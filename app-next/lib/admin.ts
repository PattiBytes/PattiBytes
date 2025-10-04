import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseClient } from './firebase';

const ADMIN_UIDS = ['YOUR_FIREBASE_UID_HERE'];

export interface AdminSettings {
  canModerate: boolean;
  canManageUsers: boolean;
  canPublishOfficial: boolean;
  canAccessAnalytics: boolean;
  canManageContent: boolean;
  createdAt: Date;
}

export function isAdmin(uid: string): boolean {
  return ADMIN_UIDS.includes(uid);
}

export async function getAdminSettings(uid: string): Promise<AdminSettings | null> {
  try {
    const { db } = getFirebaseClient();
    if (!db) return null;
    
    const adminDoc = await getDoc(doc(db, 'admins', uid));
    
    if (!adminDoc.exists()) {
      return null;
    }
    
    return adminDoc.data() as AdminSettings;
  } catch (error) {
    console.error('Error getting admin settings:', error);
    return null;
  }
}

export async function grantAdminAccess(uid: string): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  
  await setDoc(doc(db, 'admins', uid), {
    canModerate: true,
    canManageUsers: true,
    canPublishOfficial: true,
    canAccessAnalytics: true,
    canManageContent: true,
    createdAt: serverTimestamp()
  });
}

export async function revokeAdminAccess(uid: string): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  
  await setDoc(doc(db, 'admins', uid), {
    canModerate: false,
    canManageUsers: false,
    canPublishOfficial: false,
    canAccessAnalytics: false,
    canManageContent: false
  }, { merge: true });
}
