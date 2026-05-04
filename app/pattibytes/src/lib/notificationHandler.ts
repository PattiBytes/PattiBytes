import Constants from 'expo-constants'
import * as Device from 'expo-device'
import { AppState, type AppStateStatus, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Environment
// ─────────────────────────────────────────────────────────────────────────────

export const isExpoGo =
  Constants.appOwnership === 'expo' ||
  (Constants as any).executionEnvironment === 'storeClient'

export const canUsePush = Device.isDevice && !isExpoGo

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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
  | 'order'
  | 'store_order'
  | 'driver'
  | 'announcement'
  | 'review'
  | 'general'
  | (string & {})

export type NotificationTarget =
  | 'customer'
  | 'merchant'
  | 'driver'
  | 'admins'
  | 'all'

type ExpoNotificationsModule = typeof import('expo-notifications')

// ─────────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────────

const PUSH_TOKEN_KEY = 'pb_push_token_v2'
const PUSH_TOKEN_USER_KEY = 'pb_push_token_user_v2'
const PUSH_LAST_REGISTERED_AT_KEY = 'pb_push_registered_at_v2'

const REGISTRATION_REFRESH_MS = 60 * 60 * 1000
const NOTIFY_TIMEOUT_MS = 12_000

const _registrationPromises = new Map<string, Promise<string | null>>()

async function readCachedRegistration(): Promise<{
  token: string | null
  userId: string | null
  lastRegisteredAt: number | null
}> {
  const [[, token], [, userId], [, lastRegisteredAtRaw]] = await AsyncStorage.multiGet([
    PUSH_TOKEN_KEY,
    PUSH_TOKEN_USER_KEY,
    PUSH_LAST_REGISTERED_AT_KEY,
  ]).catch(() => [
    [PUSH_TOKEN_KEY, null],
    [PUSH_TOKEN_USER_KEY, null],
    [PUSH_LAST_REGISTERED_AT_KEY, null],
  ] as [string, string | null][])

  const lastRegisteredAt = lastRegisteredAtRaw
    ? new Date(lastRegisteredAtRaw).getTime()
    : null

  return {
    token: token ?? null,
    userId: userId ?? null,
    lastRegisteredAt: Number.isFinite(lastRegisteredAt) ? lastRegisteredAt : null,
  }
}

async function writeCachedRegistration(userId: string, token: string) {
  const now = new Date().toISOString()
  await AsyncStorage.multiSet([
    [PUSH_TOKEN_KEY, token],
    [PUSH_TOKEN_USER_KEY, userId],
    [PUSH_LAST_REGISTERED_AT_KEY, now],
  ]).catch(() => {})
}

function isExpoPushToken(v: string | null | undefined): v is string {
  return !!v && v.startsWith('ExponentPushToken[')
}

export async function resetPushRegistration(): Promise<void> {
  _registrationPromises.clear()
  await AsyncStorage.multiRemove([
    PUSH_TOKEN_KEY,
    PUSH_TOKEN_USER_KEY,
    PUSH_LAST_REGISTERED_AT_KEY,
  ]).catch(() => {})
}

// ─────────────────────────────────────────────────────────────────────────────
// Lazy expo-notifications
// ─────────────────────────────────────────────────────────────────────────────

function getNotif(): ExpoNotificationsModule | null {
  if (!canUsePush) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as ExpoNotificationsModule
  } catch {
    return null
  }
}

function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).easConfig?.projectId
  )
}

