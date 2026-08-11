#!/usr/bin/env python3
import datetime
import json
import os
import re
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.normpath(os.path.join(HERE, "..", "docs", "data.json"))
HISTORY_CAP = 50
MAX_BYTES = 64 * 1024 * 1024

_repos_re = re.compile(r"^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$")
_oneline_re = re.compile(r"^[\x20-\x7e]+$")

UPSTREAM = os.environ.get("UPSTREAM_REPO", "aseprite/aseprite")
if not _repos_re.match(UPSTREAM):
    print(f"error: bad UPSTREAM_REPO: {UPSTREAM}", file=sys.stderr)
    sys.exit(1)
API_URL = f"https://api.github.com/repos/{UPSTREAM}/releases/latest"


def gh_get(url, attempts=3):
    headers = {"User-Agent": "aseprite-builder", "Accept": "application/vnd.github+json"}
    token = os.environ.get("GH_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    last = None
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read(MAX_BYTES).decode("utf-8"))
        except Exception as exc:
            last = exc
            if i < attempts - 1:
                time.sleep(2 ** i)
    raise last


def emit(name, value):
    if not _oneline_re.match(str(value)):
        raise ValueError(f"refusing multiline output: {name}")
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a", encoding="utf-8") as fh:
            fh.write(f"{name}={value}\n")


def main():
    release = gh_get(API_URL)
    tag = release.get("tag_name")
    if not tag or not _oneline_re.match(tag):
        raise ValueError(f"bad tag_name: {tag!r}")
    body = release.get("body") or ""
    published = release.get("published_at") or ""
    source_url = ""
    for asset in release.get("assets", []):
        if asset.get("name", "").endswith("Source.zip"):
            cand = asset.get("browser_download_url", "")
            if cand and _oneline_re.match(cand):
                source_url = cand
            break

    with open(DATA_FILE, "r", encoding="utf-8") as fh:
        local = json.load(fh)

    latest = local.get("latest")
    today = datetime.date.today().isoformat()
    is_new = (latest is None) or (latest.get("version") != tag)

    if is_new:
        if latest:
            hist = local.setdefault("history", [])
            hist.insert(0, latest)
            local["history"] = hist[:HISTORY_CAP]
        local["latest"] = {
            "version": tag,
            "published_at": published,
            "source_url": source_url,
            "changelog": body,
            "build_status": "pending",
            "download_url": "",
            "detected_at": today,
        }
    else:
        local["latest"]["changelog"] = body
        if source_url:
            local["latest"]["source_url"] = source_url

    local["tracked_repo"] = UPSTREAM
    local["last_checked"] = today

    with open(DATA_FILE, "w", encoding="utf-8") as fh:
        json.dump(local, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    build_needed = bool(local["latest"]) and local["latest"].get("build_status") != "ready"
    emit("build_needed", "true" if build_needed else "false")
    emit("version", tag)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        try:
            emit("build_needed", "false")
            emit("version", "")
        except Exception:
            pass
        sys.exit(1)
