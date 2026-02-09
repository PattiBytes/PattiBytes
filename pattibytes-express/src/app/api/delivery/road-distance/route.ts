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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;

    const merchantLat = toNumber(body.merchantLat);
    const merchantLon = toNumber(body.merchantLon);
    const customerLat = toNumber(body.customerLat);
    const customerLon = toNumber(body.customerLon);

    if (
      merchantLat == null ||
      merchantLon == null ||
      customerLat == null ||
      customerLon == null
    ) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const key = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;
    if (!key) {
      // This is exactly what you are seeing right now.
      return NextResponse.json({ error: 'Missing LOCATIONIQ_API_KEY' }, { status: 500 });
    }

    const base = process.env.LOCATIONIQ_DIRECTIONS_BASE_URL || 'https://us1.locationiq.com';

    const url =
      `${base}/v1/directions/driving/` +
      `${merchantLon},${merchantLat};${customerLon},${customerLat}` +
      `?key=${encodeURIComponent(key)}` +
      `&overview=false&steps=false` +
      `&alternatives=3`;

    const res = await fetch(url, { cache: 'no-store' });

    // safer parsing (LocationIQ can return non-JSON sometimes)
    const raw = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Routing failed', status: res.status, details: data },
        { status: 502 }
      );
    }

    // OSRM-style: routes[].distance is meters [web:19]
    const routes = Array.isArray(data?.routes) ? data.routes : [];
    const metersList = routes
      .map((r: any) => Number(r?.distance))
      .filter((n: number) => Number.isFinite(n) && n > 0);

    if (!metersList.length) {
      return NextResponse.json(
        { error: 'Routing response missing distance', details: data },
        { status: 502 }
      );
    }

    // Mean distance of all returned routes
    const metersMean =
      metersList.reduce((a: number, b: number) => a + b, 0) / metersList.length;

    const distanceKm = Math.round((metersMean / 1000) * 100) / 100;

    return NextResponse.json({
      distanceKm,
      metersMean,
      routesCount: metersList.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
