package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"

	pb "github.com/GoogleCloudPlatform/microservices-demo/src/frontend/genproto"
)

// apiMoney/apiProduct/apiCartItem are plain JSON-friendly views over the gRPC
// proto types, so the React app never has to deal with protobuf field casing
// (GetPriceUsd, etc.) or nanos-based money encoding.
type apiMoney struct {
	CurrencyCode string `json:"currencyCode"`
	Amount       string `json:"amount"`
}

type apiProduct struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Picture     string   `json:"picture"`
	PriceUSD    apiMoney `json:"priceUsd"`
	Categories  []string `json:"categories"`
}

type apiCartItem struct {
	ProductID string `json:"productId"`
	Quantity  int32  `json:"quantity"`
}

func toApiMoney(m *pb.Money) apiMoney {
	if m == nil {
		return apiMoney{}
	}
	return apiMoney{
		CurrencyCode: m.GetCurrencyCode(),
		Amount:       fmt.Sprintf("%d.%02d", m.GetUnits(), m.GetNanos()/10_000_000),
	}
}

func toApiProduct(p *pb.Product) apiProduct {
	return apiProduct{
		ID:          p.GetId(),
		Name:        p.GetName(),
		Description: p.GetDescription(),
		Picture:     p.GetPicture(),
		PriceUSD:    toApiMoney(p.GetPriceUsd()),
		Categories:  p.GetCategories(),
	}
}

// resolveUserID prefers the authenticated user (Bearer JWT, validated
// locally against JWT_SECRET) and falls back to the anonymous session
// cookie, so guest carts keep working exactly as before auth existed.
func resolveUserID(fe *frontendServer, r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") && fe.jwtSecret != "" {
		token := strings.TrimPrefix(authHeader, "Bearer ")
		if claims, err := verifyJWT(token, fe.jwtSecret); err == nil {
			return claims.Subject
		}
	}
	return sessionID(r)
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

func writeAPIError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func corsMiddleware(allowedOrigin string) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := allowedOrigin
			if origin == "" {
				origin = "*"
			}
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func (fe *frontendServer) apiListProducts(w http.ResponseWriter, r *http.Request) {
	products, err := fe.getProducts(r.Context())
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "could not retrieve products")
		return
	}
	out := make([]apiProduct, len(products))
	for i, p := range products {
		out[i] = toApiProduct(p)
	}
	writeJSON(w, http.StatusOK, out)
}

func (fe *frontendServer) apiGetProduct(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	p, err := fe.getProduct(r.Context(), id)
	if err != nil {
		writeAPIError(w, http.StatusNotFound, "product not found")
		return
	}
	writeJSON(w, http.StatusOK, toApiProduct(p))
}

func (fe *frontendServer) apiGetCart(w http.ResponseWriter, r *http.Request) {
	userID := resolveUserID(fe, r)
	items, err := fe.getCart(r.Context(), userID)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "could not retrieve cart")
		return
	}
	out := make([]apiCartItem, len(items))
	for i, it := range items {
		out[i] = apiCartItem{ProductID: it.GetProductId(), Quantity: it.GetQuantity()}
	}
	writeJSON(w, http.StatusOK, out)
}

func (fe *frontendServer) apiAddToCart(w http.ResponseWriter, r *http.Request) {
	var payload apiCartItem
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeAPIError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if payload.ProductID == "" || payload.Quantity <= 0 {
		writeAPIError(w, http.StatusUnprocessableEntity, "productId and a positive quantity are required")
		return
	}
	userID := resolveUserID(fe, r)
	if err := fe.insertCart(r.Context(), userID, payload.ProductID, payload.Quantity); err != nil {
		writeAPIError(w, http.StatusInternalServerError, "failed to add to cart")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (fe *frontendServer) apiEmptyCart(w http.ResponseWriter, r *http.Request) {
	userID := resolveUserID(fe, r)
	if err := fe.emptyCart(r.Context(), userID); err != nil {
		writeAPIError(w, http.StatusInternalServerError, "failed to empty cart")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (fe *frontendServer) apiCurrencies(w http.ResponseWriter, r *http.Request) {
	currencies, err := fe.getCurrencies(r.Context())
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "could not retrieve currencies")
		return
	}
	writeJSON(w, http.StatusOK, currencies)
}

func (fe *frontendServer) apiRecommendations(w http.ResponseWriter, r *http.Request) {
	userID := resolveUserID(fe, r)
	var productIDs []string
	if raw := r.URL.Query().Get("productIds"); raw != "" {
		productIDs = strings.Split(raw, ",")
	}
	products, err := fe.getRecommendations(r.Context(), userID, productIDs)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "could not retrieve recommendations")
		return
	}
	out := make([]apiProduct, len(products))
	for i, p := range products {
		out[i] = toApiProduct(p)
	}
	writeJSON(w, http.StatusOK, out)
}

type apiCheckoutRequest struct {
	Email                     string `json:"email"`
	StreetAddress             string `json:"streetAddress"`
	City                      string `json:"city"`
	State                     string `json:"state"`
	Country                   string `json:"country"`
	ZipCode                   int32  `json:"zipCode"`
	CreditCardNumber          string `json:"creditCardNumber"`
	CreditCardExpirationMonth int32  `json:"creditCardExpirationMonth"`
	CreditCardExpirationYear  int32  `json:"creditCardExpirationYear"`
	CreditCardCvv             int32  `json:"creditCardCvv"`
	Currency                  string `json:"currency"`
}

func (fe *frontendServer) apiCheckout(w http.ResponseWriter, r *http.Request) {
	log := r.Context().Value(ctxKeyLog{}).(logrus.FieldLogger)

	var payload apiCheckoutRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeAPIError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	currency := payload.Currency
	if currency == "" {
		currency = defaultCurrency
	}

	userID := resolveUserID(fe, r)
	order, err := pb.NewCheckoutServiceClient(fe.checkoutSvcConn).PlaceOrder(r.Context(), &pb.PlaceOrderRequest{
		Email: payload.Email,
		CreditCard: &pb.CreditCardInfo{
			CreditCardNumber:          payload.CreditCardNumber,
			CreditCardExpirationMonth: payload.CreditCardExpirationMonth,
			CreditCardExpirationYear:  payload.CreditCardExpirationYear,
			CreditCardCvv:             payload.CreditCardCvv,
		},
		UserId:       userID,
		UserCurrency: currency,
		Address: &pb.Address{
			StreetAddress: payload.StreetAddress,
			City:          payload.City,
			State:         payload.State,
			ZipCode:       payload.ZipCode,
			Country:       payload.Country,
		},
	})
	if err != nil {
		log.WithField("error", err).Warn("checkout failed")
		writeAPIError(w, http.StatusInternalServerError, "failed to complete the order")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"orderId": order.GetOrder().GetOrderId()})
}
