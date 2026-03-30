import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import { Calendar, FileText, ArrowRight, Mail, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { fmtDate } from '@/lib/homeUtils';

// ────────────────────────────────────────────────────────────────────────────
// ✅ KEY FIX: Use SERVICE ROLE key — this is a server component, never sent to
// the browser. It bypasses RLS entirely so no policy needed on legal_pages.
// If you only have the anon key, run the SQL policy from the previous message.
// ────────────────────────────────────────────────────────────────────────────
function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??   // preferred: bypasses RLS
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // fallback: needs RLS policy

  if (!url || !key) throw new Error('Supabase env vars missing');

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession:   false,
    },
  });
}

// ── Types ────────────────────────────────────────────────────────────────────
type LegalPage = {
  id:         string;
  slug:       string;
  title:      string;
  content:    string;
  is_active:  boolean;
  updated_at: string;
  created_at: string;
};

// ── Data fetch ───────────────────────────────────────────────────────────────
async function getLegalPage(slug: string): Promise<LegalPage | null> {
  try {
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from('legal_pages')
      .select('id,slug,title,content,is_active,updated_at,created_at')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error(`[legal/${slug}] Supabase error:`, error.message, '| code:', error.code);
      return null;
    }

    if (!data) {
      console.warn(`[legal/${slug}] No active page found for slug "${slug}"`);
      return null;
    }

    return data as LegalPage;
  } catch (err) {
    console.error(`[legal/${slug}] Unexpected error:`, err);
    return null;
  }
}

// ── Static params — pre-renders all active pages at build time ───────────────
export async function generateStaticParams() {
  try {
    const supabase = getSupabaseServer();
    const { data } = await supabase
      .from('legal_pages')
      .select('slug')
      .eq('is_active', true);
    return (data || []).map((p: { slug: string }) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

// ── SEO metadata ─────────────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const page = await getLegalPage(slug);

  if (!page) {
    return {
      title:  'Not Found — PattiBytes Express',
      robots: { index: false, follow: false },
    };
  }

  return {
    title:       `${page.title} — PattiBytes Express`,
    description: `Read the ${page.title} for PattiBytes Express, the local food delivery app for Patti, Punjab.`,
    robots:      { index: true, follow: true },
    openGraph: {
      title:         `${page.title} — PattiBytes Express`,
      description:   `PattiBytes Express legal document: ${page.title}`,
      type:          'article',
      modifiedTime:  page.updated_at,
      publishedTime: page.created_at,
    },
    alternates: {
      canonical: `https://pbexpress.pattibytes.com/legal/${page.slug}`,
    },
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function LegalPageRoute(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const page = await getLegalPage(slug);
  if (!page) notFound();

  return (
    <article>
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold mb-4">
          <FileText className="w-3.5 h-3.5" />
          Legal Document
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
          {page.title}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Last updated:
            <strong className="text-gray-700 ml-1">{fmtDate(page.updated_at)}</strong>
          </span>
          {page.updated_at !== page.created_at && (
            <span className="inline-flex items-center gap-1.5 text-gray-400">
              · Published {fmtDate(page.created_at)}
            </span>
          )}
        </div>

        <div className="mt-5 h-1 w-16 rounded-full bg-gradient-to-r from-orange-500 to-pink-500" />
      </div>

      {/* ── Markdown body ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-10 prose-reset">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
          components={{
            // Headings
            h1: ({ children }) => (
              <h1 className="text-2xl font-extrabold text-gray-900 mt-10 mb-4 first:mt-0 leading-tight">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-extrabold text-gray-900 mt-9 mb-3 pb-2 border-b border-gray-100 leading-snug">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-bold text-gray-900 mt-6 mb-2">{children}</h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-sm font-bold text-gray-800 mt-4 mb-1 uppercase tracking-wide">{children}</h4>
            ),

            // Body text
            p: ({ children }) => (
              <p className="text-gray-700 leading-relaxed mb-4 text-[15px]">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="font-bold text-gray-900">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="italic text-gray-600">{children}</em>
            ),

            // Links — ✅ handles both http and mailto properly
            a: ({ href, children }) => {
              const isExternal = href?.startsWith('http');
              const isMail     = href?.startsWith('mailto:');
              return (
                <a
                  href={href}
                  className="text-orange-600 font-semibold hover:underline underline-offset-2 break-words"
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  aria-label={isMail ? `Send email to ${href?.replace('mailto:', '')}` : undefined}
                >
                  {children}
                </a>
              );
            },

            // Lists
            ul: ({ children }) => (
              <ul className="list-disc list-outside ml-5 space-y-1.5 mb-4 text-gray-700 text-[15px]">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-outside ml-5 space-y-1.5 mb-4 text-gray-700 text-[15px]">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="leading-relaxed pl-1">{children}</li>
            ),

            // Dividers
            hr: () => <hr className="my-8 border-0 border-t border-gray-100" />,

            // Quotes
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-orange-400 pl-5 italic text-gray-600 my-5 bg-orange-50 py-3 pr-4 rounded-r-xl">
                {children}
              </blockquote>
            ),

            // Inline code
            code: ({ children }) => (
              <code className="bg-gray-100 text-gray-800 text-[13px] px-1.5 py-0.5 rounded font-mono">
                {children}
              </code>
            ),

            // Tables (used in refund-policy & privacy-policy)
            table: ({ children }) => (
              <div className="overflow-x-auto my-6 rounded-2xl border border-gray-200 shadow-sm">
                <table className="w-full text-sm text-left border-collapse">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-gradient-to-r from-orange-50 to-pink-50 text-gray-800">
                {children}
              </thead>
            ),
            tbody: ({ children }) => (
              <tbody className="divide-y divide-gray-100">{children}</tbody>
            ),
            tr: ({ children }) => (
              <tr className="hover:bg-gray-50/80 transition-colors">{children}</tr>
            ),
            th: ({ children }) => (
              <th className="px-4 py-3 font-extrabold text-gray-900 whitespace-nowrap text-xs uppercase tracking-wide">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-3 text-gray-700 text-[14px] align-top">{children}</td>
            ),
          }}
        >
          {page.content}
        </ReactMarkdown>
      </div>

      {/* ── Contact / help box ── */}
      {/* ✅ FIX: Use actual JSX — no raw markdown strings here */}
      <div className="mt-8 rounded-2xl bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 border border-gray-100 p-6">
        <p className="text-sm font-extrabold text-gray-900">Questions about this policy?</p>
        <p className="text-sm text-gray-600 mt-1">
          We&apos;re happy to clarify anything. Reach us at{' '}
          <a
            href="mailto:legal@pattibytes.com"
            className="text-orange-600 font-semibold hover:underline"
          >
            legal@pattibytes.com
          </a>
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="mailto:support@pattibytes.com"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition text-sm font-semibold text-gray-900"
          >
            <Mail className="w-4 h-4 text-orange-500" />
            Email support
          </a>

          <a
            href="https://www.instagram.com/pb_express38"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition text-sm font-semibold text-gray-900"
          >
            <MessageCircle className="w-4 h-4 text-pink-500" />
            Instagram DM
          </a>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white hover:bg-black transition text-sm font-semibold"
          >
            Back to Home
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

// ✅ force-dynamic ensures fresh content on every request
// Remove this and keep generateStaticParams if you want static generation
export const dynamic = 'force-dynamic';