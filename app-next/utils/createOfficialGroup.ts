import { collection, addDoc, serverTimestamp, getDocs, DocumentData } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';

export async function createOfficialGroup() {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  // Get all user IDs
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const allUserIds = usersSnapshot.docs.map((doc: DocumentData) => doc.id);

  await addDoc(collection(db, 'chats'), {
    type: 'group',
    name: 'PattiBytes Official',
    photoURL: '/images/logo.png',
    participants: allUserIds,
    lastMessage: 'Welcome to PattiBytes!',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isOfficial: true
  });
}
