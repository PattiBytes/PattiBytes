// app-next/lib/settings.ts - FIXED
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseClient } from './firebase';

export interface SystemSettings {
  maintenanceMode: boolean;
  enableRegistration: boolean;
  enableComments: boolean;
  enableSharing: boolean;
  maxPostLength: number;
  maxImageSize: number;
  sessionTimeout: number;
  autoBackup: boolean;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  siteTitle: string;
  siteDescription: string;
  contactEmail: string;
  createdAt: Date;
  lastUpdated: Date;
}

const DEFAULT_SETTINGS: SystemSettings = {
  maintenanceMode: false,
  enableRegistration: true,
  enableComments: true,
  enableSharing: true,
  maxPostLength: 5000,
  maxImageSize: 10,
  sessionTimeout: 24,
  autoBackup: true,
  notificationsEnabled: true,
  emailNotifications: true,
  siteTitle: 'PattiBytes',
  siteDescription: 'Community Platform for Content Creators',
  contactEmail: 'support@pattibytes.com',
  createdAt: new Date(),
  lastUpdated: new Date(),
};

export async function getSystemSettings(): Promise<SystemSettings | null> {
  const { db } = getFirebaseClient();
  if (!db) return null;

  try {
    const docRef = doc(db, 'system', 'settings');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as SystemSettings;
    } else {
      // Create default settings if they don't exist
      await setDoc(docRef, DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
    return null;
  }
}

export async function saveSystemSettings(settings: Partial<SystemSettings>): Promise<boolean> {
  const { db } = getFirebaseClient();
  if (!db) return false;

  try {
    const docRef = doc(db, 'system', 'settings');
    // FIXED: Use setDoc with merge instead of updateDoc
    await setDoc(docRef, {
      ...settings,
      lastUpdated: new Date(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error);
    return false;
  }
}
