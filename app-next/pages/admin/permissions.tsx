// app-next/pages/admin/permissions.tsx

import { useEffect, useState, useCallback } from 'react';
import AdminGuard from '@/components/AdminGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import {
  grantAdminAccess,
  revokeAdminAccess,
  updateAdminPermissions,
  DEFAULT_ADMIN_PERMISSIONS,
  type AdminPermissions,
} from '@/lib/admin';
import {
  FaShieldAlt,
  FaCheck,
  FaTimes,
  FaUserPlus,
  FaUserMinus,
  FaSync,
  FaSearch,
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import styles from '@/styles/AdminPermissions.module.css';

interface AdminUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  permissions: AdminPermissions;
  grantedAt: Date;
}

const PERMISSION_DETAILS = [
  {
    key: 'canModerate',
    label: 'Moderate Content',
    icon: '🛡️',
    desc: 'Delete posts, comments, and ban users',
  },
  {
    key: 'canManageUsers',
    label: 'Manage Users',
    icon: '👥',
    desc: 'View and manage user accounts',
  },
  {
    key: 'canPublishOfficial',
    label: 'Publish Official Posts',
    icon: '📢',
    desc: 'Post official announcements',
  },
  {
    key: 'canAccessAnalytics',
    label: 'Access Analytics',
    icon: '📊',
    desc: 'View platform analytics & reports',
  },
  {
    key: 'canManageContent',
    label: 'Manage All Content',
    icon: '📝',
    desc: 'Full content control & moderation',
  },
  {
    key: 'canManageAdmins',
    label: 'Manage Admins',
    icon: '⚙️',
    desc: 'Grant/revoke admin access',
  },
  {
    key: 'canSystemSettings',
    label: 'System Settings',
    icon: '🔧',
    desc: 'Configure app-wide settings',
  },
];

