// lib/legalPages.ts
import { supabase } from './supabase';

export type LegalPage = {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_active: boolean;
  updated_at: string;
  created_at: string;
};

export async function fetchLegalPage(slug: string): Promise<LegalPage | null> {
  const { data, error } = await supabase
    .from('legal_pages')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data as LegalPage | null;
}

export async function fetchAllLegalPages(): Promise<LegalPage[]> {
  const { data, error } = await supabase
    .from('legal_pages')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as LegalPage[];
}

export async function upsertLegalPage(
  slug: string,
  fields: { title?: string; content?: string; is_active?: boolean }
): Promise<void> {
  const { error } = await supabase
    .from('legal_pages')
    .update(fields)
    .eq('slug', slug);

  if (error) throw error;
}
