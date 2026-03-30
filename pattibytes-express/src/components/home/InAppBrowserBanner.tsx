'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Copy, Check, X } from 'lucide-react';

type BrowserInfo = { detected: boolean; name: string; isIOS: boolean };

// ── Detect known in-app browsers ─────────────────────────────────────────────
function detectInAppBrowser(): BrowserInfo {
  if (typeof navigator === 'undefined') return { detected: false, name: '', isIOS: false };
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);

  // Order matters — most specific first
  if (/Instagram/i.test(ua))                          return { detected: true, name: 'Instagram',  isIOS };
  if (/FBAN|FBAV|FB_IAB|FBIOS|\[FB[^\]]*\]/i.test(ua)) return { detected: true, name: 'Facebook',  isIOS };
  if (/musical_ly|TikTok|BytedanceWebview/i.test(ua)) return { detected: true, name: 'TikTok',    isIOS };
  if (/TwitterAndroid|TwitteriPhone/i.test(ua))       return { detected: true, name: 'X / Twitter', isIOS };
  if (/LinkedInApp/i.test(ua))                        return { detected: true, name: 'LinkedIn',  isIOS };
  if (/Snapchat/i.test(ua))                           return { detected: true, name: 'Snapchat',  isIOS };
  if (/WhatsApp/i.test(ua))                           return { detected: true, name: 'WhatsApp',  isIOS };
  if (/Line\//i.test(ua))                             return { detected: true, name: 'LINE',       isIOS };
  if (/Threads/i.test(ua))                            return { detected: true, name: 'Threads',   isIOS };

  return { detected: false, name: '', isIOS };
}

// ── Try to open in system browser ────────────────────────────────────────────
function openInSystemBrowser(url: string, isIOS: boolean) {
  // Android Chrome: intent:// scheme
  if (!isIOS) {
    const intent = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = intent;
    return;
  }
  // iOS — no reliable deep link; fall back to copy + instruction
}

const DISMISS_KEY = 'pb_iab_banner_dismissed';

export default function InAppBrowserBanner() {
  const [browser, setBrowser] = useState<BrowserInfo>({ detected: false, name: '', isIOS: false });
  const [show,    setShow]    = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [url,     setUrl]     = useState('');

  useEffect(() => {
    const info = detectInAppBrowser();
    if (!info.detected) return;
    try { if (localStorage.getItem(DISMISS_KEY)) return; } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBrowser(info);
    setUrl(window.location.href);
    setShow(true);
  }, []);

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const handleOpenInBrowser = () => {
    if (!browser.isIOS) {
      openInSystemBrowser(url, false);
    }
    // iOS: just show the copy + instruction (no reliable way to force open)
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4">
      <div className="max-w-lg mx-auto bg-gray-900 text-white rounded-2xl shadow-2xl overflow-hidden border border-white/10">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">
              {browser.name} In-App Browser
            </p>
          </div>
          <button onClick={dismiss} aria-label="Close" className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-4 pb-4">
          <p className="text-sm font-bold text-white leading-snug">
            Open in your browser for the best experience
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {browser.name}&apos;s built-in browser blocks some features like install, payments, and camera.
          </p>

          <div className="mt-4 flex flex-col gap-2">
            {/* Android: try to open directly */}
            {!browser.isIOS && (
              <button
                onClick={handleOpenInBrowser}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Chrome
              </button>
            )}

            {/* iOS: copy URL + instruction */}
            {browser.isIOS && (
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-xs text-gray-300 mb-2 font-semibold">
                  Tap the <span className="text-white">⋯</span> menu → <span className="text-white">&quot;Open in Safari&quot;</span>
                </p>
                <p className="text-xs text-gray-400 mb-3">Or copy the link and paste it in Safari:</p>
                <button
                  onClick={handleCopy}
                  className="w-full inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-2.5 rounded-xl font-bold text-sm transition"
                >
                  {copied ? (
                    <><Check className="w-4 h-4 text-green-400" /> Copied!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copy Link</>
                  )}
                </button>
              </div>
            )}

            <button
              onClick={dismiss}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-300 py-1 transition"
            >
              Continue anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}