function getDeviceId(): string | null {
  return Device.deviceName ?? Device.modelName ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────────────────

export function initNotificationHandler() {
  const N = getNotif()
  if (!N) return

  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

async function ensureAndroidChannels() {
  const N = getNotif()
  if (!N || Platform.OS !== 'android') return

  await Promise.all([
    N.setNotificationChannelAsync('default', {
      name: 'General',
      importance: N.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B00',
      sound: 'default',
    }),
    N.setNotificationChannelAsync('orders', {
      name: 'Order Updates',
      importance: N.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B00',
      sound: 'default',
    }),
    N.setNotificationChannelAsync('promotions', {
      name: 'Promotions & Offers',
      importance: N.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100],
      lightColor: '#22C55E',
      sound: 'default',
    }),
  ])
}

async function upsertPushToken(userId: string, token: string) {
  const now = new Date().toISOString()

  const { error: tokenError } = await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id: userId,
        expo_push_token: token,
        platform: Platform.OS,
        device_id: getDeviceId(),
        is_active: true,
        updated_at: now,
      },
      { onConflict: 'expo_push_token' },
    )

  if (tokenError) {
    console.warn('[push] push_tokens upsert error:', tokenError.message)
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      push_token: token,
      expo_push_token: token,
      push_token_platform: Platform.OS,
      push_token_updated_at: now,
    })
    .eq('id', userId)

  if (profileError) {
    console.warn('[push] profiles push token update error:', profileError.message)
  }

  await writeCachedRegistration(userId, token)
}

async function markTokenInactive(userId: string, token: string) {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('push_tokens')
    .update({ is_active: false, updated_at: now })
    .eq('user_id', userId)
    .eq('expo_push_token', token)

  if (error) {
    console.warn('[push] mark token inactive error:', error.message)
  }
}

