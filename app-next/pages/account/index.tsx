import AuthGuard from '@/components/AuthGuard';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import AvatarUploader from '@/components/AvatarUploader';

export default function Account() {
  return (
    <AuthGuard>
      <AccountInner />
    </AuthGuard>
  );
}

function AccountInner() {
  const { user, logout } = useAuth();
  const [name,setName]=useState(user?.displayName||'');
  const [ok,setOk]=useState<string| null>(null);

  if (!user) return null;

  const save = async () => {
    await setDoc(doc(db,'users',user.uid), { displayName: name }, { merge: true });
    setOk('Saved');
  };

  return (
    <main className="account">
      <h1>ਸਤ ਸ੍ਰੀ ਅਕਾਲ, {user.email}</h1>
      <AvatarUploader user={user} />
      <div>
        <label>Display name</label>
        <input value={name} onChange={e=>setName(e.target.value)} />
        <button onClick={save}>Save</button>
        <button onClick={() => logout()}>Log out</button>
        {ok && <p className="ok">{ok}</p>}
      </div>
    </main>
  );
}
