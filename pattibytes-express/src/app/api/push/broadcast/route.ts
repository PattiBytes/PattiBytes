import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { segment, title, message, data = {}, url = '/admin/dashboard' } = await req.json();

  // Allowed segments configured in OneSignal dashboard
  // e.g. "Admins", "Superadmins", "Merchants"
  const validSegments = ['Admins', 'Superadmins', 'Merchants', 'All'];
  if (!validSegments.includes(segment)) {
    return NextResponse.json({ error: 'Invalid segment' }, { status: 400 });
  }

  const res = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${process.env.ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify({
      app_id:         process.env.ONESIGNAL_APP_ID,
      target_channel: 'push',
      included_segments: [segment],
      headings:  { en: title },
      contents:  { en: message },
      data:      { ...data, url },
      url,
    }),
  });

  const result = await res.json();
  if (!res.ok) return NextResponse.json({ error: result }, { status: res.status });
  return NextResponse.json({ ok: true, id: result.id });
}