async function postNotify(
  jwt: string,
  payload: Record<string, any>,
): Promise<Response | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), NOTIFY_TIMEOUT_MS)

  try {
    const res = await fetch(`${APIBASE}/api/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!res.ok) {
      console.warn('[push] notify API error:', res.status)
    }

    return res
  } catch (e: any) {
    console.warn('[push] notify API request failed:', e?.message ?? e)
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Register
// ─────────────────────────────────────────────────────────────────────────────

export async function registerForPushNotifications(
  userId: string,
): Promise<string | null> {
  if (!userId) return null

  const N = getNotif()
  if (!N) {
    console.log('[push] Skipping registration: not a physical device or Expo Go')
    return null
  }

  const existingPromise = _registrationPromises.get(userId)
  if (existingPromise) return existingPromise

  const promise = (async () => {
    try {
      const { status: existing } = await N.getPermissionsAsync()
      let finalStatus = existing

      if (existing !== 'granted') {
        const { status } = await N.requestPermissionsAsync()
        finalStatus = status
      }

      if (finalStatus !== 'granted') {
        console.log('[push] Permission not granted:', finalStatus)
        return null
      }

      await ensureAndroidChannels()

      const cached = await readCachedRegistration()
      const now = Date.now()
      const isFresh =
        !!cached.lastRegisteredAt &&
        now - cached.lastRegisteredAt < REGISTRATION_REFRESH_MS

      if (isExpoPushToken(cached.token) && cached.userId === userId && isFresh) {
        await upsertPushToken(userId, cached.token)

        if (__DEV__) {
          console.log('[push] Re-used fresh cached token:', cached.token.slice(0, 40))
        }

        return cached.token
      }

      const projectId = getProjectId()
      if (!projectId) {
        console.warn('[push] No EAS projectId found in app config')
      }

      let freshToken: string | null = null

      try {
        const tokenData = await N.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        )
        freshToken = tokenData?.data ?? null
      } catch (e: any) {
        console.warn('[push] getExpoPushTokenAsync failed:', e?.message ?? e)
      }

      const tokenToUse =
        (isExpoPushToken(freshToken) && freshToken) ||
        (isExpoPushToken(cached.token) && cached.token) ||
        null

      if (!tokenToUse) {
        console.warn('[push] No push token available after registration attempt')
        return null
      }

      if (
        isExpoPushToken(cached.token) &&
        cached.userId &&
        cached.userId !== userId &&
        cached.token === tokenToUse
      ) {
        await markTokenInactive(cached.userId, cached.token)
      }

      await upsertPushToken(userId, tokenToUse)

      if (__DEV__) {
        console.log(
          '[push] Registered token:',
          tokenToUse.slice(0, 40),
          cached.userId && cached.userId !== userId ? '(reassigned user)' : '',
        )
      }

      return tokenToUse
    } catch (e: any) {
      console.error('[push] Registration error:', e?.message ?? e)
      return null
    } finally {
      _registrationPromises.delete(userId)
    }
  })()

  _registrationPromises.set(userId, promise)
  return promise
}

// ─────────────────────────────────────────────────────────────────────────────
// Deregister
// ─────────────────────────────────────────────────────────────────────────────

export async function deregisterPushToken(userId: string): Promise<void> {
  try {
    const { token: cachedToken } = await readCachedRegistration()
    const now = new Date().toISOString()

    await Promise.allSettled([
      supabase
        .from('push_tokens')
        .update({ is_active: false, updated_at: now })
        .eq('user_id', userId),

      cachedToken
        ? supabase
            .from('push_tokens')
            .update({ is_active: false, updated_at: now })
            .eq('expo_push_token', cachedToken)
        : Promise.resolve(null),

      supabase
        .from('profiles')
        .update({
          push_token: null,
          expo_push_token: null,
          push_token_platform: null,
          push_token_updated_at: now,
        })
        .eq('id', userId),
    ])

    if (__DEV__) {
      console.log('[push] Deregistered push state for user', userId.slice(0, 8))
    }
  } catch (e: any) {
    console.warn('[push] Deregister error (non-fatal):', e?.message ?? e)
  } finally {
    await resetPushRegistration()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Token lookup
// ─────────────────────────────────────────────────────────────────────────────

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
      return [...new Set(
        (rows as any[])
          .map(r => r.expo_push_token as string)
          .filter(isExpoPushToken),
      )]
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('expo_push_token, push_token')
      .eq('id', userId)
      .maybeSingle()

    const token = profile?.expo_push_token ?? profile?.push_token
    return isExpoPushToken(token) ? [token] : []
  } catch (e: any) {
    console.warn('[push] getUserPushTokens error:', e?.message ?? e)
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Preference gate
// ─────────────────────────────────────────────────────────────────────────────

async function userWantsNotification(
  userId: string,
  type: NotificationType | string,
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('notification_prefs, is_active, account_status')
      .eq('id', userId)
      .maybeSingle()

    if (!data) return false
    if (data.account_status === 'banned') return false
    if (data.is_active === false) return false

    const prefs = data.notification_prefs as Record<string, boolean> | null
    if (!prefs) return true

    const prefKey: Record<string, string> = {
      new_order: 'order_updates',
      order_update: 'order_updates',
      order_cancelled: 'order_updates',
      driver_assigned: 'order_updates',
      review_request: 'order_updates',
      multi_order: 'order_updates',
      payment: 'order_updates',
      order: 'order_updates',
      store_order: 'order_updates',
      driver: 'order_updates',
      review: 'order_updates',
      promo: 'promos',
      announcement: 'system',
      general: 'system',
      system: 'system',
    }

    const key = prefKey[type] ?? 'system'
    return prefs[key] !== false
  } catch {
    return true
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function createAndSendNotification(params: {
  userId: string
  title: string
  body: string
  type: NotificationType | string
  data?: Record<string, any>
  channelId?: string
  skipPrefCheck?: boolean
}): Promise<string | null> {
  const { userId, title, body, type, data, channelId, skipPrefCheck } = params

  if (!userId || !title || !body) return null

  if (!skipPrefCheck) {
    const wants = await userWantsNotification(userId, type)
    if (!wants) {
      if (__DEV__) {
        console.log(`[push] Pref-blocked: ${userId.slice(0, 8)} / ${type}`)
      }
      return null
    }
  }

  try {
    const { data: row, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message: body,
        body,
        type,
        data: {
          ...(data ?? {}),
          channelId: channelId ?? 'default',
          skipPrefCheck: skipPrefCheck ?? false,
        },
        is_read: false,
        sent_push: false,
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
        `[push] Inserted notification ${notifId?.slice(0, 8)} → ${userId.slice(0, 8)} type=${type}`,
      )
    }

    return notifId
  } catch (e: any) {
    console.warn('[push] createAndSendNotification error:', e?.message ?? e)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Backward-compatible wrapper
// ─────────────────────────────────────────────────────────────────────────────

export async function notifyUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>,
  opts?: {
    notificationId?: string
    channelId?: string
    skipPrefCheck?: boolean
    type?: NotificationType | string
  },
): Promise<void> {
  if (opts?.notificationId) {
    if (__DEV__) {
      console.log('[push] notifyUser: row already exists', opts.notificationId.slice(0, 8))
    }
    return
  }

  await createAndSendNotification({
    userId,
    title,
    body,
    type: opts?.type ?? 'system',
    data,
    channelId: opts?.channelId,
    skipPrefCheck: opts?.skipPrefCheck,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain helpers
// ─────────────────────────────────────────────────────────────────────────────

const APIBASE = 'https://pbexpress.pattibytes.com'

export async function notifyOrderPlaced(
  customerId: string,
  orderId: string,
  orderNum: string | number | null,
  merchantId: string | null,
): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const jwt = session?.access_token
    if (!jwt) {
      console.warn('[notifyOrderPlaced] Missing access token')
      return
    }

    const num = orderNum ?? orderId.slice(0, 8)

    const notifData = {
      orderId,
      order_id: orderId,
      order_number: num,
      status: 'pending',
    }

    const customerPromise = postNotify(jwt, {
      targetUserId: customerId,
      title: '🎉 Order Placed!',
      message: `Your order #${num} has been placed. We'll confirm it shortly.`,
      type: 'new_order',
      data: {
        ...notifData,
        url: `https://pbexpress.pattibytes.com/customer/orders/${orderId}`,
      },
    })

    const merchantPromise = (async () => {
      if (!merchantId) return

      const { data: m } = await supabase
        .from('merchants')
        .select('user_id')
        .eq('id', merchantId)
        .maybeSingle()

      if (!m?.user_id) return

      return postNotify(jwt, {
        targetUserId: m.user_id,
        title: `[MERCHANT] 🛒 New Order #${num}`,
        message: 'New order received. Tap to confirm.',
        type: 'new_order',
        data: {
          ...notifData,
          url: `https://pbexpress.pattibytes.com/merchant/orders/${orderId}`,
          sound: 'order',
          forwarded_from: customerId,
        },
      })
    })()

    const adminPromise = (async () => {
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'superadmin'])
        .eq('is_active', true)

      if (!admins?.length) return

      return Promise.allSettled(
        admins.map(a =>
          postNotify(jwt, {
            targetUserId: a.id,
            title: `[ADMIN] 📋 New Order #${num}`,
            message: 'A new order has been placed.',
            type: 'new_order',
            data: {
              ...notifData,
              url: `https://pbexpress.pattibytes.com/admin/orders/${orderId}`,
              sound: 'order',
              forwarded_from: customerId,
            },
          }),
        ),
      )
    })()

    await Promise.allSettled([customerPromise, merchantPromise, adminPromise])
  } catch (e: any) {
    console.warn('[notifyOrderPlaced] error:', e?.message ?? e)
  }
}

