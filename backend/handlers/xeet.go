package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
)

// XeetHandler serves tweet data for the /posts page, rendered in the browser by
// react-xeet (frontend/assets/vendor/xeet). X's syndication endpoint (the one
// behind the official embeds) sends no CORS headers, so the browser can't call
// it directly: this proxies it, answers in react-xeet's { "data": ... } shape
// and keeps each tweet in memory so the page doesn't hit X on every visit.
type XeetHandler struct {
	client   *http.Client
	baseURL  string
	ttl      time.Duration
	notFound time.Duration

	mu    sync.Mutex
	cache map[string]xeetEntry
}

type xeetEntry struct {
	body    []byte // raw syndication JSON, nil when the tweet doesn't exist
	expires time.Time
}

const xeetCacheMax = 2000

var xeetIDPattern = regexp.MustCompile(`^[0-9]{1,40}$`)

func NewXeetHandler() *XeetHandler {
	return &XeetHandler{
		client:   &http.Client{Timeout: 8 * time.Second},
		baseURL:  "https://cdn.syndication.twimg.com",
		ttl:      6 * time.Hour,
		notFound: 30 * time.Minute,
		cache:    make(map[string]xeetEntry),
	}
}

// xeetToken is the token the syndication endpoint expects next to the id,
// computed like X's embed script and react-tweet:
//
//	((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '')
func xeetToken(id string) string {
	n, err := strconv.ParseFloat(id, 64)
	if err != nil {
		return ""
	}
	return strings.NewReplacer("0", "", ".", "").Replace(jsToString36((n / 1e15) * math.Pi))
}

// jsToString36 mirrors V8's DoubleToRadixCString for a positive double:
// fraction digits are emitted until they identify the value uniquely.
func jsToString36(value float64) string {
	const chars = "0123456789abcdefghijklmnopqrstuvwxyz"
	const radix = 36
	integer := math.Floor(value)
	fraction := value - integer
	delta := 0.5 * (math.Nextafter(value, math.Inf(1)) - value)
	delta = math.Max(math.Nextafter(0, 1), delta)

	var frac []byte
	if fraction >= delta {
		for {
			fraction *= radix
			delta *= radix
			digit := int(fraction)
			frac = append(frac, chars[digit])
			fraction -= float64(digit)
			if fraction > 0.5 || (fraction == 0.5 && digit&1 == 1) {
				if fraction+delta > 1 {
					// Round up, propagating carries.
					for {
						if len(frac) == 0 {
							integer++
							break
						}
						c := frac[len(frac)-1]
						frac = frac[:len(frac)-1]
						d := strings.IndexByte(chars, c)
						if d+1 < radix {
							frac = append(frac, chars[d+1])
							break
						}
					}
					break
				}
			}
			if fraction < delta {
				break
			}
		}
	}
	out := strconv.FormatInt(int64(integer), radix)
	if len(frac) > 0 {
		out += "." + string(frac)
	}
	return out
}

func (h *XeetHandler) fetch(id string) ([]byte, int, error) {
	q := fmt.Sprintf("%s/tweet-result?id=%s&lang=en&token=%s", h.baseURL, id, xeetToken(id))
	req, err := http.NewRequest(http.MethodGet, q, nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Accept", "application/json")
	res, err := h.client.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer res.Body.Close()
	body, err := io.ReadAll(io.LimitReader(res.Body, 2<<20))
	if err != nil {
		return nil, 0, err
	}
	return body, res.StatusCode, nil
}

// GetXeet handles GET /api/xeet/{id}.
func (h *XeetHandler) GetXeet(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	w.Header().Set("Content-Type", "application/json")
	if !xeetIDPattern.MatchString(id) {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid id"}`))
		return
	}

	now := time.Now()
	h.mu.Lock()
	e, ok := h.cache[id]
	h.mu.Unlock()

	if !ok || now.After(e.expires) {
		body, status, err := h.fetch(id)
		switch {
		case err != nil || status >= 500 || status == http.StatusTooManyRequests:
			// X is down or rate limiting: serve the stale copy if there is one.
			if ok && e.body != nil {
				break
			}
			w.WriteHeader(http.StatusBadGateway)
			w.Write([]byte(`{"error":"upstream unavailable"}`))
			return
		case status == http.StatusOK && json.Valid(body) && !isTombstone(body):
			e = xeetEntry{body: body, expires: now.Add(h.ttl)}
		default:
			// 404, deleted or protected tweet.
			e = xeetEntry{body: nil, expires: now.Add(h.notFound)}
		}
		h.store(id, e)
	}

	w.Header().Set("Cache-Control", "public, max-age=3600")
	if e.body == nil {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"data":null}`))
		return
	}
	w.Write([]byte(`{"data":`))
	w.Write(e.body)
	w.Write([]byte(`}`))
}

// isTombstone spots the 200 answers X gives for deleted or withheld tweets
// ({"__typename":"TweetTombstone",...}) or an empty object.
func isTombstone(body []byte) bool {
	var probe struct {
		Typename string `json:"__typename"`
		IDStr    string `json:"id_str"`
	}
	if json.Unmarshal(body, &probe) != nil {
		return true
	}
	return probe.Typename == "TweetTombstone" || probe.IDStr == ""
}

func (h *XeetHandler) store(id string, e xeetEntry) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if len(h.cache) >= xeetCacheMax {
		now := time.Now()
		for k, v := range h.cache {
			if now.After(v.expires) {
				delete(h.cache, k)
			}
		}
		if len(h.cache) >= xeetCacheMax {
			h.cache = make(map[string]xeetEntry)
		}
	}
	h.cache[id] = e
}
