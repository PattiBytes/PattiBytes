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
  Bold, Italic, List, ListOrdered, Quote,
  Code, Code2, Minus, Link as LinkIcon, Table,
  Maximize2, Minimize2, Save, Loader2, CheckCircle,
  Eye, Edit3, Columns, Undo2, Redo2, Strikethrough,
  Pencil, Check, X, ChevronDown,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type LegalPage = {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_active: boolean;
  updated_at: string;
};
type Tab = 'edit' | 'preview' | 'split';

// ── Format helper ─────────────────────────────────────────────────────────────
function applyFormat(ta: HTMLTextAreaElement, onChange: (v: string) => void, type: string) {
  const { selectionStart: s, selectionEnd: e, value } = ta;
  const selected = value.slice(s, e);

  const inlineMap: Record<string, [string, string, string]> = {
    bold:   ['**', '**', 'bold text'],
    italic: ['_',  '_',  'italic text'],
    strike: ['~~', '~~', 'strikethrough'],
    code:   ['`',  '`',  'code'],
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

  if (type === 'codeblock') {
    const block = '```\n' + (selected || 'code') + '\n```';
    const next  = value.slice(0, s) + block + value.slice(e);
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
    const tbl = '\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell     | Cell     | Cell     |\n';
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

  const prefixMap: Record<string, string> = {
    h1: '# ', h2: '## ', h3: '### ', ul: '- ', ol: '1. ', quote: '> ',
  };
  if (prefixMap[type]) {
    const prefix    = prefixMap[type];
    const lineStart = value.lastIndexOf('\n', s - 1) + 1;
    const lineEnd   = value.indexOf('\n', s);
    const end       = lineEnd === -1 ? value.length : lineEnd;
    const line      = value.slice(lineStart, end);
    const toggled   = line.startsWith(prefix) ? line.slice(prefix.length) : prefix + line;
    onChange(value.slice(0, lineStart) + toggled + value.slice(end));
    requestAnimationFrame(() => {
      const off = line.startsWith(prefix) ? -prefix.length : prefix.length;
      ta.setSelectionRange(s + off, s + off);
      ta.focus();
    });
  }
}

// ── Toolbar button ─────────────────────────────────────────────────────────────
function TBtn({
  onClick, title, active, wide, children,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`
        relative group flex items-center justify-center gap-1
        ${wide ? 'px-2.5' : 'px-2'} py-1.5 rounded-lg text-sm font-bold select-none
        transition-all duration-150 hover:scale-105 active:scale-95
        ${active
          ? 'bg-orange-100 text-orange-600 shadow-inner'
          : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'}
      `}
    >
      {children}
      <span className="
        pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2
        bg-gray-800 text-white text-[10px] font-semibold px-2 py-1 rounded-lg shadow-xl
        opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap z-50
      ">
        {title}
      </span>
    </button>
  );
}

function Sep() {
  return <div className="w-px h-6 bg-gray-200/70 mx-1 self-center flex-shrink-0" />;
}

// ── Floating selection toolbar ─────────────────────────────────────────────────
function FloatBar({ onFmt, pos }: {
  onFmt: (t: string) => void;
  pos: { x: number; y: number };
}) {
  return (
    <div
      onMouseDown={e => e.preventDefault()}
      style={{ left: pos.x, top: pos.y }}
      className="absolute z-40 flex items-center gap-px bg-gray-900/95 backdrop-blur-sm
                 text-white rounded-2xl shadow-2xl shadow-black/30 px-2 py-1.5
                 animate-in fade-in zoom-in-95 duration-150 border border-white/10"
    >
      {/* Headings */}
      {(['h1','h2','h3'] as const).map(h => (
        <button key={h} type="button" onClick={() => onFmt(h)}
          className="px-2 py-1 rounded-lg text-xs font-black hover:bg-white/20 transition-colors uppercase tracking-wide">
          {h}
        </button>
      ))}
      <div className="w-px h-4 bg-white/20 mx-1" />
      {/* Formatting */}
      <button type="button" onClick={() => onFmt('bold')}
        className="px-2 py-1 rounded-lg hover:bg-white/20 transition-colors">
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={() => onFmt('italic')}
        className="px-2 py-1 rounded-lg hover:bg-white/20 transition-colors">
        <Italic className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={() => onFmt('strike')}
        className="px-2 py-1 rounded-lg hover:bg-white/20 transition-colors">
        <Strikethrough className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={() => onFmt('code')}
        className="px-2 py-1 rounded-lg hover:bg-white/20 transition-colors">
        <Code className="w-3.5 h-3.5" />
      </button>
      <div className="w-px h-4 bg-white/20 mx-1" />
      <button type="button" onClick={() => onFmt('link')}
        className="px-2 py-1 rounded-lg hover:bg-white/20 transition-colors">
        <LinkIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function LegalPageEditor({ initialPage }: { initialPage: LegalPage }) {
  const router = useRouter();

  const [title,       setTitle]       = useState(initialPage.title);
  const [slug,        setSlug]        = useState(initialPage.slug);
  const [slugInput,   setSlugInput]   = useState(initialPage.slug);
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugError,   setSlugError]   = useState<string | null>(null);
  const [content,     setContent]     = useState(initialPage.content);
  const [tab,         setTab]         = useState<Tab>('edit');
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [dirty,       setDirty]       = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [fullscreen,  setFullscreen]  = useState(false);
  const [autoSaving,  setAutoSaving]  = useState(false);
  const [showHMenu,   setShowHMenu]   = useState(false);
  const [floatPos,    setFloatPos]    = useState<{ x: number; y: number } | null>(null);

  const taRef         = useRef<HTMLTextAreaElement>(null);
  const previewRef    = useRef<HTMLDivElement>(null);
  const wrapRef       = useRef<HTMLDivElement>(null);
  const hMenuRef      = useRef<HTMLDivElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyRef    = useRef<string[]>([initialPage.content]);
  const historyIdx    = useRef<number>(0);

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = content.length;
  const readMins  = Math.max(1, Math.ceil(wordCount / 200));
  const updatedDate = new Date(initialPage.updated_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  // Close heading menu on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (hMenuRef.current && !hMenuRef.current.contains(e.target as Node)) setShowHMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── History ────────────────────────────────────────────────────────────────
  const pushHistory = (val: string) => {
    const h = historyRef.current.slice(0, historyIdx.current + 1);
    h.push(val);
    historyRef.current = h.slice(-50);
    historyIdx.current = historyRef.current.length - 1;
  };

  const undo = useCallback(() => {
    if (historyIdx.current > 0) { historyIdx.current--; setContent(historyRef.current[historyIdx.current]); }
  }, []);

  const redo = useCallback(() => {
    if (historyIdx.current < historyRef.current.length - 1) { historyIdx.current++; setContent(historyRef.current[historyIdx.current]); }
  }, []);

  const handleContentChange = useCallback((val: string) => {
    setContent(val); setDirty(true); setSaved(false); pushHistory(val);
  }, []);

  const fmt = useCallback((type: string) => {
    if (!taRef.current) return;
    applyFormat(taRef.current, handleContentChange, type);
    setFloatPos(null);
  }, [handleContentChange]);

  // ── Auto-save ──────────────────────────────────────────────────────────────
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
          .eq('slug', slug);
        if (!err) { setDirty(false); setSaved(true); }
      } finally { setAutoSaving(false); }
    }, 3000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [content, title, dirty, slug]);

  // ── Manual save ────────────────────────────────────────────────────────────
  const save = useCallback(async () => {
    if (!title.trim() || !content.trim()) { setError('Title and content cannot be empty.'); return; }
    setSaving(true); setError(null);
    try {
      const { error: err } = await supabase
        .from('legal_pages')
        .update({ title: title.trim(), content: content.trim(), updated_at: new Date().toISOString() })
        .eq('slug', slug);
      if (err) throw err;
      setDirty(false); setSaved(true);
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save.');
    } finally { setSaving(false); }
  }, [title, content, slug, router]);

  // ── Slug save ──────────────────────────────────────────────────────────────
  const saveSlug = async () => {
    const newSlug = slugInput
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setSlugInput(newSlug);
    setSlugError(null);
    if (!newSlug) { setSlugError('Slug cannot be empty'); return; }
    if (newSlug === slug) { setEditingSlug(false); return; }
    try {
      const { data: exists } = await supabase
        .from('legal_pages').select('id').eq('slug', newSlug).neq('id', initialPage.id).maybeSingle();
      if (exists) { setSlugError('This slug is already taken'); return; }
      const { error: err } = await supabase
        .from('legal_pages').update({ slug: newSlug }).eq('id', initialPage.id);
      if (err) throw err;
      setSlug(newSlug);
      setEditingSlug(false);
      router.push(`/admin/legal/${newSlug}`);
    } catch (e: any) { setSlugError(e?.message ?? 'Failed to update slug'); }
  };

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta  = taRef.current;
    if (!ta) return;
    const mod = e.ctrlKey || e.metaKey;

    if (mod && e.key === 's')                                          { e.preventDefault(); save();            return; }
    if (mod && e.key === 'b')                                          { e.preventDefault(); fmt('bold');       return; }
    if (mod && e.key === 'i')                                          { e.preventDefault(); fmt('italic');     return; }
    if (mod && e.key === 'k')                                          { e.preventDefault(); fmt('link');       return; }
    if (mod && e.shiftKey && e.key === 'X')                            { e.preventDefault(); fmt('strike');     return; }
    if (mod && e.shiftKey && e.key === 'C')                            { e.preventDefault(); fmt('codeblock'); return; }
    if (mod && !e.shiftKey && e.key === 'z')                           { e.preventDefault(); undo();           return; }
    if (mod && (e.key === 'y' || (e.shiftKey && e.key === 'z')))      { e.preventDefault(); redo();           return; }
    if (mod && e.key === '1')                                          { e.preventDefault(); fmt('h1');         return; }
    if (mod && e.key === '2')                                          { e.preventDefault(); fmt('h2');         return; }
    if (mod && e.key === '3')                                          { e.preventDefault(); fmt('h3');         return; }

    // Auto-pair wraps selection
    const pairs: Record<string, string> = { '`': '`', '*': '*', '_': '_', '[': ']' };
    if (pairs[e.key] && !e.shiftKey) {
      const { selectionStart: ss, selectionEnd: se, value } = ta;
      if (ss !== se) {
        e.preventDefault();
        const next = value.slice(0, ss) + e.key + value.slice(ss, se) + pairs[e.key] + value.slice(se);
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
          handleContentChange(value.slice(0, lineStart) + '\n' + value.slice(ss));
          requestAnimationFrame(() => { ta.setSelectionRange(lineStart + 1, lineStart + 1); ta.focus(); });
        } else {
          const next = value.slice(0, ss) + '\n' + ulMatch[1] + value.slice(ss);
          handleContentChange(next);
          requestAnimationFrame(() => { const p = ss + 1 + ulMatch[1].length; ta.setSelectionRange(p, p); ta.focus(); });
        }
        return;
      }
      if (olMatch) {
        e.preventDefault();
        if (!olMatch[4].trim()) {
          handleContentChange(value.slice(0, lineStart) + '\n' + value.slice(ss));
          requestAnimationFrame(() => { ta.setSelectionRange(lineStart + 1, lineStart + 1); ta.focus(); });
        } else {
          const prefix = `${olMatch[1]}${parseInt(olMatch[2]) + 1}${olMatch[3]}`;
          const next   = value.slice(0, ss) + '\n' + prefix + value.slice(ss);
          handleContentChange(next);
          requestAnimationFrame(() => { const p = ss + 1 + prefix.length; ta.setSelectionRange(p, p); ta.focus(); });
        }
        return;
      }
    }

    // Tab = 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart: ss, selectionEnd: se, value } = ta;
      handleContentChange(value.slice(0, ss) + '  ' + value.slice(se));
      requestAnimationFrame(() => { ta.setSelectionRange(ss + 2, ss + 2); ta.focus(); });
    }
  };

  // ── Floating toolbar on mouse-select ──────────────────────────────────────
  const handleMouseUp = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const ta = taRef.current;
    if (!ta || ta.selectionStart === ta.selectionEnd) { setFloatPos(null); return; }
    const wRect = wrapRef.current?.getBoundingClientRect();
    if (!wRect) return;
    setFloatPos({
      x: Math.min(Math.max(e.clientX - wRect.left, 80), wRect.width - 80),
      y: Math.max(e.clientY - wRect.top - 56, 0),
    });
  };

  const handleScroll = () => {
    if (tab !== 'split' || !taRef.current || !previewRef.current) return;
    const ta    = taRef.current;
    const ratio = ta.scrollTop / Math.max(1, ta.scrollHeight - ta.clientHeight);
    previewRef.current.scrollTop = ratio * (previewRef.current.scrollHeight - previewRef.current.clientHeight);
  };

  const editorH = fullscreen ? 'calc(100vh - 155px)' : tab === 'split' ? 'calc(100vh - 256px)' : '560px';

  return (
    <DashboardLayout>
      <div className={`bg-gray-50 min-h-full transition-all duration-300 ${
        fullscreen ? 'fixed inset-0 z-50 bg-white overflow-auto' : ''
      }`}>

        {/* ══ Sticky top bar ══════════════════════════════════════════════════ */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">

          {/* ── Row 1: breadcrumb / title / actions ── */}
          <div className="px-4 sm:px-6 py-2.5 flex items-center gap-2.5 flex-wrap">

            <Link href="/admin/legal"
              className="text-sm font-black text-gray-400 hover:text-gray-900 transition-all duration-200
                         hover:-translate-x-0.5 flex items-center gap-1 whitespace-nowrap">
              ← Legal
            </Link>
            <div className="h-4 w-px bg-gray-200" />

            {/* Title */}
            <input
              className="flex-1 min-w-[140px] text-base font-black text-gray-900 bg-transparent outline-none
                         border-b-2 border-transparent focus:border-orange-400 py-1 transition-all duration-200
                         placeholder:text-gray-300"
              value={title}
              onChange={e => { setTitle(e.target.value); setDirty(true); setSaved(false); }}
              placeholder="Page title..."
            />

            {/* Stats pill */}
            <div className="hidden sm:flex items-center gap-2 bg-gray-50 rounded-full px-3 py-1
                            text-xs text-gray-400 font-semibold border border-gray-100 whitespace-nowrap">
              {wordCount} words · {readMins} min read
            </div>

            {/* Status badge */}
            {(saving || autoSaving) ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50
                               px-3 py-1 rounded-full animate-pulse whitespace-nowrap border border-blue-100">
                <Loader2 className="w-3 h-3 animate-spin" />
                {autoSaving ? 'Auto-saving…' : 'Saving…'}
              </span>
            ) : saved && !dirty ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50
                               px-3 py-1 rounded-full whitespace-nowrap border border-green-100
                               animate-in fade-in zoom-in-95 duration-300">
                <CheckCircle className="w-3 h-3" /> Saved
              </span>
            ) : dirty ? (
              <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50
                               px-3 py-1 rounded-full whitespace-nowrap border border-amber-100">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                Unsaved
              </span>
            ) : null}

            {/* ── Slug (editable) ── */}
            <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
              {editingSlug ? (
                <>
                  <span className="text-xs text-gray-400 font-mono">/legal/</span>
                  <input
                    autoFocus
                    value={slugInput}
                    onChange={e => { setSlugInput(e.target.value); setSlugError(null); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveSlug();
                      if (e.key === 'Escape') { setEditingSlug(false); setSlugInput(slug); setSlugError(null); }
                    }}
                    className={`text-xs font-mono px-2 py-1 rounded-lg border-2 outline-none w-36 transition-all ${
                      slugError ? 'border-red-400 bg-red-50' : 'border-orange-400 bg-orange-50 focus:ring-2 focus:ring-orange-200'
                    }`}
                  />
                  <button onClick={saveSlug}
                    className="p-1.5 hover:bg-green-100 rounded-lg text-green-600 transition-all hover:scale-110 active:scale-95">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { setEditingSlug(false); setSlugInput(slug); setSlugError(null); }}
                    className="p-1.5 hover:bg-red-100 rounded-lg text-red-400 transition-all hover:scale-110 active:scale-95">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {slugError && <span className="text-xs text-red-500 font-semibold">{slugError}</span>}
                </>
              ) : (
                <button
                  onClick={() => { setEditingSlug(true); setSlugInput(slug); }}
                  className="group flex items-center gap-1.5 text-xs font-mono
                             bg-gray-100 hover:bg-orange-50 border border-gray-200 hover:border-orange-200
                             text-gray-500 hover:text-orange-600 px-2.5 py-1 rounded-lg
                             transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  /legal/{slug}
                  <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>

            {/* Undo / Redo */}
            <div className="flex gap-0.5">
              <button type="button" onClick={undo} title="Undo (Ctrl+Z)"
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-all hover:scale-110 active:scale-95">
                <Undo2 className="w-4 h-4" />
              </button>
              <button type="button" onClick={redo} title="Redo (Ctrl+Y)"
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-all hover:scale-110 active:scale-95">
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            {/* Fullscreen */}
            <button type="button" onClick={() => setFullscreen(f => !f)} title="Toggle fullscreen"
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-all hover:scale-110 active:scale-95">
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Save */}
            <button
              onClick={save} disabled={saving || !dirty}
              className={`px-4 py-2 rounded-xl text-sm font-black flex items-center gap-1.5 whitespace-nowrap
                          transition-all duration-200 ${
                dirty && !saving
                  ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg hover:shadow-orange-200/50 hover:scale-105 active:scale-95'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
                : saved && !dirty
                  ? <><CheckCircle className="w-4 h-4" />Saved</>
                  : <><Save className="w-4 h-4" />Save</>}
            </button>
          </div>

          {/* Error bar */}
          {error && (
            <div className="bg-red-50 border-t border-red-100 px-6 py-2 flex items-center gap-2
                            animate-in slide-in-from-top-1 duration-200">
              <p className="text-xs text-red-600 font-semibold flex-1">⚠️ {error}</p>
              <button onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 text-xs font-bold hover:scale-110 transition-all">
                ✕
              </button>
            </div>
          )}

          {/* ── Row 2: Formatting toolbar ── */}
          {(tab === 'edit' || tab === 'split') && (
            <div className="px-3 sm:px-5 py-1.5 flex items-center gap-0.5 flex-wrap
                            border-t border-gray-100 bg-gradient-to-r from-gray-50/80 to-white/80">

              {/* Heading dropdown */}
              <div className="relative" ref={hMenuRef}>
                <TBtn onClick={() => setShowHMenu(m => !m)} title="Headings" wide>
                  <span className="text-xs font-black text-gray-700 tracking-tight">Heading</span>
                  <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${showHMenu ? 'rotate-180' : ''}`} />
                </TBtn>

                {showHMenu && (
                  <div className="absolute left-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl
                                  border border-gray-100/80 py-2 z-50 min-w-[180px]
                                  animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-150">
                    {[
                      { type: 'h1', label: 'Heading 1', cls: 'text-xl font-black text-gray-900', hint: 'Ctrl+1' },
                      { type: 'h2', label: 'Heading 2', cls: 'text-lg font-black text-gray-800', hint: 'Ctrl+2' },
                      { type: 'h3', label: 'Heading 3', cls: 'text-base font-black text-gray-700', hint: 'Ctrl+3' },
                    ].map(({ type, label, cls, hint }) => (
                      <button key={type} type="button"
                        onClick={() => { fmt(type); setShowHMenu(false); }}
                        className="w-full flex items-center justify-between px-4 py-2.5
                                   hover:bg-orange-50 hover:text-orange-600 transition-colors text-left group/hopt">
                        <span className={cls}>{label}</span>
                        <kbd className="text-[10px] text-gray-300 font-mono bg-gray-50 px-1.5 py-0.5 rounded
                                        group-hover/hopt:bg-orange-100 group-hover/hopt:text-orange-400 transition-colors">
                          {hint}
                        </kbd>
                      </button>
                    ))}
                    <div className="my-1.5 border-t border-gray-100" />
                    <button type="button"
                      onClick={() => setShowHMenu(false)}
                      className="w-full flex items-center px-4 py-2 hover:bg-gray-50 transition-colors text-left">
                      <span className="text-sm text-gray-500 font-semibold">Normal text</span>
                    </button>
                  </div>
                )}
              </div>

              <Sep />

              {/* Inline — styled text labels for B/I/S */}
              <TBtn onClick={() => fmt('bold')} title="Bold (Ctrl+B)">
                <span className="text-sm font-black tracking-tighter">B</span>
              </TBtn>
              <TBtn onClick={() => fmt('italic')} title="Italic (Ctrl+I)">
                <span className="text-sm italic font-semibold text-gray-700">I</span>
              </TBtn>
              <TBtn onClick={() => fmt('strike')} title="Strikethrough">
                <span className="text-sm font-semibold line-through text-gray-600">S</span>
              </TBtn>
              <TBtn onClick={() => fmt('code')} title="Inline code (`)">
                <Code className="w-4 h-4" />
              </TBtn>
              <TBtn onClick={() => fmt('codeblock')} title="Code block (Ctrl+Shift+C)">
                <Code2 className="w-4 h-4" />
              </TBtn>

              <Sep />

              <TBtn onClick={() => fmt('ul')}    title="Bullet list"><List        className="w-4 h-4" /></TBtn>
              <TBtn onClick={() => fmt('ol')}    title="Numbered list"><ListOrdered className="w-4 h-4" /></TBtn>
              <TBtn onClick={() => fmt('quote')} title="Blockquote">  <Quote       className="w-4 h-4" /></TBtn>

              <Sep />

              <TBtn onClick={() => fmt('link')}  title="Link (Ctrl+K)"><LinkIcon className="w-4 h-4" /></TBtn>
              <TBtn onClick={() => fmt('table')} title="Insert table"> <Table    className="w-4 h-4" /></TBtn>
              <TBtn onClick={() => fmt('hr')}    title="Divider">      <Minus    className="w-4 h-4" /></TBtn>

              {/* Shortcut hints */}
              <div className="ml-auto hidden xl:flex items-center gap-1 text-[10px] text-gray-300 font-mono pr-1">
                {[['Ctrl+S','save'],['Ctrl+B','bold'],['Ctrl+I','italic'],['Ctrl+K','link']].map(([k,l]) => (
                  <React.Fragment key={k}>
                    <kbd className="bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-md">{k}</kbd>
                    <span className="mr-2">{l}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* ── Row 3: View tabs ── */}
          <div className="px-4 sm:px-6 flex items-center gap-1 border-t border-gray-100">
            {([
              { key: 'edit'    as Tab, icon: <Edit3    className="w-3.5 h-3.5" />, label: 'Edit'    },
              { key: 'split'   as Tab, icon: <Columns  className="w-3.5 h-3.5" />, label: 'Split'   },
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
            <span className="ml-auto text-xs text-gray-300 pb-1.5 hidden sm:block font-mono">
              {updatedDate}
            </span>
          </div>
        </div>

              {/* ══ Editor / Preview ═══════════════════════════════════════════════ */}
        <div className="p-4 sm:p-6">
          <div className={`flex gap-4 transition-all duration-300 ${tab === 'split' ? 'flex-row' : 'flex-col'}`}>

            {/* ── Edit pane ── */}
            {(tab === 'edit' || tab === 'split') && (
              <div className={`flex flex-col animate-in fade-in slide-in-from-left-2 duration-200 ${
                tab === 'split' ? 'flex-1' : 'w-full'
              }`}>
                {tab === 'split' && (
                  <div className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5">
                    <Edit3 className="w-3 h-3" /> EDITOR
                  </div>
                )}

                {/* Relative wrapper for floating toolbar */}
                <div className="relative flex-1" ref={wrapRef}>

                  {/* Floating selection toolbar */}
                  {floatPos && (
                    <FloatBar
                      onFmt={fmt}
                      pos={floatPos}
                    />
                  )}

                  <textarea
                    ref={taRef}
                    value={content}
                    onChange={e => handleContentChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onScroll={handleScroll}
                    onMouseUp={handleMouseUp}
                    onMouseDown={() => setFloatPos(null)}
                    className="w-full bg-white rounded-2xl border-2 border-gray-100 shadow-sm p-5
                               text-sm text-gray-800 leading-8 resize-none outline-none font-sans
                               focus:ring-2 focus:ring-orange-300/50 focus:border-orange-200
                               transition-all duration-200 hover:border-gray-200
                               placeholder:text-gray-200 placeholder:font-normal"
                    style={{ minHeight: editorH }}
                    placeholder={[
                      'Start writing your legal content here…',
                      '',
                      'Use the toolbar above to format text — no Markdown needed.',
                      'Select any text to get a quick format popup.',
                      '',
                      'Tips:',
                      '  • Ctrl+B = Bold, Ctrl+I = Italic',
                      '  • Ctrl+1 / 2 / 3 = Headings',
                      '  • Ctrl+K = Insert link',
                      '  • Ctrl+S = Save',
                      '  • Enter on a list item continues the list automatically',
                    ].join('\n')}
                    spellCheck
                  />

                  {/* Bottom-right char count */}
                  <div className="absolute bottom-3 right-4 text-[11px] text-gray-200 font-mono select-none
                                  pointer-events-none transition-all duration-300">
                    {charCount.toLocaleString()} chars
                  </div>
                </div>

                {/* Quick-insert blocks (edit mode only) */}
                {tab === 'edit' && (
                  <div className="mt-3">
                    <details className="group">
                      <summary className="cursor-pointer select-none list-none flex items-center gap-2
                                          text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors
                                          w-fit">
                        <span className="transition-transform duration-200 group-open:rotate-90 inline-block text-gray-300">
                          ▶
                        </span>
                        Quick-insert blocks
                      </summary>

                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2
                                      animate-in fade-in slide-in-from-top-1 duration-200">
                        {([
                          { icon: '📌', label: 'Section heading',  action: () => fmt('h2'),       preview: 'Section Title'             },
                          { icon: '📝', label: 'Sub-heading',      action: () => fmt('h3'),       preview: 'Sub-section'               },
                          { icon: '✏️', label: 'Bold text',        action: () => fmt('bold'),     preview: '**bold text**'             },
                          { icon: '💬', label: 'Blockquote',       action: () => fmt('quote'),    preview: '> important note'          },
                          { icon: '•',  label: 'Bullet list',      action: () => fmt('ul'),       preview: '- Item one\n- Item two'    },
                          { icon: '1.', label: 'Numbered list',    action: () => fmt('ol'),       preview: '1. First\n2. Second'       },
                          { icon: '🔗', label: 'Link',             action: () => fmt('link'),     preview: '[text](url)'               },
                          { icon: '📊', label: 'Table',            action: () => fmt('table'),    preview: '| Col | Col |'             },
                          { icon: '💻', label: 'Code block',       action: () => fmt('codeblock'),preview: '```\ncode\n```'            },
                          { icon: '—',  label: 'Divider line',     action: () => fmt('hr'),       preview: '---'                       },
                          { icon: '🔴', label: 'Important notice', action: () => {
                            if (!taRef.current) return;
                            const ta  = taRef.current;
                            const { selectionStart: ss, value } = ta;
                            const ins = '\n> ⚠️ **Important:** Add your notice here.\n';
                            handleContentChange(value.slice(0, ss) + ins + value.slice(ss));
                            requestAnimationFrame(() => { ta.setSelectionRange(ss + ins.length, ss + ins.length); ta.focus(); });
                          }, preview: '> ⚠️ Important notice'  },
                          { icon: '📋', label: 'Definition item',  action: () => {
                            if (!taRef.current) return;
                            const ta = taRef.current;
                            const { selectionStart: ss, value } = ta;
                            const ins = '\n**Term:** Definition goes here.\n';
                            handleContentChange(value.slice(0, ss) + ins + value.slice(ss));
                            requestAnimationFrame(() => { ta.setSelectionRange(ss + ins.length, ss + ins.length); ta.focus(); });
                          }, preview: '**Term:** Definition' },
                        ] as { icon: string; label: string; action: () => void; preview: string }[]).map(({ icon, label, action, preview }) => (
                          <button
                            key={label}
                            type="button"
                            onClick={action}
                            className="group/blk text-left bg-white rounded-xl border-2 border-gray-100 p-3
                                       hover:border-orange-300 hover:bg-orange-50/50 hover:shadow-md
                                       hover:shadow-orange-100 hover:-translate-y-0.5
                                       transition-all duration-200 active:scale-95 active:translate-y-0"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base leading-none">{icon}</span>
                              <span className="text-xs font-black text-gray-700 group-hover/blk:text-orange-600 transition-colors">
                                {label}
                              </span>
                            </div>
                            <code className="text-[10px] text-gray-300 font-mono group-hover/blk:text-orange-400
                                             transition-colors leading-tight block truncate">
                              {preview}
                            </code>
                          </button>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}

            {/* ── Preview pane ── */}
            {(tab === 'preview' || tab === 'split') && (
              <div
                ref={previewRef}
                className={`flex flex-col animate-in fade-in slide-in-from-right-2 duration-200 overflow-auto ${
                  tab === 'split' ? 'flex-1' : 'w-full'
                }`}
                style={{ minHeight: editorH, maxHeight: tab === 'split' ? editorH : 'none' }}
              >
                {tab === 'split' && (
                  <div className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1.5">
                    <Eye className="w-3 h-3" /> LIVE PREVIEW
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex-1">

                  {/* 3D header card */}
                  <div
                    className="relative bg-gradient-to-br from-orange-500 via-orange-500 to-pink-600
                               p-6 overflow-hidden"
                    style={{
                      boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.1), 0 4px 24px -4px rgba(249,115,22,0.35)',
                    }}
                  >
                    {/* Decorative circles */}
                    <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
                    <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-pink-500/30 blur-lg pointer-events-none" />

                    <h1 className="relative text-xl font-black text-white drop-shadow-sm">
                      {title || 'Page Title'}
                    </h1>
                    <div className="relative flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 text-[11px] text-orange-100/80 font-semibold bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-full">
                        <Eye className="w-3 h-3" />
                        Live preview · auto-updates
                      </span>
                      <span className="text-[11px] text-orange-100/60 font-mono">/legal/{slug}</span>
                    </div>
                  </div>

                  {/* Rendered markdown */}
                  <div className="p-6">
                    <div className="
                      prose prose-sm max-w-none
                      prose-headings:font-black prose-headings:text-gray-900 prose-headings:tracking-tight
                      prose-h1:text-2xl prose-h1:border-b prose-h1:border-gray-100 prose-h1:pb-3
                      prose-h2:text-xl prose-h2:mt-8
                      prose-h3:text-base prose-h3:text-gray-800
                      prose-p:text-gray-700 prose-p:leading-relaxed prose-p:my-3
                      prose-a:text-orange-500 prose-a:font-semibold prose-a:no-underline hover:prose-a:underline
                      prose-strong:text-gray-900 prose-strong:font-black
                      prose-em:text-gray-700
                      prose-code:bg-orange-50 prose-code:text-orange-600
                      prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
                      prose-code:font-mono prose-code:text-[0.8em]
                      prose-code:before:content-none prose-code:after:content-none
                      prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-2xl
                      prose-pre:shadow-xl prose-pre:border prose-pre:border-gray-700/50
                      prose-blockquote:border-l-4 prose-blockquote:border-orange-400
                      prose-blockquote:bg-orange-50/60 prose-blockquote:not-italic
                      prose-blockquote:rounded-r-xl prose-blockquote:py-2 prose-blockquote:px-4
                      prose-blockquote:text-gray-700 prose-blockquote:font-medium
                      prose-ul:my-3 prose-ol:my-3
                      prose-li:text-gray-700 prose-li:marker:text-orange-400
                      prose-table:text-sm prose-table:w-full
                      prose-th:bg-orange-50 prose-th:font-black prose-th:text-gray-800
                      prose-th:px-3 prose-th:py-2 prose-th:border prose-th:border-gray-200
                      prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-gray-100
                      prose-hr:border-gray-200 prose-hr:my-6
                    ">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content || '_Start writing to see the live preview here…_'}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Danger zone ── */}
          <div className="mt-10 border-2 border-red-100 bg-gradient-to-br from-red-50/60 to-rose-50/30
                          rounded-2xl p-5 transition-all duration-200 hover:border-red-200 hover:shadow-sm
                          hover:shadow-red-100 group/dz">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0
                              group-hover/dz:bg-red-200 transition-colors">
                <span className="text-sm">⚠️</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-red-700 mb-1">Danger Zone</h3>
                <p className="text-xs text-red-400 mb-4 leading-relaxed">
                  Hiding this page removes it from the app immediately for all users.
                  You can re-enable it from the Legal Pages list at any time.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={async () => {
                      if (!confirm(`Hide "${title}" from all users?`)) return;
                      const { error: err } = await supabase
                        .from('legal_pages')
                        .update({ is_active: false })
                        .eq('slug', slug);
                      if (err) { alert(err.message); return; }
                      router.push('/admin/legal');
                    }}
                    className="text-xs font-black text-red-600 border-2 border-red-200 bg-white
                               hover:bg-red-600 hover:text-white hover:border-red-600
                               px-4 py-2 rounded-xl transition-all duration-200
                               hover:shadow-md hover:shadow-red-200 hover:scale-105 active:scale-95"
                  >
                    Hide This Page from App
                  </button>
                  <span className="text-xs text-red-300 font-medium">
                    This action is reversible
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Metadata footer ── */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-1 pb-6 text-xs text-gray-300 font-mono">
            <span>id: {initialPage.id}</span>
            <span>slug: /legal/{slug}</span>
            <span>updated: {updatedDate}</span>
            <span>status: {initialPage.is_active ? '🟢 active' : '🔴 hidden'}</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
