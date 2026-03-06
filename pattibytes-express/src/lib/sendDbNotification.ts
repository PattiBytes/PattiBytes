/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * @deprecated Use sendNotification() from utils/notifications.ts instead.
 * This shim exists only for backward compatibility during migration.
 * It now routes through /api/notify (not the old Edge Function).
 */
export async function sendDbNotification(params: {
  userId: string;
  title: string;
  message: string;
  type: string;
  data?: any;
}): Promise<void> {
  const { sendNotification } = await import('@/utils/notifications');
  const ok = await sendNotification(
    params.userId,
    params.title,
    params.message,
    params.type,
    params.data ?? {}
  );
  if (!ok) throw new Error('[sendDbNotification] Failed to send notification');
}
