/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  Bold, Italic, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Code2, Minus,
  Link as LinkIcon, Table, Maximize2, Minimize2,
  Save, Loader2, CheckCircle, Eye, Edit3, Columns,
  Undo2, Redo2, Strikethrough,
} from 'lucide-react';

// ── Types (inline — no separate types file) ───────────────────────────────────
type LegalPage = {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_active: boolean;
  updated_at: string;
};
type Tab = 'edit' | 'preview' | 'split';

// ── Textarea formatting helper ────────────────────────────────────────────────
function applyFormat(
  ta: HTMLTextAreaElement,
  onChange: (v: string) => void,
  type: string
) {
  const { selectionStart: s, selectionEnd: e, value } = ta;
  const selected = value.slice(s, e);

  // ── Inline wrap types ──
  const inlineMap: Record<string, [string, string, string]> = {
    bold:      ['**', '**', 'bold text'],
    italic:    ['_',  '_',  'italic text'],
    strike:    ['~~', '~~', 'strikethrough'],
    code:      ['`',  '`',  'code'],
  };
  if (inlineMap[type]) {
    const [before, after, placeholder] = inlineMap[type];
    const word = selected || placeholder;
    const next = value.slice(0, s) + before + word + after + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => {
      ta.setSelectionRange(s + before.length, s + before.length + word.length);
      ta.focus();
    });
    return;
  }

  // ── Block insert types ──
  if (type === 'codeblock') {
    const block = '```\n' + (selected || 'code') + '\n```';
    const next = value.slice(0, s) + block + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => { ta.setSelectionRange(s + 4, s + 4 + (selected || 'code').length); ta.focus(); });
    return;
  }
  if (type === 'link') {
    const txt = selected || 'link text';
    const ins = `[${txt}](https://example.com)`;
    const next = value.slice(0, s) + ins + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => { ta.setSelectionRange(s + txt.length + 3, s + ins.length - 1); ta.focus(); });
    return;
  }
  if (type === 'table') {
    const tbl = '\n| Header | Header |\n|--------|--------|\n| Cell   | Cell   |\n';
    const next = value.slice(0, s) + tbl + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => { ta.setSelectionRange(s + tbl.length, s + tbl.length); ta.focus(); });
    return;
  }
  if (type === 'hr') {
    const hr = '\n\n---\n\n';
    const next = value.slice(0, s) + hr + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => { ta.setSelectionRange(s + hr.length, s + hr.length); ta.focus(); });
    return;
  }

  // ── Line-prefix types ──
  const prefixMap: Record<string, string> = {
    h1: '# ', h2: '## ', h3: '### ', ul: '- ', ol: '1. ', quote: '> ',
  };
  if (prefixMap[type]) {
    const prefix = prefixMap[type];
    const lineStart = value.lastIndexOf('\n', s - 1) + 1;
    const lineEnd   = value.indexOf('\n', s);
    const end       = lineEnd === -1 ? value.length : lineEnd;
    const line      = value.slice(lineStart, end);
    const toggled   = line.startsWith(prefix) ? line.slice(prefix.length) : prefix + line;
    const next      = value.slice(0, lineStart) + toggled + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      const offset = line.startsWith(prefix) ? -prefix.length : prefix.length;
      ta.setSelectionRange(s + offset, s + offset);
      ta.focus();
    });
  }
}

// ── Toolbar button ─────────────────────────────────────────────────────────────
function TBtn({
  onClick, title, children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="relative group p-1.5 rounded-lg text-gray-500 transition-all duration-150
                 hover:bg-orange-100 hover:text-orange-600 hover:scale-110 active:scale-95"
    >
      {children}
      <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2
                       bg-gray-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md
                       opacity-0 group-hover:opacity-100 transition-opacity duration-150
                       whitespace-nowrap z-50">
        {title}
      </span>
    </button>
  );
}

