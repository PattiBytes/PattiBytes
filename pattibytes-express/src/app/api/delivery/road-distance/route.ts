/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Body = {
  merchantLat: number;
  merchantLon: number;
  customerLat: number;
  customerLon: number;
};

function toNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;

    const merchantLat = toNumber(body.merchantLat);
    const merchantLon = toNumber(body.merchantLon);
    const customerLat = toNumber(body.customerLat);
    const customerLon = toNumber(body.customerLon);

    if (merchantLat == null || merchantLon == null || customerLat == null || customerLon == null) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const key = process.env.LOCATIONIQ_API_KEY;
    if (!key) {
      return NextResponse.json({ error: 'Missing LOCATIONIQ_API_KEY' }, { status: 500 });
    }

    const base = process.env.LOCATIONIQ_DIRECTIONS_BASE_URL ?? 'https://us1.locationiq.com';
    const alternatives = 3;

    const url =
      `${base}/v1/directions/driving/` +
      `${merchantLon},${merchantLat};${customerLon},${customerLat}` +
      `?key=${encodeURIComponent(key)}` +
      `&overview=false&steps=false&alternatives=${alternatives}`;

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    }).finally(() => clearTimeout(t));

    const raw = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error: 'Routing failed',
          upstreamStatus: res.status,
          // keep details for debugging (LocationIQ error msg usually here)
          details: data,
          // helpful to confirm we hit the right endpoint
          meta: { base, alternatives },
        },
        { status: 502 }
      );
    }

    const routes = Array.isArray(data?.routes) ? data.routes : [];
    const metersList = routes
      .map((r: any) => Number(r?.distance))
      .filter((n: number) => Number.isFinite(n) && n > 0);

    if (!metersList.length) {
      return NextResponse.json({ error: 'Routing response missing distance', details: data }, { status: 502 });
    }

    // ✅ Mean distance if multiple routes exist
    const metersMean = metersList.reduce((a: number, b: number) => a + b, 0) / metersList.length;

    // Exact for calculations (don’t round early)
    const distanceKmRaw = metersMean / 1000;

    // Rounded only for display
    const distanceKm = round2(distanceKmRaw);

    return NextResponse.json({
      distanceKm,
      distanceKmRaw,
      metersMean,
      metersMin: Math.min(...metersList),
      metersMax: Math.max(...metersList),
      routesCount: metersList.length,
    });
  } catch (e: any) {
    const msg = e?.name === 'AbortError' ? 'Routing request timed out' : e?.message;
    return NextResponse.json({ error: msg || 'Server error' }, { status: 500 });
  }
}
