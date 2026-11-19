#!/usr/bin/env python3
"""Lance une synchro X avec le serveur x-context, hors client MCP.

Lit les clés depuis l'environnement (X_CONSUMER_KEY, X_SECRET_KEY, X_ACCESS_TOKEN,
X_ACCESS_TOKEN_SECRET), les range dans ~/.x-context/credentials.json (0600), puis
appelle l'outil x_sync en passant par le proxy de l'environnement.

Usage : python3 tools/social-sync/run_x_sync.py '{"max_posts":100}'
"""
import glob
import json
import os
import subprocess
import sys

HANDLE = "TomAndrieu96707"
ENV_MAP = {
    "api_key": "X_CONSUMER_KEY",
    "api_secret": "X_SECRET_KEY",
    "access_token": "X_ACCESS_TOKEN",
    "access_token_secret": "X_ACCESS_TOKEN_SECRET",
}


def write_credentials():
    creds = {k: os.environ.get(v, "").strip() for k, v in ENV_MAP.items()}
    missing = [ENV_MAP[k] for k, v in creds.items() if not v]
    if missing:
        sys.exit(f"Clés manquantes : {', '.join(missing)}")
    creds["username"] = HANDLE
    path = os.path.expanduser("~/.x-context/credentials.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    os.write(fd, json.dumps(creds).encode())
    os.close(fd)


def call(tool, args):
    server = glob.glob(os.path.expanduser("~/.claude/plugins/**/x-context/dist/server.mjs"), recursive=True)
    if not server:
        sys.exit("Serveur x-context introuvable : installe le plugin x-context.")
    env = dict(os.environ, NODE_USE_ENV_PROXY="1", X_TIMEZONE="Europe/Paris")
    p = subprocess.Popen(["node", server[0]], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                         stderr=subprocess.DEVNULL, env=env, text=True)

    def send(msg):
        p.stdin.write(json.dumps(msg) + "\n")
        p.stdin.flush()

    def recv(i):
        for line in p.stdout:
            msg = json.loads(line)
            if msg.get("id") == i:
                return msg
        sys.exit("Le serveur x-context s'est arrêté.")

    send({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
        "protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "social-sync", "version": "1"}}})
    recv(1)
    send({"jsonrpc": "2.0", "method": "notifications/initialized"})
    send({"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": tool, "arguments": args}})
    result = recv(2)["result"]
    p.terminate()
    for c in result["content"]:
        print(c.get("text", ""))
    if result.get("isError"):
        sys.exit(1)


if __name__ == "__main__":
    write_credentials()
    call("x_sync", json.loads(sys.argv[1]) if len(sys.argv) > 1 else {"max_posts": 100, "refresh_metrics_days": 7})
