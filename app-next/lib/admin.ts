import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseClient } from './firebase';

// List of admin user IDs - add your UID here
const ADMIN_UIDS = [
  'YOUR_FIREBASE_UID_HERE', // Replace with your actual Firebase Auth UID
];

export interface AdminSettings {
  canModerate: boolean;
  canManageUsers: boolean;
  canPublishOfficial: boolean;
  canAccessAnalytics: boolean;
  canManageContent: boolean;
  createdAt: Date;
}

export async function isAdmin(uid: string): Promise<boolean> {
  return ADMIN_UIDS.includes(uid);
}

export async function getAdminSettings(uid: string): Promise<AdminSettings | null> {
  try {
    const { db } = getFirebaseClient();
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
  await setDoc(doc(db, 'admins', uid), {
    canModerate: false,
    canManageUsers: false,
    canPublishOfficial: false,
    canAccessAnalytics: false,
    canManageContent: false
  }, { merge: true });
}
