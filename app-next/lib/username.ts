// lib/username.ts
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  Timestamp,
  FieldValue,
  writeBatch
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { getFirebaseClient } from './firebase';

// Helper function to remove undefined and null values from object
function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key in obj) {
    if (obj[key] !== undefined && obj[key] !== null) {
      result[key] = obj[key];
    }
  }
  return result;
}

// Helper function to wait/delay
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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

// Reserved usernames
const RESERVED_USERNAMES = [
  'admin', 'administrator', 'root', 'api', 'www', 'mail', 'email', 'support',
  'help', 'about', 'contact', 'info', 'service', 'team', 'staff', 'mod',
  'moderator', 'patti', 'pattibytes', 'official', 'system', 'null', 'undefined',
  'test', 'demo', 'guest', 'user', 'bot', 'admin1', 'admin2', 'super', 'superuser'
];

// Username validation with enhanced checks
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }

  const trimmed = username.trim().toLowerCase();

  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: 'Username must be less than 20 characters' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  if (trimmed.startsWith('_') || trimmed.endsWith('_')) {
    return { valid: false, error: 'Username cannot start or end with underscore' };
  }

  if (trimmed.includes('__')) {
    return { valid: false, error: 'Username cannot contain consecutive underscores' };
  }

  if (RESERVED_USERNAMES.includes(trimmed)) {
    return { valid: false, error: 'This username is reserved' };
  }

  return { valid: true };
}

// Check username availability with caching
const usernameCache = new Map<string, { available: boolean; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const validation = validateUsername(username);
  if (!validation.valid) return false;

  const normalizedUsername = username.toLowerCase().trim();
  const now = Date.now();

  // Check cache first
  const cached = usernameCache.get(normalizedUsername);
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.available;
  }

  try {
    const { db } = getFirebaseClient();
    if (!db) throw new Error('Firestore not initialized');
    
    const usernameDoc = await getDoc(doc(db, 'usernames', normalizedUsername));
    const available = !usernameDoc.exists();

    // Cache the result
    usernameCache.set(normalizedUsername, { available, timestamp: now });

    return available;
  } catch (error: unknown) {
    console.error('Error checking username availability:', error);
    throw new Error('Unable to check username availability. Please try again.');
  }
}

// Get user by username with caching
export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  try {
    const { db } = getFirebaseClient();
    if (!db) throw new Error('Firestore not initialized');
    
    const normalizedUsername = username.toLowerCase().trim();

    // Get UID from username mapping
    const usernameDoc = await getDoc(doc(db, 'usernames', normalizedUsername));

    if (!usernameDoc.exists()) {
      return null;
    }

    const { uid } = usernameDoc.data() as UsernameRecord;

    // Get user profile
    const userDoc = await getDoc(doc(db, 'users', uid));

    if (!userDoc.exists()) {
      return null;
    }

    return userDoc.data() as UserProfile;
  } catch (error) {
    console.error('Error getting user by username:', error);
    throw error;
  }
}

