#!/usr/bin/env python3
"""
Robust Webpushr sender for _notifications, _news and _places.
Put this file at .github/scripts/send_notifications.py and make it executable.
"""

import os
import sys
import re
import json
import time
import subprocess
from typing import List, Optional

import requests
import yaml

# --- Config / env ---
WEBPUSHR_KEY = os.getenv("WEBPUSHR_KEY")
WEBPUSHR_AUTH = os.getenv("WEBPUSHR_AUTH")
SITE_URL = (os.getenv("SITE_URL") or "").rstrip("/")
BEFORE = os.getenv("BEFORE_COMMIT")  # may be 0000.. or empty
AFTER = os.getenv("AFTER_COMMIT") or os.getenv("GITHUB_SHA")
DRY_RUN = os.getenv("DRY_RUN", "false").lower() in ("1", "true", "yes")

if not WEBPUSHR_KEY or not WEBPUSHR_AUTH or not SITE_URL:
    print("ERROR: Required env vars WEBPUSHR_KEY, WEBPUSHR_AUTH and SITE_URL must be set", file=sys.stderr)
    sys.exit(1)

if not AFTER:
    print("ERROR: AFTER_COMMIT / GITHUB_SHA not provided", file=sys.stderr)
    sys.exit(1)

FRONT_RE = re.compile(r"^---\s*\n(.*?\n)---\s*\n", re.S)


# ---------------- helpers ----------------
def run_git(cmd: List[str]) -> str:
    try:
        out = subprocess.check_output(cmd, text=True)
        return out
    except subprocess.CalledProcessError as e:
        print(f"git command failed: {e}", file=sys.stderr)
        return ""


def git_changed_files(before: Optional[str], after: str) -> List[str]:
    if not before or re.match(r"^0+$", before):
        # initial commit or before not provided — list files changed in that commit
        out = run_git(["git", "diff-tree", "--no-commit-id", "--name-only", "-r", after])
    else:
        out = run_git(["git", "diff", "--name-only", before, after])
    files = [ln.strip() for ln in out.splitlines() if ln.strip()]
    # keep only interesting paths
    return [f for f in files if f.startswith("_notifications/") or f.startswith("_news/") or f.startswith("_places/")]


def parse_frontmatter(path: str) -> dict:
    try:
        with open(path, "r", encoding="utf-8") as fh:
            txt = fh.read()
    except Exception as e:
        print(f"Failed to read {path}: {e}", file=sys.stderr)
        return {}
    m = FRONT_RE.match(txt)
    if not m:
        return {}
    try:
        return yaml.safe_load(m.group(1)) or {}
    except Exception as e:
        print(f"YAML parse error in {path}: {e}", file=sys.stderr)
        return {}


def slugify(s: str) -> str:
    s = str(s or "")
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s or "item"


def build_target_for_news(fm: dict, filepath: str) -> str:
    # Prefer explicit target_url in frontmatter
    raw = fm.get("target_url")
    if raw:
        raw = str(raw).strip()
        if raw.startswith("http://") or raw.startswith("https://"):
            return raw
        if raw.startswith("/"):
            return SITE_URL + raw
        return SITE_URL + "/" + raw
    # Otherwise construct anchor style: /news/#news-<slug>/
    slug = fm.get("id") or fm.get("slug") or os.path.splitext(os.path.basename(filepath))[0]
    s = slugify(slug)
    return f"{SITE_URL}/news/#news-{s}/"


def build_target_for_places(fm: dict, filepath: str) -> str:
    raw = fm.get("target_url")
    if raw:
        raw = str(raw).strip()
        if raw.startswith("http://") or raw.startswith("https://"):
            return raw
        if raw.startswith("/"):
            return SITE_URL + raw
        return SITE_URL + "/" + raw
    slug = fm.get("id") or fm.get("slug") or os.path.splitext(os.path.basename(filepath))[0]
    s = slugify(slug)
    # follow your example: /places/#/places/<slug>
    return f"{SITE_URL}/places/#/places/{s}"


def normalize_icon(img_field: Optional[str]) -> Optional[str]:
    if not img_field:
        return None
    img = str(img_field).strip()
    if img.startswith("http://") or img.startswith("https://"):
        return img
    if img.startswith("/"):
        return SITE_URL + img
    return SITE_URL + "/" + img


# Robust POST with retries
def post_with_retries(url: str, payload: dict, headers: dict, max_retries: int = 3):
    backoff = 1.0
    last_exc = None
    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=30)
            return resp
        except Exception as e:
            last_exc = e
            print(f"Attempt {attempt} failed: {e}", file=sys.stderr)
            time.sleep(backoff)
            backoff *= 2
    print("All attempts failed; last exception:", last_exc, file=sys.stderr)
    return None


