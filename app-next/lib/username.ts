// app-next/lib/username.ts
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
  isBanned?: boolean;
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
  'admin',
  'administrator',
  'root',
  'api',
  'www',
  'mail',
  'email',
  'support',
  'help',
  'about',
  'contact',
  'info',
  'service',
  'team',
  'staff',
  'mod',
  'moderator',
  'patti',
  'pattibytes',
  'official',
  'system',
  'null',
  'undefined',
  'test',
  'demo',
  'guest',
  'user',
  'bot',
  'admin1',
  'admin2',
  'super',
  'superuser',
];

export function validateUsername(
  username: string,
): { valid: boolean; error?: string } {
  if (!username || typeof username !== 'string')
    return { valid: false, error: 'Username is required' };
  const trimmed = username.trim().toLowerCase();
  if (trimmed.length < 3)
    return { valid: false, error: 'Username must be at least 3 characters' };
  if (trimmed.length > 20)
    return { valid: false, error: 'Username must be less than 20 characters' };
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed))
    return { valid: false, error: 'Only letters, numbers and underscores' };
  if (trimmed.startsWith('_') || trimmed.endsWith('_'))
    return { valid: false, error: 'Cannot start/end with underscore' };
  if (trimmed.includes('__'))
    return { valid: false, error: 'No consecutive underscores' };
  if (RESERVED_USERNAMES.includes(trimmed))
    return { valid: false, error: 'This username is reserved' };
  return { valid: true };
}

const usernameCache = new Map<
  string,
  { available: boolean; timestamp: number }
>();
const CACHE_DURATION = 30_000;

function normalizeUsernameKey(username: string): string {
  return username.trim().toLowerCase();
}

function normalizeUserProfile(uid: string, data: DocumentData): UserProfile {
  const username = String(data.username || '').trim().toLowerCase();
  const email = String(data.email || '');
  const displayName =
    String(data.displayName || '').trim() ||
    (email
      ? email.split('@')[0]
      : username
      ? `@${username}`
      : 'User');

  const stats = {
    postsCount: Number(data.stats?.postsCount ?? 0),
    followersCount: Number(data.stats?.followersCount ?? 0),
    followingCount: Number(data.stats?.followingCount ?? 0),
  };

  const preferences = {
    theme: (data.preferences?.theme as 'light' | 'dark' | 'auto') ?? 'auto',
    language: (data.preferences?.language as 'en' | 'pa') ?? 'en',
    notifications: Boolean(data.preferences?.notifications ?? true),
    publicProfile: Boolean(data.preferences?.publicProfile ?? true),
  };

  return deepClean({
    uid,
    username,
    email,
    displayName,
    photoURL: data.photoURL || undefined,
    bio: data.bio || undefined,
    website: data.website || undefined,
    location: data.location || undefined,
    role: (data.role as 'user' | 'admin') || 'user',
    isBanned: Boolean(data.isBanned ?? false),
    socialLinks: data.socialLinks || undefined,
    preferences,
    stats,
    unreadNotifications: Number(data.unreadNotifications ?? 0),
    isVerified: Boolean(data.isVerified ?? false),
    isOnline: Boolean(data.isOnline ?? false),
    lastSeen: (data.lastSeen as Timestamp | FieldValue) ?? undefined,
    createdAt:
      (data.createdAt as Timestamp | FieldValue) ?? serverTimestamp(),
    updatedAt:
      (data.updatedAt as Timestamp | FieldValue) ?? serverTimestamp(),
  }) as UserProfile;
}

export function isFirestoreInternalAssertion(err: unknown): boolean {
  return (
    err instanceof Error &&
    err.message.includes('INTERNAL ASSERTION FAILED: Unexpected state')
  );
}

async function ensureUsernameMapping(
  normalized: string,
  uid: string,
): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) return;
  const mapRef = doc(db, 'usernames', normalized);
  const mapSnap = await getDoc(mapRef);
  if (!mapSnap.exists()) {
    await setDoc(
      mapRef,
      { uid, createdAt: serverTimestamp() },
      { merge: true },
    );
  }
}

export async function checkUsernameAvailable(
  username: string,
): Promise<boolean> {
  const validation = validateUsername(username);
  if (!validation.valid) return false;

  const normalized = normalizeUsernameKey(username);
  const now = Date.now();

  const cached = usernameCache.get(normalized);
  if (cached && now - cached.timestamp < CACHE_DURATION)
    return cached.available;

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

export function getUsernameSuggestions(
  baseUsername: string,
  count = 3,
): string[] {
  const base = baseUsername
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 15);
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
    suggestions.push(
      `${prefixes[Math.floor(Math.random() * prefixes.length)]}_${base}`,
    );
    if (suggestions.length < count) {
      suggestions.push(
        `${base}_${suffixes[Math.floor(Math.random() * suffixes.length)]}`,
      );
    }
  }
  return suggestions.slice(0, count);
}

