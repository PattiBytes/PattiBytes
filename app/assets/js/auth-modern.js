// UI handlers for login, sign up, and forgot password
// Waits for Firebase readiness event so window.firebaseAuth is always defined.

(() => {
  const $ = sel => document.querySelector(sel);
  const toast = (m, t = 'info') => (window.Toast?.show ? window.Toast.show(m, t) : console.log(t, m));

  // Toggle password eye
  document.addEventListener('click', e => {
    if (e.target.matches('.eye')) {
      const id = e.target.getAttribute('data-toggle');
      const input = document.querySelector(id);
      if (input) input.type = input.type === 'password' ? 'text' : 'password';
    }
  });

  function wireUI() {
    if (!window.firebaseAuth?.auth) return false;

    // LOGIN
    const loginForm = $('#loginForm');
    if (loginForm) {
      $('#googleLoginBtn')?.addEventListener('click', async () => {
        try {
          const { auth, googleProvider, signInPopup } = window.firebaseAuth;
          const res = await signInPopup(auth, googleProvider);
          onSuccess(res.user);
        } catch (err) {
          toast(err.message || 'Google sign-in failed', 'error');
        }
      });

      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const email = $('#loginEmail').value.trim();
          const pass  = $('#loginPassword').value;
          if (!email || !pass) return toast('Enter email and password', 'warning');
          const { auth, signInEmail } = window.firebaseAuth;
          const res = await signInEmail(auth, email, pass);
          onSuccess(res.user);
        } catch (err) {
          toast(err.message || 'Sign-in failed', 'error');
        }
      });
    }

    // SIGNUP
    const signupForm = $('#signupForm');
    if (signupForm) {
      $('#googleSignupBtn')?.addEventListener('click', async () => {
        try {
          const { auth, googleProvider, signInPopup } = window.firebaseAuth;
          const res = await signInPopup(auth, googleProvider);
          onSuccess(res.user, true);
        } catch (err) {
          toast(err.message || 'Google sign-up failed', 'error');
        }
      });

      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fn = $('#firstName').value.trim();
        const ln = $('#lastName').value.trim();
        const email = $('#signupEmail').value.trim();
        const pw = $('#signupPassword').value;
        const cf = $('#signupConfirm').value;
        if (!fn || !ln) return toast('Enter your name', 'warning');
        if (pw !== cf) return toast('Passwords do not match', 'warning');

        try {
          const { auth, createUserEmail, updateProfile } = window.firebaseAuth;
          const res = await createUserEmail(auth, email, pw);
          await updateProfile(res.user, { displayName: `${fn} ${ln}`.trim() });
          onSuccess(res.user, true);
        } catch (err) {
          toast(err.message || 'Sign-up failed', 'error');
        }
      });
    }

    // FORGOT PASSWORD (login page)
    $('#forgotPasswordBtn')?.addEventListener('click', async () => {
      const email = prompt('Enter your account email');
      if (!email) return;
      try {
        const { auth, sendResetEmail } = window.firebaseAuth;
        await sendResetEmail(auth, email);
        toast('Password reset email sent!', 'success');
      } catch (err) {
        toast(err.message || 'Could not send reset email', 'error');
      }
    });

    function onSuccess(user, needsProfile = false) {
      const data = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || ''
      };
      localStorage.setItem('patti-user', JSON.stringify(data));
      location.href = needsProfile ? '/app/auth/profile-setup.html' : '/app/';
    }

    return true;
  }

  if (!wireUI()) {
    document.addEventListener('patti:firebase:ready', () => wireUI(), { once: true });
  }
})();
