import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { ChevronLeft, FileText } from 'lucide-react';
import type { LegalPageSummary } from '@/types/home';

// Public anon client — legal pages are readable by everyone
const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getLegalNav(): Promise<LegalPageSummary[]> {
  try {
    const { data } = await supabasePublic
      .from('legal_pages')
      .select('slug,title')
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    return (data || []) as LegalPageSummary[];
  } catch {
    return [];
  }
}

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const navPages = await getLegalNav();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50">

      {/* Sticky top bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-orange-600 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            Home
          </Link>
          <span className="text-gray-300" aria-hidden>|</span>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <FileText className="w-4 h-4" />
            <span className="font-medium">Legal</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row gap-8">

        {/* Sidebar nav — hidden on mobile, sticky on desktop */}
        {navPages.length > 0 && (
          <aside className="hidden md:block w-52 shrink-0">
            <div className="sticky top-20 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">
                Documents
              </p>
              <nav className="space-y-0.5">
                {navPages.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/legal/${p.slug}`}
                    className="block px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition"
                  >
                    {p.title}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white/60 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {navPages.map(({ slug, title }) => (
              <Link
                key={slug}
                href={`/legal/${slug}`}
                className="text-sm text-gray-600 hover:text-orange-600 font-medium transition"
              >
                {title}
              </Link>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            © {new Date().getFullYear()} PattiBytes Express. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}