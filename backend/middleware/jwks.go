package middleware

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"sync"
	"time"
)

type jwksKey struct {
	Kty string `json:"kty"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
	Kid string `json:"kid"`
	Alg string `json:"alg"`
}

type jwksResponse struct {
	Keys []jwksKey `json:"keys"`
}

type JWKSKeySet struct {
	mu        sync.RWMutex
	keys      map[string]*ecdsa.PublicKey
	jwksURL   string
	fetchedAt time.Time
}

func NewJWKSKeySet(supabaseURL string) *JWKSKeySet {
	return &JWKSKeySet{
		keys:    make(map[string]*ecdsa.PublicKey),
		jwksURL: supabaseURL + "/auth/v1/.well-known/jwks.json",
	}
}

func (ks *JWKSKeySet) GetKey(kid string) (*ecdsa.PublicKey, error) {
	ks.mu.RLock()
	key, ok := ks.keys[kid]
	ks.mu.RUnlock()
	if ok {
		return key, nil
	}

	// Refresh if we haven't fetched recently
	if err := ks.refresh(); err != nil {
		return nil, fmt.Errorf("refresh JWKS: %w", err)
	}

	ks.mu.RLock()
	defer ks.mu.RUnlock()
	key, ok = ks.keys[kid]
	if !ok {
		// Try returning any key if kid doesn't match (some tokens omit kid)
		for _, k := range ks.keys {
			return k, nil
		}
		return nil, fmt.Errorf("key %s not found in JWKS", kid)
	}
	return key, nil
}

func (ks *JWKSKeySet) refresh() error {
	ks.mu.Lock()
	defer ks.mu.Unlock()

	// Don't refetch more than once per minute
	if time.Since(ks.fetchedAt) < time.Minute {
		return nil
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(ks.jwksURL)
	if err != nil {
		return fmt.Errorf("fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("JWKS returned status %d", resp.StatusCode)
	}

	var jwks jwksResponse
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("decode JWKS: %w", err)
	}

	newKeys := make(map[string]*ecdsa.PublicKey)
	for _, k := range jwks.Keys {
		if k.Kty != "EC" {
			continue
		}

		pubKey, err := parseECPublicKey(k)
		if err != nil {
			continue
		}
		kid := k.Kid
		if kid == "" {
			kid = "default"
		}
		newKeys[kid] = pubKey
	}

	ks.keys = newKeys
	ks.fetchedAt = time.Now()
	return nil
}

func parseECPublicKey(k jwksKey) (*ecdsa.PublicKey, error) {
	xBytes, err := base64.RawURLEncoding.DecodeString(k.X)
	if err != nil {
		return nil, fmt.Errorf("decode x: %w", err)
	}
	yBytes, err := base64.RawURLEncoding.DecodeString(k.Y)
	if err != nil {
		return nil, fmt.Errorf("decode y: %w", err)
	}

	var curve elliptic.Curve
	switch k.Crv {
	case "P-256":
		curve = elliptic.P256()
	case "P-384":
		curve = elliptic.P384()
	case "P-521":
		curve = elliptic.P521()
	default:
		return nil, fmt.Errorf("unsupported curve: %s", k.Crv)
	}

	return &ecdsa.PublicKey{
		Curve: curve,
		X:     new(big.Int).SetBytes(xBytes),
		Y:     new(big.Int).SetBytes(yBytes),
	}, nil
}
