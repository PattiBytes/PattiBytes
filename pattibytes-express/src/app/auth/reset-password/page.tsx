'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

type ReadyState = 'checking' | 'ready' | 'invalid';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [readyState, setReadyState] = useState<ReadyState>('checking');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      // After /auth/confirm completes, there should be a session in the browser.
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        setReadyState('invalid');
        return;
      }

      setReadyState(data.session ? 'ready' : 'invalid');
    };

    check();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setReadyState(session ? 'ready' : 'invalid');
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success('Password updated. Please login again.');
      await supabase.auth.signOut();
      router.replace('/auth/login');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (readyState === 'checking') {
    return <div className="min-h-screen flex items-center justify-center p-4">Checking link…</div>;
  }

  if (readyState === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 space-y-3">
          <h1 className="text-2xl font-bold">Invalid or expired link</h1>
          <p className="text-gray-600">Please request a new password reset email.</p>
          <button
            onClick={() => router.replace('/auth/forgot-password')}
            className="w-full bg-primary text-white rounded-lg py-3"
          >
            Go to Forgot Password
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-2xl font-bold">Set new password</h1>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password"
          className="w-full border rounded-lg px-3 py-2"
          required
          autoComplete="new-password"
        />

        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          className="w-full border rounded-lg px-3 py-2"
          required
          autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white rounded-lg py-2 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
