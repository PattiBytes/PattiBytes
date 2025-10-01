// /app-next/pages/auth/register.tsx
import { FormEvent, useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Link from 'next/link';

export default function Register() {
  const [email,setEmail] = useState(''); const [pass,setPass] = useState('');
  const [name,setName] = useState(''); const [err,setErr] = useState<string|null>(null);

  const onSubmit = async (e:FormEvent) => {
    e.preventDefault(); setErr(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name });
      await setDoc(doc(db, 'users', cred.user.uid), { uid: cred.user.uid, displayName: name, email }, { merge: true });
      location.assign('/dashboard');
    } catch (e) { 
      setErr(e instanceof FirebaseError ? e.message : 'Registration failed'); 
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>ਨਵਾਂ ਖਾਤਾ</h1>
        <form onSubmit={onSubmit} className="auth-form">
          <input placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} required />
          <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} required />
          <button type="submit" className="btn-primary">Create account</button>
          {err && <p className="error">{err}</p>}
        </form>
        <p>Already have an account? <Link href="/auth/login">Log in</Link></p>
      </div>
    </main>
  );
}
