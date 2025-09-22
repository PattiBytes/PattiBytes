/* /app/assets/js/news.js — robust loader + reader with diagnostics (fixed apostrophe mapping) */

const $  = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));
const baseurl = () => document.querySelector('meta[name="jekyll-baseurl"]')?.content || '';
const escapeHtml = (s='') => s.replace(/[&<>"']/g, ch => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[ch])); // Corrected mapping fixes SyntaxError in object literal

const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('pa-IN',{year:'numeric',month:'short',day:'numeric'});} catch { return d; } };
const copy = async (t) => { try{ await navigator.clipboard.writeText(t);}catch{ const a=document.createElement('textarea'); a.value=t; document.body.appendChild(a); a.select(); document.execCommand('copy'); document.body.removeChild(a);} };

/* Data API */
const NewsAPI = {
  async fetchIndex() {
    const base = baseurl();
    const urls = [
      `${base}/news/index.json`,
      `${base}/_api/collections/news/entries`
    ];
    for (const url of urls) {
      try {
        const r = await fetch(url, { credentials:'same-origin', headers:{ 'Accept':'application/json' }});
        if (!r.ok) { console.warn('[news] fetch failed', url, r.status); continue; } // fetch resolves on HTTP 404; ok=false indicates error
        const j = await r.json();
        if (url.includes('/_api/')) {
          const out = (j||[]).map(e => ({
            id: e.id || e.slug,
            slug: e.slug || (e.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-'),
            title: e.title,
            preview: e.excerpt || e.preview || '',
            content: e.content || e.raw_content || '',
            date: e.date || e.modified_time || e.created_at || new Date().toISOString(),
            author: (e.author && (e.author.name || e.author)) || 'Staff',
            tags: e.tags || [],
            image: e.image || e.featured_image || null,
            url: e.http_url || `${base}/news/${e.slug || e.id}/`
          }));
          console.info('[news] loaded via Jekyll Admin API', out.length);
          return out;
        }
        const items = Array.isArray(j) ? j : (j.items || []);
        if (!Array.isArray(items)) { console.error('[news] JSON shape invalid', j); continue; }
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
        console.info('[news] loaded index.json', norm.length);
        return norm;
      } catch (err) {
        console.error('[news] fetch error', url, err);
      }
    }
    return [];
  }
};

/* List page */
if ($('#newsGrid')) {
  const state = { all:[], filtered:[], page:0, size:12, q:'', tag:'all' };
  const grid = $('#newsGrid');
  const sentinel = $('#infiniteSentinel');

  const empty = (msg) => {
    grid.innerHTML = `<div class="empty">
      <p>${escapeHtml(msg)}</p>
      <a class="btn" href="${baseurl()||'/'}">ਘਰ ਵਾਪਸ ਜਾਓ</a>
    </div>`;
  };

  const card = (a) => `
    ${a.image ? `<div class="media"><span class="badge">${(a.tags&&a.tags[0])||'ਖ਼ਬਰ'}</span><img src="${a.image}" alt="${escapeHtml(a.title)}" loading="lazy"></div>`:''}
    <div class="card-body">
      <h3 class="card-title">${escapeHtml(a.title)}</h3>
      <div class="card-meta">
        <time datetime="${a.date}">${fmtDate(a.date)}</time>
        <span>· ${escapeHtml(a.author||'Staff')}</span>
      </div>
      <p class="card-preview">${escapeHtml(a.preview||'')}</p>
      <div class="card-actions">
        <a class="btn" href="${baseurl()}/app/news/article.html?id=${encodeURIComponent(a.id || a.slug)}">ਪੂਰਾ ਪੜ੍ਹੋ →</a>
        <div>
          <button class="btn ghost share" data-title="${escapeHtml(a.title)}" data-text="${escapeHtml(a.preview||a.title)}" data-url="${a.url}">📤</button>
          <button class="btn ghost copy" data-url="${a.url}">🔗</button>
          <button class="btn ghost save" data-id="${a.id}">🔖</button>
        </div>
      </div>
    </div>`;

  const renderChunk = () => {
    const start = state.page * state.size;
    const slice = state.filtered.slice(start, start + state.size);
    if (!slice.length && !state.page) { empty('ਕੋਈ ਖ਼ਬਰ ਨਹੀਂ ਮਿਲੀ'); return; }
    const frag = document.createDocumentFragment();
    slice.forEach(a => {
      const el = document.createElement('article');
      el.className = 'news-card';
      el.dataset.id = a.id;
      el.innerHTML = card(a);
      frag.appendChild(el);
    });
    grid.appendChild(frag);
    state.page++;
    if (state.page * state.size >= state.filtered.length) sentinel.dataset.done = '1';
  };

  const applyFilters = () => {
    const q = state.q.toLowerCase().trim();
    const tag = state.tag;
    state.filtered = state.all.filter(a => {
      const qm = !q || a.title.toLowerCase().includes(q) || (a.preview||'').toLowerCase().includes(q);
      const tm = tag === 'all' || (a.tags||[]).includes(tag);
      return qm && tm;
    });
    grid.innerHTML = '';
    state.page = 0;
    delete sentinel.dataset.done;
    renderChunk();
  };

  const observe = () => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting && !sentinel.dataset.done) renderChunk(); });
    }, { rootMargin: '600px 0px 800px 0px' });
    io.observe(sentinel);
  };

  const bindUI = () => {
    $('#newsSearch')?.addEventListener('input', e => { state.q = e.target.value || ''; applyFilters(); });
    $$('.chip').forEach(ch => ch.addEventListener('click', () => {
      $$('.chip').forEach(c => c.classList.remove('active'));
      ch.classList.add('active'); state.tag = ch.dataset.filter || 'all'; applyFilters();
    }));
    grid.addEventListener('click', async e => {
      const s = e.target.closest('button.share'); const c = e.target.closest('button.copy'); const sv = e.target.closest('button.save');
      if (s) {
        const data = { title:s.dataset.title, text:s.dataset.text, url:s.dataset.url };
        try { if (navigator.share && (navigator.canShare?.(data) ?? true)) await navigator.share(data); else throw 0; }
        catch { await copy(data.url); }
      }
      if (c) await copy(c.dataset.url);
      if (sv) {
        const id = sv.dataset.id;
        const saved = new Set(JSON.parse(localStorage.getItem('patti-saved') || '[]'));
        if (saved.has(id)) { saved.delete(id); sv.textContent='🔖'; } else { saved.add(id); sv.textContent='✅ Saved'; }
        localStorage.setItem('patti-saved', JSON.stringify([...saved]));
      }
    });
  };

  const skeleton = () => {
    grid.innerHTML = '';
    for (let i=0;i<6;i++){
      const sk = document.createElement('div');
      sk.className = 'news-card';
      sk.innerHTML = `
        <div class="media skeleton"></div>
        <div class="card-body">
          <div class="skeleton" style="height:18px;width:80%"></div>
          <div class="skeleton" style="height:14px;width:50%;margin-top:6px"></div>
          <div class="skeleton" style="height:14px;width:90%;margin-top:12px"></div>
          <div class="skeleton" style="height:14px;width:70%;margin-top:6px"></div>
        </div>`;
      grid.appendChild(sk);
    }
  };

  (async function initList(){
    skeleton();
    const items = await NewsAPI.fetchIndex();
    if (!items.length) { console.warn('[news] empty dataset'); grid.innerHTML=''; empty('ਖ਼ਬਰਾਂ ਲੋਡ ਨਹੀਂ ਹੋਈਆਂ'); return; }
    state.all = items;
    bindUI();
    applyFilters();
    observe();
  })();
}

