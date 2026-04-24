import Constants       from 'expo-constants'
import * as Device     from 'expo-device'
import { Platform, AppState, AppStateStatus } from 'react-native'
import AsyncStorage    from '@react-native-async-storage/async-storage'
import { supabase }    from './supabase'

// ─── Environment ──────────────────────────────────────────────────────────────

export const isExpoGo =
  Constants.appOwnership === 'expo' ||
  (Constants as any).executionEnvironment === 'storeClient'

export const canUsePush = Device.isDevice && !isExpoGo

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'new_order'
  | 'order_update'
  | 'order_cancelled'
  | 'promo'
  | 'system'
  | 'driver_assigned'
  | 'payment'
  | 'review_request'
  | 'multi_order'

export type NotificationTarget =
  | 'customer'
  | 'merchant'
  | 'driver'
  | 'admins'
  | 'all'

// ─── Storage key ──────────────────────────────────────────────────────────────

const PUSH_TOKEN_KEY = 'pb_push_token'
let _registrationInProgress = false

export function resetPushRegistration() {
  _registrationInProgress = false
  AsyncStorage.removeItem(PUSH_TOKEN_KEY).catch(() => {})
}

// ─── Lazy-load expo-notifications ─────────────────────────────────────────────

function getNotif() {
  if (!canUsePush) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as typeof import('expo-notifications')
  } catch {
    return null
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initNotificationHandler() {
  const N = getNotif()
  if (!N) return

  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert:  true,
      shouldPlaySound:  true,
      shouldSetBadge:   true,
      shouldShowBanner: true,
      shouldShowList:   true,
    }),
  })
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function registerForPushNotifications(
  userId: string,
): Promise<string | null> {
  const N = getNotif()
  if (!N) {
    console.log('[push] Skipping registration: not a physical device or Expo Go')
    return null
  }

  if (_registrationInProgress) return null
  _registrationInProgress = true

  try {
    // ── Check if we have a cached token ──────────────────────────────────────
    const cached = await AsyncStorage.getItem(PUSH_TOKEN_KEY)
    if (cached) {
      // Re-upsert to keep is_active = true and updated_at fresh
      const { error } = await supabase.from('push_tokens').upsert(
        {
          user_id:         userId,
          expo_push_token: cached,
          platform:        Platform.OS,
          device_id:       Device.deviceName ?? null,
          is_active:       true,
          updated_at:      new Date().toISOString(),
        },
        { onConflict: 'expo_push_token' },
      )
      if (error) console.warn('[push] Cached token upsert error:', error.message)
      else console.log('[push] Re-registered cached token:', cached.slice(0, 30))
      return cached
    }

    // ── Request permission ────────────────────────────────────────────────────
    const { status: existing } = await N.getPermissionsAsync()
    let finalStatus = existing

    if (existing !== 'granted') {
      const { status } = await N.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      console.log('[push] Permission not granted — status:', finalStatus)
      return null
    }

    // ── Get Expo push token ───────────────────────────────────────────────────
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId

    if (!projectId) {
      console.warn('[push] No EAS projectId found in app config')
    }

    const tokenData = await N.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )
    const token = tokenData.data
    if (!token) {
      console.warn('[push] getExpoPushTokenAsync returned empty token')
      return null
    }

    // ── Android notification channels ─────────────────────────────────────────
    if (Platform.OS === 'android') {
      await Promise.all([
        N.setNotificationChannelAsync('default', {
          name:             'General',
          importance:       N.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor:       '#FF6B00',
          sound:            'default',
        }),
        N.setNotificationChannelAsync('orders', {
          name:             'Order Updates',
          importance:       N.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor:       '#FF6B00',
          sound:            'default',
        }),
        N.setNotificationChannelAsync('promotions', {
          name:             'Promotions & Offers',
          importance:       N.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 100],
          lightColor:       '#22C55E',
          sound:            'default',
        }),
      ])
    }

    // ── Save to push_tokens table ─────────────────────────────────────────────
    const { error: tokenError } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id:         userId,
          expo_push_token: token,
          platform:        Platform.OS,
          device_id:       Device.deviceName ?? null,
          is_active:       true,
          updated_at:      new Date().toISOString(),
        },
        { onConflict: 'expo_push_token' },
      )
    if (tokenError) console.warn('[push] Token upsert error:', tokenError.message)

    // ── Save to profiles table ────────────────────────────────────────────────
    await supabase
      .from('profiles')
      .update({
        push_token:            token,
        push_token_platform:   Platform.OS,
        push_token_updated_at: new Date().toISOString(),
        expo_push_token:       token,
      })
      .eq('id', userId)

    // ── Cache locally ─────────────────────────────────────────────────────────
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token)
    console.log('[push] ✓ Registered new token:', token.slice(0, 40))
    return token

  } catch (e: any) {
    console.error('[push] Registration error:', e?.message)
    return null
  } finally {
    _registrationInProgress = false
  }
}

