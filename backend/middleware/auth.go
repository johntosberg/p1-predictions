package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/johnosberg/p1predictions/httputil"
)

type contextKey string

const (
	UserIDKey contextKey = "user_id"
	EmailKey  contextKey = "email"
)

func AuthMiddleware(jwtSecret string, jwks *JWKSKeySet) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				httputil.WriteError(w, http.StatusUnauthorized, "missing authorization header")
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				httputil.WriteError(w, http.StatusUnauthorized, "invalid authorization header")
				return
			}

			tokenStr := parts[1]

			token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
				switch token.Method.(type) {
				case *jwt.SigningMethodHMAC:
					return []byte(jwtSecret), nil
				case *jwt.SigningMethodECDSA:
					if jwks == nil {
						return nil, fmt.Errorf("ECDSA token but no JWKS configured")
					}
					kid, _ := token.Header["kid"].(string)
					return jwks.GetKey(kid)
				default:
					return nil, fmt.Errorf("unsupported signing method: %v", token.Header["alg"])
				}
			})
			if err != nil || !token.Valid {
				httputil.WriteError(w, http.StatusUnauthorized, "invalid token")
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				httputil.WriteError(w, http.StatusUnauthorized, "invalid token claims")
				return
			}

			sub, _ := claims.GetSubject()
			email, _ := claims["email"].(string)

			if sub == "" {
				httputil.WriteError(w, http.StatusUnauthorized, "missing subject in token")
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, sub)
			ctx = context.WithValue(ctx, EmailKey, email)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func AdminMiddleware(pool *pgxpool.Pool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := r.Context().Value(UserIDKey).(string)

			var isAdmin bool
			err := pool.QueryRow(r.Context(),
				"SELECT is_admin FROM users WHERE id = $1", userID,
			).Scan(&isAdmin)
			if err != nil {
				httputil.WriteError(w, http.StatusForbidden, "user not found")
				return
			}
			if !isAdmin {
				httputil.WriteError(w, http.StatusForbidden, "admin access required")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func GetUserID(ctx context.Context) string {
	v, _ := ctx.Value(UserIDKey).(string)
	return v
}

func GetEmail(ctx context.Context) string {
	v, _ := ctx.Value(EmailKey).(string)
	return v
}
