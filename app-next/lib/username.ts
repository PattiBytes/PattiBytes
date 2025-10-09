// lib/username.ts
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query as fsQuery,
  where,
  getDocs,
  limit,
  orderBy,
  Timestamp,
  FieldValue,
  writeBatch,
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { getFirebaseClient } from './firebase';

// Helper: strip undefined/null
function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined && obj[key] !== null) {
      result[key] = obj[key];
    }
  }
  return result;
}

// Helper: delay
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface UserProfile {
  uid: string;
  username: string;
  email: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  website?: string;
  location?: string;
  role?: 'user' | 'admin';
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
  };
  preferences?: {
    theme?: 'light' | 'dark' | 'auto';
    language?: 'en' | 'pa';
    notifications?: boolean;
    publicProfile?: boolean;
  };
  stats?: {
    postsCount?: number;
    followersCount?: number;
    followingCount?: number;
  };
  unreadNotifications?: number;
  isVerified?: boolean;
  isOnline?: boolean;
  lastSeen?: Timestamp | FieldValue;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface UsernameRecord {
  uid: string;
  reserved?: boolean;
  createdAt: Timestamp | FieldValue;
}

const RESERVED_USERNAMES = [
  'admin', 'administrator', 'root', 'api', 'www', 'mail', 'email', 'support',
  'help', 'about', 'contact', 'info', 'service', 'team', 'staff', 'mod',
  'moderator', 'patti', 'pattibytes', 'official', 'system', 'null', 'undefined',
  'test', 'demo', 'guest', 'user', 'bot', 'admin1', 'admin2', 'super', 'superuser'
];

// Validate username
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== 'string') return { valid: false, error: 'Username is required' };
  const trimmed = username.trim().toLowerCase();
  if (trimmed.length < 3) return { valid: false, error: 'Username must be at least 3 characters' };
  if (trimmed.length > 20) return { valid: false, error: 'Username must be less than 20 characters' };
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return { valid: false, error: 'Only letters, numbers and underscores' };
  if (trimmed.startsWith('_') || trimmed.endsWith('_')) return { valid: false, error: 'Cannot start/end with underscore' };
  if (trimmed.includes('__')) return { valid: false, error: 'No consecutive underscores' };
  if (RESERVED_USERNAMES.includes(trimmed)) return { valid: false, error: 'This username is reserved' };
  return { valid: true };
}

// Cache and duration for availability checks
const usernameCache = new Map<string, { available: boolean; timestamp: number }>();
const CACHE_DURATION = 30000; // 30s

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const validation = validateUsername(username);
  if (!validation.valid) return false;

  const normalized = username.toLowerCase().trim();
  const now = Date.now();

  const cached = usernameCache.get(normalized);
  if (cached && now - cached.timestamp < CACHE_DURATION) return cached.available;

  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  const usernameDoc = await getDoc(doc(db, 'usernames', normalized));
  const available = !usernameDoc.exists();
  usernameCache.set(normalized, { available, timestamp: now });
  return available;
}

export async function usernameExists(username: string): Promise<boolean> {
  return !(await checkUsernameAvailable(username));
}

// Suggestions
export function getUsernameSuggestions(baseUsername: string, count = 3): string[] {
  const base = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
  if (!base) {
    return [
      'user' + Math.floor(Math.random() * 9999),
      'patti_user' + Math.floor(Math.random() * 999),
      'new_user' + Math.floor(Math.random() * 999),
    ].slice(0, count);
  }
  const suggestions: string[] = [];
  for (let i = 0; i < Math.min(count, 3); i++) {
    suggestions.push(`${base}${Math.floor(Math.random() * 9999) + 1}`);
  }
  if (suggestions.length < count) {
    const prefixes = ['the', 'real', 'official'];
    const suffixes = ['official', 'real', 'patti', 'pb'];
    suggestions.push(`${prefixes[Math.floor(Math.random() * prefixes.length)]}_${base}`);
    if (suggestions.length < count) {
      suggestions.push(`${base}_${suffixes[Math.floor(Math.random() * suffixes.length)]}`);
    }
  }
  return suggestions.slice(0, count);
}

// Get user profile by uid
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) return null;
  return userDoc.data() as UserProfile;
}

// Get user by username
export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  const normalized = username.toLowerCase().trim();
  const usernameDoc = await getDoc(doc(db, 'usernames', normalized));
  if (!usernameDoc.exists()) return null;

  const { uid } = usernameDoc.data() as UsernameRecord;
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) return null;
  return userDoc.data() as UserProfile;
}

// Prefix search in usernames mapping
export async function searchUsersByUsername(
  prefix: string,
  limitCount = 10,
  excludeUid?: string,
): Promise<UserProfile[]> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  if (prefix.length < 2) return [];

  const normalized = prefix.toLowerCase().trim();

  const usernamesQuery = fsQuery(
    collection(db, 'usernames'),
    where('__name__', '>=', normalized),
    where('__name__', '<', normalized + '\uf8ff'),
    orderBy('__name__'),
    limit(limitCount + 1),
  );

  const usernameSnapshot = await getDocs(usernamesQuery);
  let userIds = usernameSnapshot.docs.map((d) => d.data().uid as string).filter((id) => id !== excludeUid);
  if (userIds.length === 0) return [];
  userIds = userIds.slice(0, limitCount);

  const profiles = await Promise.all(
    userIds.map(async (uid) => {
      const userDoc = await getDoc(doc(db, 'users', uid));
      return userDoc.exists() ? (userDoc.data() as UserProfile) : null;
    }),
  );

  return profiles.filter((p): p is UserProfile => !!p);
}

