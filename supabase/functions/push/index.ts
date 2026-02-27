// @ts-nocheck — Deno runtime, not Node
import { createClient } from 'npm:@supabase/supabase-js@2'

interface NotificationRecord {
  id: string
  user_id: string
  title: string
  body: string
  data: Record<string, unknown>
  type: string
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: NotificationRecord
  schema: 'public'
  old_record: null | NotificationRecord
}

interface PushToken {
  expo_push_token: string
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req: Request) => {
  const payload: WebhookPayload = await req.json()

  if (payload.type !== 'INSERT') {
    return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 })
  }

  const { data: tokens, error } = await supabase
    .from('device_push_tokens')
    .select('expo_push_token')
    .eq('user_id', payload.record.user_id)

  if (error) {
    console.error('[push] Error fetching tokens:', error)
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 200 })
  }

  if (!tokens?.length) {
    return new Response(
      JSON.stringify({ ok: true, sent: 0, reason: 'no tokens' }),
      { status: 200 }
    )
  }

  const channelId =
    payload.record.type === 'order' ? 'orders' :
    payload.record.type === 'promo' ? 'promotions' : 'default'

  const messages = (tokens as PushToken[]).map((t) => ({
    to: t.expo_push_token,
    sound: 'default',
    title: payload.record.title,
    body: payload.record.body,
    data: payload.record.data ?? {},
    channelId,
  }))

  const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(messages),
  })

  const result = await expoRes.json()
  console.log('[push] Expo response:', JSON.stringify(result))

  return new Response(
    JSON.stringify({ ok: true, sent: messages.length, result }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
