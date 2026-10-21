#!/usr/bin/env python3
"""Bulk core-ingest of 2023-2025 race sessions (no per-driver tracking).

Resumable: fetch skips already-cached files. Each session = fetch(--no-tracking)
then normalize. Logs one line per session to stdout.
"""
import json
import subprocess
import sys
import time
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent / "backend"
PY = BACKEND / ".venv/bin/python"
KEYS = json.load(open("/tmp/race-keys.json"))
ALREADY = {9558, 9090}  # flagship + Monaco quali (full tracking, already normalized)

todo = [k for k in KEYS if k not in ALREADY]
total = len(todo)
print(f"BULK INGEST: {total} sessions (core-only, no tracking)", flush=True)

for i, key in enumerate(todo, 1):
    t0 = time.time()
    ok = True
    for mod in ("fetch", "normalize"):
        cmd = [str(PY), "-m", f"app.ingest.{mod}", "--session", str(key)]
        if mod == "fetch":
            cmd.append("--no-tracking")
        r = subprocess.run(cmd, cwd=BACKEND, capture_output=True, text=True)
        if r.returncode != 0:
            print(f"[{i}/{total}] {key} {mod} FAILED: {r.stderr.strip()[-200:]}", flush=True)
            ok = False
            break
    dt = time.time() - t0
    status = "ok" if ok else "FAIL"
    print(f"[{i}/{total}] {key} {status} ({dt:.0f}s)", flush=True)
    time.sleep(4)

print("BULK INGEST DONE", flush=True)
