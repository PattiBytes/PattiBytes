/**
 * PattiBytes News - List + Reader
 * Data: /news/index.json (Jekyll collection JSON), with baseurl support.
 * Features: search, tag chips, infinite scroll (IntersectionObserver), 
 * native share, copy link, save/like, JSON-LD in reader.
 */

/* --------------------------
   Utilities
-------------------------- */
const $ = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));
const baseurl = () => document.querySelector('meta[name="jekyll-baseurl"]')?.content || '';

// Fixed escapeHtml with proper object literal syntax
const escapeHtml = (s='') => s.replace(/[&<>"']/g, ch => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[ch]));

const fmtDate = (d) => { 
  try { 
    return new Date(d).toLocaleDateString('pa-IN', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  } catch { 
    return d; 
  } 
};

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
};

/* --------------------------
   Data API
-------------------------- */
const NewsAPI = {
  async fetchIndex() {
    const base = baseurl();
    const urls = [
      `${base}/news/index.json`,               // Primary Jekyll JSON index
      `${base}/_api/collections/news/entries`  // Jekyll Admin API fallback
    ];
    
    for (const url of urls) {
      try {
        console.log('[news] trying', url);
        const response = await fetch(url, { 
          credentials: 'same-origin', 
          headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) { 
          console.warn('[news] fetch failed', url, response.status);
          continue;
        }
        
        const json = await response.json();
        
        // Jekyll Admin API format
        if (url.includes('/_api/')) {
          const normalized = (json || []).map(entry => ({
            id: entry.id || entry.slug,
            slug: entry.slug || (entry.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            title: entry.title,
            preview: entry.excerpt || entry.preview || '',
            content: entry.content || entry.raw_content || '',
            date: entry.date || entry.modified_time || entry.created_at || new Date().toISOString(),
            author: (entry.author && (entry.author.name || entry.author)) || 'Staff',
            tags: entry.tags || [],
            image: entry.image || entry.featured_image || null,
            url: entry.http_url || `${base}/news/${entry.slug || entry.id}/`
          }));
          console.info('[news] loaded via Jekyll Admin API:', normalized.length);
          return normalized;
        }
        
        // Standard index.json format
        const items = Array.isArray(json) ? json : (json.items || []);
        if (!Array.isArray(items)) { 
          console.error('[news] JSON shape invalid:', json);
          continue;
        }
        
        const normalized = items.map(article => ({
          id: article.id || article.slug,
          slug: article.slug || article.id,
          title: article.title,
          preview: article.preview || article.excerpt || '',
          content: article.content || '',
          date: article.date,
          author: article.author || 'Staff',
          tags: article.tags || [],
          image: article.image || null,
          url: article.url ? `${base}${article.url}`.replace(/\/+$/, '/') : `${base}/news/${article.slug || article.id}/`
        }));
        
        console.info('[news] loaded index.json:', normalized.length);
        return normalized;
      } catch (error) {
        console.error('[news] fetch error', url, error);
      }
    }
    
    console.warn('[news] all endpoints failed');
    return [];
  }
};

/* --------------------------
   LIST PAGE (Dashboard)
-------------------------- */
if ($('#newsGrid')) {
  console.log('[news] initializing list page');
  
  const state = { 
    all: [], 
    filtered: [], 
    page: 0, 
    size: 12, 
    query: '', 
    tag: 'all' 
  };
  
  const grid = $('#newsGrid');
  const sentinel = $('#infiniteSentinel');

  const showEmpty = (message = 'ਕੋਈ ਖ਼ਬਰ ਨਹੀਂ ਮਿਲੀ') => {
    grid.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(message)}</p>
        <a class="btn" href="${baseurl() || '/'}">ਘਰ ਵਾਪਸ ਜਾਓ</a>
      </div>
    `;
  };

  const createCard = (article) => `
    ${article.image ? `
      <div class="media">
        <span class="badge">${(article.tags && article.tags[0]) || 'ਖ਼ਬਰ'}</span>
        <img src="${article.image}" alt="${escapeHtml(article.title)}" loading="lazy">
      </div>
    ` : ''}
    <div class="card-body">
      <h3 class="card-title">${escapeHtml(article.title)}</h3>
      <div class="card-meta">
        <time datetime="${article.date}">${fmtDate(article.date)}</time>
        <span>· ${escapeHtml(article.author || 'Staff')}</span>
      </div>
      <p class="card-preview">${escapeHtml(article.preview || '')}</p>
      <div class="card-actions">
        <a class="btn" href="${baseurl()}/app/news/article.html?id=${encodeURIComponent(article.id || article.slug)}">
          ਪੂਰਾ ਪੜ੍ਹੋ →
        </a>
        <div class="action-buttons">
          <button class="btn ghost share" 
                  data-title="${escapeHtml(article.title)}" 
                  data-text="${escapeHtml(article.preview || article.title)}" 
                  data-url="${article.url}">📤</button>
          <button class="btn ghost copy" data-url="${article.url}">🔗</button>
          <button class="btn ghost save" data-id="${article.id}">🔖</button>
        </div>
      </div>
    </div>
  `;

  const renderChunk = () => {
    const start = state.page * state.size;
    const slice = state.filtered.slice(start, start + state.size);
    
    if (!slice.length && state.page === 0) {
      showEmpty('ਕੋਈ ਨਤੀਜੇ ਨਹੀਂ');
      return;
    }
    
    const fragment = document.createDocumentFragment();
    slice.forEach(article => {
      const element = document.createElement('article');
      element.className = 'news-card';
      element.dataset.id = article.id;
      element.innerHTML = createCard(article);
      fragment.appendChild(element);
    });
    
    grid.appendChild(fragment);
    state.page++;
    
    if (state.page * state.size >= state.filtered.length) {
      sentinel.dataset.done = '1';
    }
  };

  const applyFilters = () => {
    const query = state.query.toLowerCase().trim();
    const tag = state.tag;
    
    state.filtered = state.all.filter(article => {
      const queryMatch = !query || 
        article.title.toLowerCase().includes(query) || 
        (article.preview || '').toLowerCase().includes(query);
      const tagMatch = tag === 'all' || (article.tags || []).includes(tag);
      return queryMatch && tagMatch;
    });
    
    grid.innerHTML = '';
    state.page = 0;
    delete sentinel.dataset.done;
    renderChunk();
  };

  const observeInfiniteScroll = () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !sentinel.dataset.done) {
          renderChunk();
        }
      });
    }, { rootMargin: '600px 0px 800px 0px' });
    
    observer.observe(sentinel);
  };

  const bindEventListeners = () => {
    // Search input
    $('#newsSearch')?.addEventListener('input', (e) => {
      state.query = e.target.value || '';
      applyFilters();
    });
    
    // Category chips
    $$('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        $$('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.tag = chip.dataset.filter || 'all';
        applyFilters();
      });
    });
    
    // Card actions
    grid.addEventListener('click', async (e) => {
      const shareBtn = e.target.closest('button.share');
      const copyBtn = e.target.closest('button.copy');
      const saveBtn = e.target.closest('button.save');
      
      if (shareBtn) {
        const shareData = {
          title: shareBtn.dataset.title,
          text: shareBtn.dataset.text,
          url: shareBtn.dataset.url
        };
        
        try {
          if (navigator.share && (navigator.canShare?.(shareData) ?? true)) {
            await navigator.share(shareData);
          } else {
            throw new Error('no-share');
          }
        } catch {
          await copyToClipboard(shareData.url);
        }
      }
      
      if (copyBtn) {
        await copyToClipboard(copyBtn.dataset.url);
      }
      
      if (saveBtn) {
        const id = saveBtn.dataset.id;
        const saved = new Set(JSON.parse(localStorage.getItem('patti-saved') || '[]'));
        
        if (saved.has(id)) {
          saved.delete(id);
          saveBtn.textContent = '🔖';
        } else {
          saved.add(id);
          saveBtn.textContent = '✅ Saved';
        }
        
        localStorage.setItem('patti-saved', JSON.stringify([...saved]));
      }
    });
  };

  const showSkeleton = () => {
    grid.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'news-card';
      skeleton.innerHTML = `
        <div class="media skeleton"></div>
        <div class="card-body">
          <div class="skeleton" style="height:18px;width:80%"></div>
          <div class="skeleton" style="height:14px;width:50%;margin-top:6px"></div>
          <div class="skeleton" style="height:14px;width:90%;margin-top:12px"></div>
          <div class="skeleton" style="height:14px;width:70%;margin-top:6px"></div>
        </div>
      `;
      grid.appendChild(skeleton);
    }
  };

  // Initialize list page
  (async function initList() {
    showSkeleton();
    
    const items = await NewsAPI.fetchIndex();
    
    if (!items.length) {
      console.warn('[news] empty dataset');
      showEmpty('ਖ਼ਬਰਾਂ ਲੋਡ ਨਹੀਂ ਹੋਈਆਂ');
      return;
    }
    
    state.all = items;
    bindEventListeners();
    applyFilters();
    observeInfiniteScroll();
    
    console.log('[news] list initialized with', items.length, 'articles');
  })();
}

/* --------------------------
   READER PAGE (Article)
-------------------------- */
if ($('#reader')) {
  console.log('[news] initializing reader page');
  
  const urlParams = new URLSearchParams(location.search);
  const targetId = urlParams.get('id') || urlParams.get('slug') || 
    location.pathname.split('/').filter(Boolean).pop();
  
  const titleEl = $('#articleTitle');
  const timeEl = $('#articleTime');
  const authorEl = $('#articleAuthor [itemprop="name"]');
  const heroEl = $('#articleHero');
  const contentEl = $('#articleContent');
  const likeBtn = $('#likeBtn');
  const likeCount = $('#likeCount');
  const saveBtn = $('#saveBtn');
  const shareBtn = $('#shareBtn');
  const copyBtn = $('#copyBtn');

  const likeKey = (id) => `patti-like-${id}`;
  const saveKey = (id) => `patti-save-${id}`;

  const setMetadata = (article) => {
    document.title = `${article.title} • PattiBytes`;
    $('#docTitle')?.textContent = document.title;
    $('#metaDesc')?.setAttribute('content', (article.preview || article.title || '').slice(0, 160));
    
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": article.title,
      "datePublished": article.date,
      "author": { 
        "@type": "Person", 
        "name": article.author || "Staff" 
      },
      "image": article.image ? [article.image] : undefined,
      "mainEntityOfPage": article.url || location.href
    };
    
    $('#articleJsonLd')?.textContent = JSON.stringify(jsonLd);
  };

  // Initialize reader page
  (async function initReader() {
    const items = await NewsAPI.fetchIndex();
    
    if (!items.length) {
      contentEl.innerHTML = '<p>ਖ਼ਬਰ ਨਹੀਂ ਮਿਲੀ</p>';
      return;
    }
    
    const article = items.find(x => (x.id === targetId) || (x.slug === targetId)) || items[0];
    
    titleEl.textContent = article.title;
    timeEl.dateTime = article.date;
    timeEl.textContent = new Date(article.date).toLocaleString('pa-IN');
    authorEl.textContent = article.author || 'Staff';
    
    if (article.image) {
      heroEl.innerHTML = `<img src="${article.image}" alt="${escapeHtml(article.title)}" loading="eager">`;
    }
    
    contentEl.innerHTML = article.content || article.preview || '';
    setMetadata(article);

    // Like functionality
    let likes = parseInt(localStorage.getItem(likeKey(article.id)), 10) || 0;
    likeCount.textContent = likes;
    
    likeBtn.addEventListener('click', () => {
      likes += 1;
      likeCount.textContent = likes;
      localStorage.setItem(likeKey(article.id), String(likes));
    });

    // Save functionality
    if (localStorage.getItem(saveKey(article.id))) {
      saveBtn.textContent = '✅ Saved';
    }
    
    saveBtn.addEventListener('click', () => {
      const key = saveKey(article.id);
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        saveBtn.textContent = '🔖 Save';
      } else {
        localStorage.setItem(key, '1');
        saveBtn.textContent = '✅ Saved';
      }
    });

    // Share functionality
    shareBtn.addEventListener('click', async () => {
      const shareData = {
        title: article.title,
        text: article.preview || article.title,
        url: article.url || location.href
      };
      
      try {
        if (navigator.share && (navigator.canShare?.(shareData) ?? true)) {
          await navigator.share(shareData);
        } else {
          throw new Error('no-share');
        }
      } catch {
        await copyToClipboard(shareData.url);
      }
    });

    // Copy functionality
    copyBtn.addEventListener('click', async () => {
      await copyToClipboard(article.url || location.href);
    });
    
    console.log('[news] reader initialized for:', article.title);
  })();
}
