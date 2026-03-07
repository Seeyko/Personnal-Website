package middleware

import (
	"crypto/subtle"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/tomandrieu/blog-api/services/ratelimit"
)

type AdminAuthMiddleware struct {
	apiKey     string
	allowedIPs []string
	limiter    *ratelimit.RateLimiter
}

func NewAdminAuthMiddleware(apiKey string, allowedIPs []string) *AdminAuthMiddleware {
	// Aggressive rate limiting: 3 attempts/min, lockout after 5 failures for 30 min
	limiter := ratelimit.NewRateLimiter(
		3,               // 3 attempts per minute
		5,               // lockout after 5 failures
		30*time.Minute,  // lockout duration: 30 minutes
		5*time.Minute,   // cleanup interval: 5 minutes
	)

	return &AdminAuthMiddleware{
		apiKey:     apiKey,
		allowedIPs: allowedIPs,
		limiter:    limiter,
	}
}

// setSecurityHeaders sets security headers on all admin responses
func setSecurityHeaders(w http.ResponseWriter) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Referrer-Policy", "no-referrer")
	w.Header().Set("X-Frame-Options", "DENY")
}

// writeUnauthorized writes a uniform unauthorized JSON response
func writeUnauthorized(w http.ResponseWriter) {
	setSecurityHeaders(w)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
}

func (m *AdminAuthMiddleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := extractIP(r)

		// Always set security headers
		setSecurityHeaders(w)

		// 1. Check IP allowlist (if configured)
		if len(m.allowedIPs) > 0 {
			allowed := false
			for _, allowedIP := range m.allowedIPs {
				if ip == allowedIP {
					allowed = true
					break
				}
			}
			if !allowed {
				log.Printf("[ADMIN-AUTH] IP not in allowlist: %s", ip)
				// Add artificial delay to prevent timing attacks
				time.Sleep(200 * time.Millisecond)
				writeUnauthorized(w)
				return
			}
		}

		// 2. Check rate limit
		allowed, retryAfter, reason := m.limiter.CheckRequest(ip, "admin")
		if !allowed {
			log.Printf("[ADMIN-AUTH] Rate limited: IP=%s, reason=%s, retryAfter=%v", ip, reason, retryAfter)
			// Same response as any other failure - no enumeration
			time.Sleep(200 * time.Millisecond)
			writeUnauthorized(w)
			return
		}

		// 3. Extract Bearer token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			log.Printf("[ADMIN-AUTH] Missing or invalid Authorization header: IP=%s", ip)
			m.limiter.RecordFailure(ip, "admin")
			time.Sleep(200 * time.Millisecond)
			writeUnauthorized(w)
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")

		// 4. Constant-time comparison of API key
		if subtle.ConstantTimeCompare([]byte(token), []byte(m.apiKey)) != 1 {
			failCount, locked := m.limiter.RecordFailure(ip, "admin")
			if locked {
				log.Printf("[ADMIN-AUTH] LOCKOUT TRIGGERED: IP=%s, attempts=%d", ip, failCount)
			} else {
				log.Printf("[ADMIN-AUTH] Invalid API key: IP=%s, attempts=%d", ip, failCount)
			}
			time.Sleep(200 * time.Millisecond)
			writeUnauthorized(w)
			return
		}

		// 5. Success - reset rate limiter and proceed
		m.limiter.RecordSuccess(ip, "admin")
		log.Printf("[ADMIN-AUTH] Authenticated: IP=%s", ip)

		next.ServeHTTP(w, r)
	})
}
