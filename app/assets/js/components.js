/**
 * ComponentLoader v2
 * - Skips mounting on /app/auth/* pages
 * - Highlights active links and syncs badges
 */
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
    if (isAuthPage()) return; // do not mount components on auth pages
    await mount('headerContainer','/app/components/header.html');
    await mount('bottomNavContainer','/app/components/bottom-nav.html');
    initHeader();
    initBottom();
    highlightActive();
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

    document.querySelectorAll('[data-page]').forEach(a=>{
      const match = a.getAttribute('data-page')===page;
      a.classList.toggle('active', match);
    });
  }

  function initHeader(){
    const drawer = document.getElementById('mobileDrawer');
    const mobileBtn = document.getElementById('mobileMenuBtn');
    if (mobileBtn && drawer){
      mobileBtn.addEventListener('click', ()=>{
        const open = drawer.hasAttribute('hidden') ? false : true;
        if (open){ drawer.setAttribute('hidden',''); mobileBtn.setAttribute('aria-expanded','false'); }
        else { drawer.removeAttribute('hidden'); mobileBtn.setAttribute('aria-expanded','true'); }
      });
    }

    const userBtn = document.getElementById('userMenuBtn');
    const menu = document.getElementById('userDropdown');
    if (userBtn && menu){
      userBtn.addEventListener('click', ()=>{
        const open = menu.hasAttribute('hidden') ? false : true;
        open ? menu.setAttribute('hidden','') : menu.removeAttribute('hidden');
        userBtn.setAttribute('aria-expanded', String(!open));
      });
      document.addEventListener('click', (e)=>{
        if (!menu || !userBtn) return;
        if (!menu.contains(e.target) && !userBtn.contains(e.target)) menu.setAttribute('hidden','');
      });
    }

    // reflect user (guest or logged in)
    try{
      const raw = localStorage.getItem('pattibytes-user') || sessionStorage.getItem('pattibytes-user');
      const u = raw ? JSON.parse(raw) : null;
      const ava = document.getElementById('userAvatar');
      const inits = document.getElementById('userInitials');
      if (u?.photoURL && ava){ ava.src=u.photoURL; ava.hidden=false; if(inits) inits.hidden=true; }
      else if (inits){ inits.textContent=(u?.displayName||'G').split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase(); inits.hidden=false; }
      document.getElementById('signOutBtn')?.addEventListener('click', async ()=>{
        try{
          if (window.firebaseAuth?.signOut) await window.firebaseAuth.signOut(window.firebaseAuth.auth);
        }finally{
          localStorage.removeItem('pattibytes-user'); sessionStorage.removeItem('pattibytes-user');
          location.href='/app/auth/login.html';
        }
      });
    }catch{}
  }

  function initBottom(){
    // badges can be updated by pages via window.PattiApp
    const news = document.getElementById('newsBadge');
    if (news && window.PattiApp?.newsCount>0){ news.textContent=window.PattiApp.newsCount; news.hidden=false; }
    const comm = document.getElementById('communityBadge');
    if (comm && window.PattiApp?.communityNotifications>0){ comm.textContent=window.PattiApp.communityNotifications; comm.hidden=false; }
  }

  // expose
  window.ComponentLoader = { loadAll };
  // auto
  document.addEventListener('DOMContentLoaded', () => window.ComponentLoader.loadAll());
})();
