// components/CMSContent.tsx
import React from 'react';
import SafeImage from '@/components/SafeImage';
import styles from '@/styles/CMSContent.module.css';

function normalizeUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}
function getDomain(url: string) {
  try {
    const u = new URL(normalizeUrl(url));
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
function isImageUrl(url: string) {
  try {
    const u = new URL(normalizeUrl(url));
    return /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(u.pathname);
  } catch { return false; }
}
function isVideoFile(url: string) {
  try {
    const u = new URL(normalizeUrl(url));
    return /\.(mp4|webm|ogg|mov)$/i.test(u.pathname);
  } catch { return false; }
}
function youTubeId(url: string): string | null {
  try {
    const u = new URL(normalizeUrl(url));
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || null;
    return null;
  } catch { return null; }
}
function vimeoId(url: string): string | null {
  try {
    const u = new URL(normalizeUrl(url));
    if (!u.hostname.includes('vimeo.com')) return null;
    const id = u.pathname.split('/').filter(Boolean)[0];
    return /^\d+$/.test(id || '') ? id! : null;
  } catch { return null; }
}

// Inline tokens; note: 'rawurl' will be removed from inline output to avoid showing raw links
const inlineTokenizers = [
  { type: 'code',   regex: /`([^`]+)`/g },
  { type: 'image',  regex: /!\[([^\]]*)\]\((https?:\/\/[^\s)]+|www\.[^\s)]+)\)/g },
  { type: 'button', regex: /\[(?:button|btn):\s*([^\]]+)\]\((https?:\/\/[^\s)]+|www\.[^\s)]+)\)/gi },
  { type: 'link',   regex: /\[([^\]]+)\]\((https?:\/\/[^\s)]+|www\.[^\s)]+)\)/g },
  { type: 'bold',   regex: /\*\*([^*]+)\*\*/g },
  { type: 'italic', regex: /\*([^*]+)\*/g },
  { type: 'rawurl', regex: /\b(https?:\/\/[^\s]+|www\.[^\s]+)\b/g },
];

type Block =
  | { kind: 'heading'; depth: 1|2|3|4|5|6; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'blockquote'; text: string }
  | { kind: 'ol'; items: string[] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'code'; lang?: string; code: string }
  | { kind: 'hr' }
  | { kind: 'table'; header: string[]; rows: string[][] };

function splitFences(input: string): Array<{ type: 'code'|'text'; content: string; lang?: string }> {
  const out: Array<{ type: 'code'|'text'; content: string; lang?: string }> = [];
  const regex = /``````/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(input))) {
    const [full, lang, code] = m;
    if (m.index > last) out.push({ type: 'text', content: input.slice(last, m.index) });
    out.push({ type: 'code', lang: lang || undefined, content: (code || '').trimEnd() });
    last = m.index + full.length;
  }
  if (last < input.length) out.push({ type: 'text', content: input.slice(last) });
  return out;
}

function tryParseTable(lines: string[], i: number) {
  const head = lines[i];
  const sep  = lines[i+1];
  if (!head || !sep || !/^\s*\|/.test(head) || !/^\s*\|/.test(sep)) return null;

  const header = head.trim().replace(/^\||\|$/g,'').split('|').map((c)=>c.trim());
  const sepOk  = sep.trim().replace(/^\||\|$/g,'').split('|').every((c)=>/^:?-{3,}:?$/.test(c.trim()));
  if (!sepOk) return null;

  const rows: string[][] = [];
  let j = i+2;
  while (j < lines.length && /^\s*\|/.test(lines[j])) {
    const row = lines[j].trim().replace(/^\||\|$/g,'').split('|').map((c)=>c.trim());
    rows.push(row); j++;
  }
  return { block: { kind:'table', header, rows } as Block, next: j };
}

function parseBlocks(input: string): Block[] {
  const parts  = splitFences(input);
  const blocks: Block[] = [];

  for (const part of parts) {
    if (part.type === 'code') { blocks.push({ kind:'code', lang:part.lang, code:part.content }); continue; }
    const text  = part.content.replace(/\r\n/g,'\n');
    const lines = text.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; } // blank

      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { blocks.push({ kind:'hr' }); i++; continue; }

      const h = line.match(/^\s*(#{1,6})\s+(.*)$/);
      if (h) { blocks.push({ kind:'heading', depth: h[1].length as 1|2|3|4|5|6, text: h[2].trim() }); i++; continue; }

      if (/^\s*>\s?/.test(line)) {
        const q: string[] = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/,'')); i++; }
        blocks.push({ kind:'blockquote', text: q.join('\n').trim() }); continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/,'')); i++; }
        blocks.push({ kind:'ol', items }); continue;
      }

      if (/^\s*[-*+]\s+/.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*+]\s+/,'')); i++; }
        blocks.push({ kind:'ul', items }); continue;
      }

      const tab = tryParseTable(lines, i);
      if (tab) { blocks.push(tab.block); i = tab.next!; continue; }

      const buf: string[] = [line]; i++;
      while (i < lines.length && lines[i].trim() && !/^\s*(#{1,6}|\d+\.|[-*+]\s+|>|\|)/.test(lines[i])) { buf.push(lines[i]); i++; }
      blocks.push({ kind:'paragraph', text: buf.join('\n') });
    }
  }
  return blocks;
}

// Render inline with links hidden (links will appear only as cards/embeds)
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  type Token = { type: string; start: number; end: number; match: RegExpExecArray };
  const tokens: Token[] = [];

  inlineTokenizers.forEach(({ type, regex }) => {
    let m: RegExpExecArray | null;
    while ((m = regex.exec(text))) tokens.push({ type, start: m.index, end: m.index + m[0].length, match: m });
  });
  tokens.sort((a, b) => a.start - b.start || b.end - a.end);

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    if (t.start < cursor) continue;
    if (t.start > cursor) nodes.push(<span key={`${keyBase}-t-${cursor}`}>{text.slice(cursor, t.start)}</span>);

    // Only render textual styles; skip link/url visual output
    if (t.type === 'code') {
      nodes.push(<code className={styles.inlineCode} key={`${keyBase}-c-${t.start}`}>{t.match[1]}</code>);
    } else if (t.type === 'bold') {
      nodes.push(<strong key={`${keyBase}-b-${t.start}`}>{t.match[1]}</strong>);
    } else if (t.type === 'italic') {
      nodes.push(<em key={`${keyBase}-i-${t.start}`}>{t.match[1]}</em>);
    } else if (t.type === 'image') {
      // keep inline markdown images visible
      const href = normalizeUrl(t.match[2]);
      nodes.push(
        <span className={styles.inlineImage} key={`${keyBase}-img-${t.start}`}>
          <SafeImage src={href} alt={t.match[1] || ''} width={1200} height={700} className={styles.cmsImage} />
        </span>
      );
    } else if (t.type === 'button' || t.type === 'link' || t.type === 'rawurl') {
      // skip inline rendering; will show as cards/embeds below paragraph
    }

    cursor = t.end;
  }
  if (cursor < text.length) nodes.push(<span key={`${keyBase}-t-end`}>{text.slice(cursor)}</span>);
  return nodes;
}

// Under-paragraph media/cards; ensures links don't appear as raw text
function renderEnhancements(text: string, keyBase: string): React.ReactNode {
  const cards: React.ReactNode[] = [];
  const urlRegex = /\b(https?:\/\/[^\s]+|www\.[^\s]+)\b/g;
  let m: RegExpExecArray | null;
  while ((m = urlRegex.exec(text))) {
    const href = normalizeUrl(m[1]);
    const yt = youTubeId(href);
    const vm = vimeoId(href);

    if (yt) {
      cards.push(
        <div className={styles.embed} key={`${keyBase}-yt-${m.index}`}>
          <iframe
            className={styles.iframe}
            src={`https://www.youtube.com/embed/${yt}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    } else if (vm) {
      cards.push(
        <div className={styles.embed} key={`${keyBase}-vm-${m.index}`}>
          <iframe
            className={styles.iframe}
            src={`https://player.vimeo.com/video/${vm}`}
            title="Vimeo video"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    } else if (isImageUrl(href)) {
      cards.push(
        <figure className={styles.cmsImageWrap} key={`${keyBase}-img-${m.index}`}>
          <SafeImage src={href} alt={href} width={1200} height={700} className={styles.cmsImage} />
          <figcaption className={styles.imgCaption}>{getDomain(href)}</figcaption>
        </figure>
      );
    } else if (isVideoFile(href)) {
      cards.push(
        <div className={styles.video} key={`${keyBase}-vid-${m.index}`}>
          <video src={href} controls playsInline preload="metadata" />
        </div>
      );
    } else {
      cards.push(
        <div className={styles.linkCard} key={`${keyBase}-card-${m.index}`}>
          <div className={styles.linkMeta}>
            <div className={styles.linkHost}>{getDomain(href)}</div>
            <div className={styles.linkUrl} title={href}>{href}</div>
          </div>
          <a href={href} className={styles.linkOpen} rel="noopener noreferrer" aria-label="Open link">
            Open →
          </a>
        </div>
      );
    }
  }
  return cards.length ? <div className={styles.cardStack}>{cards}</div> : null;
}

