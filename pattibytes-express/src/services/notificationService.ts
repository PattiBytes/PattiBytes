/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

export async function sendDbNotification(params: {
  userId: string;
  title: string;
  message: string;
  type: string;
  data?: any;
}) {
  const { error } = await supabase.functions.invoke("notify", {
    body: {
      targetUserId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      data: params.data ?? {},
      body: params.message
    }
  });

  if (error) throw error;
}
