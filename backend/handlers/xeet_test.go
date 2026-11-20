package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/go-chi/chi/v5"
)

// Expected values come from node: ((Number(id)/1e15)*Math.PI).toString(36).replace(/(0+|\.)/g,”)
func TestXeetToken(t *testing.T) {
	cases := map[string]string{
		"2123466113795432648": "55b2cxzhhfw",
		"2115704309929386068": "54moiq7f21t",
		"2112091140979921403": "54bbvp1snf",
		"2108209643172581725": "53z4w5tj3fk",
		"2105020261967781907": "53p46kzomti",
		"2102653666612183534": "53hoizanooa",
		"2086712751892623803": "523lnhbk4tr",
		"2030790114981339340": "4x7wy8iy9xe",
		"1737101797389463987": "47l9l1xq412",
		"1730133570813907297": "46zdhw2kmod",
		"1727962586539303179": "46sjypwj2q",
		"1726898015649345646": "46p7kbcfq",
		"1725432747437486144": "46klugw8p6p",
		"1629307668568633344": "3y6mctgwzxo",
		"20":                  "6dq1a2xwd93",
	}
	for id, want := range cases {
		if got := xeetToken(id); got != want {
			t.Errorf("xeetToken(%s) = %q, want %q", id, got, want)
		}
	}
}

func newTestXeetServer(t *testing.T, handler http.HandlerFunc) (*XeetHandler, *chi.Mux, *int32) {
	t.Helper()
	var calls int32
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&calls, 1)
		handler(w, r)
	}))
	t.Cleanup(upstream.Close)
	h := NewXeetHandler()
	h.baseURL = upstream.URL
	r := chi.NewRouter()
	r.Get("/api/xeet/{id}", h.GetXeet)
	return h, r, &calls
}

func getXeetPath(r http.Handler, path string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	return rec
}

func TestGetXeetWrapsAndCaches(t *testing.T) {
	_, r, calls := newTestXeetServer(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("token") == "" {
			t.Errorf("missing token")
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"__typename":"Tweet","id_str":"` + r.URL.Query().Get("id") + `","text":"hi"}`))
	})
	for i := 0; i < 2; i++ {
		rec := getXeetPath(r, "/api/xeet/123")
		if rec.Code != http.StatusOK {
			t.Fatalf("status %d", rec.Code)
		}
		var out struct {
			Data struct {
				IDStr string `json:"id_str"`
			} `json:"data"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil || out.Data.IDStr != "123" {
			t.Fatalf("bad body %s (%v)", rec.Body.String(), err)
		}
	}
	if *calls != 1 {
		t.Fatalf("upstream called %d times, want 1 (cache)", *calls)
	}
}

func TestGetXeetNotFoundAndTombstone(t *testing.T) {
	_, r, _ := newTestXeetServer(t, func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("id") == "1" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		w.Write([]byte(`{"__typename":"TweetTombstone"}`))
	})
	for _, id := range []string{"1", "2"} {
		rec := getXeetPath(r, "/api/xeet/"+id)
		if rec.Code != http.StatusNotFound || rec.Body.String() != `{"data":null}` {
			t.Errorf("id %s: %d %s", id, rec.Code, rec.Body.String())
		}
	}
}

func TestGetXeetRejectsBadID(t *testing.T) {
	_, r, calls := newTestXeetServer(t, func(w http.ResponseWriter, r *http.Request) {})
	if rec := getXeetPath(r, "/api/xeet/abc"); rec.Code != http.StatusBadRequest {
		t.Fatalf("status %d", rec.Code)
	}
	if *calls != 0 {
		t.Fatal("upstream should not be called")
	}
}

func TestGetXeetUpstreamDown(t *testing.T) {
	_, r, _ := newTestXeetServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	})
	if rec := getXeetPath(r, "/api/xeet/5"); rec.Code != http.StatusBadGateway {
		t.Fatalf("status %d", rec.Code)
	}
}

func TestGetXeetUpstreamRefusesIsNotNotFound(t *testing.T) {
	_, r, calls := newTestXeetServer(t, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK) // empty body, as X sends to some clients
	})
	for i := 0; i < 2; i++ {
		if rec := getXeetPath(r, "/api/xeet/7"); rec.Code != http.StatusBadGateway {
			t.Fatalf("status %d, want 502", rec.Code)
		}
	}
	if *calls != 2 {
		t.Fatalf("upstream called %d times, want 2 (refusals are not cached)", *calls)
	}
}
