import { FormEvent, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { getFirebaseClient } from '@/lib/firebase';
import Link from 'next/link';

export default function Login() {
  const [email,setEmail]=useState(''); 
  const [pass,setPass]=useState(''); 
  const [err,setErr]=useState<string|null>(null);

  const onSubmit = async (e:FormEvent) => {
    e.preventDefault(); 
    setErr(null);
    try {
      const { auth } = getFirebaseClient(); // guaranteed Auth
      await signInWithEmailAndPassword(auth, email, pass);
      location.assign('/dashboard');
    } catch (e) {
      setErr(e instanceof FirebaseError ? e.message : 'Login failed');
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>ਲਾਗਇਨ</h1>
        <form onSubmit={onSubmit} className="auth-form">
          <input type="email" placeholder="Email" value={email} onChange={v=>setEmail(v.target.value)} required />
          <input type="password" placeholder="Password" value={pass} onChange={v=>setPass(v.target.value)} required />
          <button type="submit" className="btn-primary">Log in</button>
          {err && <p className="error">{err}</p>}
        </form>
        <p>No account? <Link href="/auth/register">Create one</Link> · <Link href="/auth/reset">Forgot password?</Link></p>
      </div>
    </main>
  );
}
