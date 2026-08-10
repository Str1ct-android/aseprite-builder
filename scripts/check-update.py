#!/usr/bin/env python3
import datetime
import json
import os
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.normpath(os.path.join(HERE, "..", "docs", "data.json"))
UPSTREAM = os.environ.get("UPSTREAM_REPO", "aseprite/aseprite")
API_URL = f"https://api.github.com/repos/{UPSTREAM}/releases/latest"


def gh_get(url):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "aseprite-builder", "Accept": "application/vnd.github+json"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def emit(name, value):
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a", encoding="utf-8") as fh:
            fh.write(f"{name}={value}\n")


def main():
    release = gh_get(API_URL)
    tag = release["tag_name"]
    body = release.get("body") or ""
    published = release.get("published_at") or ""
    source_url = ""
    for asset in release.get("assets", []):
        if asset.get("name", "").endswith("Source.zip"):
            source_url = asset.get("browser_download_url", "")
            break

    with open(DATA_FILE, "r", encoding="utf-8") as fh:
        local = json.load(fh)

    latest = local.get("latest")
    today = datetime.date.today().isoformat()
    is_new = (latest is None) or (latest.get("version") != tag)

    if is_new:
        if latest:
            local.setdefault("history", []).insert(0, latest)
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
        emit("build_needed", "false")
        emit("version", "")
        sys.exit(1)
