import { supabase } from './supabase'

const API_BASE = 'https://pbexpress.pattibytes.com'

export type NotifyPayload = {
  userId:     string
  orderId:    string
  orderNum:   string | number | null
  merchantId: string | null
  isMulti?:   boolean
  orderIds?:  string[]
}

/**
 * Three-pronged push strategy:
 * 1. POST to /api/notify (server-side fan-out → Expo + Web Push)
 * 2. Direct Expo Push fallback if (1) fails or returns non-OK
 * 3. Update sent_push = true on the notifications row
 */
export async function notifyOrderPlaced(p: NotifyPayload): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  const jwt = session?.access_token
  if (!jwt) {
    console.warn('[notifyOrderPlaced] No JWT — push skipped')
    return
  }

  const num = p.orderNum ?? p.orderId.slice(0, 8)

  const notifData = {
    orderId:      p.orderId,
    orderIds:     p.orderIds ?? [p.orderId],
    orderNumber:  num,
    status:       'pending',
    type:         'new_order',
    sound:        'order',
    url: `https://pbexpress.pattibytes.com/customer/orders/${p.orderId}`,
    forwarded_from: p.userId,
  }

  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${jwt}`,
  }

  // ── 1. Customer push via /api/notify ─────────────────────────────────────
  const customerPromise = async () => {
    const res = await fetch(`${API_BASE}/api/notify`, {
      method: 'POST', headers,
      body: JSON.stringify({
        targetUserId: p.userId,
        title:   `[CUSTOMER] 🎉 Order Placed!`,
        message: `Your order #${num} has been placed.`,
        type:    'new_order',
        data:    notifData,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.warn('[notifyOrderPlaced] /api/notify customer failed:', res.status, text)
      // ── Fallback: direct Expo Push ──────────────────────────────────────
      await directExpoPush(p.userId, {
        title: `🎉 Order #${num} Placed!`,
        body:  `Your order has been placed and is being processed.`,
        data:  notifData,
      })
    }

    // Mark sent_push = true on notification row
    await supabase
      .from('notifications')
      .update({ sent_push: true })
      .eq('data->>orderId', p.orderId)
      .eq('user_id', p.userId)
      .eq('sent_push', false)
  }

  // ── 2. Merchant push ─────────────────────────────────────────────────────
  const merchantPromise = async () => {
    if (!p.merchantId) return
    const { data: m } = await supabase
      .from('merchants')
      .select('user_id')
      .eq('id', p.merchantId)
      .maybeSingle()
    if (!m?.user_id) return

    await fetch(`${API_BASE}/api/notify`, {
      method: 'POST', headers,
      body: JSON.stringify({
        targetUserId: m.user_id,
        title:   `🔔 New Order #${num}`,
        message: `A new order has been placed. Please confirm it.`,
        type:    'new_order',
        data:    notifData,
      }),
    }).catch(e => console.warn('[notifyOrderPlaced] merchant notify fail', e.message))
  }

  // ── 3. Admin / superadmin push ───────────────────────────────────────────
  const adminPromise = async () => {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'superadmin'])
      .eq('is_active', true)
    if (!admins?.length) return

    await Promise.allSettled(
      admins.map(({ id }) =>
        fetch(`${API_BASE}/api/notify`, {
          method: 'POST', headers,
          body: JSON.stringify({
            targetUserId: id,
            title:   `🛎 New Order #${num}`,
            message: `A new ${p.merchantId ? 'restaurant' : 'custom/store'} order was placed.`,
            type:    'new_order',
            data:    { ...notifData, forwarded_from: p.userId },
          }),
        }).catch(() => {})
      )
    )
  }

  await Promise.allSettled([customerPromise(), merchantPromise(), adminPromise()])
}

// ─── Direct Expo Push fallback ────────────────────────────────────────────────
async function directExpoPush(
  userId: string,
  payload: { title: string; body: string; data: object },
) {
  // Look up all push tokens for this user
  const { data: tokens } = await supabase
    .from('profiles')
    .select('expo_push_token, push_token, fcm_token')
    .eq('id', userId)
    .maybeSingle()

  const expoToken = tokens?.expo_push_token ?? tokens?.push_token
  if (!expoToken?.startsWith('ExponentPushToken[')) {
    console.warn('[directExpoPush] No valid Expo token for', userId)
    return
  }

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      to:    expoToken,
      title: payload.title,
      body:  payload.body,
      data:  payload.data,
      sound: 'default',
      priority: 'high',
      channelId: 'orders',
    }),
  })

  const json = await res.json().catch(() => ({}))
  if (json?.data?.status === 'error') {
    console.warn('[directExpoPush] Expo returned error:', json.data.details)
    // If DeviceNotRegistered, clear the stale token
    if (json.data.details?.error === 'DeviceNotRegistered') {
      await supabase
        .from('profiles')
        .update({ expo_push_token: null, push_token: null })
        .eq('id', userId)
    }
  }
}