export async function notifyMultiCartSession(params: {
  customerId: string
  sessionId: string
  placedOrders: { id: string; order_number?: number | null; merchant_id?: string | null }[]
  merchantNames: string[]
  grandTotal: number
}): Promise<void> {
  const { customerId, sessionId, placedOrders, merchantNames, grandTotal } = params

  const orderCount = placedOrders.length
  const namesStr =
    merchantNames.slice(0, 3).join(', ') +
    (merchantNames.length > 3 ? ` +${merchantNames.length - 3} more` : '')

  const sessionData = {
    type: 'multi_order',
    cart_session_id: sessionId,
    order_ids: placedOrders.map(o => o.id),
    order_numbers: placedOrders.map(o => o.order_number ?? o.id.slice(0, 8)),
    order_count: orderCount,
    total_amount: grandTotal,
    status: 'pending',
    is_multi: true,
  }

  const customerTask = createAndSendNotification({
    userId: customerId,
    title: `🎉 ${orderCount} Order${orderCount > 1 ? 's' : ''} Placed!`,
    body: `From ${namesStr}. Total ₹${grandTotal.toFixed(2)}.`,
    type: 'multi_order',
    data: sessionData,
    channelId: 'orders',
  })

  const merchantTask = async () => {
    await Promise.allSettled(
      placedOrders.map(async o => {
        if (!o.merchant_id || !isValidUUID(o.merchant_id)) return

        const num = o.order_number ?? o.id.slice(0, 8)
        const { data: m } = await supabase
          .from('merchants')
          .select('user_id, name')
          .eq('id', o.merchant_id)
          .maybeSingle()

        if (!m?.user_id) return

        await createAndSendNotification({
          userId: m.user_id,
          title: `🔔 New Order #${num}`,
          body: 'Part of a multi-restaurant order. Tap to confirm.',
          type: 'new_order',
          data: {
            type: 'new_order',
            order_id: o.id,
            orderId: o.id,
            order_number: num,
            cart_session_id: sessionId,
            is_multi: true,
            status: 'pending',
          },
          channelId: 'orders',
          skipPrefCheck: true,
        })
      }),
    )
  }

  const adminTask = async () => {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'superadmin'])
      .eq('is_active', true)

    if (!admins?.length) return

    const firstNum = placedOrders[0]?.order_number ?? placedOrders[0]?.id?.slice(0, 8)

    await Promise.allSettled(
      (admins as { id: string }[]).map(a =>
        createAndSendNotification({
          userId: a.id,
          title: `📋 Multi-Order #${firstNum} (+${orderCount - 1} more)`,
          body: `${orderCount} orders placed across ${namesStr}.`,
          type: 'multi_order',
          data: { ...sessionData, forwarded_from: customerId },
          channelId: 'orders',
          skipPrefCheck: true,
        }),
      ),
    )
  }

  await Promise.allSettled([customerTask, merchantTask(), adminTask()])
}

