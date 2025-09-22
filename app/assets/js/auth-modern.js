/* Auth + Profile Setup Controller (Firebase v9-style via window bridges) */
(() => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const toast = (msg, type='info') => window.Toast?.show(msg, type, {duration:3500}) || alert(msg);

  // mount header/bottom-nav from /app/components/*
  document.addEventListener('DOMContentLoaded', async () => {
    if (window.ComponentLoader?.loadAllComponents) {
      await window.ComponentLoader.loadAllComponents();
    } else {
      // lightweight fallback
      const mount = async (url, target) => {
        const el = document.getElementById(target);
        if (!el) return;
        try { el.innerHTML = await (await fetch(url)).text(); } catch {}
      };
      await Promise.all([
        mount('/app/components/header.html','headerContainer'),
        mount('/app/components/bottom-nav.html','bottomNavContainer')
      ]);
    }
  });

  // prevent double taps zoom on iOS by disabling dblclick zoom
  let lastTouch = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouch <= 300) e.preventDefault();
    lastTouch = now;
  }, {passive:false});

  // helpers
  const setLoading = (btn, on=true) => {
    if (!btn) return;
    btn.classList.toggle('loading', on);
    btn.disabled = !!on;
  };
  const togglePasswordEye = (btn) => {
    const input = $(btn.getAttribute('data-toggle'));
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  };
  $$('button.eye').forEach(b => b.addEventListener('click', () => togglePasswordEye(b)));

  // Firebase bridges expected on window: firebaseAuth, firebaseFirestore, firebaseStorage
  const auth = window.firebaseAuth?.auth;
  const signInEmail = window.firebaseAuth?.signInWithEmailAndPassword;
  const createUserEmail = window.firebaseAuth?.createUserWithEmailAndPassword;
  const updateProfile = window.firebaseAuth?.updateProfile;
  const sendReset = window.firebaseAuth?.sendPasswordResetEmail;
  const GoogleProvider = window.firebaseAuth?.GoogleAuthProvider;
  const signInPopup = window.firebaseAuth?.signInWithPopup;

  const db = window.firebaseFirestore?.db;
  const doc = window.firebaseFirestore?.doc;
  const getDoc = window.firebaseFirestore?.getDoc;
  const setDoc = window.firebaseFirestore?.setDoc;
  const updateDoc = window.firebaseFirestore?.updateDoc;

  const storage = window.firebaseStorage?.storage;
  const ref = window.firebaseStorage?.ref;
  const uploadBytes = window.firebaseStorage?.uploadBytes;
  const getDownloadURL = window.firebaseStorage?.getDownloadURL;

  // route guards
  const goto = (path) => window.location.href = path;

  // Login page logic
  const loginForm = $('#loginForm');
  if (loginForm) {
    $('#continueGuestBtn')?.addEventListener('click', () => {
      sessionStorage.setItem('guest', '1');
      toast('Continuing as guest', 'info');
      goto('/app/');
    });

    $('#googleLoginBtn')?.addEventListener('click', async () => {
      if (!GoogleProvider) return toast('Google Sign-In not available', 'error');
      try {
        setLoading($('#googleLoginBtn'), true);
        const provider = new GoogleProvider();
        const res = await signInPopup(auth, provider);
        await afterAuth(res.user, true);
      } catch (e) {
        toast(e.message || 'Google sign-in failed', 'error');
      } finally {
        setLoading($('#googleLoginBtn'), false);
      }
    });

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('#loginEmail').value.trim();
      const pass = $('#loginPassword').value;
      const remember = $('#rememberMe').checked;
      if (!email || !pass) return toast('Enter email and password', 'warning');
      try {
        setLoading($('#loginSubmit'), true);
        const res = await signInEmail(auth, email, pass);
        await afterAuth(res.user, remember);
      } catch (err) {
        const map = {
          'auth/invalid-credential':'Invalid email or password',
          'auth/user-not-found':'No account found with this email',
          'auth/wrong-password':'Incorrect password'
        };
        toast(map[err.code] || err.message || 'Sign-in failed', 'error');
      } finally { setLoading($('#loginSubmit'), false); }
    });

    // forgot password modal
    $('#forgotBtn')?.addEventListener('click', () => openForgot());
    function openForgot(){
      const tpl = $('#forgotDialog');
      if (!tpl) return;
      const node = tpl.content.cloneNode(true);
      const overlay = node.querySelector('.modal-overlay');
      const resetBtn = node.querySelector('#sendResetBtn');
      const emailEl = node.querySelector('#resetEmail');
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      overlay.querySelectorAll('[data-close]')?.forEach(x => x.addEventListener('click', () => overlay.remove()));
      resetBtn.addEventListener('click', async () => {
        const em = emailEl.value.trim();
        if (!em) return toast('Enter email', 'warning');
        try {
          setLoading(resetBtn, true);
          await sendReset(auth, em);
          toast('Password reset link sent', 'success');
          overlay.remove();
        } catch (err) {
          toast(err.message || 'Failed to send reset email', 'error');
        } finally { setLoading(resetBtn, false); }
      });
      document.body.appendChild(overlay);
    }
  }

  // Signup page logic
  const signupForm = $('#signupForm');
  if (signupForm) {
    $('#googleSignupBtn')?.addEventListener('click', async () => {
      if (!GoogleProvider) return toast('Google Sign-In not available', 'error');
      try {
        setLoading($('#googleSignupBtn'), true);
        const provider = new GoogleProvider();
        const res = await signInPopup(auth, provider);
        await afterAuth(res.user, true, {needsProfile:true});
      } catch (e) {
        toast(e.message || 'Google sign-up failed', 'error');
      } finally { setLoading($('#googleSignupBtn'), false); }
    });

    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fn = $('#firstName').value.trim();
      const ln = $('#lastName').value.trim();
      const email = $('#signupEmail').value.trim();
      const pw = $('#signupPassword').value;
      const cf = $('#signupConfirm').value;
      const agree = $('#agree').checked;
      if (!fn || !ln) return toast('Enter name', 'warning');
      if (!email) return toast('Enter email', 'warning');
      if (pw.length < 6) return toast('Password must be 6+ chars', 'warning');
      if (pw !== cf) return toast('Passwords do not match', 'warning');
      if (!agree) return toast('Please accept the terms', 'warning');
      try {
        setLoading($('#signupSubmit'), true);
        const res = await createUserEmail(auth, email, pw);
        await updateProfile(res.user, { displayName: `${fn} ${ln}`.trim() });
        await afterAuth(res.user, true, {needsProfile:true});
      } catch (err) {
        const map = {
          'auth/email-already-in-use':'Email already in use',
          'auth/weak-password':'Weak password'
        };
        toast(map[err.code] || err.message || 'Sign-up failed', 'error');
      } finally { setLoading($('#signupSubmit'), false); }
    });
  }

  // Profile setup logic
  const profileForm = $('#profileForm');
  if (profileForm) {
    // guard: must be authenticated
    window.firebaseAuth?.onAuthStateChanged(auth, async (user) => {
      if (!user) { toast('Please sign in first', 'info'); return goto('/app/auth/login.html'); }
      // if already has profile with username, go home
      const prof = await getProfile(user.uid);
      if (prof?.username) return goto('/app/');
    });

    // avatar
    $('#pickAvatarBtn')?.addEventListener('click', () => $('#avatarFile').click());
    $('#removeAvatarBtn')?.addEventListener('click', () => {
      $('#avatarFile').value = '';
      $('#avatarPreview').src = '/app/assets/img/avatar-default.svg';
      $('#avatarPreview').dataset.blob = '';
    });
    $('#avatarFile')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      $('#avatarPreview').src = url;
      $('#avatarPreview').dataset.blob = '1';
    });

    // username live check
    const username = $('#username');
    const status = $('#usernameStatus');
    const debounced = debounce(async v => {
      if (!validUsername(v)) { setStatus('Invalid username', false); return; }
      const taken = await isUsernameTaken(v);
      setStatus(taken ? 'Username not available' : 'Username available', !taken);
    }, 350);
    username.addEventListener('input', e => debounced(e.target.value.trim()));

    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = auth?.currentUser;
      if (!user) return toast('Please sign in', 'error');
      const uname = username.value.trim().toLowerCase();
      const bio = $('#bio').value.trim();
      if (!validUsername(uname)) return toast('Invalid username', 'warning');

      try {
        setLoading($('#saveProfileBtn'), true);

        // final availability check + reserve
        if (await isUsernameTaken(uname)) return toast('Username already taken', 'error');
        await reserveUsername(uname, user.uid);

        // upload avatar if picked
        let photoURL = user.photoURL || '';
        const pickedFile = $('#avatarFile').files?.[0];
        if (pickedFile && storage && ref && uploadBytes && getDownloadURL) {
          const key = `avatars/${user.uid}.jpg`;
          const r = ref(storage, key);
          await uploadBytes(r, pickedFile, { contentType: pickedFile.type });
          photoURL = await getDownloadURL(r);
          await updateProfile(user, { photoURL });
        }

        // save profile
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          displayName: user.displayName || '',
          email: user.email || '',
          username: uname,
          bio,
          photoURL: photoURL || '',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }, { merge: true });

        toast('Profile completed', 'success');
        goto('/app/');
      } catch (err) {
        toast(err.message || 'Failed to save profile', 'error');
        // rollback username reservation on failure
        try { await setDoc(doc(db,'usernames',uname), {uid:null}, {merge:true}); } catch {}
      } finally {
        setLoading($('#saveProfileBtn'), false);
      }
    });

    function setStatus(msg, ok){
      status.textContent = msg;
      status.classList.toggle('ok', !!ok);
      status.classList.toggle('bad', !ok);
    }
  }

  // common after-auth router
  async function afterAuth(user, remember, opts={}) {
    const payload = {
      uid: user.uid, email: user.email, displayName: user.displayName || '',
      photoURL: user.photoURL || '', emailVerified: !!user.emailVerified
    };
    if (remember) localStorage.setItem('pattibytes-user', JSON.stringify(payload));
    else sessionStorage.setItem('pattibytes-user', JSON.stringify(payload));

    // ensure profile exists; if missing username -> redirect to setup
    const prof = await getProfile(user.uid);
    if (!prof?.username || opts.needsProfile) return goto('/app/auth/profile-setup.html');

    toast(`Welcome ${user.displayName || 'back'}!`, 'success');
    goto('/app/');
  }

  async function getProfile(uid){
    if (!db || !doc || !getDoc) return null;
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  }

  function validUsername(v){
    return /^[a-z0-9_.]{3,20}$/.test(v);
  }

  async function isUsernameTaken(v){
    if (!db || !doc || !getDoc) return false; // assume free if offline
    const snap = await getDoc(doc(db, 'usernames', v));
    const data = snap.exists() ? snap.data() : null;
    return !!(data && data.uid);
  }

  async function reserveUsername(v, uid){
    // simple last-write-wins; use security rules to enforce uniqueness
    await setDoc(doc(db,'usernames', v), { uid, reservedAt: Date.now() });
  }

  function debounce(fn, wait){
    let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), wait); };
  }

})();