// ─── Deregister on logout ─────────────────────────────────────────────────────

export async function deregisterPushToken(userId: string): Promise<void> {
  const N = getNotif()
  try {
    const cached = await AsyncStorage.getItem(PUSH_TOKEN_KEY)
    const token  = cached ?? (N ? (await N.getExpoPushTokenAsync(
      Constants.expoConfig?.extra?.eas?.projectId
        ? { projectId: Constants.expoConfig.extra.eas.projectId }
        : undefined,
    ).catch(() => ({ data: null }))).data : null)

    if (token) {
      await Promise.all([
        supabase
          .from('push_tokens')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('expo_push_token', token)
          .eq('user_id', userId),
        supabase
          .from('profiles')
          .update({
            push_token:            null,
            expo_push_token:       null,
            push_token_platform:   null,
            push_token_updated_at: new Date().toISOString(),
          })
          .eq('id', userId),
      ])
      console.log('[push] Deregistered token for user', userId.slice(0, 8))
    }
  } catch (e: any) {
    console.warn('[push] Deregister error (non-fatal):', e?.message)
  } finally {
    resetPushRegistration()
  }
}

// ─── getUserPushTokens ────────────────────────────────────────────────────────

export async function getUserPushTokens(userId: string): Promise<string[]> {
  if (!userId) return []
  try {
    const { data: rows } = await supabase
      .from('push_tokens')
      .select('expo_push_token')
      .eq('user_id', userId)
      .eq('is_active', true)
      .not('expo_push_token', 'is', null)

    if (rows?.length) {
      return (rows as any[])
        .map(r => r.expo_push_token as string)
        .filter(t => t?.startsWith('ExponentPushToken['))
    }

    // Fallback to profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('expo_push_token, push_token')
      .eq('id', userId)
      .single()

    const token = profile?.expo_push_token ?? profile?.push_token
    return token?.startsWith('ExponentPushToken[') ? [token] : []
  } catch (e: any) {
    console.warn('[push] getUserPushTokens error:', e?.message)
    return []
  }
}

// ─── Pref check ───────────────────────────────────────────────────────────────

async function userWantsNotification(
  userId: string,
  type:   NotificationType | string,
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('notification_prefs, is_active, account_status')
      .eq('id', userId)
      .single()

    if (!data) return false
    if (data.account_status === 'banned') return false
    if (data.is_active === false) return false

    const prefs = data.notification_prefs as Record<string, boolean> | null
    if (!prefs) return true

    const prefKey: Record<string, string> = {
      new_order:       'order_updates',
      order_update:    'order_updates',
      order_cancelled: 'order_updates',
      driver_assigned: 'order_updates',
      review_request:  'order_updates',
      multi_order:     'order_updates',
      payment:         'order_updates',
      order:           'order_updates',
      promo:           'promos',
      system:          'system',
    }

    const key = prefKey[type] ?? 'system'
    return prefs[key] !== false
  } catch {
    return true
  }
}

// ─── MAIN ENTRY POINT ─────────────────────────────────────────────────────────
/**
 * createAndSendNotification
 *
 * INSERTS a row into the notifications table.
 * The Supabase Edge Function (send-push-notification) fires automatically
 * via DB Webhook on INSERT — it handles all Expo + OneSignal push delivery.
 *
 * This function does NOT call Expo directly — no push from the client.
 */