export default function AdminPermissions() {
  const { db } = getFirebaseClient();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [grantingAdmin, setGrantingAdmin] = useState(false);
  const [expandedAdmin, setExpandedAdmin] = useState<string | null>(null);

  const loadAdmins = useCallback(async () => {
    if (!db) return;
    try {
      const usersQ = query(
        collection(db, 'users'),
        where('role', '==', 'admin'),
        limit(100),
      );
      const usersSnap = await getDocs(usersQ);

      const adminList: AdminUser[] = [];

      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const adminDocRef = doc(db, 'admins', userDoc.id);
        const adminDocSnap = await getDoc(adminDocRef);

        adminList.push({
          uid: userDoc.id,
          displayName: userData.displayName || 'Admin',
          email: userData.email || '',
          photoURL: userData.photoURL,
          permissions: (adminDocSnap.data() as AdminPermissions) ||
            DEFAULT_ADMIN_PERMISSIONS,
          grantedAt: userData.adminGrantedAt?.toDate?.() || new Date(),
        });
      }

      setAdmins(adminList);
      setFilteredAdmins(adminList);
    } catch (error) {
      console.error('Failed to load admins:', error);
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  useEffect(() => {
    const filtered = admins.filter(
      (admin) =>
        admin.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.email.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setFilteredAdmins(filtered);
  }, [searchQuery, admins]);

  const togglePermission = async (
    uid: string,
    permission: keyof AdminPermissions,
  ) => {
    const admin = admins.find((a) => a.uid === uid);
    if (!admin) return;

    try {
      const newPermissions = {
        ...admin.permissions,
        [permission]: !admin.permissions[permission],
      };

      await updateAdminPermissions(uid, newPermissions);
      toast.success('Permission updated');
      await loadAdmins();
    } catch (error) {
      console.error('Failed to update permission:', error);
      toast.error('Failed to update permission');
    }
  };

  const handleRevokeAdmin = async (uid: string, displayName: string) => {
    if (
      !window.confirm(
        `Revoke admin access from ${displayName}? They will become a regular user.`,
      )
    )
      return;

    try {
      await revokeAdminAccess(uid);
      toast.success('Admin access revoked');
      await loadAdmins();
    } catch (error) {
      console.error('Failed to revoke admin:', error);
      toast.error('Failed to revoke admin');
    }
  };

  const handleGrantAdmin = async () => {
    if (!newAdminEmail.trim() || !db) {
      toast.error('Please enter an email address');
      return;
    }

    setGrantingAdmin(true);
    try {
      const usersQ = query(
        collection(db, 'users'),
        where('email', '==', newAdminEmail),
      );
      const usersSnap = await getDocs(usersQ);

      if (usersSnap.empty) {
        toast.error('User not found with that email');
        setGrantingAdmin(false);
        return;
      }

      const userId = usersSnap.docs[0].id;
      await grantAdminAccess(userId, DEFAULT_ADMIN_PERMISSIONS);
      toast.success('Admin access granted successfully!');
      setNewAdminEmail('');
      await loadAdmins();
    } catch (error) {
      console.error('Failed to grant admin:', error);
      toast.error('Failed to grant admin access');
    } finally {
      setGrantingAdmin(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAdmins();
      toast.success('Admins refreshed');
    } finally {
      setRefreshing(false);
    }
  };

  const countPermissions = (admin: AdminUser): number => {
    return Object.values(admin.permissions).filter(Boolean).length;
  };

  return (
    <AdminGuard>
      <Layout title="Admin Permissions - Admin">
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
                <FaShieldAlt /> Admin Permissions
              </h1>
              <p>Manage admin roles and granular permissions</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={styles.refreshBtn}
              title="Refresh admins"
            >
              <motion.div
                animate={refreshing ? { rotate: 360 } : {}}
                transition={{
                  repeat: refreshing ? Infinity : 0,
                  duration: 1,
                }}
              >
                <FaSync />
              </motion.div>
            </button>
          </motion.div>

          {/* Grant Admin Card */}
          <motion.div
            className={styles.grantCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <div className={styles.grantHeader}>
              <h2>
                <FaUserPlus /> Grant Admin Access
              </h2>
              <p>Add a new admin by their email address</p>
            </div>

            <div className={styles.grantForm}>
              <input
                type="email"
                placeholder="Enter user email..."
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleGrantAdmin()}
                className={styles.emailInput}
              />
              <motion.button
                onClick={handleGrantAdmin}
                disabled={grantingAdmin || !newAdminEmail.trim()}
                className={styles.grantBtn}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {grantingAdmin ? 'Granting...' : 'Grant Admin'}
              </motion.button>
            </div>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            className={styles.searchSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <div className={styles.searchBox}>
              <FaSearch />
              <input
                type="text"
                placeholder="Search admins by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <span className={styles.resultCount}>
              {filteredAdmins.length} admin{filteredAdmins.length !== 1 ? 's' : ''}
            </span>
          </motion.div>

          {/* Content */}
          {loading ? (
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
              <p>Loading admins...</p>
            </motion.div>
          ) : filteredAdmins.length === 0 ? (
            <motion.div
              className={styles.emptyState}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className={styles.emptyIcon}>
                <FaShieldAlt />
              </div>
              <h3>No admins found</h3>
              <p>Use the form above to grant admin access to users</p>
            </motion.div>
          ) : (
            <div className={styles.adminsList}>
              <AnimatePresence mode="popLayout">
                {filteredAdmins.map((admin, idx) => (
                  <motion.div
                    key={admin.uid}
                    className={styles.adminCard}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                    layout
                  >
                    {/* Admin Header */}
                    <motion.div
                      className={styles.adminCardHeader}
                      onClick={() =>
                        setExpandedAdmin(
                          expandedAdmin === admin.uid ? null : admin.uid,
                        )
                      }
                    >
                      <div className={styles.adminLeft}>
                        <SafeImage
                          src={admin.photoURL || '/images/default-avatar.png'}
                          alt={admin.displayName}
                          width={56}
                          height={56}
                          className={styles.adminAvatar}
                        />
                        <div className={styles.adminMeta}>
                          <h3>{admin.displayName}</h3>
                          <p>{admin.email}</p>
                          <small className={styles.adminDate}>
                            Since {admin.grantedAt.toLocaleDateString()}
                          </small>
                        </div>
                      </div>

                      <div className={styles.adminStats}>
                        <span className={styles.permCount}>
                          {countPermissions(admin)}/{PERMISSION_DETAILS.length}
                        </span>
                        <motion.div
                          animate={{
                            rotate: expandedAdmin === admin.uid ? 180 : 0,
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          <FaCheck />
                        </motion.div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevokeAdmin(admin.uid, admin.displayName);
                        }}
                        className={styles.revokeBtn}
                        title="Revoke admin access"
                      >
                        <FaUserMinus />
                      </button>
                    </motion.div>

                    {/* Permissions Grid - Expandable */}
                    <AnimatePresence>
                      {expandedAdmin === admin.uid && (
                        <motion.div
                          className={styles.permissionsGrid}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          {PERMISSION_DETAILS.map((perm, idx) => {
                            const isActive =
                              admin.permissions[
                                perm.key as keyof AdminPermissions
                              ];
                            return (
                              <motion.div
                                key={perm.key}
                                className={styles.permissionItem}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{
                                  delay: idx * 0.04,
                                  duration: 0.2,
                                }}
                              >
                                <div className={styles.permHeader}>
                                  <span className={styles.permIcon}>
                                    {perm.icon}
                                  </span>
                                  <div>
                                    <div className={styles.permLabel}>
                                      {perm.label}
                                    </div>
                                    <div className={styles.permDesc}>
                                      {perm.desc}
                                    </div>
                                  </div>
                                </div>
                                <motion.button
                                  onClick={() =>
                                    togglePermission(
                                      admin.uid,
                                      perm.key as keyof AdminPermissions,
                                    )
                                  }
                                  className={
                                    isActive
                                      ? styles.permissionActive
                                      : styles.permissionInactive
                                  }
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  {isActive ? <FaCheck /> : <FaTimes />}
                                </motion.button>
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </Layout>
    </AdminGuard>
  );
}
