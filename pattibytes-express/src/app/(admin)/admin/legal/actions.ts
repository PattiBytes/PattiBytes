'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Inline admin client — 'use server' files only run on the server
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export type LegalPageRow = {
  id: string;
  slug: string;
  title: string;
  content: string;
  updated_at: string;
};

export async function getLegalPages(): Promise<LegalPageRow[]> {
  const { data, error } = await admin
    .from('legal_pages')
    .select('*')
    .order('slug');
  if (error) throw new Error(error.message);
  return (data ?? []) as LegalPageRow[];
}

export async function upsertLegalPage(
  payload: { id?: string; slug: string; title: string; content: string }
) {
  const now = new Date().toISOString();
  if (payload.id) {
    const { error } = await admin
      .from('legal_pages')
      .update({ slug: payload.slug, title: payload.title, content: payload.content, updated_at: now })
      .eq('id', payload.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin
      .from('legal_pages')
      .insert({ slug: payload.slug, title: payload.title, content: payload.content, updated_at: now });
    if (error) throw new Error(error.message);
  }
  revalidatePath('/admin/legal');
}

export async function deleteLegalPage(id: string) {
  const { error } = await admin.from('legal_pages').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/legal');
}
