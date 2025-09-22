/**
 * /app/assets/js/news.js
 * PattiBytes News (List + Reader)
 * - Data source: /news/index.json (Jekyll collection JSON)
 * - Base URL aware via <meta name="jekyll-baseurl" content="{{ site.baseurl }}">
 * - Infinite scroll (IntersectionObserver), native share/copy, save/like, JSON-LD in reader
 */

/* ---------- Utilities ---------- */
const $ = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));
const getBase = () => document.querySelector('meta[name="jekyll-baseurl"]')?.content || '';

const escapeHtml = (s='') => s.replace(/[&<>"']/g, ch => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[ch]));

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('pa-IN', { year:'numeric', month:'short', day:'numeric' });
  } catch {
    return d;
  }
};

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

/* ---------- Data API ---------- */
const NewsAPI = {
  async fetchIndex() {
    const base = getBase();                                              // e.g. "" or "/repo" on GH Pages [web:415]
    const endpoints = [
      `${base}/news/index.json`,                                         // JSON index generated from Jekyll collection [web:383]
      `${base}/_api/collections/news/entries`                            // Jekyll Admin fallback (if present) [web:389]
    ];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { credentials: 'same-origin', headers: { 'Accept': 'application/json' } }); // fetch returns ok=false on 404 [web:439]
        if (!res.ok) { console.warn('[news] fetch failed', url, res.status); continue; }                         // log bad status for diagnostics [web:441]
        const j = await res.json();
        if (url.includes('/_api/')) {
          const out = (j || []).map(e => ({
            id: e.id || e.slug,
            slug: e.slug || (e.title || '').toLowerCase().replace(/[^a-z0-9]+/g,'-'),
            title: e.title,
            preview: e.excerpt || e.preview || '',
            content: e.content || e.raw_content || '',
            date: e.date || e.modified_time || e.created_at || new Date().toISOString(),
            author: (e.author && (e.author.name || e.author)) || 'Staff',
            tags: e.tags || [],
            image: e.image || e.featured_image || null,
            url: e.http_url || `${base}/news/${e.slug || e.id}/`
          }));
          console.info('[news] loaded via Jekyll Admin API:', out.length);
          return out;                                                     // normalized fallback shape [web:389]
        }
        const items = Array.isArray(j) ? j : (j.items || []);             // allow {items:[...]} or bare array [web:398]
        if (!Array.isArray(items)) { console.error('[news] invalid JSON shape', j); continue; }                  // guard malformed feeds [web:439]
        const norm = items.map(a => ({
          id: a.id || a.slug,
          slug: a.slug || a.id,
          title: a.title,
          preview: a.preview || a.excerpt || '',
          content: a.content || '',
          date: a.date,
          author: a.author || 'Staff',
          tags: a.tags || [],
          image: a.image || null,
          url: a.url ? `${base}${a.url}`.replace(/\/+$/,'/') : `${base}/news/${a.slug || a.id}/`
        }));
        console.info('[news] loaded index.json:', norm.length);
        return norm;                                                      // normalized collection items [web:383]
      } catch (err) {
        console.error('[news] fetch error', url, err);                    // surface CORS/JSON parse errors in console [web:439]
      }
    }
    return [];                                                            // no endpoint worked; UI will show empty state [web:383]
  }
};

