/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

export async function sendDbNotification(params: {
  userId: string;
  title: string;
  message: string;
  type: string;
  data?: any;
}) {
  const row = {
    user_id: params.userId,
    title: params.title,
    message: params.message,
    body: params.message,     // keep both if both exist / may be NOT NULL
    type: params.type,
    data: params.data ?? null,
    is_read: false,
    // created_at: let DB default if you set default now()
    // read_at: null
  };

  const { error } = await supabase.from('notifications').insert([row]);
  if (error) throw error;
}
