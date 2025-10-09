import { useEffect, useState, useCallback } from 'react';
import AdminGuard from '@/components/AdminGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { updateAdminPermissions, type AdminSettings, grantAdminAccess, revokeAdminAccess } from '@/lib/admin';
import { FaShieldAlt, FaCheck, FaTimes, FaUserPlus, FaUserMinus } from 'react-icons/fa';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import styles from '@/styles/AdminEnhanced.module.css';

interface AdminUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  permissions: AdminSettings;
}

export default function AdminPermissions() {
  const { db } = getFirebaseClient();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAdmins = useCallback(async () => {
    if (!db) return;
    try {
      const adminsSnap = await getDocs(collection(db, 'admins'));
      const adminList: AdminUser[] = [];

      for (const adminDoc of adminsSnap.docs) {
        const userDocRef = doc(db, 'users', adminDoc.id);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) continue;

        const userData = userDoc.data();
        adminList.push({
          uid: adminDoc.id,
          displayName: userData.displayName || 'Admin',
          email: userData.email || '',
          photoURL: userData.photoURL,
          permissions: adminDoc.data() as AdminSettings,
        });
      }

      setAdmins(adminList);
    } catch (e) {
      console.error('Failed to load admins:', e);
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const togglePermission = async (uid: string, permission: keyof AdminSettings) => {
    const admin = admins.find((a) => a.uid === uid);
    if (!admin) return;

    const currentValue = admin.permissions[permission];
    if (typeof currentValue !== 'boolean') return;

    try {
      const newValue = !currentValue;
      await updateAdminPermissions(uid, { [permission]: newValue });
      toast.success('Permission updated');
      await loadAdmins();
    } catch (e) {
      console.error('Failed to update permission:', e);
      toast.error('Failed to update permission');
    }
  };

  const handleRevokeAdmin = async (uid: string, displayName: string) => {
    if (!confirm(`Revoke admin access from ${displayName}?`)) return;

    try {
      await revokeAdminAccess(uid);
      toast.success('Admin access revoked');
      await loadAdmins();
    } catch (e) {
      console.error('Failed to revoke admin:', e);
      toast.error('Failed to revoke admin');
    }
  };

  const handleGrantAdmin = async () => {
    const email = prompt('Enter user email to grant admin access:');
    if (!email || !db) return;

    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const userDoc = usersSnap.docs.find((d) => d.data().email === email);

      if (!userDoc) {
        toast.error('User not found');
        return;
      }

      await grantAdminAccess(userDoc.id);
      toast.success('Admin access granted');
      await loadAdmins();
    } catch (e) {
      console.error('Failed to grant admin:', e);
      toast.error('Failed to grant admin');
    }
  };

  return (
    <AdminGuard>
      <Layout title="Admin Permissions - Admin">
        <div className={styles.admin}>
          <motion.div
            className={styles.header}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <h1>
                <FaShieldAlt /> Admin Permissions
              </h1>
              <p>Manage admin roles and permissions</p>
            </div>
            <button onClick={handleGrantAdmin} className={styles.addAdminBtn}>
              <FaUserPlus /> Add Admin
            </button>
          </motion.div>

          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Loading admins...</p>
            </div>
          ) : admins.length === 0 ? (
            <div className={styles.emptyState}>
              <FaShieldAlt />
              <h3>No admins found</h3>
              <p>Click &ldquo;Add Admin&rdquo; to grant admin access to users</p>
            </div>
          ) : (
            <div className={styles.permissionsGrid}>
              {admins.map((admin, i) => (
                <motion.div
                  key={admin.uid}
                  className={styles.permissionCard}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className={styles.adminHeader}>
                    <SafeImage
                      src={admin.photoURL || '/images/default-avatar.png'}
                      alt={admin.displayName}
                      width={60}
                      height={60}
                    />
                    <div className={styles.adminDetails}>
                      <h3>{admin.displayName}</h3>
                      <p>{admin.email}</p>
                    </div>
                    <button
                      onClick={() => handleRevokeAdmin(admin.uid, admin.displayName)}
                      className={styles.revokeBtn}
                      title="Revoke Admin"
                    >
                      <FaUserMinus />
                    </button>
                  </div>

                  <div className={styles.permissionsList}>
                    {[
                      { key: 'canModerate', label: 'Moderate Content', icon: '🛡️' },
                      { key: 'canManageUsers', label: 'Manage Users', icon: '👥' },
                      { key: 'canPublishOfficial', label: 'Publish Official Posts', icon: '📢' },
                      { key: 'canAccessAnalytics', label: 'Access Analytics', icon: '📊' },
                      { key: 'canManageContent', label: 'Manage All Content', icon: '📝' },
                    ].map((perm) => {
                      const value = admin.permissions[perm.key as keyof AdminSettings];
                      const isActive = typeof value === 'boolean' ? value : false;

                      return (
                        <div key={perm.key} className={styles.permissionItem}>
                          <div className={styles.permLabel}>
                            <span className={styles.permIcon}>{perm.icon}</span>
                            <span>{perm.label}</span>
                          </div>
                          <button
                            onClick={() => togglePermission(admin.uid, perm.key as keyof AdminSettings)}
                            className={isActive ? styles.permissionActive : styles.permissionInactive}
                          >
                            {isActive ? <FaCheck /> : <FaTimes />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </AdminGuard>
  );
}
