FROM golang:1.24-alpine AS builder

WORKDIR /build

RUN apk add --no-cache git

# Cache bust — changing this value invalidates all layers below (backend source + articles)
# Update this on every deploy that needs a fresh build
ARG CACHE_BUST=2026-04-13-ssr
RUN echo "Cache bust: ${CACHE_BUST}"

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

# Copy articles from the repo
COPY blog/articles /app/articles

EXPOSE 3000

ENV PORT=3000
ENV ARTICLES_DIR=/app/articles

CMD ["./server"]
