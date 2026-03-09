package services

import (
	"errors"
	"log"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("token expired")
	ErrInvalidSlug  = errors.New("token slug mismatch")
)

type Claims struct {
	Slug string `json:"slug"`
	jwt.RegisteredClaims
}

type JWTService struct {
	secret         []byte
	expirationTime time.Duration
}

func NewJWTService() *JWTService {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Fatal("FATAL: JWT_SECRET environment variable is required. Set it before starting the server.")
	}

	expirationTime := 1 * time.Hour // Par défaut 1 heure
	if expEnv := os.Getenv("JWT_EXPIRATION_HOURS"); expEnv != "" {
		if hours, err := time.ParseDuration(expEnv + "h"); err == nil {
			expirationTime = hours
		}
	}

	return &JWTService{
		secret:         []byte(secret),
		expirationTime: expirationTime,
	}
}

func (s *JWTService) GenerateToken(slug string) (string, time.Time, error) {
	expiresAt := time.Now().Add(s.expirationTime)

	claims := &Claims{
		Slug: slug,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.secret)
	if err != nil {
		return "", time.Time{}, err
	}

	return tokenString, expiresAt, nil
}

func (s *JWTService) ValidateToken(tokenString, expectedSlug string) error {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return s.secret, nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return ErrExpiredToken
		}
		return ErrInvalidToken
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		if claims.Slug != expectedSlug {
			return ErrInvalidSlug
		}
		return nil
	}

	return ErrInvalidToken
}
