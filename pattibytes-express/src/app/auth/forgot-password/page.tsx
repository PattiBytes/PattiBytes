'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { Mail, ArrowLeft, CheckCircle, Clock } from 'lucide-react';

const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOLDOWN_S  = 60;
const TIMEOUT_MS  = 15_000;

export default function ForgotPasswordPage() {
  const [email,    setEmail]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error,    setError]    = useState('');
  const [progress, setProgress] = useState(0);     // 0-100 fake progress bar
  const emailRef    = useRef<HTMLInputElement>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Fake progress bar while loading
  useEffect(() => {
    if (loading) {
      setProgress(5);
      progressRef.current = setInterval(() => {
        setProgress(p => p >= 85 ? 85 : p + Math.random() * 8);
      }, 400);
    } else {
      if (progressRef.current) clearInterval(progressRef.current);
      setProgress(sent ? 100 : 0);
    }
    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  }, [loading, sent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail)) { setError('Please enter a valid email address.'); emailRef.current?.focus(); return; }
    if (cooldown > 0 || loading) return;

    setError('');
    setLoading(true);

    // Timeout guard
    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      setError('Request timed out. Please check your connection and try again.');
    }, TIMEOUT_MS);

    try {
      const redirectTo = `${window.location.origin}/auth/reset-password`;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo });

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (resetErr) throw resetErr;

      setSent(true);
      setCooldown(COOLDOWN_S);
      toast.success('Reset link sent — check your inbox!');
    } catch (err: unknown) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as any).message) : null;
      setError(msg || 'Failed to send reset link. Please try again.');
      toast.error(msg || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4">
        <Link href="/auth/login" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary transition-colors font-medium text-sm">
          <ArrowLeft size={16} />Back to Login
        </Link>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-gray-100">
            <div
              className="h-1 transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
                backgroundColor: progress === 100 ? '#10B981' : 'var(--color-primary, #f97316)',
              }}
            />
          </div>

          <div className="p-8">
            {/* Icon */}
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 transition-colors ${sent ? 'bg-green-100' : 'bg-orange-100'}`}>
              {sent
                ? <CheckCircle className="text-green-600" size={28} />
                : <Mail className="text-primary" size={28} />
              }
            </div>

            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
              {sent ? 'Check Your Inbox' : 'Forgot Password?'}
            </h1>
            <p className="text-gray-500 text-sm text-center mb-6">
              {sent
                ? `We've sent a reset link to ${email.trim().toLowerCase()}`
                : "Enter your registered email to receive a secure reset link."}
            </p>

            {/* Steps indicator */}
            <div className="flex items-center justify-between mb-6">
              {['Email', 'Click Link', 'New Password'].map((s, i) => (
                <div key={s} className="flex items-center flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                    ${i === 0 && sent ? 'bg-green-500 text-white' :
                      i === 0 ? 'bg-primary text-white' :
                      'bg-gray-100 text-gray-400'}`}>
                    {i === 0 && sent ? '✓' : i + 1}
                  </div>
                  <div className="flex-1 text-center">
                    <p className={`text-[11px] font-semibold mt-1 ${i === 0 ? (sent ? 'text-green-600' : 'text-primary') : 'text-gray-400'}`}>{s}</p>
                  </div>
                  {i < 2 && <div className={`h-0.5 flex-1 ${i === 0 && sent ? 'bg-green-300' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>

            {!sent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <span className="text-red-500 text-sm">⚠️</span>
                    <p className="text-red-600 text-sm font-medium">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      ref={emailRef}
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); if (error) setError(''); }}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors outline-none ${error ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      inputMode="email"
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || cooldown > 0}
                  className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all hover:bg-orange-600 flex items-center justify-center gap-2"
                >
                  {loading && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  )}
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 text-center">
                  <p className="font-semibold mb-1">Sent successfully!</p>
                  <p className="text-green-600">Check your spam folder if you don&apos;t see it in 2 minutes.</p>
                </div>

                <button
                  onClick={() => { setSent(false); setProgress(0); }}
                  disabled={cooldown > 0}
                  className="w-full border border-gray-200 text-gray-700 py-3 rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  {cooldown > 0 && <Clock size={14} />}
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Try a different email'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