def send_payload(url: str, payload: dict):
    headers = {
        "webpushrKey": WEBPUSHR_KEY,
        "webpushrAuthToken": WEBPUSHR_AUTH,
        "Content-Type": "application/json",
    }
    # Show full request in log for debugging
    print("=== Sending push ===")
    print("URL:", url)
    print("HEADERS:", json.dumps({k: v for k, v in headers.items() if k != "webpushrAuthToken"}, ensure_ascii=False))
    print("PAYLOAD:", json.dumps(payload, ensure_ascii=False))
    if DRY_RUN:
        print("DRY_RUN enabled — not actually sending.")
        return None

    resp = post_with_retries(url, payload, headers)
    if resp is None:
        print("No response (network error).", file=sys.stderr)
        return None

    # Print response details for debugging
    print("Response status:", resp.status_code)
    try:
        print("Response headers:", dict(resp.headers))
    except Exception:
        pass
    try:
        print("Response body:", resp.text)
    except Exception:
        pass

    # Non-2xx -> log as error but continue
    if resp.status_code < 200 or resp.status_code >= 300:
        print("Non-success HTTP status from Webpushr", resp.status_code, file=sys.stderr)
    return resp


# ---------------- handlers ----------------
def handle_notification_file(path: str):
    fm = parse_frontmatter(path)
    print("Notification frontmatter:", json.dumps(fm, ensure_ascii=False))
    send_now = fm.get("send_now", True) or fm.get("send_notification", False)
    if not send_now:
        print("send_now false — skipping", path)
        return

    title = fm.get("title") or "Patti Bytes"
    message = fm.get("message") or fm.get("preview") or title
    target = fm.get("target_url") or f"{SITE_URL}/"
    # normalize target (allow full url or path)
    target = target if target.startswith("http") else SITE_URL + (target if target.startswith("/") else ("/" + target))
    icon = normalize_icon(fm.get("image"))

    payload = {"title": title, "message": message, "target_url": target}
    # add image in multiple common fields to maximize compatibility
    if icon:
        payload["icon"] = icon
        payload["image"] = icon
        payload["thumbnail"] = icon

    audience = (fm.get("audience") or "all").lower()
    if audience == "all":
        send_payload("https://api.webpushr.com/v1/notification/send/all", payload)
    elif audience == "segment":
        seg = fm.get("segment_tag") or fm.get("segment")
        if not seg:
            print("Missing segment_tag — skipping", path)
            return
        payload["segment"] = seg
        send_payload("https://api.webpushr.com/v1/notification/send/segment", payload)
    elif audience == "specific":
        subs = fm.get("specific_subscribers") or []
        for item in subs:
            sid = item.get("subscriber") if isinstance(item, dict) else item
            if not sid:
                continue
            p = dict(payload)
            p["sid"] = str(sid)
            send_payload("https://api.webpushr.com/v1/notification/send/sid", p)
    else:
        print("Unknown audience:", audience)


def handle_content_file(path: str, coll: str):
    fm = parse_frontmatter(path)
    print(f"Content ({coll}) frontmatter:", json.dumps(fm, ensure_ascii=False))
    # Default behavior: send by default unless explicitly false
    send_flag = fm.get("send_notification") if "send_notification" in fm else fm.get("send_now", True)
    if send_flag is False:
        print("send_notification/send_now explicitly false — skipping", path)
        return

    title = fm.get("title") or "Patti Bytes"
    # push_message preferred; then preview; then title
    message = fm.get("push_message") or fm.get("message") or fm.get("preview") or title

    if coll == "news":
        target = build_target_for_news(fm, path)
    elif coll == "places":
        target = build_target_for_places(fm, path)
    else:
        target = SITE_URL + "/"

    icon = normalize_icon(fm.get("image"))

    payload = {"title": title, "message": message, "target_url": target}
    if icon:
        payload["icon"] = icon
        payload["image"] = icon
        payload["thumbnail"] = icon

    # Audience support
    audience = (fm.get("audience") or "all").lower()
    if audience == "all":
        send_payload("https://api.webpushr.com/v1/notification/send/all", payload)
    elif audience == "segment":
        seg = fm.get("segment_tag") or fm.get("segment")
        if not seg:
            print("Missing segment_tag — skipping", path)
            return
        payload["segment"] = seg
        send_payload("https://api.webpushr.com/v1/notification/send/segment", payload)
    elif audience == "specific":
        subs = fm.get("specific_subscribers") or []
        for item in subs:
            sid = item.get("subscriber") if isinstance(item, dict) else item
            if not sid:
                continue
            p = dict(payload)
            p["sid"] = str(sid)
            send_payload("https://api.webpushr.com/v1/notification/send/sid", p)
    else:
        print("Unknown audience:", audience)


# --------------- main ---------------
def main():
    files = git_changed_files(BEFORE, AFTER)
    if not files:
        print("No changed files to process.")
        return
    print("Changed files:", files)

    for f in files:
        if f.startswith("_notifications/"):
            handle_notification_file(f)
        elif f.startswith("_news/"):
            handle_content_file(f, "news")
        elif f.startswith("_places/"):
            handle_content_file(f, "places")
        else:
            print("Ignoring file:", f)

    print("Finished processing notifications.")


if __name__ == "__main__":
    main()
