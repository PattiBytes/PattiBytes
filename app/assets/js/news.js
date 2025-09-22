/* PattiBytes News - List + Reader
 * Data: /news/index.json (Jekyll collection JSON), with baseurl support.
 * Features: search + category filter, infinite scroll (IntersectionObserver), native share, copy link, save/like, SEO-ready reader.
 */

/* --------------------------
   Utilities
-------------------------- */
const $  = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));
const escapeHtml = (s='') => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const formatDate = (d) => { try { return new Date(d).toLocaleDateString('pa-IN', { year:'numeric', month:'short', day:'numeric' }); } catch { return d; } };
const copyToClipboard = async (text) => {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
  }
};
const baseurl = () => document.querySelector('meta[name="jekyll-baseurl"]')?.content || '';

/* --------------------------
   Data API (index.json first)
-------------------------- */
const NewsAPI = {
  async fetchIndex() {
    const base = baseurl();
    const paths = [
      `${base}/news/index.json`,                // primary JSON index from Jekyll collection
      `${base}/_api/collections/news/entries`  // Jekyll Admin API fallback (if enabled)
    ];
    for (const url of paths) {
      try {
        const r = await fetch(url, { credentials: 'same-origin' });
        if (!r.ok) continue;
        const j = await r.json();
        if (url.includes('/_api/')) {
          // Normalize Jekyll Admin entry format to app schema
          return j.map(e => ({
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
        }
        // Standard index.json shape { items: [...] } or bare array
        const items = Array.isArray(j) ? j : (j.items || []);
        return items.map(a => ({
          id: a.id || a.slug,
          slug: a.slug || a.id,
          title: a.title,
          preview: a.preview || a.excerpt || '',
          content: a.content || '',
          date: a.date,
          author: a.author || 'Staff',
          tags: a.tags || [],
          image: a.image || null,
          url: a.url || `${base}/news/${a.slug || a.id}/`
        }));
      } catch {}
    }
    return [];
  }
};

/* --------------------------
   LIST PAGE (index)
-------------------------- */
if ($('#newsGrid')) {
  const state = { all: [], filtered: [], page: 0, size: 12, q: '', tag: 'all' };
  const grid = $('#newsGrid');
  const sentinel = $('#infiniteSentinel');

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
        <time datetime="${a.date}">${formatDate(a.date)}</time>
        <span>· ${escapeHtml(a.author || 'Staff')}</span>
      </div>
      <p class="card-preview">${escapeHtml(a.preview || '')}</p>
      <div class="card-actions">
        <a class="btn" href="/app/news/article.html?id=${encodeURIComponent(a.id || a.slug)}">ਪੂਰਾ ਪੜ੍ਹੋ →</a>
        <div>
          <button class="btn ghost share" data-id="${a.id}">📤</button>
          <button class="btn ghost copy" data-link="${a.url}">🔗</button>
          <button class="btn ghost save" data-id="${a.id}">🔖</button>
        </div>
      </div>
    </div>
  `;

  const renderChunk = () => {
    const start = state.page * state.size;
    const slice = state.filtered.slice(start, start + state.size);
    const frag = document.createDocumentFragment();
    slice.forEach(a => {
      const el = document.createElement('article');
      el.className = 'news-card';
      el.dataset.id = a.id;
      el.innerHTML = cardHTML(a);
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

  const observeInfinite = () => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && !sentinel.dataset.done) renderChunk();
      });
    }, { rootMargin: '600px 0px 800px 0px' });
    io.observe(sentinel);
  };

  const bindUI = () => {
    $('#newsSearch')?.addEventListener('input', e => { state.q = e.target.value || ''; applyFilters(); });
    $$('.chip').forEach(ch => ch.addEventListener('click', () => {
      $$('.chip').forEach(c => c.classList.remove('active'));
      ch.classList.add('active');
      state.tag = ch.dataset.filter || 'all';
      applyFilters();
    }));
    grid.addEventListener('click', async (e) => {
      const share = e.target.closest('button.share');
      const copy  = e.target.closest('button.copy');
      const save  = e.target.closest('button.save');
      if (share) {
        const a = state.all.find(x => (x.id || x.slug) == share.dataset.id);
        const data = { title: a?.title, text: a?.preview || a?.title, url: a?.url };
        try {
          if (navigator.share && (navigator.canShare?.(data) ?? true)) await navigator.share(data);
          else throw new Error('no-share');
        } catch { await copyToClipboard(data.url); }
      }
      if (copy) { await copyToClipboard(copy.dataset.link); }
      if (save) {
        const id = save.dataset.id;
        const saved = new Set(JSON.parse(localStorage.getItem('patti-saved') || '[]'));
        if (saved.has(id)) { saved.delete(id); save.textContent='🔖'; }
        else { saved.add(id); save.textContent='✅ Saved'; }
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

  const initList = async () => {
    skeleton();
    const items = await NewsAPI.fetchIndex();
    state.all = items;
    bindUI();
    applyFilters();
    observeInfinite();
  };

  initList();
}

/* --------------------------
   READER PAGE (article.html)
-------------------------- */
if ($('#reader')) {
  const qs = new URLSearchParams(location.search);
  const want = qs.get('id') || qs.get('slug');

  const titleEl = $('#articleTitle');
  const timeEl  = $('#articleTime');
  const authorNm= $('#articleAuthor [itemprop="name"]');
  const heroEl  = $('#articleHero');
  const bodyEl  = $('#articleContent');
  const likeBtn = $('#likeBtn'); const likeCnt = $('#likeCount');
  const saveBtn = $('#saveBtn'); const shareBtn = $('#shareBtn'); const copyBtn = $('#copyBtn');

  const likeKey = (id) => `patti-like-${id}`;
  const saveKey = (id) => `patti-save-${id}`;

  const setMeta = (a) => {
    document.title = `${a.title} • PattiBytes`;
    $('#docTitle')?.textContent = document.title;
    $('#metaDesc')?.setAttribute('content', (a.preview || a.title).slice(0,160));
    const ld = {
      "@context":"https://schema.org",
      "@type":"NewsArticle",
      "headline": a.title,
      "datePublished": a.date,
      "author": { "@type":"Person", "name": a.author || "Staff" },
      "image": a.image ? [a.image] : undefined,
      "mainEntityOfPage": a.url || location.href
    };
    $('#articleJsonLd')?.textContent = JSON.stringify(ld);
  };

  const findArticle = (items=[]) => items.find(x => (x.id==want)||(x.slug==want)) || items[0];

  const initReader = async () => {
    const items = await NewsAPI.fetchIndex();
    if (!items.length) { bodyEl.innerHTML = '<p>Article not found.</p>'; return; }
    const a = findArticle(items);

    titleEl.textContent = a.title;
    timeEl.dateTime = a.date; timeEl.textContent = new Date(a.date).toLocaleString('pa-IN');
    authorNm.textContent = a.author || 'Staff';
    if (a.image) heroEl.innerHTML = `<img src="${a.image}" alt="${escapeHtml(a.title)}" loading="eager">`;
    bodyEl.innerHTML = a.content || a.preview || '';
    setMeta(a);

    let likes = parseInt(localStorage.getItem(likeKey(a.id)), 10) || 0;
    likeCnt.textContent = likes;
    likeBtn.addEventListener('click', ()=> {
      likes += 1; likeCnt.textContent = likes;
      localStorage.setItem(likeKey(a.id), String(likes));
    });

    if (localStorage.getItem(saveKey(a.id))) saveBtn.textContent = '✅ Saved';
    saveBtn.addEventListener('click', ()=> {
      const k = saveKey(a.id);
      if (localStorage.getItem(k)) { localStorage.removeItem(k); saveBtn.textContent='🔖 Save'; }
      else { localStorage.setItem(k, '1'); saveBtn.textContent='✅ Saved'; }
    });

    shareBtn.addEventListener('click', async ()=> {
      const data = { title:a.title, text:a.preview || a.title, url:a.url || location.href };
      try {
        if (navigator.share && (navigator.canShare?.(data) ?? true)) await navigator.share(data);
        else throw new Error('no-share');
      } catch { await copyToClipboard(data.url); }
    });
    copyBtn.addEventListener('click', async ()=> { await copyToClipboard(a.url || location.href); });
  };

  initReader();
}