export async function notifyOrderStatusUpdate(
  customerId: string,
  orderId: string,
  orderNum: string | number,
  newStatus: string,
): Promise<void> {
  const STATUS_MESSAGES: Record<string, { title: string; body: string }> = {
    confirmed: { title: '✅ Order Confirmed!', body: `Your order #${orderNum} has been confirmed.` },
    preparing: { title: '👨‍🍳 Being Prepared', body: `Your order #${orderNum} is being prepared.` },
    ready: { title: '📦 Order Ready!', body: `Your order #${orderNum} is ready for pickup.` },
    picked_up: { title: '🛵 On the Way!', body: `Your order #${orderNum} is heading your way!` },
    delivered: { title: '🎉 Delivered!', body: `Your order #${orderNum} has been delivered. Enjoy!` },
    cancelled: { title: '❌ Order Cancelled', body: `Your order #${orderNum} was cancelled.` },
    rejected: { title: '⚠️ Order Rejected', body: `Your order #${orderNum} was rejected. Please try again.` },
  }

  const msg = STATUS_MESSAGES[newStatus]
  if (!msg) return

  await createAndSendNotification({
    userId: customerId,
    title: msg.title,
    body: msg.body,
    type: 'order_update',
    data: {
      type: 'order_update',
      order_id: orderId,
      orderId,
      order_number: orderNum,
      status: newStatus,
      url: `/orders/${orderId}`,
    },
    channelId: 'orders',
  })
}