export async function createAndSendNotification(params: {
  userId:         string
  title:          string
  body:           string
  type:           NotificationType | string
  data?:          Record<string, any>
  channelId?:     string
  skipPrefCheck?: boolean
}): Promise<string | null> {
  const { userId, title, body, type, data, channelId, skipPrefCheck } = params

  if (!userId) return null

  // ── Preference gate (client-side fast check) ──────────────────────────────
  if (!skipPrefCheck) {
    const wants = await userWantsNotification(userId, type)
    if (!wants) {
      if (__DEV__) console.log(`[push] Pref-blocked: ${userId.slice(0, 8)} / ${type}`)
      return null
    }
  }

  try {
    const { data: row, error } = await supabase
      .from('notifications')
      .insert({
        user_id:    userId,
        title,
        message:    body,
        body,
        type,
        data: {
          ...(data ?? {}),
          channelId:      channelId ?? 'orders',
          skipPrefCheck:  skipPrefCheck ?? false,  // ← passed to Edge Function
        },
        is_read:    false,
        sent_push:  false,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      console.warn('[push] Notification insert error:', error.message)
      return null
    }

    const notifId = row?.id ?? null

    if (__DEV__) {
      console.log(
        `[push] ✓ Inserted notification ${notifId?.slice(0, 8)} ` +
        `→ ${userId.slice(0, 8)} type=${type}` +
        ` (Edge Function will fire push)`,
      )
    }

    return notifId
  } catch (e: any) {
    console.warn('[push] createAndSendNotification error:', e?.message)
    return null
  }
}

// ─── notifyUser (kept for backward compat — now delegates to insert) ──────────

export async function notifyUser(
  userId:  string,
  title:   string,
  body:    string,
  data?:   Record<string, any>,
  opts?: {
    notificationId?: string
    channelId?:      string
    skipPrefCheck?:  boolean
    type?:           NotificationType
  },
): Promise<void> {
  // If we already have a notificationId, the row exists — just log
  // (Edge Function will have already fired or is about to)
  if (opts?.notificationId) {
    if (__DEV__) console.log('[push] notifyUser: row already exists', opts.notificationId.slice(0, 8))
    return
  }

  // Otherwise insert a new row (triggers push via Edge Function)
  await createAndSendNotification({
    userId,
    title,
    body,
    type:          opts?.type ?? 'system',
    data,
    channelId:     opts?.channelId,
    skipPrefCheck: opts?.skipPrefCheck,
  })
}

// ─── Domain helpers ───────────────────────────────────────────────────────────

export async function notifyOrderPlaced(
  customerId: string,
  orderId:    string,
  orderNum:   string | number | null,
  merchantId: string | null,
): Promise<void> {
  const num = orderNum ?? orderId.slice(0, 8)

  const baseData = {
    type:         'new_order',
    order_id:     orderId,
    orderId,
    order_number: num,
    status:       'pending',
    url:          `https://pbexpress.pattibytes.com/customer/orders/${orderId}`,
  }

  const customerTask = createAndSendNotification({
    userId:    customerId,
    title:     '🎉 Order Placed!',
    body:      `Your order #${num} has been placed. We'll confirm it shortly.`,
    type:      'new_order',
    data:      baseData,
    channelId: 'orders',
  })

  const merchantTask = async () => {
    if (!merchantId || !isValidUUID(merchantId)) return
    const { data: m } = await supabase
      .from('merchants')
      .select('user_id, name')
      .eq('id', merchantId)
      .maybeSingle()
    if (!m?.user_id) return
    await createAndSendNotification({
      userId:        m.user_id,
      title:         `🔔 New Order #${num}`,
      body:          `A new order at ${m.name ?? 'your restaurant'}. Tap to confirm.`,
      type:          'new_order',
      data:          { ...baseData, forwarded_from: customerId, merchant_id: merchantId },
      channelId:     'orders',
      skipPrefCheck: true,
    })
  }

  const adminTask = async () => {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'superadmin'])
      .eq('is_active', true)
    if (!admins?.length) return
    await Promise.allSettled(
      (admins as { id: string }[]).map(a =>
        createAndSendNotification({
          userId:        a.id,
          title:         `📋 New Order #${num}`,
          body:          `A new order has been placed.`,
          type:          'new_order',
          data:          { ...baseData, forwarded_from: customerId },
          channelId:     'orders',
          skipPrefCheck: true,
        }),
      ),
    )
  }

  await Promise.allSettled([customerTask, merchantTask(), adminTask()])
}

