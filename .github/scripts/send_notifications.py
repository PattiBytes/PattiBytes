#!/usr/bin/env python3
"""
Send pushes when _notifications, _news or _places files change.
Called from GitHub Actions. Uses env vars:
 - WEBPUSHR_KEY (required)
 - WEBPUSHR_AUTH (required)
 - SITE_URL (required)
 - BEFORE_COMMIT (optional)
 - AFTER_COMMIT (required)
"""

import os, sys, re, json, subprocess, time
from typing import List
import requests
import yaml

WEBPUSHR_KEY = os.getenv('WEBPUSHR_KEY')
WEBPUSHR_AUTH = os.getenv('WEBPUSHR_AUTH')
SITE_URL = (os.getenv('SITE_URL') or '').rstrip('/')
BEFORE = os.getenv('BEFORE_COMMIT')
AFTER = os.getenv('AFTER_COMMIT') or os.getenv('GITHUB_SHA')

if not WEBPUSHR_KEY or not WEBPUSHR_AUTH or not SITE_URL:
    print("ERROR: Missing one of required env vars: WEBPUSHR_KEY, WEBPUSHR_AUTH, SITE_URL", file=sys.stderr)
    sys.exit(1)
if not AFTER:
    print("ERROR: AFTER_COMMIT not provided", file=sys.stderr)
    sys.exit(1)


FRONT_RE = re.compile(r'^---\s*\n(.*?\n)---\s*\n', re.S)

def git_changed_files(before: str, after: str) -> List[str]:
    try:
        if not before or re.match(r'^0+$', before):
            out = subprocess.check_output(['git', 'diff-tree', '--no-commit-id', '--name-only', '-r', after], text=True)
        else:
            out = subprocess.check_output(['git', 'diff', '--name-only', before, after], text=True)
        files = [l.strip() for l in out.splitlines() if l.strip()]
        # only those we care about
        files = [f for f in files if f.startswith('_notifications/') or f.startswith('_news/') or f.startswith('_places/')]
        return files
    except subprocess.CalledProcessError as e:
        print("git command failed:", e, file=sys.stderr)
        return []

def parse_frontmatter(path: str) -> dict:
    try:
        with open(path, 'r', encoding='utf-8') as fh:
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
    s = str(s or '')
    s = s.lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    s = s.strip('-')
    return s or 'item'

def build_target_url_for_collection(coll: str, fm: dict, filepath: str) -> str:
    # Use explicit target_url if provided
    raw = fm.get('target_url')
    if raw:
        raw = str(raw).strip()
        if raw.startswith('http://') or raw.startswith('https://'):
            return raw
        if raw.startswith('/'):
            return SITE_URL + raw
        return SITE_URL + '/' + raw

    # Otherwise build a sensible default from collection and slug/id/filename
    ident = fm.get('id') or fm.get('slug') or None
    if not ident:
        # fallback to filename without extension
        ident = os.path.splitext(os.path.basename(filepath))[0]
    if coll == 'news':
        return SITE_URL + '/news/' + slugify(ident)
    if coll == 'places':
        return SITE_URL + '/places/' + slugify(ident)
    # default
    return SITE_URL + '/'

def normalize_icon(img_field):
    if not img_field:
        return None
    img = str(img_field).strip()
    if img.startswith('http://') or img.startswith('https://'):
        return img
    if img.startswith('/'):
        return SITE_URL + img
    return SITE_URL + '/' + img

def send_post(url: str, payload: dict):
    headers = {
        "webpushrKey": WEBPUSHR_KEY,
        "webpushrAuthToken": WEBPUSHR_AUTH,
        "Content-Type": "application/json"
    }
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        print("POST", url)
        print("PAYLOAD:", json.dumps(payload, ensure_ascii=False))
        print("HTTP", resp.status_code, resp.text)
        return resp
    except Exception as e:
        print("Request error:", e, file=sys.stderr)
        return None

