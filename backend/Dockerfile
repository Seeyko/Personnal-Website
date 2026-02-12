FROM golang:1.23-alpine AS builder

WORKDIR /build

RUN apk add --no-cache git

# Copy Go module files first (from backend directory in context)
COPY backend/go.mod backend/go.sum* ./
RUN go mod download 2>/dev/null || go mod tidy

# Copy backend source
COPY backend/ .
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server .

FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/server .

# Copy articles from the repo (ensures fresh articles on every build)
COPY blog/articles /app/articles

EXPOSE 3000

ENV PORT=3000
ENV ARTICLES_DIR=/app/articles

CMD ["./server"]
# Rebuild trigger Thu Feb 12 13:20:51 CET 2026