export async function notifyDriverAssigned(
  customerId: string,
  orderId: string,
  orderNum: string | number,
  driverName?: string,
): Promise<void> {
  await createAndSendNotification({
    userId: customerId,
    title: '🛵 Driver Assigned',
    body: `${driverName ? `${driverName} is` : 'A driver is'} on the way to pick up order #${orderNum}.`,
    type: 'driver_assigned',
    data: {
      type: 'driver_assigned',
      order_id: orderId,
      orderId,
      order_number: orderNum,
      url: `/orders/${orderId}`,
    },
    channelId: 'orders',
  })
}

export async function notifyPromo(
  customerId: string,
  title: string,
  body: string,
  promoCode?: string,
  promoId?: string,
): Promise<void> {
  await createAndSendNotification({
    userId: customerId,
    title,
    body,
    type: 'promo',
    data: {
      type: 'promo',
      promo_code: promoCode,
      promo_id: promoId,
    },
    channelId: 'promotions',
  })
}

export async function notifyReviewRequest(
  customerId: string,
  orderId: string,
  orderNum: string | number,
  merchantName: string,
): Promise<void> {
  await createAndSendNotification({
    userId: customerId,
    title: '⭐ How was your order?',
    body: `Rate your order #${orderNum} from ${merchantName}.`,
    type: 'review_request',
    data: {
      type: 'review_request',
      order_id: orderId,
      orderId,
      order_number: orderNum,
      url: `/orders/${orderId}`,
    },
    channelId: 'default',
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Debug
// ─────────────────────────────────────────────────────────────────────────────

export async function debugPushSetup(userId: string): Promise<void> {
  if (!__DEV__) return

  const cached = await readCachedRegistration()

  console.log('══════════════════ PUSH DEBUG ══════════════════')
  console.log('userId:', userId.slice(0, 8))
  console.log('isExpoGo:', isExpoGo)
  console.log('canUsePush:', canUsePush)
  console.log('Device.isDevice:', Device.isDevice)
  console.log('AsyncStorage token:', cached.token?.slice(0, 40) ?? 'NONE')
  console.log('AsyncStorage user:', cached.userId ?? 'NONE')
  console.log(
    'Last registered:',
    cached.lastRegisteredAt ? new Date(cached.lastRegisteredAt).toISOString() : 'NONE',
  )

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('expo_push_token, is_active, platform, updated_at')
    .eq('user_id', userId)

  console.log(`push_tokens rows: ${tokens?.length ?? 0}`)
  tokens?.forEach((t: any) => {
    console.log(
      `  ${t.expo_push_token?.slice(0, 40)} | active=${t.is_active} | ${t.platform} | ${t.updated_at}`,
    )
  })

  const { data: p } = await supabase
    .from('profiles')
    .select('expo_push_token, push_token, notification_prefs')
    .eq('id', userId)
    .maybeSingle()

  console.log('profiles.expo_push_token:', p?.expo_push_token?.slice(0, 40) ?? 'NONE')
  console.log('profiles.push_token:', p?.push_token?.slice(0, 40) ?? 'NONE')
  console.log('notification_prefs:', JSON.stringify(p?.notification_prefs))
  console.log('═══════════════════════════════════════════════')
}

// ─────────────────────────────────────────────────────────────────────────────
// AppState refresh
// ─────────────────────────────────────────────────────────────────────────────

export function setupForegroundReregistration(userId: string): () => void {
  let lastState = AppState.currentState
  let checking = false

  const maybeRefresh = async () => {
    if (!userId || !canUsePush || checking) return
    checking = true

    try {
      const cached = await readCachedRegistration()
      const now = Date.now()

      if (
        !cached.lastRegisteredAt ||
        now - cached.lastRegisteredAt > REGISTRATION_REFRESH_MS
      ) {
        await registerForPushNotifications(userId)
      }
    } finally {
      checking = false
    }
  }

  const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
    if (lastState.match(/inactive|background/) && next === 'active') {
      void maybeRefresh()
    }

    lastState = next
  })

  return () => sub.remove()
}

// ─────────────────────────────────────────────────────────────────────────────
// Expo listeners
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isValidUUID(v: string | null | undefined): boolean {
  if (!v) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}