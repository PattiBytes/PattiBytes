/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import Script from 'next/script';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

declare global {
  interface Window {
    google?: any;
  }
}

export default function GoogleOneTapButton() {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const renderedRef = useRef(false);

  const init = useCallback(async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId) {
      console.error('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID');
      toast.error('Google Client ID missing');
      return;
    }

    const google = window.google;
    if (!google?.accounts?.id) {
      console.error('Google GSI not available on window');
      return;
    }

    if (renderedRef.current) return; // prevent double render in React strict mode
    renderedRef.current = true;

    google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: any) => {
        try {
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: response.credential,
          });

          if (error) throw error;

          // session is now stored by supabase-js; AuthProvider will receive SIGNED_IN event
          console.log('Google sign-in ok:', data?.user?.id);
        } catch (e: any) {
          console.error(e);
          toast.error(e?.message || 'Google sign-in failed');
        }
      },
    });

    const el = document.getElementById('googleBtn');
    if (!el) {
      console.error('googleBtn element not found');
      return;
    }

    google.accounts.id.renderButton(el, {
      theme: 'outline',
      size: 'large',
      width: 360,
      text: 'continue_with',
    });

    // Optional:
    // google.accounts.id.prompt();
  }, []);

  useEffect(() => {
    if (scriptLoaded) void init();
  }, [scriptLoaded, init]);

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <div id="googleBtn" className="w-full mb-6 flex justify-center" />
    </>
  );
}
