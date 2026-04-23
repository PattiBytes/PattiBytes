/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!    // service role — server only
);

export async function POST(req: NextRequest) {
  try {
    const {
      userId,      // Supabase user ID (OneSignal external_id)
      userIds,     // optional array for broadcast
      title,
      message,
      type = 'system',
      data = {},
      url = '/',   // click-through URL
    } = await req.json();

    const appId  = process.env.ONESIGNAL_APP_ID!;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY!;

    if (!appId || !apiKey) {
      return NextResponse.json({ error: 'OneSignal not configured' }, { status: 503 });
    }

    // Build target — single user or multiple
    const targetIds: string[] = userIds ?? (userId ? [userId] : []);
    if (!targetIds.length) {
      return NextResponse.json({ error: 'No target userId(s)' }, { status: 400 });
    }

    const body: Record<string, any> = {
      app_id:          appId,
      target_channel:  'push',
      headings:        { en: title },
      contents:        { en: message },
      data:            { ...data, type, url },
      url,
      chrome_web_icon:  `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/icon-192.png`,
      chrome_web_badge: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/icon-192.png`,
      // ✅ Use external_id (= Supabase user ID) — no token management needed
      include_aliases: { external_id: targetIds },
      channel_for_external_user_ids: 'push',
    };

    const res = await fetch('https://api.onesignal.com/notifications', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Key ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error('[OneSignal] API error', result);
      return NextResponse.json({ error: result }, { status: res.status });
    }

    // Update notifications table: mark sent_push = true
    if (data?.notification_id) {
      await supabaseAdmin
        .from('notifications')
        .update({ sent_push: true })
        .eq('id', data.notification_id);
    }

    return NextResponse.json({ ok: true, id: result.id });
  } catch (e: any) {
    console.error('[/api/push]', e);
    return NextResponse.json({ error: e?.message ?? 'Internal error' }, { status: 500 });
  }
}

