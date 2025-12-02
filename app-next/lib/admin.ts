// app-next/lib/admin.ts

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type FieldValue,
  type Timestamp,
} from 'firebase/firestore';
import { getFirebaseClient } from './firebase';

/**
 * Unified Admin Permissions Interface
 * Covers both granular controls and legacy settings
 */
export interface AdminPermissions {
  // Content Moderation
  canModerate: boolean;
  // User Management
  canManageUsers: boolean;
  // Official Communications
  canPublishOfficial: boolean;
  // Analytics & Reporting
  canAccessAnalytics: boolean;
  // Content Management
  canManageContent: boolean;
  // Admin Management
  canManageAdmins: boolean;
  // System Configuration
  canSystemSettings: boolean;
  // Metadata
  uid?: string;
  grantedAt?: FieldValue | Timestamp;
  createdAt?: FieldValue | Timestamp;
  updatedAt?: FieldValue | Timestamp;
}

/**
 * Default Admin Permissions - Standard level
 * New admins get these by default unless specified otherwise
 */
export const DEFAULT_ADMIN_PERMISSIONS: AdminPermissions = {
  canModerate: true,
  canManageUsers: true,
  canPublishOfficial: true,
  canAccessAnalytics: true,
  canManageContent: true,
  canManageAdmins: false, // Restricted by default
  canSystemSettings: false, // Restricted by default
};

/**
 * Super Admin Permissions - Full access
 * Only grant to trusted admins
 */
export const SUPER_ADMIN_PERMISSIONS: AdminPermissions = {
  canModerate: true,
  canManageUsers: true,
  canPublishOfficial: true,
  canAccessAnalytics: true,
  canManageContent: true,
  canManageAdmins: true,
  canSystemSettings: true,
};

/**
 * Check if a user is an admin
 * Uses multi-layer verification:
 * 1. Environment variable (fallback only)
 * 2. User.role === 'admin'
 * 3. Presence in admins collection
 */
export async function isAdmin(uid: string): Promise<boolean> {
  const { db } = getFirebaseClient();
  if (!db || !uid) return false;

  try {
    // Layer 1: Check environment variable (for bootstrap/super admin)
    if (
      typeof process !== 'undefined' &&
      process.env.NEXT_PUBLIC_ADMIN_UID === uid
    ) {
      console.log('[isAdmin] User is admin via env variable:', uid);
      return true;
    }

    // Layer 2: Check user.role in users collection
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data()?.role === 'admin') {
      console.log('[isAdmin] User is admin via role field:', uid);
      return true;
    }

    // Layer 3: Check presence in admins collection
    const adminRef = doc(db, 'admins', uid);
    const adminSnap = await getDoc(adminRef);

    if (adminSnap.exists()) {
      console.log('[isAdmin] User is admin via admins collection:', uid);
      return true;
    }

    return false;
  } catch (error) {
    console.error('[isAdmin] Check failed for user:', uid, error);
    return false;
  }
}

/**
 * Get complete admin permissions for a user
 * Returns null if user is not an admin
 */
export async function getAdminPermissions(
  uid: string,
): Promise<AdminPermissions | null> {
  const { db } = getFirebaseClient();
  if (!db || !uid) return null;

  try {
    const adminRef = doc(db, 'admins', uid);
    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists()) {
      console.warn('[getAdminPermissions] No admin doc for user:', uid);
      return null;
    }

    const data = adminSnap.data() as AdminPermissions;
    console.log('[getAdminPermissions] Retrieved permissions for:', uid);
    return data;
  } catch (error) {
    console.error('[getAdminPermissions] Failed to get permissions:', error);
    return null;
  }
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(
  uid: string,
  permission: keyof AdminPermissions,
): Promise<boolean> {
  const permissions = await getAdminPermissions(uid);
  if (!permissions) return false;

  const hasIt = permissions[permission] === true;
  console.log(
    `[hasPermission] User ${uid} has "${permission}": ${hasIt}`,
  );
  return hasIt;
}

/**
 * Grant admin access to a user
 * Creates both /users/{uid} role update and /admins/{uid} permissions doc
 *
 * Steps:
 * 1. Verify user exists in users collection
 * 2. Update user.role = 'admin'
 * 3. Create/update admin permissions document
 */
export async function grantAdminAccess(
  uid: string,
  permissions?: Partial<AdminPermissions>,
): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  const userRef = doc(db, 'users', uid);
  const adminRef = doc(db, 'admins', uid);

  try {
    console.log('[grantAdminAccess] Starting for user:', uid);

    // 1. Verify user exists
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      throw new Error(`User not found: ${uid}`);
    }

    const userData = userSnap.data();
    console.log(
      `[grantAdminAccess] User found: ${userData.displayName || userData.email}`,
    );

    // 2. Update user role to admin
    await updateDoc(userRef, {
      role: 'admin',
      updatedAt: serverTimestamp(),
    });
    console.log('[grantAdminAccess] Updated user role to admin');

    // 3. Create/update admin permissions document
    const finalPermissions: AdminPermissions = {
      ...DEFAULT_ADMIN_PERMISSIONS,
      ...(permissions || {}),
      uid,
      grantedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(adminRef, finalPermissions, { merge: true });
    console.log('[grantAdminAccess] Successfully created admin document');

    console.log(`[grantAdminAccess] ✓ Admin access granted to ${uid}`);
  } catch (error) {
    console.error('[grantAdminAccess] ✗ Error:', error);
    throw error;
  }
}

