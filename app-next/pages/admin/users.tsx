import { useEffect, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { grantAdminAccess, revokeAdminAccess } from '@/lib/admin';
import { FaSearch, FaTrash, FaShieldAlt, FaUser, FaSyncAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';
import styles from '@/styles/Admin.module.css';

interface FirestoreUserData {
  displayName?: string;
  username?: string;
  email?: string;
  photoURL?: string;
  role?: string;
  createdAt?: Timestamp;
  onlineStatus?: string;
}

interface User {
  uid: string;
  displayName: string;
  username: string;
  email: string;
  photoURL?: string;
  role?: string;
  createdAt: Date;
  onlineStatus?: string;
}

export default function UsersManagement() {
  const { db } = getFirebaseClient();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Map Firestore document to User with safe fallbacks
  const mapDocToUser = (id: string, raw: FirestoreUserData): User => {
    const displayName =
      raw.displayName ||
      raw.username ||
      (raw.email ? String(raw.email).split('@')[0] : '') ||
      'User';

    const username =
      raw.username ||
      (raw.email ? String(raw.email).split('@')[0] : '') ||
      'unknown';

    const email = raw.email || '';

    const createdAt =
      raw.createdAt instanceof Timestamp
        ? raw.createdAt.toDate()
        : new Date(0); // ensures sort always works

    return {
      uid: id,
      displayName,
      username,
      email,
      photoURL: raw.photoURL,
      role: raw.role || 'user',
      createdAt,
      onlineStatus: raw.onlineStatus || 'offline',
    };
  };

  const loadUsers = async () => {
    if (!db) return;
    setLoading(true);
    try {
      // 1) NO orderBy here → all docs are returned
      const colRef = collection(db, 'users');
      const snap = await getDocs(colRef);

      const list = snap.docs.map((d) =>
        mapDocToUser(d.id, d.data() as FirestoreUserData),
      );

      // 2) Sort by createdAt on client (newest first)
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setUsers(list);
      setFilteredUsers(list);

      if (list.length === 0) {
        toast('No users found in the database', { icon: '⚠️' });
      }
    } catch (e) {
      console.error('Failed to load users:', e);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!db) return;
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  // Safe search filter
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter((u) => {
      const text = `${u.displayName} ${u.username} ${u.email} ${u.uid}`.toLowerCase();
      return text.includes(q);
    });

    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const handleRefresh = async () => {
    if (!db) return;
    setRefreshing(true);
    try {
      await loadUsers();
      toast.success('Users refreshed');
    } catch (e) {
      console.error('Failed to refresh users:', e);
      toast.error('Failed to refresh users');
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleAdmin = async (user: User) => {
    const isAdmin = user.role === 'admin';
    const confirmMsg = isAdmin
      ? `Remove admin access from ${user.displayName}?`
      : `Grant admin access to ${user.displayName}?`;

    if (!confirm(confirmMsg)) return;

    try {
      if (isAdmin) {
        await revokeAdminAccess(user.uid);
        toast.success('Admin access revoked');
      } else {
        await grantAdminAccess(user.uid);
        toast.success('Admin access granted');
      }
      // Reuse same loader (also without orderBy)
      await loadUsers();
    } catch (e) {
      console.error('Failed to toggle admin:', e);
      toast.error('Failed to update admin status');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Permanently delete ${user.displayName}?`)) return;

    try {
      await deleteDoc(doc(db!, 'users', user.uid));
      toast.success('User deleted');
      setUsers((prev) => prev.filter((u) => u.uid !== user.uid));
      setFilteredUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    } catch (e) {
      console.error('Failed to delete user:', e);
      toast.error('Failed to delete user');
    }
  };

  return (
    <AdminGuard>
      <Layout title="Users Management - Admin">
        <div className={styles.admin}>
          <div className={styles.header}>
            <div>
              <h1>
                <FaUser /> Users Management
              </h1>
              <p>Manage user accounts and permissions</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={styles.iconBtn}
              title="Refresh"
            >
              <FaSyncAlt />
            </button>
          </div>

          <div className={styles.searchBox}>
            <FaSearch />
            <input
              type="text"
              placeholder="Search users by name, username, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className={styles.loading}>Loading users...</div>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.uid}>
                      <td>
                        <div className={styles.userCell}>
                          <SafeImage
                            src={user.photoURL || '/images/default-avatar.png'}
                            alt={user.displayName}
                            width={40}
                            height={40}
                          />
                          <span>{user.displayName}</span>
                        </div>
                      </td>
                      <td>@{user.username}</td>
                      <td>{user.email}</td>
                      <td>
                        <span
                          className={
                            user.role === 'admin' ? styles.adminBadge : styles.userBadge
                          }
                        >
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            user.onlineStatus === 'online'
                              ? styles.statusOnline
                              : styles.statusOffline
                          }
                        >
                          {user.onlineStatus === 'online' ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            onClick={() => handleToggleAdmin(user)}
                            className={styles.iconBtn}
                            title={user.role === 'admin' ? 'Revoke Admin' : 'Grant Admin'}
                          >
                            <FaShieldAlt />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className={styles.iconBtnDanger}
                            title="Delete User"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <p className={styles.noData}>No users found</p>
              )}
            </div>
          )}
        </div>
      </Layout>
    </AdminGuard>
  );
}