// ── Toolbar separator ──────────────────────────────────────────────────────────
function Sep() {
  return <div className="w-px h-5 bg-gray-200 mx-0.5 self-center" />;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function LegalPageEditor({ initialPage }: { initialPage: LegalPage }) {
  const router = useRouter();

  const [title,      setTitle]      = useState(initialPage.title);
  const [content,    setContent]    = useState(initialPage.content);
  const [tab,        setTab]        = useState<Tab>('edit');
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [dirty,      setDirty]      = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);

  // ── Refs — all have explicit initial values to fix TS2554 ─────────────────
  const taRef         = useRef<HTMLTextAreaElement>(null);
  const previewRef    = useRef<HTMLDivElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyRef    = useRef<string[]>([initialPage.content]);
  const historyIdx    = useRef<number>(0);

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;
  const readMins  = Math.max(1, Math.ceil(wordCount / 200));

  const updatedDate = new Date(initialPage.updated_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  // ── History ────────────────────────────────────────────────────────────────
  const pushHistory = (val: string) => {
    const h = historyRef.current.slice(0, historyIdx.current + 1);
    h.push(val);
    historyRef.current = h.slice(-50);
    historyIdx.current = historyRef.current.length - 1;
  };

  const undo = useCallback(() => {
    if (historyIdx.current > 0) {
      historyIdx.current--;
      setContent(historyRef.current[historyIdx.current]);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIdx.current < historyRef.current.length - 1) {
      historyIdx.current++;
      setContent(historyRef.current[historyIdx.current]);
    }
  }, []);

  // ── Content change ─────────────────────────────────────────────────────────
  const handleContentChange = useCallback((val: string) => {
    setContent(val);
    setDirty(true);
    setSaved(false);
    pushHistory(val);
  }, []);

  // ── Apply format (binds to current textarea) ───────────────────────────────
  const fmt = useCallback((type: string) => {
    if (!taRef.current) return;
    applyFormat(taRef.current, handleContentChange, type);
  }, [handleContentChange]);

  // ── Auto-save (3 s debounce) ───────────────────────────────────────────────
  useEffect(() => {
    if (!dirty) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      if (!title.trim() || !content.trim()) return;
      setAutoSaving(true);
      try {
        const { error: err } = await supabase
          .from('legal_pages')
          .update({ title: title.trim(), content: content.trim(), updated_at: new Date().toISOString() })
          .eq('slug', initialPage.slug);
        if (!err) { setDirty(false); setSaved(true); }
      } finally {
        setAutoSaving(false);
      }
    }, 3000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [content, title, dirty, initialPage.slug]);

  // ── Manual save ────────────────────────────────────────────────────────────
  const save = useCallback(async () => {
    if (!title.trim() || !content.trim()) {
      setError('Title and content cannot be empty.'); return;
    }
    setSaving(true); setError(null);
    try {
      const { error: err } = await supabase
        .from('legal_pages')
        .update({ title: title.trim(), content: content.trim(), updated_at: new Date().toISOString() })
        .eq('slug', initialPage.slug);
      if (err) throw err;
      setDirty(false); setSaved(true);
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }, [title, content, initialPage.slug, router]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta  = taRef.current;
    if (!ta) return;
    const mod = e.ctrlKey || e.metaKey;

    if (mod && e.key === 's')                       { e.preventDefault(); save();                       return; }
    if (mod && e.key === 'b')                       { e.preventDefault(); fmt('bold');                  return; }
    if (mod && e.key === 'i')                       { e.preventDefault(); fmt('italic');                return; }
    if (mod && e.key === 'k')                       { e.preventDefault(); fmt('link');                  return; }
    if (mod && e.shiftKey && e.key === 'X')         { e.preventDefault(); fmt('strike');                return; }
    if (mod && e.shiftKey && e.key === 'C')         { e.preventDefault(); fmt('codeblock');             return; }
    if (mod && !e.shiftKey && e.key === 'z')        { e.preventDefault(); undo();                       return; }
    if (mod && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); return; }

    // Auto-pair: wraps selected text when typing *, `, _, [
    const pairs: Record<string, string> = { '`': '`', '*': '*', '_': '_', '[': ']' };
    if (pairs[e.key] && !e.shiftKey) {
      const { selectionStart: ss, selectionEnd: se, value } = ta;
      if (ss !== se) {
        e.preventDefault();
        const sel  = value.slice(ss, se);
        const next = value.slice(0, ss) + e.key + sel + pairs[e.key] + value.slice(se);
        handleContentChange(next);
        requestAnimationFrame(() => { ta.setSelectionRange(ss + 1, se + 1); ta.focus(); });
        return;
      }
    }

    // Smart Enter: continue lists
    if (e.key === 'Enter') {
      const { selectionStart: ss, value } = ta;
      const lineStart = value.lastIndexOf('\n', ss - 1) + 1;
      const line      = value.slice(lineStart, ss);
      const ulMatch   = line.match(/^(\s*[-*+] )(.*)/);
      const olMatch   = line.match(/^(\s*)(\d+)(\.|\) )(.*)/);

      if (ulMatch) {
        e.preventDefault();
        if (!ulMatch[2].trim()) {
          // Empty bullet → exit list
          const next = value.slice(0, lineStart) + '\n' + value.slice(ss);
          handleContentChange(next);
          requestAnimationFrame(() => { ta.setSelectionRange(lineStart + 1, lineStart + 1); ta.focus(); });
        } else {
          const next = value.slice(0, ss) + '\n' + ulMatch[1] + value.slice(ss);
          handleContentChange(next);
          requestAnimationFrame(() => {
            const p = ss + 1 + ulMatch[1].length;
            ta.setSelectionRange(p, p); ta.focus();
          });
        }
        return;
      }
      if (olMatch) {
        e.preventDefault();
        if (!olMatch[4].trim()) {
          const next = value.slice(0, lineStart) + '\n' + value.slice(ss);
          handleContentChange(next);
          requestAnimationFrame(() => { ta.setSelectionRange(lineStart + 1, lineStart + 1); ta.focus(); });
        } else {
          const nextNum = parseInt(olMatch[2]) + 1;
          const prefix  = `${olMatch[1]}${nextNum}${olMatch[3]}`;
          const next    = value.slice(0, ss) + '\n' + prefix + value.slice(ss);
          handleContentChange(next);
          requestAnimationFrame(() => {
            const p = ss + 1 + prefix.length;
            ta.setSelectionRange(p, p); ta.focus();
          });
        }
        return;
      }
    }

    // Tab = 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart: ss, selectionEnd: se, value } = ta;
      const next = value.slice(0, ss) + '  ' + value.slice(se);
      handleContentChange(next);
      requestAnimationFrame(() => { ta.setSelectionRange(ss + 2, ss + 2); ta.focus(); });
    }
  };

  // ── Scroll sync in split mode ──────────────────────────────────────────────
  const handleScroll = () => {
    if (tab !== 'split' || !taRef.current || !previewRef.current) return;
    const ta      = taRef.current;
    const ratio   = ta.scrollTop / Math.max(1, ta.scrollHeight - ta.clientHeight);
    const preview = previewRef.current;
    preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight);
  };

  const editorH = fullscreen
    ? 'calc(100vh - 160px)'
    : tab === 'split' ? 'calc(100vh - 260px)' : '560px';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className={`bg-gray-50 min-h-full transition-all duration-300 ${
        fullscreen ? 'fixed inset-0 z-50 bg-white overflow-auto' : ''
      }`}>

        {/* ── Top bar ── */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">

          {/* Row 1: breadcrumb / title / actions */}
          <div className="px-4 sm:px-6 py-2.5 flex items-center gap-3 flex-wrap">
            <Link href="/admin/legal"
              className="text-sm font-black text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-1 whitespace-nowrap">
              ← Legal
            </Link>
            <div className="h-4 w-px bg-gray-200" />

            <input
              className="flex-1 min-w-[140px] text-base font-black text-gray-900 bg-transparent outline-none
                         border-b-2 border-transparent focus:border-orange-400 py-1 transition-all duration-200"
              value={title}
              onChange={e => { setTitle(e.target.value); setDirty(true); setSaved(false); }}
              placeholder="Page title..."
            />

            {/* Stats */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 font-semibold whitespace-nowrap">
              <span>{wordCount} words</span>
              <span>·</span>
              <span>{charCount} chars</span>
              <span>·</span>
              <span>{readMins} min read</span>
            </div>

            {/* Status */}
            {(saving || autoSaving) ? (
              <span className="flex items-center gap-1 text-xs font-bold text-blue-500 animate-pulse whitespace-nowrap">
                <Loader2 className="w-3 h-3 animate-spin" />
                {autoSaving ? 'Auto-saving…' : 'Saving…'}
              </span>
            ) : saved && !dirty ? (
              <span className="flex items-center gap-1 text-xs font-bold text-green-500 whitespace-nowrap">
                <CheckCircle className="w-3 h-3" /> Saved
              </span>
            ) : dirty ? (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-500 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
                Unsaved
              </span>
            ) : null}

            <span className="hidden md:block text-xs font-mono bg-gray-100 text-gray-400 px-2 py-1 rounded-lg whitespace-nowrap">
              /legal/{initialPage.slug}
            </span>

            {/* Undo / Redo */}
            <button type="button" onClick={undo} title="Undo (Ctrl+Z)"
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-all hover:scale-110 active:scale-95">
              <Undo2 className="w-4 h-4" />
            </button>
            <button type="button" onClick={redo} title="Redo (Ctrl+Y)"
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-all hover:scale-110 active:scale-95">
              <Redo2 className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button type="button" onClick={() => setFullscreen(f => !f)} title="Fullscreen"
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-all hover:scale-110 active:scale-95">
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Save */}
            <button
              onClick={save} disabled={saving || !dirty}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all duration-200
                          whitespace-nowrap flex items-center gap-1.5 ${
                dirty && !saving
                  ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
              ) : saved && !dirty ? (
                <><CheckCircle className="w-4 h-4" />Saved</>
              ) : (
                <><Save className="w-4 h-4" />Save</>
              )}
            </button>
          </div>

          {/* Error bar */}
          {error && (
            <div className="bg-red-50 border-t border-red-100 px-6 py-2 flex items-center gap-2
                            animate-in slide-in-from-top-1 duration-200">
              <p className="text-xs text-red-600 font-semibold flex-1">⚠️ {error}</p>
              <button onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 text-xs font-bold">✕</button>
            </div>
          )}

          {/* Row 2: formatting toolbar (edit / split only) */}
          {(tab === 'edit' || tab === 'split') && (
            <div className="px-4 sm:px-6 py-1.5 flex items-center gap-0.5 flex-wrap border-t border-gray-100 bg-gray-50/50">
              {/* Headings */}
              <TBtn onClick={() => fmt('h1')} title="Heading 1 (# )">
                <Heading1 className="w-4 h-4" />
              </TBtn>
              <TBtn onClick={() => fmt('h2')} title="Heading 2 (## )">
                <Heading2 className="w-4 h-4" />
              </TBtn>
              <TBtn onClick={() => fmt('h3')} title="Heading 3 (### )">
                <Heading3 className="w-4 h-4" />
              </TBtn>
              <Sep />
              {/* Inline */}
              <TBtn onClick={() => fmt('bold')} title="Bold (Ctrl+B)">
                <Bold className="w-4 h-4" />
              </TBtn>
              <TBtn onClick={() => fmt('italic')} title="Italic (Ctrl+I)">
                <Italic className="w-4 h-4" />
              </TBtn>
              <TBtn onClick={() => fmt('strike')} title="Strikethrough (Ctrl+Shift+X)">
                <Strikethrough className="w-4 h-4" />
              </TBtn>
              <TBtn onClick={() => fmt('code')} title="Inline code (`)">
                <Code className="w-4 h-4" />
              </TBtn>
              <TBtn onClick={() => fmt('codeblock')} title="Code block (Ctrl+Shift+C)">
                <Code2 className="w-4 h-4" />
              </TBtn>
              <Sep />
              {/* Blocks */}
              <TBtn onClick={() => fmt('ul')} title="Bullet list (- )">
                <List className="w-4 h-4" />
              </TBtn>
              <TBtn onClick={() => fmt('ol')} title="Numbered list (1. )">
                <ListOrdered className="w-4 h-4" />
              </TBtn>
              <TBtn onClick={() => fmt('quote')} title="Blockquote (> )">
                <Quote className="w-4 h-4" />
              </TBtn>
              <Sep />
              {/* Inserts */}
              <TBtn onClick={() => fmt('link')} title="Link (Ctrl+K)">
                <LinkIcon className="w-4 h-4" />
              </TBtn>
              <TBtn onClick={() => fmt('table')} title="Insert table">
                <Table className="w-4 h-4" />
              </TBtn>
              <TBtn onClick={() => fmt('hr')} title="Horizontal rule (---)">
                <Minus className="w-4 h-4" />
              </TBtn>
              <span className="ml-auto text-[10px] text-gray-300 font-semibold hidden lg:block pr-1 whitespace-nowrap">
                Ctrl+S save · Ctrl+B bold · Ctrl+I italic · Ctrl+K link
              </span>
            </div>
          )}

          {/* Row 3: view tabs */}
          <div className="px-4 sm:px-6 flex items-center gap-1 border-t border-gray-100">
            {([
              { key: 'edit' as Tab,    icon: <Edit3    className="w-3.5 h-3.5" />, label: 'Edit'    },
              { key: 'split' as Tab,   icon: <Columns  className="w-3.5 h-3.5" />, label: 'Split'   },
              { key: 'preview' as Tab, icon: <Eye      className="w-3.5 h-3.5" />, label: 'Preview' },
            ]).map(({ key, icon, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-black rounded-t-lg
                            transition-all duration-200 border-b-2 ${
                  tab === key
                    ? 'text-orange-500 border-orange-500 bg-orange-50'
                    : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-50'
                }`}>
                {icon}{label}
              </button>
            ))}
            <span className="ml-auto text-xs text-gray-300 pb-1.5 hidden sm:block">
              Last saved: {updatedDate}
            </span>
          </div>
        </div>

        {/* ── Editor / Preview ── */}
        <div className="p-4 sm:p-6">
          <div className={`flex gap-4 transition-all duration-300 ${tab === 'split' ? 'flex-row' : 'flex-col'}`}>

            {/* Edit pane */}
            {(tab === 'edit' || tab === 'split') && (
              <div className={`flex flex-col animate-in fade-in slide-in-from-left-2 duration-200 ${
                tab === 'split' ? 'flex-1' : 'w-full'
              }`}>
                {tab === 'split' && (
                  <div className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1">
                    <Edit3 className="w-3 h-3" /> EDITOR
                  </div>
                )}
                {tab === 'edit' && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 mb-3 flex items-start gap-2">
                    <span className="text-blue-400 font-black text-sm flex-shrink-0">ℹ</span>
                    <p className="text-xs text-blue-700 font-semibold leading-relaxed">
                      Supports Markdown —{' '}
                      {['# H1', '## H2', '**bold**', '_italic_', '- list', '> quote', '`code`', '---'].map(s => (
                        <code key={s} className="bg-blue-100 px-1 py-0.5 rounded mx-0.5 font-mono">{s}</code>
                      ))}
                      . Changes auto-save 3 s after you stop typing.
                    </p>
                  </div>
                )}
                <div className="relative flex-1">
                  <textarea
                    ref={taRef}
                    value={content}
                    onChange={e => handleContentChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onScroll={handleScroll}
                    className="w-full bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-5
                               text-sm font-mono text-gray-800 leading-7 resize-none outline-none
                               focus:ring-2 focus:ring-orange-300 focus:border-orange-200
                               transition-all duration-200 hover:border-gray-200"
                    style={{ minHeight: editorH }}
                    placeholder={
                      '## Section Title\n\nYour content here…\n\n' +
                      '- Bullet point\n- Another point\n\n' +
                      '**Bold**, _italic_, `code`\n\n---\n\n> Blockquote'
                    }
                    spellCheck={false}
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-gray-300 font-mono select-none">
                    {charCount.toLocaleString()} chars
                  </div>
                </div>
              </div>
            )}

            {/* Preview pane */}
            {(tab === 'preview' || tab === 'split') && (
              <div
                ref={previewRef}
                className={`flex flex-col animate-in fade-in slide-in-from-right-2 duration-200 overflow-auto ${
                  tab === 'split' ? 'flex-1' : 'w-full'
                }`}
                style={{
                  minHeight: editorH,
                  maxHeight: tab === 'split' ? editorH : 'none',
                }}
              >
                {tab === 'split' && (
                  <div className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> PREVIEW
                  </div>
                )}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex-1">
                  {/* Simulated app header */}
                  <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl p-5 mb-6 shadow-lg shadow-orange-100">
                    <h1 className="text-xl font-black text-white">{title || 'Page Title'}</h1>
                    <p className="text-xs text-orange-100 mt-1 font-medium opacity-80">
                      Live preview · Auto-updates as you type
                    </p>
                  </div>
                  <div className="prose prose-sm max-w-none
                                  prose-headings:font-black prose-headings:text-gray-900
                                  prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                                  prose-p:text-gray-700 prose-p:leading-relaxed
                                  prose-a:text-orange-500 prose-a:font-semibold
                                  prose-strong:text-gray-900 prose-strong:font-black
                                  prose-code:bg-orange-50 prose-code:text-orange-600
                                  prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                                  prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                                  prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-xl
                                  prose-blockquote:border-l-4 prose-blockquote:border-orange-400
                                  prose-blockquote:bg-orange-50 prose-blockquote:not-italic
                                  prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:rounded-r-xl
                                  prose-table:text-sm prose-th:bg-gray-50 prose-th:font-black
                                  prose-hr:border-gray-200">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {content || '*Start writing to see the preview...*'}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Markdown cheatsheet (edit only, collapsible) ── */}
          {tab === 'edit' && (
            <details className="mt-4 group">
              <summary className="cursor-pointer select-none list-none flex items-center gap-2
                                  text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">
                <span className="transition-transform duration-200 group-open:rotate-90 inline-block">▶</span>
                Markdown cheatsheet (click to insert)
              </summary>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2
                              animate-in fade-in slide-in-from-top-1 duration-200">
                {[
                  ['# Heading 1',   'Large heading'],
                  ['## Heading 2',  'Section heading'],
                  ['### Heading 3', 'Sub-heading'],
                  ['**bold**',      'Bold text'],
                  ['_italic_',      'Italic text'],
                  ['~~strike~~',    'Strikethrough'],
                  ['`code`',        'Inline code'],
                  ['```\\ncode\\n```','Code block'],
                  ['- item',        'Bullet list'],
                  ['1. item',       'Numbered list'],
                  ['> quote',       'Blockquote'],
                  ['---',           'Divider line'],
                  ['[text](url)',   'Hyperlink'],
                  ['| A | B |',    'Table row'],
                ].map(([syntax, desc]) => (
                  <div
                    key={syntax}
                    onClick={() => {
                      if (!taRef.current) return;
                      const ta = taRef.current;
                      const { selectionStart: ss, value } = ta;
                      const ins = syntax.includes('\\n')
                        ? '\n```\ncode\n```\n'
                        : '\n' + syntax + '\n';
                      const next = value.slice(0, ss) + ins + value.slice(ss);
                      handleContentChange(next);
                      requestAnimationFrame(() => {
                        ta.setSelectionRange(ss + ins.length, ss + ins.length);
                        ta.focus();
                      });
                    }}
                    className="bg-white rounded-xl border border-gray-100 p-2.5 cursor-pointer group/chip
                               hover:border-orange-300 hover:bg-orange-50 transition-all duration-150"
                  >
                    <code className="text-xs text-orange-600 font-mono group-hover/chip:text-orange-700">
                      {syntax}
                    </code>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* ── Danger zone ── */}
          <div className="mt-8 border border-red-100 bg-red-50/60 rounded-2xl p-5">
            <h3 className="text-sm font-black text-red-700 mb-1">⚠️ Danger Zone</h3>
            <p className="text-xs text-red-400 mb-4">
              Hiding this page removes it from the app immediately. You can re-enable it from the list at any time.
            </p>
            <button
              onClick={async () => {
                if (!confirm(`Hide "${title}" from all users?`)) return;
                const { error: err } = await supabase
                  .from('legal_pages')
                  .update({ is_active: false })
                  .eq('slug', initialPage.slug);
                if (err) { alert(err.message); return; }
                router.push('/admin/legal');
              }}
              className="text-xs font-black text-red-600 border-2 border-red-200 bg-white
                         hover:bg-red-100 px-4 py-2 rounded-xl transition-all
                         hover:scale-105 active:scale-95"
            >
              Hide This Page from App
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
