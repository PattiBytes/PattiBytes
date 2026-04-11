/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef, useState } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type VerifyState = 'checking' | 'ready' | 'invalid' | 'done';

const VERIFY_TIMEOUT_MS = 30_000;
const UPDATE_TIMEOUT_MS = 20_000;

// ─── Strength ─────────────────────────────────────────────────────────────────
function getStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8)             s++;
  if (/[A-Z]/.test(pw))           s++;
  if (/[0-9]/.test(pw))           s++;
  if (/[^A-Za-z0-9]/.test(pw))   s++;
  const levels = [
    { label: 'Too short', color: '#EF4444', width: '15%' },
    { label: 'Weak',      color: '#EF4444', width: '25%' },
    { label: 'Fair',      color: '#F59E0B', width: '50%' },
    { label: 'Good',      color: '#3B82F6', width: '75%' },
    { label: 'Strong',    color: '#10B981', width: '100%' },
  ];
  return { ...levels[s], score: s };
}

/**
 * Extract tokens from URL hash — handles both:
 *  - /auth/reset-password#access_token=...  (Supabase email link)
 *  - /auth/reset-password?code=...          (PKCE flow)
 */
function extractHashTokens(): { access_token?: string; refresh_token?: string; type?: string } {
  if (typeof window === 'undefined') return {};
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  return {
    access_token:  params.get('access_token')  ?? undefined,
    refresh_token: params.get('refresh_token') ?? undefined,
    type:          params.get('type')          ?? undefined,
  };
}