export async function notifyMultiCartSession(params: {
  customerId:    string
  sessionId:     string
  placedOrders:  { id: string; order_number?: number | null; merchant_id?: string | null }[]
  merchantNames: string[]
  grandTotal:    number
}): Promise<void> {
  const { customerId, sessionId, placedOrders, merchantNames, grandTotal } = params
  const orderCount = placedOrders.length
  const namesStr   = merchantNames.slice(0, 3).join(', ') +
                     (merchantNames.length > 3 ? ` +${merchantNames.length - 3} more` : '')

  const sessionData = {
    type:            'multi_order',
    cart_session_id: sessionId,
    order_ids:       placedOrders.map(o => o.id),
    order_numbers:   placedOrders.map(o => o.order_number ?? o.id.slice(0, 8)),
    order_count:     orderCount,
    total_amount:    grandTotal,
    status:          'pending',
    is_multi:        true,
  }

  const customerTask = createAndSendNotification({
    userId:    customerId,
    title:     `🎉 ${orderCount} Order${orderCount > 1 ? 's' : ''} Placed!`,
    body:      `From ${namesStr}. Total ₹${grandTotal.toFixed(2)}.`,
    type:      'multi_order',
    data:      sessionData,
    channelId: 'orders',
  })

  const merchantTask = async () => {
    await Promise.allSettled(
      placedOrders.map(async o => {
        if (!o.merchant_id || !isValidUUID(o.merchant_id)) return
        const num = o.order_number ?? o.id.slice(0, 8)
        const { data: m } = await supabase
          .from('merchants').select('user_id, name').eq('id', o.merchant_id).maybeSingle()
        if (!m?.user_id) return
        await createAndSendNotification({
          userId:        m.user_id,
          title:         `🔔 New Order #${num}`,
          body:          `Part of a multi-restaurant order. Tap to confirm.`,
          type:          'new_order',
          data: {
            type:            'new_order',
            order_id:        o.id,
            orderId:         o.id,
            order_number:    num,
            cart_session_id: sessionId,
            is_multi:        true,
            status:          'pending',
          },
          channelId:     'orders',
          skipPrefCheck: true,
        })
      }),
    )
  }

  const adminTask = async () => {
    const { data: admins } = await supabase
      .from('profiles').select('id').in('role', ['admin', 'superadmin']).eq('is_active', true)
    if (!admins?.length) return
    const firstNum = placedOrders[0]?.order_number ?? placedOrders[0]?.id?.slice(0, 8)
    await Promise.allSettled(
      (admins as { id: string }[]).map(a =>
        createAndSendNotification({
          userId:        a.id,
          title:         `📋 Multi-Order #${firstNum} (+${orderCount - 1} more)`,
          body:          `${orderCount} orders placed across ${namesStr}.`,
          type:          'multi_order',
          data:          { ...sessionData, forwarded_from: customerId },
          channelId:     'orders',
          skipPrefCheck: true,
        }),
      ),
    )
  }

  await Promise.allSettled([customerTask, merchantTask(), adminTask()])
}

export async function notifyOrderStatusUpdate(
  customerId: string,
  orderId:    string,
  orderNum:   string | number,
  newStatus:  string,
): Promise<void> {
  const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
    confirmed:  { title: '✅ Order Confirmed!',   body: `Your order #${orderNum} has been confirmed.` },
    preparing:  { title: '👨‍🍳 Being Prepared',     body: `Your order #${orderNum} is being prepared.` },
    ready:      { title: '📦 Order Ready!',        body: `Your order #${orderNum} is ready for pickup.` },
    picked_up:  { title: '🛵 On the Way!',         body: `Your order #${orderNum} is heading your way!` },
    delivered:  { title: '🎉 Delivered!',          body: `Your order #${orderNum} has been delivered. Enjoy!` },
    cancelled:  { title: '❌ Order Cancelled',     body: `Your order #${orderNum} was cancelled.` },
    rejected:   { title: '⚠️ Order Rejected',      body: `Your order #${orderNum} was rejected. Please try again.` },
  }
  const msg = STATUS_MESSAGES[newStatus]
  if (!msg) return
  await createAndSendNotification({
    userId:    customerId,
    title:     msg.title,
    body:      msg.body,
    type:      'order_update',
    data:      { type: 'order_update', order_id: orderId, orderId, order_number: orderNum, status: newStatus },
    channelId: 'orders',
  })
}

