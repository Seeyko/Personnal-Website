package ratelimit

import (
	"log"
	"sync"
	"time"
)

// AttemptRecord tracks failed unlock attempts for a specific IP+slug
type AttemptRecord struct {
	Count        int        // Number of consecutive failed attempts
	FirstAttempt time.Time  // First attempt in the current sliding window
	LastAttempt  time.Time  // Last attempt timestamp
	LockedUntil  *time.Time // Nil if not locked out, otherwise expiration time
}

// RateLimiter provides thread-safe rate limiting for article unlock attempts
type RateLimiter struct {
	mu       sync.RWMutex
	attempts map[string]*AttemptRecord // key = "IP:slug"

	// Configuration
	maxAttemptsPerMinute int           // Max attempts within sliding 1-minute window
	lockoutThreshold     int           // Number of failures before lockout
	lockoutDuration      time.Duration // Duration of lockout period
	cleanupInterval      time.Duration // Interval for cleanup worker
}

// NewRateLimiter creates a new RateLimiter and starts the cleanup worker
func NewRateLimiter(maxAttemptsPerMinute, lockoutThreshold int, lockoutDuration, cleanupInterval time.Duration) *RateLimiter {
	rl := &RateLimiter{
		attempts:             make(map[string]*AttemptRecord),
		maxAttemptsPerMinute: maxAttemptsPerMinute,
		lockoutThreshold:     lockoutThreshold,
		lockoutDuration:      lockoutDuration,
		cleanupInterval:      cleanupInterval,
	}

	rl.startCleanupWorker()
	log.Printf("[RateLimiter] Initialized: maxPerMin=%d, lockoutThreshold=%d, lockoutDuration=%v, cleanup=%v",
		maxAttemptsPerMinute, lockoutThreshold, lockoutDuration, cleanupInterval)

	return rl
}

// CheckRequest checks if a request from the given IP for the given slug is allowed
// Returns:
//   - allowed: true if request should proceed
//   - retryAfter: duration until the client can retry (if not allowed)
//   - reason: "locked_out" or "rate_limit_exceeded"
func (rl *RateLimiter) CheckRequest(ip, slug string) (bool, time.Duration, string) {
	key := ip + ":" + slug

	rl.mu.RLock()
	record, exists := rl.attempts[key]
	rl.mu.RUnlock()

	now := time.Now()

	// Check if currently locked out
	if exists && record.LockedUntil != nil && now.Before(*record.LockedUntil) {
		retryAfter := record.LockedUntil.Sub(now)
		return false, retryAfter, "locked_out"
	}

	// Check rate limit (sliding window: max attempts per minute)
	if exists && now.Sub(record.FirstAttempt) < time.Minute {
		if record.Count >= rl.maxAttemptsPerMinute {
			retryAfter := time.Minute - now.Sub(record.FirstAttempt)
			return false, retryAfter, "rate_limit_exceeded"
		}
	}

	return true, 0, ""
}

// RecordFailure records a failed unlock attempt
// Returns:
//   - failCount: total number of failures in current window
//   - locked: true if lockout was triggered
func (rl *RateLimiter) RecordFailure(ip, slug string) (int, bool) {
	key := ip + ":" + slug

	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	record, exists := rl.attempts[key]

	// If no record exists or sliding window expired, start new window
	if !exists || now.Sub(record.FirstAttempt) > time.Minute {
		record = &AttemptRecord{
			Count:        1,
			FirstAttempt: now,
			LastAttempt:  now,
		}
		rl.attempts[key] = record
		return 1, false
	}

	// Increment failure count
	record.Count++
	record.LastAttempt = now

	// Check if lockout threshold reached
	if record.Count >= rl.lockoutThreshold {
		lockUntil := now.Add(rl.lockoutDuration)
		record.LockedUntil = &lockUntil
		log.Printf("[RateLimiter] LOCKOUT TRIGGERED: key=%s, attempts=%d, lockUntil=%v", key, record.Count, lockUntil)
		return record.Count, true
	}

	return record.Count, false
}

// RecordSuccess resets the attempt counter after a successful unlock
func (rl *RateLimiter) RecordSuccess(ip, slug string) {
	key := ip + ":" + slug

	rl.mu.Lock()
	defer rl.mu.Unlock()

	// Remove the record entirely on success
	delete(rl.attempts, key)
	log.Printf("[RateLimiter] Success: key=%s (counter reset)", key)
}

// startCleanupWorker launches a background goroutine to periodically clean up expired entries
func (rl *RateLimiter) startCleanupWorker() {
	ticker := time.NewTicker(rl.cleanupInterval)
	go func() {
		for range ticker.C {
			rl.cleanup()
		}
	}()
}

// cleanup removes expired entries from the attempts map
func (rl *RateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	removedCount := 0

	for key, record := range rl.attempts {
		// Remove if inactive for more than 1 hour
		if now.Sub(record.LastAttempt) > time.Hour {
			delete(rl.attempts, key)
			removedCount++
			continue
		}

		// Remove if lockout has expired
		if record.LockedUntil != nil && now.After(*record.LockedUntil) {
			delete(rl.attempts, key)
			removedCount++
		}
	}

	if removedCount > 0 {
		log.Printf("[RateLimiter] Cleanup: removed %d expired entries (remaining: %d)", removedCount, len(rl.attempts))
	}
}

// GetStats returns current rate limiter statistics (useful for monitoring)
func (rl *RateLimiter) GetStats() map[string]interface{} {
	rl.mu.RLock()
	defer rl.mu.RUnlock()

	lockedCount := 0
	for _, record := range rl.attempts {
		if record.LockedUntil != nil && time.Now().Before(*record.LockedUntil) {
			lockedCount++
		}
	}

	return map[string]interface{}{
		"total_entries": len(rl.attempts),
		"locked_count":  lockedCount,
	}
}