// Create a new user profile and claim username in one go
export async function createUserProfile(profile: {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  photoURL?: string;
}): Promise<void> {
  const { uid, email, username, displayName, photoURL } = profile;
  const available = await checkUsernameAvailable(username);
  if (!available) throw new Error('Username is already taken');
  await claimUsername(username, uid, {
    email,
    displayName,
    photoURL,
  });
}

// Claim username atomically and upsert profile
export async function claimUsername(
  username: string,
  uid: string,
  userProfile?: Partial<UserProfile>,
): Promise<void> {
  const validation = validateUsername(username);
  if (!validation.valid) throw new Error(validation.error);

  const { db, auth } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  const normalized = username.toLowerCase().trim();
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const usernameRef = doc(db, 'usernames', normalized);
      const usernameSnapshot = await getDoc(usernameRef);
      if (usernameSnapshot.exists()) {
        const existing = usernameSnapshot.data() as UsernameRecord;
        if (existing.uid !== uid) throw new Error('Username is already taken');
      }

      const userRef = doc(db, 'users', uid);
      const userSnapshot = await getDoc(userRef);
      const isNewUser = !userSnapshot.exists();
      const current = isNewUser ? null : (userSnapshot.data() as UserProfile);

      const batch = writeBatch(db);

      if (current?.username && current.username !== normalized) {
        const oldRef = doc(db, 'usernames', current.username);
        batch.delete(oldRef);
        usernameCache.delete(current.username);
      }

      batch.set(usernameRef, { uid, createdAt: serverTimestamp() });

      const now = serverTimestamp();
      const profileData: Record<string, unknown> = { username: normalized, updatedAt: now };

      if (userProfile) {
        const cleaned = removeUndefined(userProfile as Record<string, unknown>);
        Object.assign(profileData, cleaned);
      }

      if (isNewUser) {
        profileData.uid = uid;
        profileData.createdAt = now;
        profileData.stats = { postsCount: 0, followersCount: 0, followingCount: 0 };
        profileData.unreadNotifications = 0;
        profileData.preferences = profileData.preferences || {
          theme: 'auto',
          language: 'en',
          notifications: true,
          publicProfile: true,
        };
        profileData.isVerified = false;
        profileData.isOnline = false;
      }

      batch.set(userRef, profileData, { merge: true });
      await batch.commit();

      usernameCache.delete(normalized);

      if (userProfile?.displayName && auth?.currentUser) {
        try {
          await updateProfile(auth.currentUser, { displayName: userProfile.displayName });
        } catch (e) {
          console.warn('Failed to update auth profile:', e);
        }
      }
      return;
    } catch (error) {
      lastError = error as Error;
      if (error instanceof Error && error.message.includes('already taken')) throw error;
      if (attempt < maxRetries - 1) {
        await delay(1000 * Math.pow(2, attempt));
      }
    }
  }
  if (lastError) throw lastError;
  throw new Error('Failed to claim username. Please try again.');
}

// Update profile
export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  const { db, auth } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  const profileUpdates: Partial<UserProfile> = { ...updates, updatedAt: serverTimestamp() as FieldValue };
  delete profileUpdates.uid;
  delete profileUpdates.createdAt;
  delete profileUpdates.username;
  delete profileUpdates.stats;

  if (profileUpdates.bio && profileUpdates.bio.length > 160) {
    throw new Error('Bio must be less than 160 characters');
  }

  const cleaned = removeUndefined(profileUpdates as Record<string, unknown>);
  await setDoc(doc(db, 'users', uid), cleaned, { merge: true });

  if (updates.displayName && auth?.currentUser?.uid === uid) {
    try {
      await updateProfile(auth.currentUser, { displayName: updates.displayName });
    } catch (e) {
      console.warn('Failed to update auth profile:', e);
    }
  }
}

// Presence
export async function updateUserOnlineStatus(uid: string, isOnline: boolean): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) return;
  await setDoc(
    doc(db, 'users', uid),
    { isOnline, lastSeen: serverTimestamp(), updatedAt: serverTimestamp() },
    { merge: true },
  );
}

// Stats helpers
export async function updateUserStats(uid: string, statsUpdate: Partial<UserProfile['stats']>): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) throw new Error('User not found');

  const currentStats = userDoc.data().stats || { postsCount: 0, followersCount: 0, followingCount: 0 };
  const updatedStats = { ...currentStats, ...statsUpdate };

  await setDoc(
    userRef,
    {
      stats: updatedStats,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function incrementPostCount(uid: string): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) return;
  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);
  if (userDoc.exists()) {
    const current = userDoc.data().stats?.postsCount || 0;
    await updateUserStats(uid, { postsCount: current + 1 });
  }
}

export async function decrementPostCount(uid: string): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) return;
  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);
  if (userDoc.exists()) {
    const current = userDoc.data().stats?.postsCount || 0;
    await updateUserStats(uid, { postsCount: Math.max(0, current - 1) });
  }
}

export async function updateUnreadNotifications(uid: string, count: number): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) return;
  await setDoc(
    doc(db, 'users', uid),
    { unreadNotifications: Math.max(0, count), updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export function clearUsernameCache(): void {
  usernameCache.clear();
}

export function getCachedUsernameStatus(
  username: string,
): { available: boolean; timestamp: number } | undefined {
  return usernameCache.get(username.toLowerCase().trim());
}

// Alias used elsewhere in codebases
export function isUsernameTaken(username: string): Promise<boolean> {
  return usernameExists(username);
}
