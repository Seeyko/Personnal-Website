#!/usr/bin/env python3
"""Fusionne le cache x-context (~/.x-context/posts.json) dans frontend/data/social/posts.json.

Usage : python3 tools/social-sync/x_to_posts.py [cache.json] [posts.json]
Format de sortie documenté dans frontend/data/social/README.md.
"""
import json
import os
import re
import sys
from datetime import datetime, timezone

HANDLE = "TomAndrieu96707"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/.x-context/posts.json")
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "frontend/data/social/posts.json")


def reply_handles(text):
    m = re.match(r"^((?:@\w+\s+)+)", text)
    return re.findall(r"@(\w+)", m.group(1)) if m else []


def convert(p):
    m = p.get("metrics") or {}
    post = {
        "id": f"x:{p['id']}",
        "platform": "x",
        "kind": p["kind"],
        "url": f"https://x.com/{HANDLE}/status/{p['id']}",
        "text": p["text"],
        "lang": p.get("lang"),
        "publishedAt": p["created_at"],
        "hasMedia": bool(p.get("has_media")),
        "hasLink": bool(p.get("has_link")),
        "metrics": {
            "views": m.get("impressions", 0),
            "likes": m.get("likes", 0),
            "replies": m.get("replies", 0),
            "reposts": m.get("reposts", 0),
            "bookmarks": m.get("bookmarks", 0),
        },
    }
    if p["kind"] == "reply":
        handles = reply_handles(p["text"])
        if handles:
            post["inReplyTo"] = handles
    return post


def main():
    cache = json.load(open(CACHE, encoding="utf-8"))
    raw = cache["posts"]
    raw = raw.values() if isinstance(raw, dict) else raw
    existing = {}
    if os.path.exists(OUT):
        data = json.load(open(OUT, encoding="utf-8"))
        existing = {p["id"]: p for p in data.get("posts", [])}
    else:
        data = {}
    for p in raw:
        new = convert(p)
        existing[new["id"]] = {**existing.get(new["id"], {}), **new}
    posts = sorted(existing.values(), key=lambda p: p["publishedAt"], reverse=True)
    data["updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    accounts = data.get("accounts", {})
    accounts["x"] = {"handle": HANDLE, "url": f"https://x.com/{HANDLE}"}
    data["accounts"] = accounts
    data["posts"] = posts
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"updated": data["updated"], "accounts": data["accounts"], "posts": posts}, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"{len(posts)} posts -> {OUT}")


if __name__ == "__main__":
    main()