export async function notifyDriverAssigned(
  customerId: string, orderId: string,
  orderNum: string | number, driverName?: string,
): Promise<void> {
  await createAndSendNotification({
    userId:    customerId,
    title:     '🛵 Driver Assigned',
    body:      `${driverName ? driverName + ' is' : 'A driver is'} on the way to pick up order #${orderNum}.`,
    type:      'driver_assigned',
    data:      { type: 'driver_assigned', order_id: orderId, orderId, order_number: orderNum },
    channelId: 'orders',
  })
}

export async function notifyPromo(
  customerId: string, title: string, body: string,
  promoCode?: string, promoId?: string,
): Promise<void> {
  await createAndSendNotification({
    userId:    customerId,
    title,
    body,
    type:      'promo',
    data:      { type: 'promo', promo_code: promoCode, promo_id: promoId },
    channelId: 'promotions',
  })
}

export async function notifyReviewRequest(
  customerId: string, orderId: string,
  orderNum: string | number, merchantName: string,
): Promise<void> {
  await createAndSendNotification({
    userId:    customerId,
    title:     '⭐ How was your order?',
    body:      `Rate your order #${orderNum} from ${merchantName}.`,
    type:      'review_request',
    data:      { type: 'review_request', order_id: orderId, orderId, order_number: orderNum },
    channelId: 'default',
  })
}

// ─── Debug helper (DEV only) ──────────────────────────────────────────────────

export async function debugPushSetup(userId: string): Promise<void> {
  if (!__DEV__) return
  console.log('══════════════════ PUSH DEBUG ══════════════════')
  console.log('userId:', userId.slice(0, 8))
  console.log('isExpoGo:', isExpoGo)
  console.log('canUsePush:', canUsePush)
  console.log('Device.isDevice:', Device.isDevice)

  const cached = await AsyncStorage.getItem(PUSH_TOKEN_KEY)
  console.log('AsyncStorage token:', cached?.slice(0, 40) ?? 'NONE')

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('expo_push_token, is_active, platform, updated_at')
    .eq('user_id', userId)

  console.log(`push_tokens rows: ${tokens?.length ?? 0}`)
  tokens?.forEach((t: any) =>
    console.log(`  ${t.expo_push_token?.slice(0, 40)} | active=${t.is_active} | ${t.platform}`)
  )

  const { data: p } = await supabase
    .from('profiles')
    .select('expo_push_token, push_token, notification_prefs')
    .eq('id', userId).single()

  console.log('profiles.expo_push_token:', p?.expo_push_token?.slice(0, 40) ?? 'NONE')
  console.log('profiles.push_token:', p?.push_token?.slice(0, 40) ?? 'NONE')
  console.log('notification_prefs:', JSON.stringify(p?.notification_prefs))
  console.log('═══════════════════════════════════════════════')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidUUID(v: string | null | undefined): boolean {
  if (!v) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

export function setupForegroundReregistration(userId: string): () => void {
  let lastState      = AppState.currentState
  let lastRegistered = 0

  const sub = AppState.addEventListener('change', async (next: AppStateStatus) => {
    if (lastState.match(/inactive|background/) && next === 'active') {
      const now = Date.now()
      if (now - lastRegistered > 60 * 60 * 1000) {
        lastRegistered = now
        await AsyncStorage.removeItem(PUSH_TOKEN_KEY).catch(() => {})
        await registerForPushNotifications(userId)
      }
    }
    lastState = next
  })

  return () => sub.remove()
}

export function addReceivedListener(cb: (n: any) => void) {
  const N = getNotif()
  if (!N) return { remove: () => {} }
  return N.addNotificationReceivedListener(cb)
}

export function addResponseListener(cb: (r: any) => void) {
  const N = getNotif()
  if (!N) return { remove: () => {} }
  return N.addNotificationResponseReceivedListener(cb)
}