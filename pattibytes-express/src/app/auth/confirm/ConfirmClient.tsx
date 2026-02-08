/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

type ConfirmState = 'working' | 'success' | 'error';

export default function ConfirmClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [state, setState] = useState<ConfirmState>('working');
  const [message, setMessage] = useState('');

  const code = useMemo(() => sp.get('code'), [sp]); // from {{ .ConfirmationURL }}
  const tokenHash = useMemo(() => sp.get('token_hash') || sp.get('tokenHash'), [sp]); // from custom template
  const type = useMemo(() => (sp.get('type') || 'recovery') as any, [sp]);

  useEffect(() => {
    const run = async () => {
      const err = sp.get('error');
      const errDesc = sp.get('error_description');
      if (err) {
        setState('error');
        setMessage(errDesc ? decodeURIComponent(errDesc) : err);
        return;
      }

      try {
        // A) code flow
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;

          setState('success');
          router.replace((String(type).toLowerCase() === 'recovery') ? '/auth/reset-password' : '/');
          return;
        }

        // B) token_hash flow
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;

          setState('success');
          router.replace((String(type).toLowerCase() === 'recovery') ? '/auth/reset-password' : '/');
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
        <h1 className="text-2xl font-bold">
          {state === 'working' ? 'Confirming…' : state === 'success' ? 'Success' : 'Link error'}
        </h1>

        {state === 'working' && <p className="text-gray-600">Please wait while we validate your link.</p>}

        {state === 'success' && <p className="text-gray-600">Redirecting…</p>}

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
