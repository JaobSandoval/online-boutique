package main

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"

	pb "github.com/GoogleCloudPlatform/microservices-demo/src/frontend/genproto"
	"github.com/GoogleCloudPlatform/microservices-demo/src/frontend/money"
	"github.com/GoogleCloudPlatform/microservices-demo/src/frontend/validator"
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
	// Price is PriceUSD converted to the currency requested with ?currency=
	// (currencyservice), the same conversion the original Go storefront did
	// on every page. Omitted when the conversion fails, so clients fall back
	// to priceUsd instead of breaking.
	Price      *apiMoney `json:"price,omitempty"`
	Categories []string  `json:"categories"`
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

// apiCurrency returns the ?currency= query param if it is one of the
// currencies the store supports, else the default (USD) — mirrors
// currentCurrency() for the cookie-based HTML storefront.
func apiCurrency(r *http.Request) string {
	c := strings.ToUpper(strings.TrimSpace(r.URL.Query().Get("currency")))
	if whitelistedCurrencies[c] {
		return c
	}
	return defaultCurrency
}

// toApiProductIn is toApiProduct plus the price converted to currency.
func (fe *frontendServer) toApiProductIn(ctx context.Context, p *pb.Product, currency string) apiProduct {
	out := toApiProduct(p)
	if price, err := fe.convertCurrency(ctx, p.GetPriceUsd(), currency); err == nil {
		m := toApiMoney(price)
		out.Price = &m
	}
	return out
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

// requireAuthMiddleware makes login mandatory for the whole store: every
// /api/v1 route requires a valid access token, so a guest can't reach the
// catalog, cart, or checkout by calling the API directly even if they
// bypass the React route guard.
func requireAuthMiddleware(fe *frontendServer) mux.MiddlewareFunc {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodOptions {
				next.ServeHTTP(w, r)
				return
			}
			authHeader := r.Header.Get("Authorization")
			token := strings.TrimPrefix(authHeader, "Bearer ")
			if token == authHeader || fe.jwtSecret == "" {
				writeAPIError(w, http.StatusUnauthorized, "authentication required")
				return
			}
			if _, err := verifyJWT(token, fe.jwtSecret); err != nil {
				writeAPIError(w, http.StatusUnauthorized, "invalid or expired token")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
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
	currency := apiCurrency(r)
	out := make([]apiProduct, len(products))
	for i, p := range products {
		out[i] = fe.toApiProductIn(r.Context(), p, currency)
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
	writeJSON(w, http.StatusOK, fe.toApiProductIn(r.Context(), p, apiCurrency(r)))
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
	if payload.Quantity <= 0 {
		writeAPIError(w, http.StatusUnprocessableEntity, "productId and a quantity between 1 and 10 are required")
		return
	}
	check := validator.AddToCartPayload{Quantity: uint64(payload.Quantity), ProductID: payload.ProductID}
	if err := check.Validate(); err != nil {
		writeAPIError(w, http.StatusUnprocessableEntity, "productId and a quantity between 1 and 10 are required")
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
	currency := apiCurrency(r)
	out := make([]apiProduct, len(products))
	for i, p := range products {
		out[i] = fe.toApiProductIn(r.Context(), p, currency)
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
	currency := strings.ToUpper(payload.Currency)
	if !whitelistedCurrencies[currency] {
		currency = defaultCurrency
	}

	// Same server-side validation as the original HTML checkout
	// (placeOrderHandler): never trust the browser's form checks alone.
	check := validator.PlaceOrderPayload{
		Email:         payload.Email,
		StreetAddress: payload.StreetAddress,
		ZipCode:       int64(payload.ZipCode),
		City:          payload.City,
		State:         payload.State,
		Country:       payload.Country,
		CcNumber:      payload.CreditCardNumber,
		CcMonth:       int64(payload.CreditCardExpirationMonth),
		CcYear:        int64(payload.CreditCardExpirationYear),
		CcCVV:         int64(payload.CreditCardCvv),
	}
	if err := check.Validate(); err != nil {
		writeAPIError(w, http.StatusUnprocessableEntity, strings.TrimSpace(validator.ValidationErrorResponse(err).Error()))
		return
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
	o := order.GetOrder()
	log.WithField("order", o.GetOrderId()).Info("order placed")

	// Same "Total Paid" math as the original order confirmation page.
	totalPaid := *o.GetShippingCost()
	items := make([]apiOrderItem, 0, len(o.GetItems()))
	for _, v := range o.GetItems() {
		line := money.MultiplySlow(*v.GetCost(), uint32(v.GetItem().GetQuantity()))
		totalPaid = money.Must(money.Sum(totalPaid, line))
		items = append(items, apiOrderItem{
			ProductID: v.GetItem().GetProductId(),
			Quantity:  v.GetItem().GetQuantity(),
			UnitPrice: toApiMoney(v.GetCost()),
			LineTotal: toApiMoney(&line),
		})
	}
	writeJSON(w, http.StatusOK, apiOrderResponse{
		OrderID:            o.GetOrderId(),
		ShippingTrackingID: o.GetShippingTrackingId(),
		ShippingCost:       toApiMoney(o.GetShippingCost()),
		TotalPaid:          toApiMoney(&totalPaid),
		Items:              items,
	})
}

type apiOrderItem struct {
	ProductID string   `json:"productId"`
	Quantity  int32    `json:"quantity"`
	UnitPrice apiMoney `json:"unitPrice"`
	LineTotal apiMoney `json:"lineTotal"`
}

type apiOrderResponse struct {
	OrderID            string         `json:"orderId"`
	ShippingTrackingID string         `json:"shippingTrackingId"`
	ShippingCost       apiMoney       `json:"shippingCost"`
	TotalPaid          apiMoney       `json:"totalPaid"`
	Items              []apiOrderItem `json:"items"`
}

type apiCartQuote struct {
	Currency     string         `json:"currency"`
	Items        []apiOrderItem `json:"items"`
	Subtotal     apiMoney       `json:"subtotal"`
	ShippingCost apiMoney       `json:"shippingCost"`
	Total        apiMoney       `json:"total"`
}

// apiCartQuote prices the user's cart in the requested currency and asks
// shippingservice for a shipping estimate — what the original cart page
// showed as "Shipping" and "Total".
func (fe *frontendServer) apiCartQuote(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	currency := apiCurrency(r)
	cart, err := fe.getCart(ctx, resolveUserID(fe, r))
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, "could not retrieve cart")
		return
	}
	shipping := pb.Money{CurrencyCode: currency}
	if len(cart) > 0 {
		quote, err := fe.getShippingQuote(ctx, cart, currency)
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "failed to get shipping quote")
			return
		}
		shipping = *quote
	}
	subtotal := pb.Money{CurrencyCode: currency}
	items := make([]apiOrderItem, 0, len(cart))
	for _, it := range cart {
		p, err := fe.getProduct(ctx, it.GetProductId())
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "could not retrieve product "+it.GetProductId())
			return
		}
		price, err := fe.convertCurrency(ctx, p.GetPriceUsd(), currency)
		if err != nil {
			writeAPIError(w, http.StatusInternalServerError, "failed to convert currency")
			return
		}
		line := money.MultiplySlow(*price, uint32(it.GetQuantity()))
		subtotal = money.Must(money.Sum(subtotal, line))
		items = append(items, apiOrderItem{
			ProductID: it.GetProductId(),
			Quantity:  it.GetQuantity(),
			UnitPrice: toApiMoney(price),
			LineTotal: toApiMoney(&line),
		})
	}
	total := money.Must(money.Sum(subtotal, shipping))
	writeJSON(w, http.StatusOK, apiCartQuote{
		Currency:     currency,
		Items:        items,
		Subtotal:     toApiMoney(&subtotal),
		ShippingCost: toApiMoney(&shipping),
		Total:        toApiMoney(&total),
	})
}

// apiAd returns one contextual text ad from adservice (as the original
// product page did), or 204 when adservice has nothing or is unavailable —
// ads are never critical to the page.
func (fe *frontendServer) apiAd(w http.ResponseWriter, r *http.Request) {
	var keys []string
	if raw := r.URL.Query().Get("categories"); raw != "" {
		keys = strings.Split(raw, ",")
	}
	ads, err := fe.getAd(r.Context(), keys)
	if err != nil || len(ads) == 0 {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	ad := ads[rand.Intn(len(ads))]
	writeJSON(w, http.StatusOK, map[string]string{"redirectUrl": ad.GetRedirectUrl(), "text": ad.GetText()})
}

// apiStoreInfo exposes what the original header/footer showed: the
// FRONTEND_MESSAGE banner and the deployment details (cluster/zone/pod).
func (fe *frontendServer) apiStoreInfo(w http.ResponseWriter, r *http.Request) {
	deployment := map[string]string{}
	for k, v := range deploymentDetailsMap {
		if v != "" {
			deployment[strings.ToLower(k)] = v
		}
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"message":         frontendMessage,
		"defaultCurrency": defaultCurrency,
		"deployment":      deployment,
	})
}