/* Reader page */
if ($('#reader')) {
  const qs = new URLSearchParams(location.search);
  const want = qs.get('id') || qs.get('slug') || location.pathname.split('/').filter(Boolean).pop();
  const tEl = $('#articleTitle'), dEl = $('#articleTime'), aNm = $('#articleAuthor [itemprop="name"]'), hEl = $('#articleHero'), bEl = $('#articleContent');
  const likeBtn = $('#likeBtn'), likeCnt = $('#likeCount'), saveBtn = $('#saveBtn'), shareBtn = $('#shareBtn'), copyBtn = $('#copyBtn');
  const likeKey = (id) => `patti-like-${id}`, saveKey = (id) => `patti-save-${id}`;

  const setMeta = (a) => {
    document.title = `${a.title} • PattiBytes`;
    $('#docTitle')?.textContent = document.title;
    $('#metaDesc')?.setAttribute('content', (a.preview || a.title || '').slice(0,160));
    const ld = { "@context":"https://schema.org", "@type":"NewsArticle", "headline": a.title,
      "datePublished": a.date, "author": { "@type":"Person", "name": a.author || "Staff" },
      "image": a.image ? [a.image] : undefined, "mainEntityOfPage": a.url || location.href };
    $('#articleJsonLd')?.textContent = JSON.stringify(ld);
  };

  (async function initReader(){
    const items = await NewsAPI.fetchIndex();
    if (!items.length) { bEl.innerHTML = '<p>ਖ਼ਬਰ ਨਹੀਂ ਮਿਲੀ</p>'; return; }
    const a = items.find(x => (x.id==want)||(x.slug==want)) || items[0];
    tEl.textContent = a.title;
    dEl.dateTime = a.date; dEl.textContent = new Date(a.date).toLocaleString('pa-IN');
    aNm.textContent = a.author || 'Staff';
    if (a.image) hEl.innerHTML = `<img src="${a.image}" alt="${escapeHtml(a.title)}" loading="eager">`;
    bEl.innerHTML = a.content || a.preview || '';
    setMeta(a);

    let likes = parseInt(localStorage.getItem(likeKey(a.id)),10) || 0;
    likeCnt.textContent = likes;
    likeBtn.addEventListener('click', ()=> { likes+=1; likeCnt.textContent=likes; localStorage.setItem(likeKey(a.id), String(likes)); });

    if (localStorage.getItem(saveKey(a.id))) saveBtn.textContent='✅ Saved';
    saveBtn.addEventListener('click', ()=> {
      const k = saveKey(a.id);
      if (localStorage.getItem(k)) { localStorage.removeItem(k); saveBtn.textContent='🔖 Save'; }
      else { localStorage.setItem(k,'1'); saveBtn.textContent='✅ Saved'; }
    });

    shareBtn.addEventListener('click', async ()=> {
      const data = { title:a.title, text:a.preview||a.title, url:a.url||location.href };
      try { if (navigator.share && (navigator.canShare?.(data) ?? true)) await navigator.share(data); else throw 0; }
      catch { await copy(data.url); }
    });
    copyBtn.addEventListener('click', async ()=> { await copy(a.url || location.href); });
  })();
}