/* ---------- LIST PAGE ---------- */
if ($('#newsGrid')) {
  console.log('[news] init list');
  const state = { all: [], filtered: [], page: 0, size: 12, q: '', tag: 'all' };
  const grid = $('#newsGrid');
  const sentinel = $('#infiniteSentinel');

  const empty = (msg) => {
    grid.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(msg)}</p>
        <a class="btn" href="${getBase() || '/'}">ਘਰ ਵਾਪਸ ਜਾਓ</a>
      </div>
    `;
  };

  const cardHTML = (a) => `
    ${a.image ? `
      <div class="media">
        <span class="badge">${(a.tags && a.tags[0]) || 'ਖ਼ਬਰ'}</span>
        <img src="${a.image}" alt="${escapeHtml(a.title)}" loading="lazy">
      </div>` : ''
    }
    <div class="card-body">
      <h3 class="card-title">${escapeHtml(a.title)}</h3>
      <div class="card-meta">
        <time datetime="${a.date}">${fmtDate(a.date)}</time>
        <span>· ${escapeHtml(a.author || 'Staff')}</span>
      </div>
      <p class="card-preview">${escapeHtml(a.preview || '')}</p>
      <div class="card-actions">
        <a class="btn" href="${getBase()}/app/news/article.html?id=${encodeURIComponent(a.id || a.slug)}">ਪੂਰਾ ਪੜ੍ਹੋ →</a>
        <div class="action-buttons">
          <button class="btn ghost share" data-title="${escapeHtml(a.title)}" data-text="${escapeHtml(a.preview || a.title)}" data-url="${a.url}">📤</button>
          <button class="btn ghost copy"  data-url="${a.url}">🔗</button>
          <button class="btn ghost save"  data-id="${a.id}">🔖</button>
        </div>
      </div>
    </div>
  `;

  const renderChunk = () => {
    const start = state.page * state.size;
    const slice = state.filtered.slice(start, start + state.size);
    if (!slice.length && state.page === 0) { empty('ਕੋਈ ਨਤੀਜੇ ਨਹੀਂ'); return; }            // early empty state [web:383]
    const frag = document.createDocumentFragment();
    slice.forEach(a => {
      const el = document.createElement('article');
      el.className = 'news-card';
      el.dataset.id = a.id;
      el.innerHTML = cardHTML(a);
      frag.appendChild(el);
    });
    grid.appendChild(frag);
    state.page += 1;
    if (state.page * state.size >= state.filtered.length) sentinel.dataset.done = '1';        // stop observing when done [web:400]
  };

  const applyFilters = () => {
    const q = state.q.toLowerCase().trim();
    const tag = state.tag;
    state.filtered = state.all.filter(a => {
      const qm = !q || a.title.toLowerCase().includes(q) || (a.preview || '').toLowerCase().includes(q);
      const tm = tag === 'all' || (a.tags || []).includes(tag);
      return qm && tm;
    });
    grid.innerHTML = '';
    state.page = 0;
    delete sentinel.dataset.done;
    renderChunk();
  };

  const observeInfinite = () => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting && !sentinel.dataset.done) renderChunk(); });
    }, { rootMargin: '600px 0px 800px 0px' });                                                                // prefetch ahead [web:400]
    io.observe(sentinel);
  };

  const bindListUI = () => {
    $('#newsSearch')?.addEventListener('input', (e) => { state.q = e.target.value || ''; applyFilters(); });  // live search [web:383]
    $$('.chip').forEach(ch => ch.addEventListener('click', () => {
      $$('.chip').forEach(c => c.classList.remove('active'));
      ch.classList.add('active');
      state.tag = ch.dataset.filter || 'all';
      applyFilters();
    }));                                                                                                      // category chips [web:383]
    grid.addEventListener('click', async (e) => {
      const share = e.target.closest('button.share');
      const copy  = e.target.closest('button.copy');
      const save  = e.target.closest('button.save');
      if (share) {
        const data = { title: share.dataset.title, text: share.dataset.text, url: share.dataset.url };
        try {
          if (navigator.share && (navigator.canShare?.(data) ?? true)) { await navigator.share(data); }      // Web Share API [web:390]
          else throw new Error('no-share');
        } catch { await copyToClipboard(data.url); }                                                          // fallback to copy [web:390]
      }
      if (copy) { await copyToClipboard(copy.dataset.url); }                                                  // copy link [web:439]
      if (save) {
        const id = save.dataset.id;
        const saved = new Set(JSON.parse(localStorage.getItem('patti-saved') || '[]'));
        if (saved.has(id)) { saved.delete(id); save.textContent = '🔖'; }
        else { saved.add(id); save.textContent = '✅ Saved'; }
        localStorage.setItem('patti-saved', JSON.stringify([...saved]));                                      // simple local save [web:439]
      }
    });
  };

  const showSkeleton = () => {
    grid.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const sk = document.createElement('div');
      sk.className = 'news-card';
      sk.innerHTML = `
        <div class="media skeleton"></div>
        <div class="card-body">
          <div class="skeleton" style="height:18px;width:80%"></div>
          <div class="skeleton" style="height:14px;width:50%;margin-top:6px"></div>
          <div class="skeleton" style="height:14px;width:90%;margin-top:12px"></div>
          <div class="skeleton" style="height:14px;width:70%;margin-top:6px"></div>
        </div>
      `;
      grid.appendChild(sk);
    }
  };

  (async function initList() {
    showSkeleton();
    const items = await NewsAPI.fetchIndex();
    if (!items.length) { console.warn('[news] no items'); grid.innerHTML = ''; empty('ਖ਼ਬਰਾਂ ਲੋਡ ਨਹੀਂ ਹੋਈਆਂ'); return; } // JSON missing/empty [web:398]
    state.all = items;
    bindListUI();
    applyFilters();
    observeInfinite();
    console.log('[news] list ready with', items.length, 'items');
  })();
}

/* ---------- READER PAGE ---------- */
if ($('#reader')) {
  console.log('[news] init reader');
  const qs = new URLSearchParams(location.search);
  const want = qs.get('id') || qs.get('slug') || location.pathname.split('/').filter(Boolean).pop();

  const tEl = $('#articleTitle');
  const dEl = $('#articleTime');
  const aEl = $('#articleAuthor [itemprop="name"]');
  const hEl = $('#articleHero');
  const bEl = $('#articleContent');
  const likeBtn = $('#likeBtn'), likeCnt = $('#likeCount'), saveBtn = $('#saveBtn'), shareBtn = $('#shareBtn'), copyBtn = $('#copyBtn');

  const likeKey = (id) => `patti-like-${id}`;
  const saveKey = (id) => `patti-save-${id}`;

  const setMeta = (a) => {
    document.title = `${a.title} • PattiBytes`;
    $('#docTitle')?.textContent = document.title;
    $('#metaDesc')?.setAttribute('content', (a.preview || a.title || '').slice(0,160));
    const ld = {
      "@context":"https://schema.org",
      "@type":"NewsArticle",
      "headline": a.title,
      "datePublished": a.date,
      "author": { "@type":"Person", "name": a.author || "Staff" },
      "image": a.image ? [a.image] : undefined,
      "mainEntityOfPage": a.url || location.href
    };
    $('#articleJsonLd')?.textContent = JSON.stringify(ld);                                                    // JSON‑LD for SEO [web:383]
  };

  (async function initReader() {
    const items = await NewsAPI.fetchIndex();
    if (!items.length) { bEl.innerHTML = '<p>ਖ਼ਬਰ ਨਹੀਂ ਮਿਲੀ</p>'; return; }                                   // guard missing feed [web:398]
    const a = items.find(x => (x.id === want) || (x.slug === want)) || items[0];

    tEl.textContent = a.title;
    dEl.dateTime = a.date; dEl.textContent = new Date(a.date).toLocaleString('pa-IN');
    aEl.textContent = a.author || 'Staff';
    if (a.image) hEl.innerHTML = `<img src="${a.image}" alt="${escapeHtml(a.title)}" loading="eager">`;
    bEl.innerHTML = a.content || a.preview || '';
    setMeta(a);

    // like
    let likes = parseInt(localStorage.getItem(likeKey(a.id)), 10) || 0;
    likeCnt.textContent = likes;
    likeBtn.addEventListener('click', () => {
      likes += 1;
      likeCnt.textContent = likes;
      localStorage.setItem(likeKey(a.id), String(likes));
    });

    // save
    if (localStorage.getItem(saveKey(a.id))) saveBtn.textContent = '✅ Saved';
    saveBtn.addEventListener('click', () => {
      const k = saveKey(a.id);
      if (localStorage.getItem(k)) { localStorage.removeItem(k); saveBtn.textContent='🔖 Save'; }
      else { localStorage.setItem(k,'1'); saveBtn.textContent='✅ Saved'; }
    });

    // share/copy
    shareBtn.addEventListener('click', async () => {
      const data = { title:a.title, text:a.preview || a.title, url:a.url || location.href };
      try {
        if (navigator.share && (navigator.canShare?.(data) ?? true)) { await navigator.share(data); }          // native share [web:390]
        else throw new Error('no-share');
      } catch { await copyToClipboard(data.url); }                                                             // copy fallback [web:390]
    });
    copyBtn.addEventListener('click', async () => { await copyToClipboard(a.url || location.href); });         // quick copy [web:439]

    console.log('[news] reader ready:', a.title);
  })();
}
