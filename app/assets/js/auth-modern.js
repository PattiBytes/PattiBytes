// /app/assets/js/auth-modern.js
(() => {
  const $ = sel => document.querySelector(sel);
  const toast = (m,t='info') => (window.Toast?.show ? window.Toast.show(m,t) : console.log(t, m));

  // Toggle password eyes
  document.addEventListener('click', e => {
    if (e.target.matches('.eye')) {
      const id = e.target.getAttribute('data-toggle');
      const input = document.querySelector(id);
      if (input) input.type = input.type === 'password' ? 'text' : 'password';
    }
  });

  // Login
  const loginForm = $('#loginForm');
  if (loginForm) {
    $('#googleLoginBtn')?.addEventListener('click', async () => {
      try {
        const { auth, googleProvider, signInWithPopup } = window.firebaseAuth;
        const r = await signInWithPopup(auth, googleProvider);
        done(r.user);
      } catch (e){ toast(e.message || 'Google sign-in failed', 'error'); }
    });
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      try{
        const email = $('#loginEmail').value.trim();
        const pass  = $('#loginPassword').value;
        const { auth, signInWithEmailAndPassword } = window.firebaseAuth;
        const r = await signInWithEmailAndPassword(auth, email, pass);
        done(r.user);
      }catch(e){ toast(e.message || 'Sign-in failed', 'error'); }
    });
  }

  // Signup
  const signupForm = $('#signupForm');
  if (signupForm) {
    $('#googleSignupBtn')?.addEventListener('click', async () => {
      try{
        const { auth, googleProvider, signInWithPopup } = window.firebaseAuth;
        const r = await signInWithPopup(auth, googleProvider);
        done(r.user, true);
      }catch(e){ toast(e.message || 'Google sign-up failed', 'error'); }
    });
    signupForm.addEventListener('submit', async e => {
      e.preventDefault();
      const fn = $('#firstName').value.trim(), ln = $('#lastName').value.trim();
      const email = $('#signupEmail').value.trim(), pw = $('#signupPassword').value, cf = $('#signupConfirm').value;
      if (!fn || !ln) return toast('Enter your name', 'warning');
      if (pw !== cf) return toast('Passwords do not match', 'warning');
      try{
        const { auth, createUserWithEmailAndPassword, updateProfile } = window.firebaseAuth;
        const r = await createUserWithEmailAndPassword(auth, email, pw);
        await updateProfile(r.user, { displayName: `${fn} ${ln}`.trim() });
        done(r.user, true);
      }catch(e){ toast(e.message || 'Sign-up failed', 'error'); }
    });
  }

  // Forgot password (login page)
  $('#forgotBtn')?.addEventListener('click', async () => {
    const em = prompt('Enter your account email');
    if (!em) return;
    try {
      const { auth, sendPasswordResetEmail } = window.firebaseAuth;
      await sendPasswordResetEmail(auth, em);
      toast('Reset link sent to email', 'success');
    } catch (e){ toast(e.message || 'Could not send reset link', 'error'); }
  });

  function done(user, needsProfile=false){
    const data = { uid:user.uid, email:user.email, displayName:user.displayName||'', photoURL:user.photoURL||'' };
    localStorage.setItem('pattibytes-user', JSON.stringify(data));
    if (needsProfile) location.href = '/app/auth/profile-setup.html';
    else location.href = '/app/';
  }
})();
