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
  const [name, setName] = useState(user?.displayName || '');
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const save = async () => {
    // Guard: ensure Firestore is initialized
    if (!db) {
      setError('Database not available');
      setOk(null);
      return;
    }

    try {
      // Narrowing: assign to a local const so its type is Firestore, not Firestore | undefined
      const dbc = db;
      await setDoc(doc(dbc, 'users', user.uid), { displayName: name }, { merge: true });
      setOk('Saved');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setOk(null);
    }
  };

  return (
    <main className="account">
      <div className="account-container">
        <h1>ਸਤ ਸ੍ਰੀ ਅਕਾਲ, {user.displayName || user.email}</h1>

        <div className="account-section">
          <h2>Profile Photo</h2>
          <AvatarUploader user={user} />
        </div>

        <div className="account-section">
          <h2>Account Details</h2>
          <div className="form-group">
            <label>Display name</label>
            <input value={name} onChange={e => setName(e.target.value)} />
            <button onClick={save} className="btn-primary">Save</button>
          </div>
          <div className="form-group">
            <label>Email</label>
            <input value={user.email || ''} disabled />
          </div>
        </div>

        <div className="account-actions">
          <button onClick={() => logout()} className="btn-secondary">Log out</button>
        </div>

        {ok && <p className="success">{ok}</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </main>
  );
}
