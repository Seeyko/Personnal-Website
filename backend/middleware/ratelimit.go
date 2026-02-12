package middleware

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/tomandrieu/blog-api/services/ratelimit"
)

// RateLimitMiddleware wraps the rate limiter for HTTP middleware
type RateLimitMiddleware struct {
	limiter *ratelimit.RateLimiter
}

// NewRateLimitMiddleware creates a new rate limiting middleware
func NewRateLimitMiddleware(limiter *ratelimit.RateLimiter) *RateLimitMiddleware {
	return &RateLimitMiddleware{limiter: limiter}
}

// UnlockRateLimit is a middleware that protects article unlock endpoints
func (m *RateLimitMiddleware) UnlockRateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		slug := chi.URLParam(r, "slug")
		ip := extractIP(r)

		// Check if request is allowed
		allowed, retryAfter, reason := m.limiter.CheckRequest(ip, slug)

		if !allowed {
			w.Header().Set("Retry-After", retryAfter.String())
			w.Header().Set("Content-Type", "application/json")

			if reason == "locked_out" {
				w.WriteHeader(http.StatusForbidden)
				w.Write([]byte(`{"error":"account_locked","message":"Too many failed attempts. Try again later.","retryAfter":"` + retryAfter.String() + `"}`))
				log.Printf("[SECURITY] Rate limit LOCKOUT: IP=%s, slug=%s, retryAfter=%v", ip, slug, retryAfter)
			} else {
				w.WriteHeader(http.StatusTooManyRequests)
				w.Write([]byte(`{"error":"rate_limit_exceeded","message":"Too many requests. Please slow down.","retryAfter":"` + retryAfter.String() + `"}`))
				log.Printf("[SECURITY] Rate limit EXCEEDED: IP=%s, slug=%s, retryAfter=%v", ip, slug, retryAfter)
			}
			return
		}

		// Wrap response writer to capture status code
		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(rw, r)

		// Post-processing: handle result
		if rw.statusCode == http.StatusUnauthorized {
			// Failed unlock attempt
			failCount, locked := m.limiter.RecordFailure(ip, slug)

			if locked {
				log.Printf("[SECURITY] LOCKOUT TRIGGERED: IP=%s, slug=%s, attempts=%d", ip, slug, failCount)
			} else {
				log.Printf("[SECURITY] Failed unlock: IP=%s, slug=%s, attempts=%d", ip, slug, failCount)
			}

			// Apply progressive delay (exponential backoff)
			delay := calculateDelay(failCount)
			if delay > 0 {
				log.Printf("[SECURITY] Applying delay: %v for IP=%s, slug=%s", delay, ip, slug)
				time.Sleep(delay)
			}
		} else if rw.statusCode == http.StatusOK {
			// Successful unlock
			m.limiter.RecordSuccess(ip, slug)
			log.Printf("[SECURITY] Successful unlock: IP=%s, slug=%s", ip, slug)
		}
	})
}

// extractIP extracts the real client IP from the request
// Priority: X-Forwarded-For > X-Real-IP > RemoteAddr
func extractIP(r *http.Request) string {
	// Check X-Forwarded-For (most common with reverse proxies)
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// Take the first IP in the chain
		ips := strings.Split(xff, ",")
		return strings.TrimSpace(ips[0])
	}

	// Check X-Real-IP
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	// Fallback to RemoteAddr (format "IP:port")
	ip := r.RemoteAddr
	if colon := strings.LastIndex(ip, ":"); colon != -1 {
		ip = ip[:colon]
	}
	return ip
}

// calculateDelay computes exponential backoff delay based on attempt count
// Pattern: 0s, 1s, 2s, 4s, 8s, 16s (max)
func calculateDelay(attemptCount int) time.Duration {
	if attemptCount <= 1 {
		return 0
	}
	// Exponential backoff: 2^(n-2) seconds
	delay := time.Second * time.Duration(1<<(attemptCount-2))
	// Cap at 16 seconds
	if delay > 16*time.Second {
		delay = 16 * time.Second
	}
	return delay
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