export default function CMSContent({ body }: { body: string }) {
  const blocks = React.useMemo(() => parseBlocks(body || ''), [body]);

  return (
    <div className={styles.cmsContent}>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case 'heading': {
            const tag = (['h1','h2','h3','h4','h5','h6'][b.depth - 1]) as 'h1'|'h2'|'h3'|'h4'|'h5'|'h6';
            return React.createElement(tag, { className: styles.heading, key: `h-${i}` }, renderInline(b.text, `h-${i}`));
          }
          case 'paragraph': {
            return (
              <div key={`p-${i}`}>
                <p className={styles.paragraph}>{renderInline(b.text, `p-${i}`)}</p>
                {renderEnhancements(b.text, `p-${i}`)}
              </div>
            );
          }
          case 'blockquote':
            return <blockquote className={styles.blockquote} key={`q-${i}`}>{renderInline(b.text, `q-${i}`)}</blockquote>;
          case 'ol':
            return <ol className={styles.ol} key={`ol-${i}`}>{b.items.map((t,j)=><li key={`ol-${i}-${j}`}>{renderInline(t,`ol-${i}-${j}`)}</li>)}</ol>;
          case 'ul':
            return <ul className={styles.ul} key={`ul-${i}`}>{b.items.map((t,j)=><li key={`ul-${i}-${j}`}>{renderInline(t,`ul-${i}-${j}`)}</li>)}</ul>;
          case 'code':
            return <pre className={styles.code} key={`c-${i}`}><code>{b.code}</code></pre>;
          case 'hr':
            return <hr className={styles.hr} key={`hr-${i}`} />;
          case 'table':
            return (
              <div className={styles.tableWrap} key={`tbl-${i}`}>
                <table className={styles.table}>
                  <thead><tr>{b.header.map((h,j)=><th key={`th-${i}-${j}`}>{h}</th>)}</tr></thead>
                  <tbody>
                    {b.rows.map((r,ri)=>(
                      <tr key={`tr-${i}-${ri}`}>{r.map((c,cj)=><td key={`td-${i}-${ri}-${cj}`}>{c}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default: return null;
        }
      })}
    </div>
  );
}