/**
 * Revoke admin access from a user
 * Steps:
 * 1. Revert user.role to 'user'
 * 2. Keep admin document for historical record (optional: delete it)
 */
export async function revokeAdminAccess(uid: string): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  const userRef = doc(db, 'users', uid);
  const adminRef = doc(db, 'admins', uid);

  try {
    console.log('[revokeAdminAccess] Starting for user:', uid);

    // 1. Verify user exists
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      throw new Error(`User not found: ${uid}`);
    }

    // 2. Revert role to user
    await updateDoc(userRef, {
      role: 'user',
      updatedAt: serverTimestamp(),
    });
    console.log('[revokeAdminAccess] Reverted user role to user');

    // 3. Delete admin permissions document (clean up)
    await deleteDoc(adminRef);
    console.log('[revokeAdminAccess] Deleted admin document');

    console.log(`[revokeAdminAccess] ✓ Admin access revoked from ${uid}`);
  } catch (error) {
    console.error('[revokeAdminAccess] ✗ Error:', error);
    throw error;
  }
}

/**
 * Update admin permissions for an existing admin
 * Steps:
 * 1. Verify admin document exists (or create with defaults)
 * 2. Update specified permissions
 *
 * Useful for fine-tuning admin capabilities
 */
export async function updateAdminPermissions(
  uid: string,
  updates: Partial<AdminPermissions>,
): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  const adminRef = doc(db, 'admins', uid);

  try {
    console.log('[updateAdminPermissions] Starting for user:', uid);

    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists()) {
      // If admin doc doesn't exist, create it with defaults + updates
      console.log(
        '[updateAdminPermissions] Admin doc not found, creating with defaults',
      );

      const newPermissions: AdminPermissions = {
        ...DEFAULT_ADMIN_PERMISSIONS,
        ...updates,
        uid,
        grantedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(adminRef, newPermissions);
    } else {
      // If admin doc exists, just update the fields
      console.log('[updateAdminPermissions] Admin doc found, updating...');

      await updateDoc(adminRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    }

    console.log(
      `[updateAdminPermissions] ✓ Successfully updated permissions for ${uid}`,
    );
  } catch (error) {
    console.error('[updateAdminPermissions] ✗ Error:', error);
    throw error;
  }
}

/**
 * Bulk update permissions for multiple admins
 * Useful for policy changes or upgrades
 */
export async function bulkUpdateAdminPermissions(
  uids: string[],
  updates: Partial<AdminPermissions>,
): Promise<{ success: string[]; failed: Array<{ uid: string; error: string }> }> {
  const results = {
    success: [] as string[],
    failed: [] as Array<{ uid: string; error: string }>,
  };

  console.log('[bulkUpdateAdminPermissions] Starting for', uids.length, 'admins');

  for (const uid of uids) {
    try {
      await updateAdminPermissions(uid, updates);
      results.success.push(uid);
    } catch (error) {
      results.failed.push({
        uid,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.log(
    `[bulkUpdateAdminPermissions] ✓ Complete: ${results.success.length} succeeded, ${results.failed.length} failed`,
  );
  return results;
}

/**
 * Get all admins (for admin dashboard)
 * Reads from admins collection directly
 */
export async function getAllAdmins(): Promise<
  Array<AdminPermissions & { uid: string }>
> {
  const { db } = getFirebaseClient();
  if (!db) return [];

  try {
    const { collection, getDocs, query } = await import('firebase/firestore');
    const adminsRef = collection(db, 'admins');
    const snap = await getDocs(query(adminsRef));

    const admins = snap.docs.map((doc) => ({
      ...doc.data(),
      uid: doc.id,
    })) as Array<AdminPermissions & { uid: string }>;

    console.log(`[getAllAdmins] Retrieved ${admins.length} admins`);
    return admins;
  } catch (error) {
    console.error('[getAllAdmins] ✗ Error:', error);
    return [];
  }
}

/**
 * Promote admin to super admin
 * Grants all permissions
 */
export async function promoteToSuperAdmin(uid: string): Promise<void> {
  console.log('[promoteToSuperAdmin] Starting for user:', uid);
  await updateAdminPermissions(uid, SUPER_ADMIN_PERMISSIONS);
  console.log(`[promoteToSuperAdmin] ✓ User ${uid} promoted to super admin`);
}

/**
 * Demote super admin to standard admin
 * Revokes sensitive permissions
 */
export async function demoteFromSuperAdmin(uid: string): Promise<void> {
  console.log('[demoteFromSuperAdmin] Starting for user:', uid);
  const updates: Partial<AdminPermissions> = {
    canManageAdmins: false,
    canSystemSettings: false,
  };
  await updateAdminPermissions(uid, updates);
  console.log(`[demoteFromSuperAdmin] ✓ User ${uid} demoted`);
}
