import { doc, setDoc } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';

export async function setAdminRole(userId: string) {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  await setDoc(doc(db, 'users', userId), {
    role: 'admin'
  }, { merge: true });

  console.log('Admin role granted to user:', userId);
}

// Usage: Run this once in console or create a special page
// setAdminRole('YOUR_USER_ID_HERE');
