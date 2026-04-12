/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, ArrowRight, Shield } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type VerifyState = 'checking' | 'ready' | 'invalid' | 'done';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStrength(pw: string) {
  let s = 0;
  if (pw.length >= 8)           s++;
  if (/[A-Z]/.test(pw))         s++;
  if (/[0-9]/.test(pw))         s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const levels = [
    { label: 'Too short', color: '#EF4444', bg: 'bg-red-500',    width: '15%' },
    { label: 'Weak',      color: '#EF4444', bg: 'bg-red-500',    width: '25%' },
    { label: 'Fair',      color: '#F59E0B', bg: 'bg-amber-400',  width: '50%' },
    { label: 'Good',      color: '#3B82F6', bg: 'bg-blue-500',   width: '75%' },
    { label: 'Strong',    color: '#10B981', bg: 'bg-emerald-500',width: '100%'},
  ];
  return { ...levels[s], score: s };
}

function extractHashTokens() {
  if (typeof window === 'undefined') return {};
  const hash   = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  return {
    access_token:  params.get('access_token')  ?? undefined,
    refresh_token: params.get('refresh_token') ?? undefined,
    type:          params.get('type')          ?? undefined,
  };
}

// ─── Checking skeleton ────────────────────────────────────────────────────────
function CheckingScreen({ msg }: { msg: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(135deg,#fff7f3 0%,#fff 50%,#fff7f3 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center border border-orange-50">

          {/* Animated ring */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-orange-100 animate-ping opacity-30" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-200">
              <Shield className="text-white" size={32} />
            </div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying Reset Link</h2>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">{msg}</p>

          {/* Animated step dots */}
          <div className="flex items-center justify-center gap-3 mb-6">
            {['Validating token', 'Checking session', 'Preparing form'].map((step, i) => (
              <div key={step} className="flex flex-col items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full bg-orange-400"
                  style={{ animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite` }}
                />
                <span className="text-[10px] text-gray-400 whitespace-nowrap">{step}</span>
              </div>
            ))}
          </div>

          {/* Progress skeleton bars */}
          <div className="space-y-2.5">
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-200 via-orange-400 to-orange-200 rounded-full animate-shimmer"
                   style={{ backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite' }} />
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden w-4/5 mx-auto">
              <div className="h-full bg-gradient-to-r from-orange-200 via-orange-400 to-orange-200 rounded-full"
                   style={{ backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite 0.4s' }} />
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden w-3/5 mx-auto">
              <div className="h-full bg-gradient-to-r from-orange-200 via-orange-400 to-orange-200 rounded-full"
                   style={{ backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite 0.8s' }} />
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-6">⏱ Usually completes in under 5 seconds</p>
        </div>
      </div>

      {/* Keyframes injected inline */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
      `}</style>
    </div>
  );
}

// ─── Invalid screen ───────────────────────────────────────────────────────────
function InvalidScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(135deg,#fff7f3 0%,#fff 50%,#fff7f3 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center border border-red-50">

          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-100">
            <AlertCircle className="text-red-500" size={36} />
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Expired or Invalid</h1>
          <p className="text-sm text-gray-500 mb-2 leading-relaxed">
            This reset link has expired or has already been used.
          </p>
          <p className="text-xs text-gray-400 mb-8">
            Reset links are valid for <span className="font-semibold text-gray-600">1 hour</span> and
            can only be used once.
          </p>

          <button
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 text-white font-semibold text-sm py-3.5 rounded-2xl transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-orange-200"
            style={{ background: 'linear-gradient(135deg, #fb923c, #ea580c)' }}
          >
            Request a New Reset Link
            <ArrowRight size={16} />
          </button>

          <p className="text-xs text-gray-400 mt-5">
            Need help?{' '}
            <a href="mailto:support@pattibytes.com" className="text-orange-500 hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Done screen ──────────────────────────────────────────────────────────────
function DoneScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(135deg,#f0fdf4 0%,#fff 50%,#f0fdf4 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center border border-green-50">

          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-40" />
            <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
              <CheckCircle className="text-white" size={36} />
            </div>
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2">Password Updated!</h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Your password has been changed successfully.
            <br />Redirecting you to login…
          </p>

          <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-semibold">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Taking you to sign in…
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ResetPasswordPage() {
  const router = useRouter();

  const [verifyState, setVerifyState] = useState<VerifyState>('checking');
  const [verifyMsg,   setVerifyMsg]   = useState('Validating your reset link…');
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [showCf,      setShowCf]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [progress,    setProgress]    = useState(0);

  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIv  = useRef<ReturnType<typeof setInterval> | null>(null);
  /**
   * KEY FIX — doneRef prevents the SIGNED_OUT auth event (fired when we call
   * signOut() after a successful password update) from overwriting the 'done'
   * state with 'invalid', which was causing the "timed out" flash.
   */
  const doneRef    = useRef(false);
  const mountedRef = useRef(true);

  const strength  = getStrength(password);
  const pwMatches = password === confirm && confirm.length > 0;

  // ── Verify link on mount ─────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    // 15 s safety net — if nothing resolves, mark invalid
    timerRef.current = setTimeout(() => {
      if (mountedRef.current && !doneRef.current) {
        setVerifyState('invalid');
      }
    }, 15_000);

    async function verify() {
      // 1. Hash tokens (implicit recovery link from Supabase email)
      const { access_token, refresh_token, type } = extractHashTokens();
      if (access_token && refresh_token && type === 'recovery') {
        setVerifyMsg('Authenticating recovery session…');
        try {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!error && mountedRef.current) {
            clearTimeout(timerRef.current!);
            // Remove tokens from the URL bar
            window.history.replaceState(null, '', window.location.pathname);
            setVerifyState('ready');
            return;
          }
        } catch { /* fall through */ }
      }

      // 2. Existing valid session (PKCE already exchanged, or recent sign-in)
      setVerifyMsg('Checking active session…');
      const { data } = await supabase.auth.getSession();
      if (!mountedRef.current) return;
      if (data.session) {
        clearTimeout(timerRef.current!);
        setVerifyState('ready');
        return;
      }

      // 3. Waiting for PASSWORD_RECOVERY event from the Supabase client
      setVerifyMsg('Waiting for authentication event…');
    }

    verify();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;

      if (event === 'PASSWORD_RECOVERY' && session) {
        clearTimeout(timerRef.current!);
        setVerifyState('ready');
        return;
      }

      if (event === 'SIGNED_IN' && session) {
        // setSession() triggers SIGNED_IN rather than PASSWORD_RECOVERY on some
        // Supabase-js versions — handle both
        if (verifyState === 'checking') {
          clearTimeout(timerRef.current!);
          setVerifyState('ready');
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        // Only move to invalid if the reset is NOT already complete
        if (!doneRef.current) setVerifyState('invalid');
      }
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current!);
      sub.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Progress bar animation ────────────────────────────────────────────────
  useEffect(() => {
    if (loading) {
      setProgress(5);
      progressIv.current = setInterval(() => {
        setProgress(p => (p >= 85 ? 85 : p + Math.random() * 6));
      }, 400);
    } else {
      clearInterval(progressIv.current!);
    }
    return () => clearInterval(progressIv.current!);
  }, [loading]);

  // ── Submit ────────────────────────────────────────────────────────────────
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (password.length < 8)  { toast.error('Password must be at least 8 characters'); return; }
    if (password !== confirm)  { toast.error('Passwords do not match');               return; }
    if (strength.score < 2)   { toast.error('Password too weak — add numbers or symbols'); return; }

    setLoading(true);

    const hardTimeout = setTimeout(() => {
      setLoading(false);
      setProgress(0);
      toast.error('Request timed out. Check your connection and try again.');
    }, 20_000);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      clearTimeout(hardTimeout);
      if (error) throw error;

      // ← Mark done BEFORE signOut so SIGNED_OUT event is ignored
      doneRef.current = true;
      setProgress(100);
      setVerifyState('done');
      toast.success('Password changed successfully!');

      await supabase.auth.signOut();
      setTimeout(() => router.replace('/auth/login'), 2000);
    } catch (err: any) {
      clearTimeout(hardTimeout);
      const msg = (err?.message ?? '').toLowerCase();
      if (msg.includes('session') || msg.includes('expired') || msg.includes('invalid')) {
        toast.error('Session expired. Please request a new reset link.');
        setTimeout(() => router.replace('/auth/forgot-password'), 2500);
      } else {
        toast.error(err?.message || 'Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Route to sub-screens ──────────────────────────────────────────────────
  if (verifyState === 'checking') return <CheckingScreen msg={verifyMsg} />;
  if (verifyState === 'invalid')  return <InvalidScreen onRetry={() => router.replace('/auth/forgot-password')} />;
  if (verifyState === 'done')     return <DoneScreen />;

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
         style={{ background: 'linear-gradient(135deg,#fff7f3 0%,#fff 50%,#fff7f3 100%)' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-orange-50">

          {/* Progress bar */}
          <div className="h-1 bg-gray-100">
            <div
              className="h-1 transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
                background: progress === 100
                  ? 'linear-gradient(90deg,#10B981,#059669)'
                  : 'linear-gradient(90deg,#fb923c,#ea580c)',
              }}
            />
          </div>

          <form onSubmit={onSubmit} className="p-8 space-y-5">

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200"
                   style={{ background: 'linear-gradient(135deg,#fb923c,#ea580c)' }}>
                <Lock className="text-white" size={28} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
              <p className="text-sm text-gray-500 mt-1.5">
                Choose a strong password you haven&apos;t used before.
              </p>
            </div>

            {/* New password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none transition-all bg-gray-50 focus:bg-white"
                  placeholder="Minimum 8 characters"
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength meter */}
              {password.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: strength.width, backgroundColor: strength.color }}
                      />
                    </div>
                    <span className="text-xs font-semibold w-14 text-right" style={{ color: strength.color }}>
                      {strength.label}
                    </span>
                  </div>

                  {/* Requirements checklist */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                    {[
                      { ok: password.length >= 8,           text: '8+ characters' },
                      { ok: /[A-Z]/.test(password),         text: 'Uppercase letter' },
                      { ok: /[0-9]/.test(password),         text: 'Number' },
                      { ok: /[^A-Za-z0-9]/.test(password),  text: 'Symbol (!@#…)' },
                    ].map(r => (
                      <p
                        key={r.text}
                        className={`text-xs font-medium flex items-center gap-1 transition-colors ${
                          r.ok ? 'text-emerald-600' : 'text-gray-400'
                        }`}
                      >
                        <span className="text-[11px]">{r.ok ? '✓' : '○'}</span>
                        {r.text}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type={showCf ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className={`w-full pl-10 pr-11 py-3 border rounded-2xl text-sm outline-none transition-all bg-gray-50 focus:bg-white focus:ring-2 ${
                    confirm.length === 0
                      ? 'border-gray-200 focus:ring-orange-300 focus:border-orange-400'
                      : pwMatches
                        ? 'border-emerald-400 focus:ring-emerald-200 bg-emerald-50/30'
                        : 'border-red-300 focus:ring-red-200 bg-red-50/20'
                  }`}
                  placeholder="Re-enter your password"
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowCf(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showCf ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirm.length > 0 && (
                <p className={`text-xs mt-1.5 font-medium ${pwMatches ? 'text-emerald-600' : 'text-red-500'}`}>
                  {pwMatches ? '✓ Passwords match' : '✗ Passwords don\'t match'}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !pwMatches || strength.score < 2}
              className="w-full text-white font-semibold py-3.5 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#fb923c,#ea580c)' }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Updating password…
                </>
              ) : (
                <>
                  Update Password
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-400 pt-1">
              Remember your password?{' '}
              <a href="/auth/login" className="text-orange-500 font-semibold hover:underline">
                Sign in
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
