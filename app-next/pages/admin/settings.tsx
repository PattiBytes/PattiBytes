import { useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import Layout from '@/components/Layout';
import { FaCog, FaSave } from 'react-icons/fa';
import toast from 'react-hot-toast';
import styles from '@/styles/Admin.module.css';

export default function AdminSettings() {
  const [siteName, setSiteName] = useState('PattiBytes');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [maxUploadSize, setMaxUploadSize] = useState(10);

  const handleSave = () => {
    // In production, save these to Firestore or a config collection
    toast.success('Settings saved successfully');
  };

  return (
    <AdminGuard>
      <Layout title="Admin Settings">
        <div className={styles.admin}>
          <div className={styles.header}>
            <div>
              <h1><FaCog /> Admin Settings</h1>
              <p>Configure platform settings</p>
            </div>
          </div>

          <div className={styles.settingsContainer}>
            <div className={styles.settingGroup}>
              <label htmlFor="siteName">Site Name</label>
              <input
                id="siteName"
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className={styles.input}
              />
            </div>

            <div className={styles.settingGroup}>
              <label htmlFor="maxUpload">Max Upload Size (MB)</label>
              <input
                id="maxUpload"
                type="number"
                value={maxUploadSize}
                onChange={(e) => setMaxUploadSize(Number(e.target.value))}
                className={styles.input}
              />
            </div>

            <div className={styles.settingGroup}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                />
                <span>Maintenance Mode</span>
              </label>
            </div>

            <div className={styles.settingGroup}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={allowRegistration}
                  onChange={(e) => setAllowRegistration(e.target.checked)}
                />
                <span>Allow New Registrations</span>
              </label>
            </div>

            <button onClick={handleSave} className={styles.saveBtn}>
              <FaSave /> Save Settings
            </button>
          </div>
        </div>
      </Layout>
    </AdminGuard>
  );
}
