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
  increment,
  type DocumentData,
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { getFirebaseClient } from './firebase';

// Deeply strip undefined and null
function deepClean<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj as T;
  if (Array.isArray(obj)) {
    return obj
      .map((v) => deepClean(v))
      .filter((v) => v !== undefined && v !== null) as unknown as T;
  }
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const cleaned = deepClean(v);
      if (cleaned !== undefined && cleaned !== null) out[k] = cleaned as unknown;
    }
    return out as T;
  }
  return obj;
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

// Cache for username availability checks
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

// Get user by username (mapping -> users)
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

// Prefix search in usernames mapping with fallback to displayName prefix
export async function searchUsersByUsername(
  prefix: string,
  limitCount = 10,
  excludeUid?: string,
): Promise<UserProfile[]> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  const normalized = prefix.toLowerCase().trim();
  if (normalized.length < 2) return [];

  // Primary: usernames mapping
  const usernamesQuery = fsQuery(
    collection(db, 'usernames'),
    orderBy('__name__'),
    where('__name__', '>=', normalized),
    where('__name__', '<', normalized + '\uf8ff'),
    limit(limitCount + 1),
  );
  const usernameSnapshot = await getDocs(usernamesQuery);
  let userIds = usernameSnapshot.docs
    .map((d) => (d.data() as UsernameRecord).uid)
    .filter((id) => id && id !== excludeUid);
  userIds = userIds.slice(0, limitCount);

  // Hydrate
  const fromUsernames = await Promise.all(
    userIds.map(async (uid) => {
      const userDoc = await getDoc(doc(db, 'users', uid));
      return userDoc.exists() ? (userDoc.data() as UserProfile) : null;
    }),
  );
  const primary = fromUsernames.filter((p): p is UserProfile => !!p);

  if (primary.length >= limitCount) return primary.slice(0, limitCount);

  // Fallback: displayName prefix search in users (to catch people whose display names changed)
  const remaining = limitCount - primary.length;
  const nameQuery = fsQuery(
    collection(db, 'users'),
    orderBy('displayNameLower'),
    where('displayNameLower', '>=', normalized),
    where('displayNameLower', '<', normalized + '\uf8ff'),
    limit(remaining * 2),
  );
  const nameSnap = await getDocs(nameQuery);
  const nameMatches: UserProfile[] = [];
  for (const d of nameSnap.docs) {
    const data = d.data() as DocumentData;
    if (excludeUid && d.id === excludeUid) continue;
    nameMatches.push({ uid: d.id, ...(data as Omit<UserProfile, 'uid'>) });
    if (nameMatches.length >= remaining) break;
  }

  // Deduplicate by uid
  const seen = new Set(primary.map((p) => p.uid));
  const merged = [...primary, ...nameMatches.filter((p) => !seen.has(p.uid))];
  return merged.slice(0, limitCount);
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

      // If user is changing username, delete old mapping
      if (current?.username && current.username !== normalized) {
        const oldRef = doc(db, 'usernames', current.username);
        batch.delete(oldRef);
        usernameCache.delete(current.username);
      }

      // Create/update username mapping
      batch.set(usernameRef, { uid, createdAt: serverTimestamp() });

      const now = serverTimestamp();

      // Build base profile updates; never include undefined by deepClean later
      const profileData: Record<string, unknown> = {
        username: normalized,
        updatedAt: now,
      };

      if (userProfile) {
        const cleanedPartial = deepClean(userProfile as Record<string, unknown>);
        Object.assign(profileData, cleanedPartial);
        if (typeof userProfile.displayName === 'string') {
          profileData.displayNameLower = userProfile.displayName.toLowerCase();
        }
      }

      if (isNewUser) {
        profileData.uid = uid;
        profileData.createdAt = now;
        // Initialize stats with concrete zeros to avoid undefined inside nested object
        profileData.stats = { postsCount: 0, followersCount: 0, followingCount: 0 };
        profileData.unreadNotifications = 0;
        profileData.preferences =
          profileData.preferences || {
            theme: 'auto',
            language: 'en',
            notifications: true,
            publicProfile: true,
          };
        profileData.isVerified = false;
        profileData.isOnline = false;
        // store a lowercased display name to support displayName search fallback
        if (typeof (profileData as Record<string, unknown>).displayName === 'string') {
          (profileData as Record<string, unknown>).displayNameLower = String(
            (profileData as Record<string, unknown>).displayName
          ).toLowerCase();
        }
      }

      // Final sanitize to remove any undefined properties anywhere
      const finalProfile = deepClean(profileData);

      batch.set(userRef, finalProfile, { merge: true });
      await batch.commit();

      // Invalidate username cache
      usernameCache.delete(normalized);

      // Update Firebase Auth profile display name if provided
      if (userProfile?.displayName && auth?.currentUser && auth.currentUser.uid === uid) {
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

// Update profile (never write undefined and never overwrite stats here)
export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  const { db, auth } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  const toWrite: Record<string, unknown> = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  // Do not allow these to be directly updated here
  delete toWrite.uid;
  delete toWrite.createdAt;
  delete toWrite.username;
  delete toWrite.stats;

  if (typeof toWrite.bio === 'string' && (toWrite.bio as string).length > 160) {
    throw new Error('Bio must be less than 160 characters');
  }

  if (typeof toWrite.displayName === 'string') {
    toWrite.displayNameLower = (toWrite.displayName as string).toLowerCase();
  }

  const cleaned = deepClean(toWrite);
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
    deepClean({ isOnline, lastSeen: serverTimestamp(), updatedAt: serverTimestamp() }),
    { merge: true },
  );
}

// Stats helpers
export async function updateUserStats(uid: string, statsUpdate: Partial<UserProfile['stats']>): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);

  // Build a safe stats object with numbers, defaulting to 0
  const currentStats = (userDoc.exists() && (userDoc.data().stats as UserProfile['stats'])) || {};
  const safeCurrent = {
    postsCount: Number(currentStats?.postsCount ?? 0),
    followersCount: Number(currentStats?.followersCount ?? 0),
    followingCount: Number(currentStats?.followingCount ?? 0),
  };

  const merged = {
    ...safeCurrent,
    ...(statsUpdate || {}),
  };

  // Ensure we never write undefined inside stats
  const safeMerged = {
    postsCount: Number(merged.postsCount ?? safeCurrent.postsCount),
    followersCount: Number(merged.followersCount ?? safeCurrent.followersCount),
    followingCount: Number(merged.followingCount ?? safeCurrent.followingCount),
  };

  await setDoc(
    userRef,
    deepClean({
      stats: safeMerged,
      updatedAt: serverTimestamp(),
    }),
    { merge: true },
  );
}

export async function incrementPostCount(uid: string): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) return;
  const userRef = doc(db, 'users', uid);
  // Use atomic increment and also set defaults if missing
  await setDoc(
    userRef,
    deepClean({
      stats: {
        postsCount: increment(1),
        followersCount: 0,
        followingCount: 0,
      },
      updatedAt: serverTimestamp(),
    }),
    { merge: true },
  );
}

export async function decrementPostCount(uid: string): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) return;
  const userRef = doc(db, 'users', uid);
  await setDoc(
    userRef,
    deepClean({
      stats: {
        postsCount: increment(-1),
        followersCount: 0,
        followingCount: 0,
      },
      updatedAt: serverTimestamp(),
    }),
    { merge: true },
  );
}

export async function updateUnreadNotifications(uid: string, count: number): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) return;
  await setDoc(
    doc(db, 'users', uid),
    deepClean({ unreadNotifications: Math.max(0, count), updatedAt: serverTimestamp() }),
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
