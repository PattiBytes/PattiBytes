// app-next/pages/admin/settings.tsx

import { useEffect, useState, useCallback } from 'react';
import AdminGuard from '@/components/AdminGuard';
import Layout from '@/components/Layout';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import {
  FaCog,
  FaToggleOn,
  FaToggleOff,
  FaSave,
  FaSync,
  FaExclamationTriangle,
  FaKey,
  FaShieldAlt,
  FaBell,
  FaCheckCircle,
  FaArrowUp,
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import styles from '@/styles/AdminSettings.module.css';

/**
 * System Settings Interface
 * Covers all platform-wide configurations
 */
interface SystemSettings {
  // System Status
  maintenanceMode: boolean;
  maintenanceMessage?: string;

  // User Features
  enableRegistration: boolean;
  enableComments: boolean;
  enableSharing: boolean;
  enableDirectMessages: boolean;

  // Content Limits
  maxPostLength: number;
  maxImageSize: number; // MB
  maxVideoSize: number; // MB
  sessionTimeout: number; // hours

  // Notifications
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;

  // Site Information
  siteTitle: string;
  siteDescription: string;
  contactEmail: string;
  supportUrl?: string;

  // Backup & Maintenance
  autoBackup: boolean;
  lastBackupTime?: Timestamp;

  // Metadata
  lastUpdatedBy?: string;
  lastUpdated?: Timestamp;
}

/**
 * Default system settings
 */
const DEFAULT_SETTINGS: SystemSettings = {
  maintenanceMode: false,
  maintenanceMessage: 'Platform is under maintenance. Please try again later.',
  enableRegistration: true,
  enableComments: true,
  enableSharing: true,
  enableDirectMessages: true,
  maxPostLength: 5000,
  maxImageSize: 10,
  maxVideoSize: 100,
  sessionTimeout: 24,
  notificationsEnabled: true,
  emailNotifications: true,
  pushNotifications: true,
  siteTitle: 'PattiBytes',
  siteDescription: 'Community Platform for Content Creators',
  contactEmail: 'support@pattibytes.com',
  supportUrl: 'https://pattibytes.com/support',
  autoBackup: true,
};

/**
 * Settings sections for organization
 */
const SETTINGS_SECTIONS = [
  { id: 'system', label: 'System Status', icon: FaShieldAlt },
  { id: 'features', label: 'User Features', icon: FaBell },
  { id: 'content', label: 'Content Limits', icon: FaKey },
  { id: 'notifications', label: 'Notifications', icon: FaBell },
  { id: 'site', label: 'Site Information', icon: FaCog },
  { id: 'backup', label: 'Backup & Maintenance', icon: FaSync },
];

export default function AdminSettings() {
  const { db } = getFirebaseClient();
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<SystemSettings>(
    DEFAULT_SETTINGS,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState('system');
  const [saveSuccess, setSaveSuccess] = useState(false);

  /**
   * Load settings from Firestore
   */
  const loadSettings = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      console.log('[AdminSettings] Loading system settings...');
      const settingsRef = doc(db, 'system', 'settings');
      const settingsSnap = await getDoc(settingsRef);

      let loadedSettings = DEFAULT_SETTINGS;

      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        loadedSettings = {
          ...DEFAULT_SETTINGS,
          ...(data as Partial<SystemSettings>),
        };
        console.log('[AdminSettings] Settings loaded from Firestore');
      } else {
        console.log('[AdminSettings] No settings found, using defaults');
      }

      setSettings(loadedSettings);
      setOriginalSettings(loadedSettings);
    } catch (error) {
      console.error('[AdminSettings] Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /**
   * Handle individual setting changes
   */
  const handleSettingChange = (
    key: keyof SystemSettings,
    value: unknown,
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  /**
   * Save all settings to Firestore
   */
  const saveSettings = async () => {
    if (!db) return;
    setSaving(true);

    try {
      console.log('[AdminSettings] Saving settings...');
      const settingsRef = doc(db, 'system', 'settings');

      const dataToSave: SystemSettings & {
        lastUpdated: Timestamp;
      } = {
        ...settings,
        lastUpdated: Timestamp.now(),
      };

      // Use setDoc with merge: true to create if missing, update if exists
      await setDoc(settingsRef, dataToSave, { merge: true });

      console.log('[AdminSettings] ✓ Settings saved successfully');
      toast.success('Settings saved successfully!');
      setHasChanges(false);
      setSaveSuccess(true);
      setOriginalSettings(settings);

      // Clear success indicator after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('[AdminSettings] Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Reset to original settings
   */
  const resetSettings = () => {
    if (window.confirm('Discard all changes?')) {
      setSettings(originalSettings);
      setHasChanges(false);
      toast.success('Changes discarded');
    }
  };

  /**
   * Reset to default settings
   */
  const resetToDefaults = () => {
    if (
      window.confirm(
        'Reset all settings to defaults? This action cannot be undone.',
      )
    ) {
      setSettings(DEFAULT_SETTINGS);
      setHasChanges(true);
      toast.success('Reset to defaults');
    }
  };

  if (loading) {
    return (
      <AdminGuard>
        <Layout title="System Settings - Admin">
          <div className={styles.container}>
            <motion.div
              className={styles.loading}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  repeat: Infinity,
                  duration: 2,
                  ease: 'linear',
                }}
              >
                <FaSync />
              </motion.div>
              <p>Loading settings...</p>
            </motion.div>
          </div>
        </Layout>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <Layout title="System Settings - Admin">
        <div className={styles.container}>
          {/* Header */}
          <motion.div
            className={styles.header}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className={styles.headerContent}>
              <h1>
                <FaCog /> System Settings
              </h1>
              <p>Configure platform behavior and features</p>
            </div>

            <div className={styles.headerActions}>
              {hasChanges && (
                <motion.button
                  onClick={resetSettings}
                  className={styles.secondaryBtn}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  title="Discard changes"
                >
                  Discard
                </motion.button>
              )}
              <motion.button
                onClick={saveSettings}
                disabled={!hasChanges || saving}
                className={styles.primaryBtn}
                whileHover={!saving ? { scale: 1.02 } : {}}
                whileTap={!saving ? { scale: 0.98 } : {}}
              >
                {saving ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                      }}
                    >
                      <FaSync />
                    </motion.div>
                    Saving...
                  </>
                ) : saveSuccess ? (
                  <>
                    <FaCheckCircle /> Saved
                  </>
                ) : (
                  <>
                    <FaSave /> Save Changes
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Success Banner */}
          <AnimatePresence>
            {saveSuccess && (
              <motion.div
                className={styles.successBanner}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <FaCheckCircle /> All settings have been saved successfully
              </motion.div>
            )}
          </AnimatePresence>

          {/* Maintenance Warning */}
          <AnimatePresence>
            {settings.maintenanceMode && (
              <motion.div
                className={styles.warningBanner}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <FaExclamationTriangle /> Maintenance mode is ACTIVE. Only
                admins can access the platform.
              </motion.div>
            )}
          </AnimatePresence>

          <div className={styles.content}>
            {/* Section Navigation */}
            <motion.div
              className={styles.navigation}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <div className={styles.navHeader}>
                <h3>Sections</h3>
              </div>
              <div className={styles.navItems}>
                {SETTINGS_SECTIONS.map((section) => (
                  <motion.button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={
                      activeSection === section.id
                        ? styles.navItemActive
                        : styles.navItem
                    }
                    whileHover={{ x: 4 }}
                  >
                    <section.icon />
                    <span>{section.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Settings Panels */}
            <div className={styles.panels}>
              {/* System Status */}
              {activeSection === 'system' && (
                <SettingPanel title="System Status" icon={FaShieldAlt}>
                  <div className={styles.settingItem}>
                    <div className={styles.settingHeader}>
                      <label>Maintenance Mode</label>
                      <p>Site will be unavailable to regular users</p>
                    </div>
                    <motion.button
                      className={
                        settings.maintenanceMode
                          ? styles.toggleActive
                          : styles.toggleInactive
                      }
                      onClick={() =>
                        handleSettingChange(
                          'maintenanceMode',
                          !settings.maintenanceMode,
                        )
                      }
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {settings.maintenanceMode ? (
                        <FaToggleOn />
                      ) : (
                        <FaToggleOff />
                      )}
                    </motion.button>
                  </div>

                  {settings.maintenanceMode && (
                    <motion.div
                      className={styles.maintenanceMessageBox}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <label>Maintenance Message</label>
                      <textarea
                        value={settings.maintenanceMessage || ''}
                        onChange={(e) =>
                          handleSettingChange(
                            'maintenanceMessage',
                            e.target.value,
                          )
                        }
                        className={styles.textarea}
                        rows={3}
                      />
                    </motion.div>
                  )}
                </SettingPanel>
              )}

              {/* User Features */}
              {activeSection === 'features' && (
                <SettingPanel title="User Features">
                  <ToggleSetting
                    label="Enable Registration"
                    description="Allow new users to create accounts"
                    value={settings.enableRegistration}
                    onChange={(val) =>
                      handleSettingChange('enableRegistration', val)
                    }
                  />
                  <ToggleSetting
                    label="Enable Comments"
                    description="Users can comment on posts"
                    value={settings.enableComments}
                    onChange={(val) => handleSettingChange('enableComments', val)}
                  />
                  <ToggleSetting
                    label="Enable Sharing"
                    description="Users can share posts"
                    value={settings.enableSharing}
                    onChange={(val) => handleSettingChange('enableSharing', val)}
                  />
                  <ToggleSetting
                    label="Enable Direct Messages"
                    description="Users can send private messages"
                    value={settings.enableDirectMessages}
                    onChange={(val) =>
                      handleSettingChange('enableDirectMessages', val)
                    }
                  />
                </SettingPanel>
              )}

              {/* Content Limits */}
              {activeSection === 'content' && (
                <SettingPanel title="Content Limits">
                  <NumberSetting
                    label="Max Post Length"
                    description="Maximum characters per post"
                    value={settings.maxPostLength}
                    onChange={(val) =>
                      handleSettingChange('maxPostLength', val)
                    }
                    min={100}
                    max={50000}
                    unit="characters"
                  />
                  <NumberSetting
                    label="Max Image Size"
                    description="Maximum file size for uploads"
                    value={settings.maxImageSize}
                    onChange={(val) =>
                      handleSettingChange('maxImageSize', val)
                    }
                    min={1}
                    max={100}
                    unit="MB"
                  />
                  <NumberSetting
                    label="Max Video Size"
                    description="Maximum video file size"
                    value={settings.maxVideoSize}
                    onChange={(val) =>
                      handleSettingChange('maxVideoSize', val)
                    }
                    min={1}
                    max={500}
                    unit="MB"
                  />
                  <NumberSetting
                    label="Session Timeout"
                    description="User session expiration time"
                    value={settings.sessionTimeout}
                    onChange={(val) =>
                      handleSettingChange('sessionTimeout', val)
                    }
                    min={1}
                    max={720}
                    unit="hours"
                  />
                </SettingPanel>
              )}

              {/* Notifications */}
              {activeSection === 'notifications' && (
                <SettingPanel title="Notifications" icon={FaBell}>
                  <ToggleSetting
                    label="Enable Notifications"
                    description="Push notifications to users"
                    value={settings.notificationsEnabled}
                    onChange={(val) =>
                      handleSettingChange('notificationsEnabled', val)
                    }
                  />
                  <ToggleSetting
                    label="Email Notifications"
                    description="Send email notifications to users"
                    value={settings.emailNotifications}
                    onChange={(val) =>
                      handleSettingChange('emailNotifications', val)
                    }
                  />
                  <ToggleSetting
                    label="Push Notifications"
                    description="Send push notifications to users"
                    value={settings.pushNotifications}
                    onChange={(val) =>
                      handleSettingChange('pushNotifications', val)
                    }
                  />
                </SettingPanel>
              )}

              {/* Site Information */}
              {activeSection === 'site' && (
                <SettingPanel title="Site Information">
                  <TextSetting
                    label="Site Title"
                    description="Platform display name"
                    value={settings.siteTitle}
                    onChange={(val) => handleSettingChange('siteTitle', val)}
                    maxLength={100}
                  />
                  <TextAreaSetting
                    label="Site Description"
                    description="Platform description for SEO"
                    value={settings.siteDescription}
                    onChange={(val) =>
                      handleSettingChange('siteDescription', val)
                    }
                    maxLength={500}
                    rows={3}
                  />
                  <TextSetting
                    label="Contact Email"
                    description="Support email address"
                    value={settings.contactEmail}
                    onChange={(val) => handleSettingChange('contactEmail', val)}
                    type="email"
                  />
                  <TextSetting
                    label="Support URL"
                    description="Link to support page"
                    value={settings.supportUrl || ''}
                    onChange={(val) => handleSettingChange('supportUrl', val)}
                    type="url"
                    placeholder="https://..."
                  />
                </SettingPanel>
              )}

              {/* Backup & Maintenance */}
              {activeSection === 'backup' && (
                <SettingPanel title="Backup & Maintenance" icon={FaKey}>
                  <ToggleSetting
                    label="Auto Backup"
                    description="Automatically backup data daily"
                    value={settings.autoBackup}
                    onChange={(val) => handleSettingChange('autoBackup', val)}
                  />

                  {settings.lastBackupTime && (
                    <div className={styles.infoBox}>
                      Last backup:{' '}
                      {settings.lastBackupTime
                        .toDate()
                        .toLocaleString()}
                    </div>
                  )}

                  <div className={styles.actionButtons}>
                    <motion.button
                      className={styles.actionBtn}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toast.success('Backup started...')}
                    >
                      <FaSync /> Backup Now
                    </motion.button>
                    <motion.button
                      className={styles.actionBtn}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toast.success('Cache cleared')}
                    >
                      <FaSync /> Clear Cache
                    </motion.button>
                  </div>

                  <motion.button
                    className={styles.dangerBtn}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={resetToDefaults}
                  >
                    Reset to Default Settings
                  </motion.button>
                </SettingPanel>
              )}
            </div>
          </div>

          {/* Floating Action Bar */}
          <AnimatePresence>
            {hasChanges && (
              <motion.div
                className={styles.floatingBar}
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                transition={{ duration: 0.3 }}
              >
                <div className={styles.barContent}>
                  <FaArrowUp /> You have unsaved changes
                </div>
                <div className={styles.barActions}>
                  <button
                    onClick={resetSettings}
                    className={styles.barSecondaryBtn}
                  >
                    Discard
                  </button>
                  <button
                    onClick={saveSettings}
                    disabled={saving}
                    className={styles.barPrimaryBtn}
                  >
                    {saving ? 'Saving...' : 'Save Now'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Layout>
    </AdminGuard>
  );
}

/**
 * Reusable Components
 */

interface SettingPanelProps {
  title: string;
  icon?: React.ComponentType;
  children: React.ReactNode;
}

function SettingPanel({ title, icon: Icon, children }: SettingPanelProps) {
  return (
    <motion.div
      className={styles.panel}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.panelHeader}>
        {Icon && <Icon />}
        <h2>{title}</h2>
      </div>
      <div className={styles.panelContent}>{children}</div>
    </motion.div>
  );
}

interface ToggleSettingProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

function ToggleSetting({
  label,
  description,
  value,
  onChange,
}: ToggleSettingProps) {
  return (
    <div className={styles.settingItem}>
      <div className={styles.settingHeader}>
        <label>{label}</label>
        {description && <p>{description}</p>}
      </div>
      <motion.button
        className={value ? styles.toggleActive : styles.toggleInactive}
        onClick={() => onChange(!value)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {value ? <FaToggleOn /> : <FaToggleOff />}
      </motion.button>
    </div>
  );
}

interface NumberSettingProps {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}

function NumberSetting({
  label,
  description,
  value,
  onChange,
  min = 0,
  max = 100,
  unit,
}: NumberSettingProps) {
  return (
    <div className={styles.settingItem}>
      <div className={styles.settingHeader}>
        <label>{label}</label>
        {description && <p>{description}</p>}
      </div>
      <div className={styles.numberInputGroup}>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          min={min}
          max={max}
          className={styles.numberInput}
        />
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
    </div>
  );
}

interface TextSettingProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  type?: string;
  placeholder?: string;
}

function TextSetting({
  label,
  description,
  value,
  onChange,
  maxLength = 100,
  type = 'text',
  placeholder,
}: TextSettingProps) {
  return (
    <div className={styles.settingItem}>
      <div className={styles.settingHeader}>
        <label>{label}</label>
        {description && <p>{description}</p>}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        className={styles.textInput}
      />
      <small className={styles.charCount}>
        {value.length}/{maxLength}
      </small>
    </div>
  );
}

interface TextAreaSettingProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  rows?: number;
}

function TextAreaSetting({
  label,
  description,
  value,
  onChange,
  maxLength = 500,
  rows = 3,
}: TextAreaSettingProps) {
  return (
    <div className={styles.settingItem}>
      <div className={styles.settingHeader}>
        <label>{label}</label>
        {description && <p>{description}</p>}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        rows={rows}
        className={styles.textarea}
      />
      <small className={styles.charCount}>
        {value.length}/{maxLength}
      </small>
    </div>
  );
}