export async function getUserProfile(
  uid: string,
): Promise<UserProfile | null> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return null;
    const profile = normalizeUserProfile(uid, userDoc.data());
    console.log('[getUserProfile] loaded profile:', {
      uid,
      displayName: profile.displayName,
      username: profile.username,
      bio: profile.bio,
    });
    return profile;
  } catch (err) {
    if (isFirestoreInternalAssertion(err)) {
      console.warn(
        '[getUserProfile] Ignoring Firestore internal assertion (bug in SDK):',
        err,
      );
      return null;
    }
    throw err;
  }
}

export async function getUserByUsername(
  username: string,
): Promise<UserProfile | null> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  const normalized = normalizeUsernameKey(username);

  // Primary mapping lookup
  const mapRef = doc(db, 'usernames', normalized);
  const mapSnap = await getDoc(mapRef);

  if (mapSnap.exists()) {
    const { uid } = mapSnap.data() as UsernameRecord;
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return normalizeUserProfile(uid, userSnap.data());
    }
  }

  // Fallback query by users.username and heal mapping
  const q = fsQuery(
    collection(db, 'users'),
    where('username', '==', normalized),
    limit(1),
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    const uid = d.id;
    const data = d.data();
    await ensureUsernameMapping(normalized, uid);
    return normalizeUserProfile(uid, data);
  }

  return null;
}

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
      return userDoc.exists()
        ? normalizeUserProfile(uid, userDoc.data())
        : null;
    }),
  );
  const primary = fromUsernames.filter(
    (p): p is UserProfile => !!p,
  );

  if (primary.length >= limitCount) return primary.slice(0, limitCount);

  // Fallback: displayNameLower prefix in users
  const remaining = Math.max(0, limitCount - primary.length);
  if (remaining === 0) return primary;

  const nameQuery = fsQuery(
    collection(db, 'users'),
    orderBy('displayNameLower'),
    where('displayNameLower', '>=', normalized),
    where('displayNameLower', '<', normalized + '\uf8ff'),
    limit(remaining * 2),
  );

  const nameSnap = await getDocs(nameQuery);
  const seen = new Set(primary.map((p) => p.uid));
  const fallback: UserProfile[] = [];

  for (const d of nameSnap.docs) {
    if (excludeUid && d.id === excludeUid) continue;
    if (seen.has(d.id)) continue;
    const data = d.data() as DocumentData;
    fallback.push(normalizeUserProfile(d.id, data));
    if (fallback.length >= remaining) break;
  }

  return [...primary, ...fallback].slice(0, limitCount);
}

export async function createUserProfile(profile: {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  photoURL?: string;
}): Promise<void> {
  const { uid, email, username, displayName, photoURL } = profile;
  
  if (!displayName?.trim()) {
    throw new Error('Display name is required');
  }

  const available = await checkUsernameAvailable(username);
  if (!available) throw new Error('Username is already taken');
  
  await claimUsername(username, uid, {
    email,
    displayName: displayName.trim(),
    photoURL,
  });
}

