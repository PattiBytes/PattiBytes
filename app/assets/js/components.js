(function(){
  const isAuthPage = () => location.pathname.startsWith('/app/auth/');
  async function mount(id, url){
    const host = document.getElementById(id);
    if (!host) return;
    const html = await fetch(url).then(r=>r.text()).catch(()=>null);
    if (!html) return;
    host.innerHTML = html;
  }
  async function loadAll(){
    if (isAuthPage()) return;
    await mount('headerContainer','/app/components/header.html');
    await mount('bottomNavContainer','/app/components/bottom-nav.html');
    initHeader(); initBottom(); highlightActive();
  }
  function highlightActive(){
    const page = (p=>{
      if (p.endsWith('/')||p.endsWith('/index.html')) return 'dashboard';
      if (p.includes('/news')) return 'news';
      if (p.includes('/places')) return 'places';
      if (p.includes('/community')) return 'community';
      if (p.includes('/profile')) return 'profile';
      return '';
    })(location.pathname);
    document.querySelectorAll('[data-page]').forEach(a=>a.classList.toggle('active', a.dataset.page===page));
  }
  function initHeader(){
    const drawer = document.getElementById('mobileDrawer');
    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn && drawer){
      mobileBtn.addEventListener('click', ()=>{
        const open = !drawer.hasAttribute('hidden');
        open ? drawer.setAttribute('hidden','') : drawer.removeAttribute('hidden');
        mobileBtn.setAttribute('aria-expanded', String(!open));
      });
    }
    const userBtn = document.getElementById('userMenuBtn');
    const menu = document.getElementById('userDropdown');
    if (userBtn && menu){
      userBtn.addEventListener('click', ()=>{
        const open = !menu.hasAttribute('hidden');
        open ? menu.setAttribute('hidden','') : menu.removeAttribute('hidden');
        userBtn.setAttribute('aria-expanded', String(!open));
      });
      document.addEventListener('click', (e)=>{ if (!menu.contains(e.target) && !userBtn.contains(e.target)) menu.setAttribute('hidden',''); });
    }
    try{
      const raw = localStorage.getItem('pattibytes-user') || sessionStorage.getItem('pattibytes-user');
      const u = raw ? JSON.parse(raw) : null;
      const ava = document.getElementById('userAvatar');
      const inits = document.getElementById('userInitials');
      if (u?.photoURL && ava){ ava.src=u.photoURL; ava.hidden=false; if(inits) inits.hidden=true; }
      else if (inits){ inits.textContent=(u?.displayName||'G').split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase(); inits.hidden=false; }
      document.getElementById('signOutBtn')?.addEventListener('click', async ()=>{
        try{ if (window.firebaseAuth?.signOut) await window.firebaseAuth.signOut(window.firebaseAuth.auth); }
        finally{ localStorage.removeItem('pattibytes-user'); sessionStorage.removeItem('pattibytes-user'); location.href='/app/auth/login.html'; }
      });
    }catch{}
  }
  function initBottom(){
    const news = document.getElementById('newsBadge');
    if (news && window.PattiApp?.newsCount>0){ news.textContent=window.PattiApp.newsCount; news.hidden=false; }
    const comm = document.getElementById('communityBadge');
    if (comm && window.PattiApp?.communityNotifications>0){ comm.textContent=window.PattiApp.communityNotifications; comm.hidden=false; }
  }
  window.ComponentLoader = { loadAll };
  document.addEventListener('DOMContentLoaded', () => window.ComponentLoader.loadAll());
})();
// /app/assets/js/components.js
(function(){
  const isAuth = () => location.pathname.startsWith('/app/auth/');
  async function mount(id, url){ const host = document.getElementById(id); if (!host) return; host.innerHTML = await fetch(url).then(r=>r.text()).catch(()=> ''); }
  async function loadAll(){ if (isAuth()) return; await mount('headerContainer','/app/components/header.html'); await mount('bottomNavContainer','/app/components/bottom-nav.html'); wire(); markActive(); }
  function markActive(){ const p = location.pathname; const k = p.endsWith('/')||p.endsWith('/index.html')?'dashboard':p.includes('/news')?'news':p.includes('/places')?'places':p.includes('/community')?'community':p.includes('/profile')?'profile':''; document.querySelectorAll('[data-page]').forEach(a=>a.classList.toggle('active', a.dataset.page===k)); }
  function wire(){
    const drawer = document.getElementById('mobileDrawer');
    const mbtn = document.getElementById('mobileMenuBtn');
    mbtn?.addEventListener('click', ()=>{ const open = !drawer?.hasAttribute('hidden'); open ? drawer?.setAttribute('hidden','') : drawer?.removeAttribute('hidden'); mbtn.setAttribute('aria-expanded', String(!open)); });
    const userBtn = document.getElementById('userMenuBtn'); const menu = document.getElementById('userDropdown');
    userBtn?.addEventListener('click', ()=>{ const open = !menu?.hasAttribute('hidden'); open ? menu?.setAttribute('hidden','') : menu?.removeAttribute('hidden'); userBtn.setAttribute('aria-expanded', String(!open)); });
    document.addEventListener('click', (e)=>{ if (menu && userBtn && !menu.contains(e.target) && !userBtn.contains(e.target)) menu.setAttribute('hidden',''); });
    const raw = localStorage.getItem('pattibytes-user') || sessionStorage.getItem('pattibytes-user'); const u = raw?JSON.parse(raw):null;
    const ava = document.getElementById('userAvatar'); const init = document.getElementById('userInitials');
    if (u?.photoURL && ava){ ava.src=u.photoURL; ava.hidden=false; init && (init.hidden=true); } else if (init){ init.textContent=(u?.displayName||'G').split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase(); init.hidden=false; }
    document.getElementById('signOutBtn')?.addEventListener('click', async ()=>{ try{ await window.firebaseAuth?.signOut?.(window.firebaseAuth.auth); } finally { localStorage.removeItem('pattibytes-user'); sessionStorage.removeItem('pattibytes-user'); location.href='/app/auth/login.html'; } });
    const nb = document.getElementById('newsBadge'); if (nb && window.PattiApp?.newsCount>0){ nb.hidden=false; nb.textContent=window.PattiApp.newsCount; }
    const cb = document.getElementById('communityBadge'); if (cb && window.PattiApp?.communityNotifications>0){ cb.hidden=false; cb.textContent=window.PattiApp.communityNotifications; }
  }
  window.ComponentLoader = { loadAll };
  document.addEventListener('DOMContentLoaded', ()=> window.ComponentLoader.loadAll());
})();
