/* eslint-disable @typescript-eslint/no-explicit-any */
import PDFDocument from 'pdfkit';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type MerchantInfo = {
  business_name: string | null;
  address: string | null;
  phone: string | null;
  gst_enabled: boolean | null;
  gst_percentage: number | null;
};

function money(n: any) {
  return `₹${Number(n || 0).toFixed(2)}`;
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // no-op in route handler
        },
      },
    }
  );

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Ensure logged-in user is merchant
  const { data: merchantRow, error: merchantErr } = await supabase
    .from('merchants')
    .select('id')
    .eq('user_id', auth.user.id)
    .single();

  if (merchantErr || !merchantRow?.id) {
    return new Response(JSON.stringify({ error: 'Merchant profile not found' }), { status: 404 });
  }

  // Load order only if it belongs to this merchant
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select(
      `
      id,
      order_number,
      merchant_id,
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
    .eq('merchant_id', merchantRow.id)
    .single();

  if (orderErr || !order) {
    return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 });
  }

  // FIX: relation can be typed as array -> normalize
  const merchant: MerchantInfo | null = Array.isArray(order.merchants)
    ? (order.merchants?.[0] as any) ?? null
    : (order.merchants as any) ?? null;

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

    doc.fontSize(11).text('Delivery details', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).text(order.delivery_address || '-');
    doc.fontSize(10).text(`Phone: ${order.customer_phone || 'N/A'}`);
    doc.moveDown(1);

    doc.fontSize(11).text('Items', { underline: true });
    doc.moveDown(0.5);

    const items = Array.isArray(order.items) ? order.items : [];
    items.forEach((it: any, idx: number) => {
      const name = String(it?.name || `Item ${idx + 1}`);
      const qty = Number(it?.quantity || 0);
      const price = Number(it?.price || 0);
      const line = price * qty;

      doc.fontSize(10).text(`${idx + 1}. ${name}`);
      doc.fillColor('#555').text(`   ${money(price)} × ${qty} = ${money(line)}`);
      doc.fillColor('#000');
      doc.moveDown(0.2);
    });

    doc.moveDown(0.8);
    doc.fontSize(11).text('Payment summary', { underline: true });
    doc.moveDown(0.4);

    doc.fontSize(10).text(`Subtotal: ${money(order.subtotal)}`);
    if (Number(order.discount || 0) > 0) doc.fontSize(10).text(`Discount: -${money(order.discount)}`);
    doc.fontSize(10).text(`Delivery fee: ${money(order.delivery_fee)}`);
    doc.fontSize(10).text(`GST: ${money(order.tax)}`);
    doc.moveDown(0.2);
    doc.fontSize(12).text(`TOTAL: ${money(order.total_amount)}`, { underline: true });

    doc.moveDown(1);
    doc.fontSize(10)
      .fillColor('#555')
      .text(
        `Payment: ${String(order.payment_method || '').toUpperCase()} • ${String(order.payment_status || '').toUpperCase()}`
      );
    doc.fontSize(10).fillColor('#555').text(`Status: ${String(order.status || '').toUpperCase()}`);
    doc.fillColor('#000');

    doc.end();
  });

  // FIX: return Uint8Array (BodyInit-safe)
  const body = new Uint8Array(pdfBuffer);

  return new Response(body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${order.order_number}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