// Search users by username prefix with pagination
export async function searchUsersByUsername(
  prefix: string,
  limitCount: number = 10,
  excludeUid?: string
): Promise<UserProfile[]> {
  try {
    const { db } = getFirebaseClient();
    if (!db) throw new Error('Firestore not initialized');

    if (prefix.length < 2) {
      return [];
    }

    const normalizedPrefix = prefix.toLowerCase().trim();

    // Search in usernames collection
    const usernamesQuery = query(
      collection(db, 'usernames'),
      where('__name__', '>=', normalizedPrefix),
      where('__name__', '<', normalizedPrefix + '\uf8ff'),
      orderBy('__name__'),
      limit(limitCount + 1)
    );

    const usernameSnapshot = await getDocs(usernamesQuery);
    let userIds = usernameSnapshot.docs
      .map(docSnap => docSnap.data().uid)
      .filter(uid => uid !== excludeUid);

    if (userIds.length === 0) {
      return [];
    }

    userIds = userIds.slice(0, limitCount);

    const userProfiles = await Promise.allSettled(
      userIds.map(async (uid) => {
        const userDoc = await getDoc(doc(db, 'users', uid));
        return userDoc.exists() ? userDoc.data() as UserProfile : null;
      })
    );

    return userProfiles
      .filter((result): result is PromiseFulfilledResult<UserProfile> =>
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);

  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
}

// Atomic username claiming using batch writes - NO TRANSACTION CONFLICTS
export async function claimUsername(
  username: string,
  uid: string,
  userProfile?: Partial<UserProfile>
): Promise<void> {
  const validation = validateUsername(username);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const { db, auth } = getFirebaseClient();
  if (!db) throw new Error('Firestore not initialized');
  
  const normalizedUsername = username.toLowerCase().trim();

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Step 1: Check if username is available
      const usernameRef = doc(db, 'usernames', normalizedUsername);
      const usernameSnapshot = await getDoc(usernameRef);

      if (usernameSnapshot.exists()) {
        const existingData = usernameSnapshot.data() as UsernameRecord;
        if (existingData.uid !== uid) {
          throw new Error('Username is already taken');
        }
      }

      // Step 2: Get current user data
      const userRef = doc(db, 'users', uid);
      const userSnapshot = await getDoc(userRef);
      const isNewUser = !userSnapshot.exists();
      const currentUserData = isNewUser ? null : userSnapshot.data() as UserProfile;

      // Step 3: Use batch write for atomic operations
      const batch = writeBatch(db);

      // Release old username if it exists and is different
      if (currentUserData?.username && currentUserData.username !== normalizedUsername) {
        const oldUsernameRef = doc(db, 'usernames', currentUserData.username);
        batch.delete(oldUsernameRef);
        usernameCache.delete(currentUserData.username);
      }

      // Claim the new username
      batch.set(usernameRef, {
        uid,
        createdAt: serverTimestamp()
      });

      // Prepare profile data
      const now = serverTimestamp();
      const profileData: Record<string, unknown> = {
        username: normalizedUsername,
        updatedAt: now
      };

      // Add provided profile fields (remove undefined/null)
      if (userProfile) {
        const cleaned = removeUndefined(userProfile as Record<string, unknown>);
        Object.assign(profileData, cleaned);
      }

      // Add default fields for new users
      if (isNewUser) {
        profileData.uid = uid;
        profileData.createdAt = now;
        profileData.stats = {
          postsCount: 0,
          followersCount: 0,
          followingCount: 0
        };

        if (!profileData.preferences) {
          profileData.preferences = {
            theme: 'auto',
            language: 'en',
            notifications: true,
            publicProfile: true
          };
        }

        profileData.isVerified = false;
      }

      // Update user profile
      batch.set(userRef, profileData, { merge: true });

      // Commit batch
      await batch.commit();

      // Clear cache
      usernameCache.delete(normalizedUsername);

      // Update Auth profile (outside batch)
      if (userProfile?.displayName && auth && auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, {
            displayName: userProfile.displayName
          });
        } catch (error) {
          console.warn('Failed to update auth profile:', error);
        }
      }

      return;

    } catch (error) {
      lastError = error as Error;
      console.error(`Username claim attempt ${attempt + 1} failed:`, error);

      // Check if it's a non-retryable error
      if (error instanceof Error && error.message.includes('already taken')) {
        throw error;
      }

      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string };
        if (
          firebaseError.code === 'permission-denied' ||
          firebaseError.code === 'unauthenticated'
        ) {
          throw error;
        }
      }

      // Wait before retry with exponential backoff
      if (attempt < maxRetries - 1) {
        const waitTime = 1000 * Math.pow(2, attempt);
        await delay(waitTime);
      }
    }
  }

  // All retries failed
  if (lastError) {
    throw lastError;
  }

  throw new Error('Failed to claim username. Please try again.');
}