export async function claimUsername(
  username: string,
  uid: string,
  userProfile?: Partial<UserProfile>,
): Promise<void> {
  const validation = validateUsername(username);
  if (!validation.valid) throw new Error(validation.error);

  const { db, auth } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  const normalized = normalizeUsernameKey(username);
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const usernameRef = doc(db, 'usernames', normalized);
      const usernameSnapshot = await getDoc(usernameRef);
      if (usernameSnapshot.exists()) {
        const existing = usernameSnapshot.data() as UsernameRecord;
        if (existing.uid !== uid)
          throw new Error('Username is already taken');
      }

      const userRef = doc(db, 'users', uid);
      const userSnapshot = await getDoc(userRef);
      const isNewUser = !userSnapshot.exists();
      const current = isNewUser
        ? null
        : (userSnapshot.data() as UserProfile);

      const batch = writeBatch(db);

      if (current?.username && current.username !== normalized) {
        const oldRef = doc(db, 'usernames', current.username);
        batch.delete(oldRef);
        usernameCache.delete(current.username);
      }

      batch.set(usernameRef, {
        uid,
        createdAt: serverTimestamp(),
      });

      const now = serverTimestamp();

      const profileData: Record<string, unknown> = {
        username: normalized,
        updatedAt: now,
      };

      if (userProfile) {
        const cleanedPartial = deepClean(
          userProfile as Record<string, unknown>,
        );
        Object.assign(profileData, cleanedPartial);
        if (typeof userProfile.displayName === 'string') {
          profileData.displayNameLower =
            userProfile.displayName.toLowerCase();
        }
      }

      if (isNewUser) {
        profileData.uid = uid;
        profileData.createdAt = now;
        profileData.role = 'user';
        profileData.stats = {
          postsCount: 0,
          followersCount: 0,
          followingCount: 0,
        };
        profileData.unreadNotifications = 0;
        profileData.preferences = {
          theme: 'auto',
          language: 'en',
          notifications: true,
          publicProfile: true,
        };
        profileData.isVerified = false;
        profileData.isOnline = false;
        profileData.isBanned = false;

        const rec = profileData as Record<string, unknown>;
        if (typeof rec.displayName === 'string') {
          rec.displayNameLower = String(
            rec.displayName,
          ).toLowerCase();
        }
      }

      const finalProfile = deepClean(profileData);
      console.log('[claimUsername] Writing profile to Firestore:', {
        uid,
        username: finalProfile.username,
        displayName: finalProfile.displayName,
        isNewUser,
      });
      
      batch.set(userRef, finalProfile, { merge: true });
      await batch.commit();

      usernameCache.delete(normalized);

      if (
        userProfile?.displayName &&
        auth?.currentUser &&
        auth.currentUser.uid === uid
      ) {
        try {
          await updateProfile(auth.currentUser, {
            displayName: userProfile.displayName,
          });
        } catch (e) {
          console.warn('Failed to update auth profile:', e);
        }
      }
      console.log('[claimUsername] Successfully claimed username for:', uid);
      return;
    } catch (error) {
      lastError = error as Error;
      if (
        error instanceof Error &&
        error.message.includes('already taken')
      )
        throw error;
      if (attempt < maxRetries - 1) {
        await delay(1000 * Math.pow(2, attempt));
      }
    }
  }
  if (lastError) throw lastError;
  throw new Error('Failed to claim username. Please try again.');
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>,
): Promise<void> {
  const { db, auth } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  if (updates.displayName && !updates.displayName.trim()) {
    throw new Error('Display name cannot be empty');
  }

  const toWrite: Record<string, unknown> = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  delete toWrite.uid;
  delete toWrite.createdAt;
  delete toWrite.username;
  delete toWrite.stats;

  if (
    typeof toWrite.bio === 'string' &&
    (toWrite.bio as string).length > 160
  ) {
    throw new Error('Bio must be less than 160 characters');
  }

  if (typeof toWrite.displayName === 'string') {
    toWrite.displayNameLower = (toWrite
      .displayName as string).toLowerCase();
  }

  const cleaned = deepClean(toWrite);
  console.log('[updateUserProfile] Writing to Firestore:', {
    uid,
    updates: cleaned,
  });
  
  await setDoc(doc(db, 'users', uid), cleaned, { merge: true });

  if (updates.displayName && auth?.currentUser?.uid === uid) {
    try {
      await updateProfile(auth.currentUser, {
        displayName: updates.displayName,
      });
    } catch (e) {
      console.warn('Failed to update auth profile:', e);
    }
  }
}

export async function updateUserOnlineStatus(
  uid: string,
  isOnline: boolean,
): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) return;
  await setDoc(
    doc(db, 'users', uid),
    deepClean({
      isOnline,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    { merge: true },
  );
}

export async function updateUserStats(
  uid: string,
  statsUpdate: Partial<UserProfile['stats']>,
): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');

  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);

  const currentStats =
    (userDoc.exists() &&
      (userDoc.data().stats as UserProfile['stats'])) ||
    {};
  const safeCurrent = {
    postsCount: Number(currentStats?.postsCount ?? 0),
    followersCount: Number(currentStats?.followersCount ?? 0),
    followingCount: Number(currentStats?.followingCount ?? 0),
  };

  const merged = {
    ...safeCurrent,
    ...(statsUpdate || {}),
  };

  const safeMerged = {
    postsCount: Number(merged.postsCount ?? safeCurrent.postsCount),
    followersCount: Number(
      merged.followersCount ?? safeCurrent.followersCount,
    ),
    followingCount: Number(
      merged.followingCount ?? safeCurrent.followingCount,
    ),
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

export async function updateUnreadNotifications(
  uid: string,
  count: number,
): Promise<void> {
  const { db } = getFirebaseClient();
  if (!db) return;
  await setDoc(
    doc(db, 'users', uid),
    deepClean({
      unreadNotifications: Math.max(0, count),
      updatedAt: serverTimestamp(),
    }),
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

export function isUsernameTaken(username: string): Promise<boolean> {
  return usernameExists(username);
}