export default function ResetPasswordPage() {
  const router = useRouter();

  const [verifyState, setVerifyState] = useState<VerifyState>('checking');
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [progress,    setProgress]    = useState(0);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIv = useRef<ReturnType<typeof setInterval> | null>(null);
  const strength   = getStrength(password);
  const pwMatches  = password === confirm && confirm.length > 0;

  // ── Verify session on mount ──────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    // 30s timeout: if no session found, mark invalid
    timerRef.current = setTimeout(() => {
      if (mounted && verifyState === 'checking') setVerifyState('invalid');
    }, VERIFY_TIMEOUT_MS);

    async function verify() {
      // 1. Try to exchange hash tokens for a session (implicit flow from email link)
      const { access_token, refresh_token, type } = extractHashTokens();
      if (access_token && refresh_token && type === 'recovery') {
        try {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!error && mounted) {
            if (timerRef.current) clearTimeout(timerRef.current);
            setVerifyState('ready');
            // Clean the hash from the URL bar
            window.history.replaceState(null, '', window.location.pathname);
            return;
          }
        } catch {}
      }

      // 2. Check for an existing active session (already exchanged / PKCE code)
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) {
        if (timerRef.current) clearTimeout(timerRef.current);
        setVerifyState('ready');
        return;
      }

      // 3. Fall through to auth state listener
    }

    verify();

    // 4. Listen for PASSWORD_RECOVERY event
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        if (timerRef.current) clearTimeout(timerRef.current);
        setVerifyState('ready');
      } else if (event === 'SIGNED_OUT') {
        setVerifyState('invalid');
      }
    });

    return () => {
      mounted = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      sub.subscription.unsubscribe();
    };
  }, []);

  // ── Fake progress bar ─────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) {
      setProgress(5);
      progressIv.current = setInterval(() => {
        setProgress(p => p >= 85 ? 85 : p + Math.random() * 6);
      }, 400);
    } else {
      if (progressIv.current) clearInterval(progressIv.current);
    }
    return () => { if (progressIv.current) clearInterval(progressIv.current); };
  }, [loading]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (password.length < 8)   { toast.error('Password must be at least 8 characters'); return; }
    if (password !== confirm)  { toast.error('Passwords do not match');                 return; }
    if (strength.score < 2)    { toast.error('Password is too weak — add numbers or symbols'); return; }

    setLoading(true);

    const hardTimeout = setTimeout(() => {
      setLoading(false);
      setProgress(0);
      toast.error('Update timed out. Please check your connection.');
    }, UPDATE_TIMEOUT_MS);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      clearTimeout(hardTimeout);
      if (error) throw error;

      setProgress(100);
      setVerifyState('done');
      toast.success('Password updated! Signing you out…');
      await supabase.auth.signOut();
      setTimeout(() => router.replace('/auth/login'), 1500);
    } catch (err: any) {
      clearTimeout(hardTimeout);
      const msg = err?.message ?? '';
      if (msg.toLowerCase().includes('session') || msg.toLowerCase().includes('expired')) {
        toast.error('Session expired. Please request a new reset link.');
        setTimeout(() => router.replace('/auth/forgot-password'), 2500);
      } else {
        toast.error(msg || 'Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  // ─── RENDER: checking ────────────────────────────────────────────────────
  if (verifyState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-white to-orange-50">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Lock className="text-primary" size={24} />
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">Verifying Reset Link</h2>
          <p className="text-sm text-gray-500 mb-6">Please wait while we validate your link…</p>
          {/* Skeleton bars */}
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded-full animate-pulse w-full" />
            <div className="h-3 bg-gray-100 rounded-full animate-pulse w-4/5 mx-auto" />
            <div className="h-3 bg-gray-100 rounded-full animate-pulse w-3/5 mx-auto" />
          </div>
          <p className="text-xs text-gray-400 mt-6">This usually takes under 5 seconds.</p>
        </div>
      </div>
    );
  }

  // ─── RENDER: invalid ─────────────────────────────────────────────────────
  if (verifyState === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-white to-orange-50">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 space-y-4 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">⏰</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Link Expired or Invalid</h1>
          <p className="text-sm text-gray-500">
            This password reset link has expired (links are valid for 1 hour) or has already been used.
          </p>
          <button
            onClick={() => router.replace('/auth/forgot-password')}
            className="w-full bg-primary text-white rounded-xl py-3 font-semibold text-sm hover:bg-orange-600 transition-colors"
          >
            Request a New Reset Link
          </button>
        </div>
      </div>
    );
  }

  // ─── RENDER: done ─────────────────────────────────────────────────────────
  if (verifyState === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 via-white to-orange-50">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 space-y-4 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle className="text-green-600" size={28} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Password Updated!</h1>
          <p className="text-sm text-gray-500">Redirecting you to login…</p>
        </div>
      </div>
    );
  }

  // ─── RENDER: form ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-gray-100">
            <div
              className="h-1 transition-all duration-300"
              style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#10B981' : 'var(--color-primary, #f97316)' }}
            />
          </div>

          <form onSubmit={onSubmit} className="p-8 space-y-5">
            <div className="text-center mb-2">
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="text-primary" size={24} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
              <p className="text-sm text-gray-500 mt-1">Choose a strong password you haven&apos;t used before.</p>
            </div>

            {/* New password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-colors"
                  placeholder="Min 8 characters"
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength meter */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: strength.width, backgroundColor: strength.color }} />
                  </div>
                  <p className="text-xs font-semibold" style={{ color: strength.color }}>{strength.label}</p>
                </div>
              )}

              {/* Requirements */}
              {password.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {[
                    { ok: password.length >= 8,           text: '8+ characters' },
                    { ok: /[A-Z]/.test(password),         text: 'Uppercase letter' },
                    { ok: /[0-9]/.test(password),         text: 'Number' },
                    { ok: /[^A-Za-z0-9]/.test(password),  text: 'Symbol (!@#…)' },
                  ].map(r => (
                    <p key={r.text} className={`text-xs font-medium ${r.ok ? 'text-green-600' : 'text-gray-400'}`}>
                      {r.ok ? '✓' : '○'} {r.text}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className={`w-full pl-9 pr-4 py-3 border rounded-xl text-sm focus:ring-2 focus:outline-none transition-colors
                    ${confirm.length > 0 ? (pwMatches ? 'border-green-400 focus:ring-green-200' : 'border-red-300 focus:ring-red-200') : 'border-gray-200 focus:ring-primary/30 focus:border-primary'}`}
                  placeholder="Re-enter password"
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />
                {confirm.length > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                    {pwMatches ? '✅' : '❌'}
                  </span>
                )}
              </div>
              {confirm.length > 0 && !pwMatches && (
                <p className="text-xs text-red-500 mt-1">Passwords don&apos;t match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !pwMatches || strength.score < 2}
              className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all hover:bg-orange-600 flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? 'Updating password…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
