/* app/assets/js/news.js */

(() => {
  const $ = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));
  const Toast = window.Toast || { show: (m)=>console.log(m) };

  const API = {
    async getIndex() {
      // Try Jekyll JSON index
      try {
        const r = await fetch('/news/index.json', { credentials:'same-origin' });
        if (r.ok) return await r.json();
      } catch {}
      // Try app-bundled data (optional fallback)
      try {
        const r = await fetch('/app/data/news.json', { credentials:'same-origin' });
        if (r.ok) return await r.json();
      } catch {}
      // Try Jekyll Admin HTTP API if enabled
      try {
        const r = await fetch('/_api/collections/news/entries');
        if (r.ok) {
          const j = await r.json();
          // Normalize Jekyll Admin entry shape -> our shape
          return j.map(e => ({
            id: e.id || e.slug,
            slug: e.slug || e.title?.toLowerCase().replace(/\s+/g,'-'),
            title: e.title,
            preview: e.excerpt || e.preview || '',
            content: e.content || e.raw_content || '',
            date: e.date || e.modified_time || e.created_at,
            author: (e.author && (e.author.name || e.author)) || 'Staff',
            tags: e.tags || [],
            image: e.image || e.featured_image || null,
            url: e.http_url || `/news/${e.slug || e.id}/`
          }));
        }
      } catch {}
      return [];
    }
  };

  // List page wiring
  if ($('#newsGrid')) {
    const state = {
      all: [],
      filtered: [],
      page: 0,
      pageSize: 12,
      filter: 'all',
      q: ''
    };

    const grid = $('#newsGrid');
    const sentinel = $('#infiniteSentinel');

    const renderCards = (items) => {
      const frag = document.createDocumentFragment();
      items.forEach(a => {
        const card = document.createElement('article');
        card.className = 'news-card';
        card.setAttribute('data-id', a.id);
        const img = a.image ? `
          <div class="media">
            <span class="badge">${(a.tags && a.tags[0]) || 'ਖ਼ਬਰ'}</span>
            <img src="${a.image}" alt="${escapeHtml(a.title)}" loading="lazy">
          </div>` : '';
        card.innerHTML = `
          ${img}
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
                <button class="btn ghost copy" data-link="${a.url || location.origin+'/news/'+(a.slug||a.id)+'/'}">🔗</button>
                <button class="btn ghost save" data-id="${a.id}">🔖</button>
              </div>
            </div>
          </div>
        `;
        frag.appendChild(card);
      });
      grid.appendChild(frag);
      bindCardActions();
    };

    const bindCardActions = () => {
      grid.addEventListener('click', async (e) => {
        const shareBtn = e.target.closest('button.share');
        const copyBtn = e.target.closest('button.copy');
        const saveBtn  = e.target.closest('button.save');
        if (shareBtn) {
          const id = shareBtn.dataset.id;
          const a = state.all.find(x => (x.id||x.slug) == id);
          const shareData = { title: a?.title, text: a?.preview || a?.title, url: a?.url || (location.origin + '/news/' + (a?.slug || a?.id) + '/') };
          try {
            if (navigator.share && navigator.canShare?.(shareData)) {
              await navigator.share(shareData);
            } else {
              await copyToClipboard(shareData.url);
              Toast.show('Link copied');
            }
          } catch {}
        }
        if (copyBtn) {
          const link = copyBtn.dataset.link;
          await copyToClipboard(link);
          Toast.show('Link copied');
        }
        if (saveBtn) {
          const id = saveBtn.dataset.id;
          toggleSave(id);
          saveBtn.textContent = isSaved(id) ? '✅ Saved' : '🔖';
        }
      }, { once: true });
    };

    const isSaved = (id) => {
      const set = new Set(JSON.parse(localStorage.getItem('patti-saved') || '[]'));
      return set.has(id);
    };
    const toggleSave = (id) => {
      const set = new Set(JSON.parse(localStorage.getItem('patti-saved') || '[]'));
      if (set.has(id)) set.delete(id); else set.add(id);
      localStorage.setItem('patti-saved', JSON.stringify([...set]));
    };

    const applyFilters = () => {
      const q = state.q.trim().toLowerCase();
      const tag = state.filter;
      state.filtered = state.all.filter(a => {
        const matchQ = !q || a.title.toLowerCase().includes(q) || (a.preview||'').toLowerCase().includes(q);
        const matchT = tag === 'all' || (a.tags||[]).includes(tag);
        return matchQ && matchT;
      });
      grid.innerHTML = '';
      state.page = 0;
      loadMore();
    };

    const loadMore = () => {
      const start = state.page * state.pageSize;
      const items = state.filtered.slice(start, start + state.pageSize);
      renderCards(items);
      state.page++;
      if (state.page * state.pageSize >= state.filtered.length) sentinel.setAttribute('data-done','1');
    };

    const observeInfinite = () => {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting && !sentinel.dataset.done) {
            loadMore();
          }
        });
      }, { rootMargin: '600px 0px 800px 0px' });
      io.observe(sentinel);
    };

    const bindFilters = () => {
      $('#newsSearch')?.addEventListener('input', (e) => {
        state.q = e.target.value || '';
        applyFilters();
      });
      $$('.chip').forEach(ch => ch.addEventListener('click', () => {
        $$('.chip').forEach(c=>c.classList.remove('active'));
        ch.classList.add('active');
        state.filter = ch.dataset.filter;
        applyFilters();
      }));
    };

    const bootstrap = async () => {
      showSkel();
      const data = await API.getIndex();
      state.all = normalizeIndex(data);
      hideSkel();
      bindFilters();
      applyFilters();
      observeInfinite();
    };

    const normalizeIndex = (arr) => (arr || []).map(x => ({
      id: x.id || x.slug || slugify(x.title),
      slug: x.slug || x.id,
      title: x.title,
      preview: x.preview || x.excerpt || '',
      content: x.content || '',
      date: x.date || new Date().toISOString(),
      author: x.author || 'Staff',
      tags: x.tags || [],
      image: x.image || null,
      url: x.url || `/news/${x.slug || slugify(x.title)}/`
    }));

    const showSkel = () => {
      grid.innerHTML = '';
      for (let i=0;i<6;i++){
        const s = document.createElement('div');
        s.className = 'news-card';
        s.innerHTML = `
          <div class="media skeleton"></div>
          <div class="card-body">
            <div class="skeleton" style="height:18px;width:80%"></div>
            <div class="skeleton" style="height:14px;width:50%;margin-top:6px"></div>
            <div class="skeleton" style="height:14px;width:90%;margin-top:12px"></div>
            <div class="skeleton" style="height:14px;width:70%;margin-top:6px"></div>
          </div>`;
        grid.appendChild(s);
      }
    };
    const hideSkel = () => { /* replaced by real nodes */ };

    const copyToClipboard = async (text) => {
      try { await navigator.clipboard.writeText(text); }
      catch {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }
    };
    const slugify = (s) => (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

    const formatDate = (d) => {
      try { return new Date(d).toLocaleDateString('pa-IN', { year:'numeric', month:'short', day:'numeric' }); }
      catch { return d; }
    };
    const escapeHtml = (s) => (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

    bootstrap();
  }

  // Reader page wiring
  if ($('#reader')) {
    const p = new URLSearchParams(location.search);
    const want = p.get('id') || p.get('slug');
    const titleEl = $('#articleTitle');
    const timeEl  = $('#articleTime');
    const authorEl= $('#articleAuthor [itemprop="name"]');
    const heroEl  = $('#articleHero');
    const bodyEl  = $('#articleContent');
    const likeBtn = $('#likeBtn'); const likeCountEl = $('#likeCount');
    const saveBtn = $('#saveBtn'); const shareBtn = $('#shareBtn'); const copyBtn = $('#copyBtn');

    const getIndex = async ()=> {
      try { const r=await fetch('/news/index.json'); if(r.ok) return r.json(); } catch {}
      try { const r=await fetch('/app/data/news.json'); if(r.ok) return r.json(); } catch {}
      try { const r=await fetch('/_api/collections/news/entries'); if(r.ok) return r.json(); } catch {}
      return [];
    };

    const findArticle = (arr) => {
      const a = (arr||[]).find(x => (x.id==want)||(x.slug==want));
      if (a) return a;
      // last resort: by path
      const slug = want || location.pathname.split('/').filter(Boolean).pop();
      return (arr||[]).find(x => (x.slug==slug));
    };

    const setJsonLd = (a) => {
      const json = {
        "@context":"https://schema.org",
        "@type":"NewsArticle",
        "headline": a.title,
        "datePublished": a.date,
        "author": { "@type":"Person", "name": a.author || "Staff" },
        "image": a.image ? [a.image] : undefined,
        "mainEntityOfPage": a.url || location.href
      };
      $('#articleJsonLd').textContent = JSON.stringify(json);
    };

    const setMeta = (a) => {
      document.title = `${a.title} • PattiBytes`;
      $('#docTitle').textContent = document.title;
      $('#metaDesc').setAttribute('content', (a.preview || a.title).slice(0,160));
    };

    const likeKey = (id) => `patti-like-${id}`;
    const savedKey= (id) => `patti-save-${id}`;

    const bootstrapReader = async () => {
      const data = await getIndex();
      const items = Array.isArray(data) ? data : data.items || [];
      const a = findArticle(items);
      if (!a) { bodyEl.innerHTML = '<p>Article not found.</p>'; return; }

      titleEl.textContent = a.title;
      timeEl.dateTime = a.date; timeEl.textContent = new Date(a.date).toLocaleString('pa-IN');
      authorEl.textContent = a.author || 'Staff';
      if (a.image) heroEl.innerHTML = `<img src="${a.image}" alt="${titleEl.textContent}" loading="eager">`;
      bodyEl.innerHTML = a.content || a.preview || '';

      setMeta(a);
      setJsonLd(a);

      // Like / Save
      let likes = parseInt(localStorage.getItem(likeKey(a.id||a.slug)) || '0', 10);
      likeCountEl.textContent = likes;
      likeBtn.addEventListener('click', ()=> {
        likes += 1; likeCountEl.textContent = likes;
        localStorage.setItem(likeKey(a.id||a.slug), String(likes));
      });
      if (localStorage.getItem(savedKey(a.id||a.slug))) saveBtn.textContent = '✅ Saved';
      saveBtn.addEventListener('click', ()=> {
        const k = savedKey(a.id||a.slug);
        if (localStorage.getItem(k)) { localStorage.removeItem(k); saveBtn.textContent='🔖 Save'; }
        else { localStorage.setItem(k,'1'); saveBtn.textContent='✅ Saved'; }
      });

      // Share / Copy
      shareBtn.addEventListener('click', async ()=> {
        const shareData = { title:a.title, text:a.preview || a.title, url: a.url || location.href };
        try {
          if (navigator.share && (navigator.canShare?.(shareData) ?? true)) await navigator.share(shareData);
          else throw new Error('no share');
        } catch {
          await navigator.clipboard?.writeText(shareData.url).catch(()=>{});
          Toast.show('Link copied');
        }
      });
      copyBtn.addEventListener('click', async ()=> {
        await navigator.clipboard?.writeText(a.url || location.href).catch(()=>{});
        Toast.show('Link copied');
      });

      // Optional neighbor links if provided in JSON
      if (a.next?.url) { const n=$('#nextLink'); n.href=a.next.url; n.hidden=false; }
      if (a.previous?.url) { const p=$('#prevLink'); p.href=a.previous.url; p.hidden=false; }
    };

    bootstrapReader();
  }
})();
