// /app-next/pages/auth/reset.tsx
import { FormEvent, useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

export default function Reset() {
  const [email,setEmail]=useState(''); const [msg,setMsg]=useState<string|null>(null); const [err,setErr]=useState<string|null>(null);

  const onSubmit = async (e:FormEvent) => {
    e.preventDefault(); setErr(null); setMsg(null);
    try { 
      await sendPasswordResetEmail(auth, email); 
      setMsg('Check your inbox for reset link.'); 
    } catch (e) { 
      setErr(e instanceof FirebaseError ? e.message : 'Reset failed'); 
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Reset Password</h1>
        <form onSubmit={onSubmit} className="auth-form">
          <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <button type="submit" className="btn-primary">Send reset link</button>
        </form>
        {msg && <p className="success">{msg}</p>}
        {err && <p className="error">{err}</p>}
        <p><Link href="/auth/login">Back to login</Link></p>
      </div>
    </main>
  );
}