def handle_notification_file(path: str):
    fm = parse_frontmatter(path)
    print("Notification frontmatter:", json.dumps(fm, ensure_ascii=False))
    send_now = fm.get('send_now', True) or fm.get('send_notification', False)
    if not send_now:
        print("send_now false — skipping", path)
        return
    audience = (fm.get('audience') or 'all').lower()
    title = fm.get('title') or "Patti Bytes"
    message = fm.get('message') or fm.get('preview') or title
    target = build_target_url_for_collection('notification', fm, path)
    icon = normalize_icon(fm.get('image'))

    if audience == 'all':
        url = "https://api.webpushr.com/v1/notification/send/all"
        payload = {"title": title, "message": message, "target_url": target}
        if icon: payload["icon"] = icon
        send_post(url, payload)
    elif audience == 'segment':
        seg = fm.get('segment_tag') or fm.get('segment')
        if not seg:
            print("Missing segment_tag — skipping", path)
            return
        url = "https://api.webpushr.com/v1/notification/send/segment"
        payload = {"title": title, "message": message, "target_url": target, "segment": seg}
        if icon: payload["icon"] = icon
        send_post(url, payload)
    elif audience == 'specific':
        subs = fm.get('specific_subscribers') or []
        sids = []
        for item in subs:
            if isinstance(item, dict):
                v = item.get('subscriber')
            else:
                v = item
            if v:
                sids.append(str(v).strip())
        if not sids:
            print("No specific subscriber ids — skipping", path)
            return
        for sid in sids:
            url = "https://api.webpushr.com/v1/notification/send/sid"
            payload = {"title": title, "message": message, "target_url": target, "sid": sid}
            if icon: payload["icon"] = icon
            send_post(url, payload)
            time.sleep(0.5)
    else:
        print("Unknown audience:", audience)

def handle_content_file(path: str, coll: str):
    fm = parse_frontmatter(path)
    print(f"Content file ({coll}) frontmatter:", json.dumps(fm, ensure_ascii=False))
    # News uses 'send_notification', notifications use 'send_now'
    send_flag = fm.get('send_notification') or fm.get('send_now') or False
    if not send_flag:
        print("send_notification/send_now not true — skipping content file", path)
        return

    # Build title/message/target
    title = fm.get('title') or "Patti Bytes"
    message = fm.get('push_message') or fm.get('message') or fm.get('preview') or title
    target = build_target_url_for_collection(coll, fm, path)
    icon = normalize_icon(fm.get('image'))

    # Send to all by default (edit frontmatter to include audience/segment if needed)
    audience = (fm.get('audience') or 'all').lower()
    if audience == 'all':
        url = "https://api.webpushr.com/v1/notification/send/all"
        payload = {"title": title, "message": message, "target_url": target}
        if icon: payload["icon"] = icon
        send_post(url, payload)
    elif audience == 'segment':
        seg = fm.get('segment_tag') or fm.get('segment')
        if not seg:
            print("Missing segment_tag for content file — skipping", path)
            return
        url = "https://api.webpushr.com/v1/notification/send/segment"
        payload = {"title": title, "message": message, "target_url": target, "segment": seg}
        if icon: payload["icon"] = icon
        send_post(url, payload)
    elif audience == 'specific':
        subs = fm.get('specific_subscribers') or []
        sids = []
        for item in subs:
            if isinstance(item, dict):
                v = item.get('subscriber')
            else:
                v = item
            if v:
                sids.append(str(v).strip())
        if not sids:
            print("No subscriber IDs for specific audience — skipping", path)
            return
        for sid in sids:
            url = "https://api.webpushr.com/v1/notification/send/sid"
            payload = {"title": title, "message": message, "target_url": target, "sid": sid}
            if icon: payload["icon"] = icon
            send_post(url, payload)
            time.sleep(0.5)
    else:
        print("Unknown audience:", audience)

def main():
    files = git_changed_files(BEFORE, AFTER)
    if not files:
        print("No changed files to process.")
        return
    print("Changed files:", files)
    for f in files:
        if f.startswith('_notifications/'):
            handle_notification_file(f)
        elif f.startswith('_news/'):
            handle_content_file(f, 'news')
        elif f.startswith('_places/'):
            handle_content_file(f, 'places')
        else:
            print("Ignoring file:", f)
    print("Finished.")

if __name__ == '__main__':
    main()
