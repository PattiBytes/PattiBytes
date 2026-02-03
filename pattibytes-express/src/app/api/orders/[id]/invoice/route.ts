/* eslint-disable @typescript-eslint/no-explicit-any */
import PDFDocument from 'pdfkit';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function money(n: any) {
  return `₹${Number(n || 0).toFixed(2)}`;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = params.id;

  const cookieStore = cookies();
  const supabase = createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return (await cookieStore).getAll();
        },
        setAll() {
          // no-op
        },
      },
    }
  );

  // Accept Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const { data: userRes, error: userErr } = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();

  const user = userRes?.user;
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { data: order, error: orderErr } = await (supabase.from('orders') as any)
    .select(
      `
      id,
      order_number,
      items,
      subtotal,
      discount,
      delivery_fee,
      tax,
      total_amount,
      payment_method,
      payment_status,
      status,
      promo_code,
      created_at,
      delivery_address,
      customer_phone,
      merchants:merchants (
        business_name,
        address,
        phone,
        gst_enabled,
        gst_percentage
      )
    `
    )
    .eq('id', id)
    .eq('customer_id', user.id)
    .single();

  if (orderErr || !order) {
    return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
  }

  // ... generate PDF exactly like you already do ...
  const merchant = Array.isArray(order.merchants) ? order.merchants?.[0] ?? null : order.merchants ?? null;
  const merchantName = merchant?.business_name || 'Restaurant';

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks: Buffer[] = [];
  doc.on('data', (c) => chunks.push(c));

  const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(merchantName);
    doc.moveDown(0.2);
    doc.fontSize(12).text(`INVOICE • Order #${order.order_number}`);
    doc.fontSize(10).fillColor('#555').text(`Placed: ${new Date(order.created_at).toLocaleString()}`);
    doc.fillColor('#000');
    doc.moveDown(1);

    // ... rest unchanged ...
    doc.end();
  });

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${order.order_number}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
