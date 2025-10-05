import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import toast from 'react-hot-toast';

export default function AdminSetup() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const SECRET_PASSWORD = 'pattibytes-admin-2025';

  const handleSetAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== SECRET_PASSWORD) {
      toast.error('Invalid setup password');
      return;
    }
    setLoading(true);
    try {
      const { db } = getFirebaseClient();
      if (!db) throw new Error('Firestore not initialized');
      await setDoc(doc(db, 'users', userId), { role: 'admin' }, { merge: true });
      toast.success('Admin role granted successfully!');
      setUserId('');
      setPassword('');
    } catch {
      toast.error('Failed to grant admin role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '100px auto', padding: '20px' }}>
      <h1>Admin Setup</h1>
      <form onSubmit={handleSetAdmin}>
        <div style={{ marginBottom: '16px' }}>
          <label>User ID (UID):</label>
          <input type="text" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Paste user UID here" required style={{ width: '100%', padding: '12px', marginTop: '8px' }} />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label>Setup Password:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter secret password" required style={{ width: '100%', padding: '12px', marginTop: '8px' }} />
        </div>
        <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#667eea', color: 'white', border: 'none', borderRadius: '8px' }}>
          {loading ? 'Setting...' : 'Grant Admin Role'}
        </button>
      </form>
      <p style={{ marginTop: '16px', color: '#666' }}>Get your UID from Firebase Console → Authentication → Users</p>
    </div>
  );
}
