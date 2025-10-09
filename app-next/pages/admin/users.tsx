import { useEffect, useState } from 'react';
import AdminGuard from '@/components/AdminGuard';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { collection, getDocs, query, orderBy, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { getFirebaseClient } from '@/lib/firebase';
import { grantAdminAccess, revokeAdminAccess } from '@/lib/admin';
import { FaSearch, FaTrash, FaShieldAlt, FaUser } from 'react-icons/fa';
import toast from 'react-hot-toast';
import styles from '@/styles/Admin.module.css';

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

  useEffect(() => {
    if (!db) return;

    const loadUsers = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            displayName: data.displayName || 'User',
            username: data.username || 'unknown',
            email: data.email || '',
            photoURL: data.photoURL,
            role: data.role || 'user',
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
            onlineStatus: data.onlineStatus || 'offline',
          };
        });
        setUsers(list);
        setFilteredUsers(list);
      } catch (e) {
        console.error('Failed to load users:', e);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [db]);

  useEffect(() => {
    const filtered = users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

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
      // Reload users
      const q = query(collection(db!, 'users'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          uid: d.id,
          displayName: data.displayName || 'User',
          username: data.username || 'unknown',
          email: data.email || '',
          photoURL: data.photoURL,
          role: data.role || 'user',
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          onlineStatus: data.onlineStatus || 'offline',
        };
      });
      setUsers(list);
      setFilteredUsers(list);
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
              <h1><FaUser /> Users Management</h1>
              <p>Manage user accounts and permissions</p>
            </div>
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
                        <span className={user.role === 'admin' ? styles.adminBadge : styles.userBadge}>
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={user.onlineStatus === 'online' ? styles.statusOnline : styles.statusOffline}
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
              {filteredUsers.length === 0 && <p className={styles.noData}>No users found</p>}
            </div>
          )}
        </div>
      </Layout>
    </AdminGuard>
  );
}
