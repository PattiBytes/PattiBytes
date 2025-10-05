import { useState } from 'react';
import { useRouter } from 'next/router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { FaLock, FaEnvelope } from 'react-icons/fa';
import styles from '@/styles/AdminLogin.module.css';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      const { auth, db } = getFirebaseClient();
      if (!auth || !db) throw new Error('Firebase not initialized');

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const userData = userDoc.data();
      
      if (userData?.role !== 'admin') {
        await auth.signOut();
        toast.error('Access denied. Admin privileges required.');
        return;
      }

      toast.success('Welcome, Admin!');
      router.push('/admin/dashboard');
    } catch (error) {
      console.error('Admin login error:', error);
      toast.error((error as Error).message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.adminLogin}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <FaLock className={styles.lockIcon} />
          <h1>Admin Access</h1>
          <p>PattiBytes Administration</p>
        </div>
        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.formGroup}>
            <FaEnvelope className={styles.inputIcon} />
            <input type="email" placeholder="Admin Email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
          </div>
          <div className={styles.formGroup}>
            <FaLock className={styles.inputIcon} />
            <input type="password" placeholder="Admin Password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
          </div>
          <button type="submit" disabled={loading} className={styles.loginBtn}>{loading ? 'Signing In...' : 'Sign In as Admin'}</button>
        </form>
      </div>
    </div>
  );
}
