import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { FaBell, FaLock, FaPalette, FaGlobe, FaTrash, FaShieldAlt } from 'react-icons/fa';
import styles from '@/styles/Settings.module.css';

type Theme = 'auto' | 'light' | 'dark';
type Language = 'en' | 'pa';

export default function Settings() {
  const { userProfile, signOut } = useAuth();
  const router = useRouter();
  
  const [settings, setSettings] = useState({
    notifications: userProfile?.preferences?.notifications ?? true,
    publicProfile: userProfile?.preferences?.publicProfile ?? true,
    theme: (userProfile?.preferences?.theme || 'auto') as Theme,
    language: (userProfile?.preferences?.language || 'en') as Language
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      // Implement account deletion
      alert('Account deletion is not yet implemented');
    }
  };

  const handleThemeChange = (theme: string) => {
    if (theme === 'auto' || theme === 'light' || theme === 'dark') {
      setSettings({ ...settings, theme: theme as Theme });
    }
  };

  const handleLanguageChange = (language: string) => {
    if (language === 'en' || language === 'pa') {
      setSettings({ ...settings, language: language as Language });
    }
  };

  return (
    <Layout title="Settings - PattiBytes">
      <div className={styles.settings}>
        <h1>Settings</h1>

        {/* Notifications */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <FaBell />
            <h2>Notifications</h2>
          </div>
          
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <h3>Push Notifications</h3>
              <p>Receive notifications about new content and updates</p>
            </div>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={settings.notifications}
                onChange={e => setSettings({ ...settings, notifications: e.target.checked })}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </section>

        {/* Privacy */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <FaShieldAlt />
            <h2>Privacy</h2>
          </div>
          
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <h3>Public Profile</h3>
              <p>Make your profile visible to everyone</p>
            </div>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={settings.publicProfile}
                onChange={e => setSettings({ ...settings, publicProfile: e.target.checked })}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </section>

        {/* Appearance */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <FaPalette />
            <h2>Appearance</h2>
          </div>
          
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <h3>Theme</h3>
              <p>Choose your preferred theme</p>
            </div>
            <select
              value={settings.theme}
              onChange={e => handleThemeChange(e.target.value)}
              className={styles.select}
            >
              <option value="auto">Auto</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </section>

        {/* Language */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <FaGlobe />
            <h2>Language</h2>
          </div>
          
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <h3>Preferred Language</h3>
              <p>Choose your preferred language</p>
            </div>
            <select
              value={settings.language}
              onChange={e => handleLanguageChange(e.target.value)}
              className={styles.select}
            >
              <option value="en">English</option>
              <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
            </select>
          </div>
        </section>

        {/* Security */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <FaLock />
            <h2>Security</h2>
          </div>
          
          <button className={styles.button}>
            Change Password
          </button>
        </section>

        {/* Danger Zone */}
        <section className={`${styles.section} ${styles.dangerSection}`}>
          <div className={styles.sectionHeader}>
            <FaTrash />
            <h2>Danger Zone</h2>
          </div>
          
          <button 
            className={styles.logoutButton}
            onClick={handleSignOut}
          >
            Sign Out
          </button>
          
          <button 
            className={styles.deleteButton}
            onClick={handleDeleteAccount}
          >
            Delete Account
          </button>
        </section>
      </div>
    </Layout>
  );
}