// Update user profile with validation
export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  try {
    const { db, auth } = getFirebaseClient();
    if (!db) throw new Error('Firestore not initialized');

    const profileUpdates: Partial<UserProfile> = {
      ...updates,
      updatedAt: serverTimestamp() as FieldValue
    };

    // Remove fields that shouldn't be updated
    delete profileUpdates.uid;
    delete profileUpdates.createdAt;
    delete profileUpdates.username;
    delete profileUpdates.stats;

    // Validate bio length
    if (profileUpdates.bio && profileUpdates.bio.length > 160) {
      throw new Error('Bio must be less than 160 characters');
    }

    // Remove undefined/null values
    const cleanedUpdates = removeUndefined(profileUpdates as Record<string, unknown>);

    // Update Firestore
    await setDoc(doc(db, 'users', uid), cleanedUpdates, { merge: true });

    // Update Auth profile if displayName changed
    if (updates.displayName && auth && auth.currentUser && auth.currentUser.uid === uid) {
      try {
        await updateProfile(auth.currentUser, {
          displayName: updates.displayName
        });
      } catch (error) {
        console.warn('Failed to update auth profile:', error);
      }
    }

  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

// Update user online status (non-blocking)
export async function updateUserOnlineStatus(uid: string, isOnline: boolean): Promise<void> {
  try {
    const { db } = getFirebaseClient();
    if (!db) return;

    await setDoc(doc(db, 'users', uid), {
      isOnline,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

  } catch (error) {
    console.error('Error updating online status:', error);
  }
}

// Get username suggestions based on a base string
export function getUsernameSuggestions(baseUsername: string, count: number = 3): string[] {
  const base = baseUsername.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);

  if (!base) {
    return [
      'user' + Math.floor(Math.random() * 9999),
      'patti_user' + Math.floor(Math.random() * 999),
      'new_user' + Math.floor(Math.random() * 999)
    ];
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

// Update user stats
export async function updateUserStats(
  uid: string,
  statsUpdate: Partial<UserProfile['stats']>
): Promise<void> {
  try {
    const { db } = getFirebaseClient();
    if (!db) throw new Error('Firestore not initialized');

    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const currentStats = userDoc.data().stats || {
      postsCount: 0,
      followersCount: 0,
      followingCount: 0
    };

    const updatedStats = {
      ...currentStats,
      ...statsUpdate
    };

    await setDoc(userRef, {
      stats: updatedStats,
      updatedAt: serverTimestamp()
    }, { merge: true });

  } catch (error) {
    console.error('Error updating user stats:', error);
    throw error;
  }
}

// Increment post count
export async function incrementPostCount(uid: string): Promise<void> {
  try {
    const { db } = getFirebaseClient();
    if (!db) return;
    
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const currentCount = userDoc.data().stats?.postsCount || 0;
      await updateUserStats(uid, { postsCount: currentCount + 1 });
    }
  } catch (error) {
    console.error('Error incrementing post count:', error);
  }
}

// Decrement post count
export async function decrementPostCount(uid: string): Promise<void> {
  try {
    const { db } = getFirebaseClient();
    if (!db) return;
    
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const currentCount = userDoc.data().stats?.postsCount || 0;
      await updateUserStats(uid, { postsCount: Math.max(0, currentCount - 1) });
    }
  } catch (error) {
    console.error('Error decrementing post count:', error);
  }
}

// Clear username cache
export function clearUsernameCache(): void {
  usernameCache.clear();
}

// Get cached username status
export function getCachedUsernameStatus(username: string): { available: boolean; timestamp: number } | undefined {
  return usernameCache.get(username.toLowerCase().trim());
}

// Check if username exists
export async function usernameExists(username: string): Promise<boolean> {
  const available = await checkUsernameAvailable(username);
  return !available;
}

// Get all reserved usernames
export function getReservedUsernames(): readonly string[] {
  return RESERVED_USERNAMES;
}
