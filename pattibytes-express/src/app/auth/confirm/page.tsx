/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

type ConfirmState = 'idle' | 'working' | 'success' | 'error';

export default function AuthConfirmPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [state, setState] = useState<ConfirmState>('idle');
  const [message, setMessage] = useState<string>('');

  // Support both styles:
  // 1) Our custom template: token_hash + type
  const tokenHash = useMemo(() => sp.get('token_hash') || sp.get('tokenHash'), [sp]);
  const type = useMemo(() => (sp.get('type') || 'recovery') as any, [sp]);

  // 2) Supabase ConfirmationURL: code
  const code = useMemo(() => sp.get('code'), [sp]);

  useEffect(() => {
    // Auto-run once when user lands here
    const run = async () => {
      if (state === 'working') return;

      // If Supabase sent an error back in the URL, show it
      const error = sp.get('error');
      const errorDesc = sp.get('error_description');
      if (error) {
        setState('error');
        setMessage(errorDesc ? decodeURIComponent(errorDesc) : error);
        return;
      }

      setState('working');
      setMessage('');

      try {
        // A) code flow (from {{ .ConfirmationURL }})
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) throw exErr;

          setState('success');

          // If this is a recovery flow, go to reset page; otherwise go home/login as you want.
          if ((sp.get('type') || '').toLowerCase() === 'recovery') {
            router.replace('/auth/reset-password');
          } else {
            router.replace('/');
          }
          return;
        }

        // B) token_hash flow (recommended custom template)
        if (tokenHash) {
          const { error: vErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type, // e.g. 'recovery', 'magiclink', 'email', 'invite'
          });
          if (vErr) throw vErr;

          setState('success');

          if (String(type).toLowerCase() === 'recovery') {
            router.replace('/auth/reset-password');
          } else {
            router.replace('/');
          }
          return;
        }

        setState('error');
        setMessage('Invalid link (missing code/token).');
      } catch (e: any) {
        setState('error');
        setMessage(e?.message || 'Link invalid or expired');
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, tokenHash]);

  useEffect(() => {
    if (state === 'error' && message) toast.error(message);
  }, [state, message]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 space-y-3">
        <h1 className="text-2xl font-bold">Confirming...</h1>

        {state === 'working' && <p className="text-gray-600">Please wait while we validate your link.</p>}

        {state === 'success' && <p className="text-gray-600">Success! Redirecting…</p>}

        {state === 'error' && (
          <>
            <p className="text-gray-700">This link is invalid or expired.</p>
            {message && <p className="text-sm text-gray-500 break-words">{message}</p>}
            <button
              onClick={() => router.replace('/auth/forgot-password')}
              className="w-full bg-primary text-white rounded-lg py-3"
            >
              Request a new link
            </button>
          </>
        )}
      </div>
    </div>
  );
}
