// lib/admin.ts
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
  type FieldValue,
  type Timestamp,
} from 'firebase/firestore';
import { getFirebaseClient } from './firebase';

export interface AdminSettings {
  canModerate: boolean;
  canManageUsers: boolean;
  canPublishOfficial: boolean;
  canAccessAnalytics: boolean;
  canManageContent: boolean;
  createdAt?: FieldValue | Timestamp;
  updatedAt?: FieldValue | Timestamp;
}

export async function isAdmin(uid: string): Promise<boolean> {
  const { db } = getFirebaseClient();
  if (!db || !uid) return false;

  try {
    // 1) Env variable check
    if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ADMIN_UID === uid) {
      return true;
    }

    // 2) Users role === 'admin'
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists() && userDoc.data()?.role === 'admin') {
      return true;
    }

    // 3) Presence in admins/{uid}
    const adminDoc = await getDoc(doc(db, 'admins', uid));
    if (adminDoc.exists()) return true;

    return false;
  } catch (e) {
    console.error('isAdmin check failed:', e);
    return false;
  }
}

export async function getAdminSettings(uid: string): Promise<AdminSettings | null> {
  const { db } = getFirebaseClient();
  if (!db) return null;

  try {
    const adminDoc = await getDoc(doc(db, 'admins', uid));
    if (!adminDoc.exists()) return null;
    return adminDoc.data() as AdminSettings;
  } catch (error) {
    console.error('Error getting admin settings:', error);
    return null;
  }
}

export async function grantAdminAccess(uid: string, partial?: Partial<AdminSettings>): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  try {
    // Set role in users collection
    await setDoc(
      doc(db, 'users', uid),
      { role: 'admin', updatedAt: serverTimestamp() },
      { merge: true }
    );

    // Set permissions in admins collection
    const defaultSettings: AdminSettings = {
      canModerate: true,
      canManageUsers: true,
      canPublishOfficial: true,
      canAccessAnalytics: true,
      canManageContent: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(
      doc(db, 'admins', uid),
      { ...defaultSettings, ...(partial || {}), updatedAt: serverTimestamp() },
      { merge: true }
    );

    console.log(`Admin access granted to user ${uid}`);
  } catch (error) {
    console.error('Error granting admin access:', error);
    throw error;
  }
}

export async function revokeAdminAccess(uid: string): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  try {
    // Remove role from users collection
    await updateDoc(doc(db, 'users', uid), {
      role: 'user',
      updatedAt: serverTimestamp(),
    });

    // Delete admins document
    await deleteDoc(doc(db, 'admins', uid));

    console.log(`Admin access revoked from user ${uid}`);
  } catch (error) {
    console.error('Error revoking admin access:', error);
    throw error;
  }
}

export async function updateAdminPermissions(uid: string, permissions: Partial<AdminSettings>): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  try {
    await setDoc(
      doc(db, 'admins', uid),
      { ...permissions, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating admin permissions:', error);
    throw error;
  }
}
