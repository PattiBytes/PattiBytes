// src/app/(admin)/admin/legal/[slug]/page.tsx
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { notFound } from 'next/navigation';
import LegalPageEditor from '../_components/LegalPageEditor';  // ← default import ✓

export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

async function getPage(slug: string) {
  const { data, error } = await supabaseAdmin
    .from('legal_pages')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export default async function AdminLegalEditPage({ params }: Props) {
  const page = await getPage(params.slug);
  if (!page) notFound();
  return <LegalPageEditor initialPage={page} />;
}
