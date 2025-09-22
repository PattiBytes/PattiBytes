(() => {
  const $ = sel => document.querySelector(sel);
  const toast = (m, t = 'info') => (window.Toast?.show ? window.Toast.show(m, t) : console.log(t, m));

  // Toggle password visibility
  document.addEventListener('click', e => {
    if (e.target.matches('.eye')) {
      const target = e.target.getAttribute('data-toggle');
      const input = document.querySelector(target);
      if (input) input.type = input.type === 'password' ? 'text' : 'password';
    }
  });

  // Start UI once Firebase auth is ready
  const startAuthUI = () => {
    if (!window.firebaseAuth?.auth) return false;

    // Login flow
    const loginForm = $('#loginForm');
    if (loginForm) {
      $('#googleLoginBtn')?.addEventListener('click', async () => {
        try {
          const { auth, googleProvider, signInPopup } = window.firebaseAuth;
          const result = await signInPopup(auth, googleProvider);
          handleSuccess(result.user);
        } catch (err) {
          toast(err.message || 'Google sign-in failed', 'error');
        }
      });
      loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        try {
          const email = $('#loginEmail').value.trim();
          const password = $('#loginPassword').value;
          if (!email || !password) return toast('Enter email and password', 'warning');
          const { auth, signInEmail } = window.firebaseAuth;
          const result = await signInEmail(auth, email, password);
          handleSuccess(result.user);
        } catch (err) {
          toast(err.message || 'Email login failed', 'error');
        }
      });
    }

    // Signup flow
    const signupForm = $('#signupForm');
    if (signupForm) {
      $('#googleSignupBtn')?.addEventListener('click', async () => {
        try {
          const { auth, googleProvider, signInPopup } = window.firebaseAuth;
          const result = await signInPopup(auth, googleProvider);
          handleSuccess(result.user, true);
        } catch (err) {
          toast(err.message || 'Google sign-up failed', 'error');
        }
      });
      signupForm.addEventListener('submit', async e => {
        e.preventDefault();
        const firstName = $('#firstName').value.trim();
        const lastName = $('#lastName').value.trim();
        const email = $('#signupEmail').value.trim();
        const password = $('#signupPassword').value;
        const confirmPassword = $('#signupConfirm').value;
        if (!firstName || !lastName)
          return toast('Please enter your name', 'warning');
        if (password !== confirmPassword) return toast('Passwords do not match', 'warning');
        try {
          const { auth, createUserEmail, updateProfile } = window.firebaseAuth;
          const userCredential = await createUserEmail(auth, email, password);
          await updateProfile(userCredential.user, { displayName: `${firstName} ${lastName}`.trim() });
          handleSuccess(userCredential.user, true);
        } catch (err) {
          toast(err.message || 'Email sign-up failed', 'error');
        }
      });
    }

    // Forgot password (login page)
    $('#forgotPasswordBtn')?.addEventListener('click', async () => {
      const email = prompt('Enter your registered email');
      if (!email) return;
      try {
        const { auth, sendResetEmail } = window.firebaseAuth;
        await sendResetEmail(auth, email);
        toast('Password reset email sent!', 'success');
      } catch (err) {
        toast(err.message || 'Failed to send reset email', 'error');
      }
    });

    // Helpers:
    function handleSuccess(user, needsProfile = false) {
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName ?? '',
        photoURL: user.photoURL ?? ''
      };
      localStorage.setItem('patti-user', JSON.stringify(userData));
      if (needsProfile) location.href = '/app/auth/profile-setup.html';
      else location.href = '/app/';
    }

    return true;
  };

  if (!startAuthUI()) {
    document.addEventListener('patti:firebase:ready', () => startAuthUI(), { once: true });
  }
})();
