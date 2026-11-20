#!/usr/bin/env python3
"""Fusionne le cache x-context (~/.x-context/posts.json) dans frontend/data/social/posts.json.

Usage : python3 tools/social-sync/x_to_posts.py [cache.json] [posts.json]
Format de sortie documenté dans frontend/data/social/README.md.
"""
import html
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
        # The X API sends &amp; &lt; &gt; escaped: store plain text.
        "text": html.unescape(p["text"]),
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


THREAD_GAP = 6 * 3600   # a self-reply this close to the previous post continues it
SAME_BURST = 120        # posted together (even if it starts with @mentions)
NUMBERED = re.compile(r"^\s*(\d{1,2})\s*/\s*\d{1,2}\b")


def _ts(p):
    return datetime.fromisoformat(p["publishedAt"].replace("Z", "+00:00")).timestamp()


def _order(p):
    return (p["publishedAt"], int(p["id"].split(":")[1]))


def group_threads(posts):
    """Group Tom's threads (an opener and the self-replies under it) and set
    `thread: {id, index, total}` on each member (id = the opener's id).

    x-context marks every post in a conversation Tom is part of as "thread".
    The ones that open with @mentions and aren't posted with the thread are
    replies to someone else: they become kind "reply".
    """
    for p in posts:
        p.pop("thread", None)
    xs = sorted((p for p in posts if p["platform"] == "x"), key=_order)
    groups, current = [], None
    for p in xs:
        if p["kind"] == "thread":
            near = current and _ts(p) - _ts(current[-1]) <= THREAD_GAP
            burst = current and _ts(p) - _ts(current[-1]) <= SAME_BURST
            if current and (burst or (near and not p["text"].lstrip().startswith("@"))):
                current.append(p)
                continue
            if p["text"].lstrip().startswith("@"):
                p["kind"] = "reply"
                p["inReplyTo"] = reply_handles(p["text"])
                continue
        if p["kind"] in ("post", "quote", "thread"):
            current = [p]
            groups.append(current)
        else:
            current = None
    for g in groups:
        if len(g) < 2:
            continue
        # "3/9 : ..." numbering wins over timestamps (posts sent in the same second).
        slots = [i for i, p in enumerate(g) if NUMBERED.match(p["text"])]
        numbered = sorted((g[i] for i in slots), key=lambda p: int(NUMBERED.match(p["text"]).group(1)))
        for i, p in zip(slots, numbered):
            g[i] = p
        for i, p in enumerate(g, 1):
            p["thread"] = {"id": g[0]["id"], "index": i, "total": len(g)}
            if i > 1:
                p["kind"] = "thread"


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
    posts = list(existing.values())
    for p in posts:
        p["text"] = html.unescape(p["text"])
    group_threads(posts)
    posts.sort(key=_order, reverse=True)
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
