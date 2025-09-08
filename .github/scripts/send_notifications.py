#!/usr/bin/env python3
"""
Send notifications for files changed under _notifications/
This script is intended to be invoked from a GitHub Action step.
It reads env vars:
  - WEBPUSHR_KEY (required)
  - WEBPUSHR_AUTH (required)
  - SITE_URL (required)
  - BEFORE_COMMIT (git before ref) (optional)
  - AFTER_COMMIT (git after ref) (required)
"""

import os
import sys
import re
import json
import yaml
import subprocess
import requests
import time
from typing import List

# --- config / env ---
WEBPUSHR_KEY = os.getenv('WEBPUSHR_KEY')
WEBPUSHR_AUTH = os.getenv('WEBPUSHR_AUTH')
SITE_URL = (os.getenv('SITE_URL') or '').rstrip('/')
BEFORE = os.getenv('BEFORE_COMMIT')  # may be all-zero for initial commit
AFTER = os.getenv('AFTER_COMMIT') or os.getenv('GITHUB_SHA')

if not WEBPUSHR_KEY or not WEBPUSHR_AUTH or not SITE_URL:
    print("ERROR: missing required env vars: WEBPUSHR_KEY, WEBPUSHR_AUTH, SITE_URL", file=sys.stderr)
    sys.exit(1)

if not AFTER:
    print("ERROR: AFTER_COMMIT (or GITHUB_SHA) not provided", file=sys.stderr)
    sys.exit(1)

# --- helpers ---
def git_changed_files(before: str, after: str) -> List[str]:
    """Return list of changed files between two commits limited to _notifications/"""
    try:
        if not before or re.match(r'^0+$', before):
            # initial commit case - list files in after commit tree
            out = subprocess.check_output(['git', 'diff-tree', '--no-commit-id', '--name-only', '-r', after], text=True)
        else:
            out = subprocess.check_output(['git', 'diff', '--name-only', before, after], text=True)
        files = [line.strip() for line in out.splitlines() if line.strip()]
        # filter notifications directory
        files = [f for f in files if f.startswith('_notifications/')]
        return files
    except subprocess.CalledProcessError as e:
        print("git command failed:", e, file=sys.stderr)
        return []

FRONTMATTER_RE = re.compile(r'^---\s*\n(.*?\n)---\s*\n', re.S)

def parse_frontmatter(path: str) -> dict:
    try:
        with open(path, 'r', encoding='utf-8') as fh:
            txt = fh.read()
    except Exception as e:
        print(f"Failed to read {path}: {e}", file=sys.stderr)
        return {}
    m = FRONTMATTER_RE.match(txt)
    if not m:
        return {}
    try:
        return yaml.safe_load(m.group(1)) or {}
    except Exception as e:
        print(f"YAML parse error in {path}: {e}", file=sys.stderr)
        return {}

def build_target_url(raw):
    if not raw:
        return SITE_URL + '/'
    raw = str(raw).strip()
    if raw.startswith('http://') or raw.startswith('https://'):
        return raw
    if raw.startswith('/'):
        return SITE_URL + raw
    return SITE_URL + '/' + raw

def send_post(url: str, payload: dict):
    headers = {
        "webpushrKey": WEBPUSHR_KEY,
        "webpushrAuthToken": WEBPUSHR_AUTH,
        "Content-Type": "application/json"
    }
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        print("POST", url, "payload:", json.dumps(payload, ensure_ascii=False))
        print("HTTP", resp.status_code, resp.text)
        return resp
    except Exception as e:
        print("Request error for {}: {}".format(url, e), file=sys.stderr)
        return None

def normalize_icon(img_field):
    if not img_field:
        return None
    img = str(img_field).strip()
    if img.startswith('http://') or img.startswith('https://'):
        return img
    if img.startswith('/'):
        return SITE_URL + img
    return SITE_URL + '/' + img

# --- main ---
def main():
    files = git_changed_files(BEFORE, AFTER)
    if not files:
        print("No changed notification files - nothing to do.")
        return

    print("Found changed notification files:", files)

    for p in files:
        if not os.path.exists(p):
            print("Skipped (not found):", p)
            continue

        fm = parse_frontmatter(p)
        print("Processing:", p, "frontmatter:", json.dumps(fm, ensure_ascii=False))

        # support both names used in your config
        send_now = fm.get('send_now', True)
        # legacy/alternate key
        if not send_now and fm.get('send_notification') is True:
            send_now = True
        if not send_now:
            print("send_now false — skipping", p)
            continue

        audience = (fm.get('audience') or 'all').lower()
        title = fm.get('title') or "Patti Bytes"
        message = fm.get('message') or fm.get('push_message') or fm.get('preview') or title
        target = build_target_url(fm.get('target_url') or '/')
        icon = normalize_icon(fm.get('image'))

        if audience == 'all':
            url = "https://api.webpushr.com/v1/notification/send/all"
            payload = {"title": title, "message": message, "target_url": target}
            if icon:
                payload["icon"] = icon
            send_post(url, payload)

        elif audience == 'segment':
            seg = fm.get('segment_tag') or fm.get('segment')
            if not seg:
                print("No 'segment_tag' found — skipping segment send for", p)
                continue
            url = "https://api.webpushr.com/v1/notification/send/segment"
            payload = {"title": title, "message": message, "target_url": target, "segment": seg}
            if icon:
                payload["icon"] = icon
            send_post(url, payload)

        elif audience == 'specific':
            subs = fm.get('specific_subscribers') or []
            sids = []
            for item in subs:
                if isinstance(item, dict):
                    v = item.get('subscriber')
                else:
                    v = item
                if v is None:
                    continue
                sids.append(str(v).strip())
            if not sids:
                print("No subscriber IDs found — skipping specific send for", p)
                continue
            for sid in sids:
                url = "https://api.webpushr.com/v1/notification/send/sid"
                payload = {"title": title, "message": message, "target_url": target, "sid": sid}
                if icon:
                    payload["icon"] = icon
                send_post(url, payload)
                time.sleep(0.5)
        else:
            print("Unknown audience:", audience, " — skipping", p)

    print("Done.")

if __name__ == "__main__":
    main()
