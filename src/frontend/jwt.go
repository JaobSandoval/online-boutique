package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

// jwtClaims mirrors the payload shape issued by accountservice (see
// src/accountservice/app/core/security.py: create_access_token).
type jwtClaims struct {
	Subject string   `json:"sub"`
	Email   string   `json:"email"`
	Roles   []string `json:"roles"`
	Type    string   `json:"type"`
	Exp     int64    `json:"exp"`
}

// verifyJWT does local HS256 verification against the shared JWT_SECRET, the
// same secret accountservice signs with. Kept dependency-free (stdlib only)
// so every service can validate tokens without calling accountservice per
// request, avoiding a bottleneck/SPOF on it.
func verifyJWT(token, secret string) (*jwtClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, errors.New("malformed token")
	}

	signingInput := parts[0] + "." + parts[1]
	expectedSig := signHS256(signingInput, secret)

	actualSig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return nil, errors.New("invalid signature encoding")
	}
	if subtle.ConstantTimeCompare(expectedSig, actualSig) != 1 {
		return nil, errors.New("invalid signature")
	}

	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, errors.New("invalid payload encoding")
	}

	var claims jwtClaims
	if err := json.Unmarshal(payloadBytes, &claims); err != nil {
		return nil, errors.New("invalid payload json")
	}

	if claims.Type != "access" {
		return nil, errors.New("not an access token")
	}
	if claims.Exp != 0 && time.Now().Unix() > claims.Exp {
		return nil, errors.New("token expired")
	}
	return &claims, nil
}

func signHS256(input, secret string) []byte {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(input))
	return mac.Sum(nil)
}
