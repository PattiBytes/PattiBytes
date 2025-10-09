import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SafeImage from './SafeImage';
import { useState, useEffect, useRef } from 'react';
import {
  FaBell,
  FaSignOutAlt,
  FaUser,
  FaCog,
  FaChevronLeft,
  FaComments,
  FaShieldAlt,
  FaBullhorn,
  FaUsers,
  FaUserShield,
  FaFileAlt,
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import styles from '@/styles/Header.module.css';

export default function Header() {
  const { user, userProfile, isAdmin, signOut } = useAuth();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showBackButton, setShowBackButton] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const noBackPaths = [
      '/',
      '/dashboard',
      '/search',
      '/notifications',
      '/create',
      '/profile',
      '/settings',
      '/community',
      '/admin',
    ];
    setShowBackButton(!noBackPaths.includes(router.pathname));
  }, [router.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setShowDropdown(false);
    const loadingToast = toast.loading('Logging out...');
    try {
      await signOut();
      if (typeof window !== 'undefined') {
        Promise.all([
          (async () => localStorage.clear())(),
          (async () => sessionStorage.clear())(),
          'caches' in window ? caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n)))) : Promise.resolve(),
        ]).catch(() => {});
      }
      toast.success('Logged out!', { id: loadingToast });
      router.replace('/').then(() => {
        if (router.pathname !== '/') window.location.href = '/';
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed', { id: loadingToast });
    }
  };

  const handleBack = () => router.back();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.left}>
          {showBackButton ? (
            <button onClick={handleBack} className={styles.backBtn} aria-label="Go back">
              <FaChevronLeft />
            </button>
          ) : (
            <Link href={user ? '/dashboard' : '/'} className={styles.logo}>
              <SafeImage src="/icons/pwab-192.jpg" alt="PattiBytes" width={36} height={36} className={styles.logoImg} />
              <span className={styles.logoText}>PattiBytes</span>
            </Link>
          )}
        </div>

        <div className={styles.actions}>
          {user ? (
            <>
              <Link href="/community" className={styles.iconButton} aria-label="Community">
                <FaComments />
              </Link>
              <Link href="/notifications" className={styles.iconButton} aria-label="Notifications">
                <FaBell />
              </Link>

              <div className={styles.userMenu} ref={dropdownRef}>
                <button
                  className={styles.userButton}
                  onClick={() => setShowDropdown((v) => !v)}
                  aria-label="User menu"
                  aria-expanded={showDropdown}
                >
                  <SafeImage
                    src={userProfile?.photoURL || user.photoURL || '/images/default-avatar.png'}
                    alt={userProfile?.displayName || 'User'}
                    width={36}
                    height={36}
                    className={styles.avatar}
                  />
                </button>

                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      className={styles.dropdown}
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className={styles.dropdownHeader}>
                        <SafeImage
                          src={userProfile?.photoURL || user.photoURL || '/images/default-avatar.png'}
                          alt={userProfile?.displayName || 'User'}
                          width={48}
                          height={48}
                          className={styles.dropdownAvatar}
                        />
                        <div className={styles.dropdownInfo}>
                          <h4>{userProfile?.displayName || 'User'}</h4>
                          <p>@{userProfile?.username || 'username'}</p>
                          {isAdmin && <span className={styles.adminBadge}>Admin</span>}
                        </div>
                      </div>

                      {/* Scrollable body for many actions */}
                      <div className={styles.dropdownScroll}>
                        <div className={styles.dropdownDivider} />

                        <Link href="/profile" className={styles.dropdownItem} onClick={() => setShowDropdown(false)}>
                          <FaUser /> My Profile
                        </Link>

                        <Link href="/community" className={styles.dropdownItem} onClick={() => setShowDropdown(false)}>
                          <FaComments /> Community
                        </Link>

                        {isAdmin && (
                          <>
                            <div className={styles.dropdownDivider} />
                            <div className={styles.dropdownSection}>
                              <span className={styles.sectionTitle}>Admin Tools</span>
                            </div>

                            <Link href="/admin/broadcast" className={styles.dropdownItem} onClick={() => setShowDropdown(false)}>
                              <FaBullhorn /> Broadcast
                            </Link>
                            <Link href="/admin/permissions" className={styles.dropdownItem} onClick={() => setShowDropdown(false)}>
                              <FaUserShield /> Permissions
                            </Link>
                            <Link href="/admin/users" className={styles.dropdownItem} onClick={() => setShowDropdown(false)}>
                              <FaUsers /> Users
                            </Link>
                            <Link href="/admin/posts" className={styles.dropdownItem} onClick={() => setShowDropdown(false)}>
                              <FaFileAlt /> Posts
                            </Link>
                            <Link href="/admin/chats" className={styles.dropdownItem} onClick={() => setShowDropdown(false)}>
                              <FaComments /> Chats
                            </Link>
                            <Link href="/admin" className={styles.dropdownItem} onClick={() => setShowDropdown(false)}>
                              <FaShieldAlt /> Admin Home
                            </Link>
                          </>
                        )}

                        <div className={styles.dropdownDivider} />

                        <Link href="/settings" className={styles.dropdownItem} onClick={() => setShowDropdown(false)}>
                          <FaCog /> Settings
                        </Link>

                        <div className={styles.dropdownDivider} />

                        <button onClick={handleLogout} className={`${styles.dropdownItem} ${styles.logoutItem}`}>
                          <FaSignOutAlt /> Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <Link href="/auth/login" className={styles.loginBtn}>
                Login
              </Link>
              <Link href="/auth/register" className={styles.signupBtn}>
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
