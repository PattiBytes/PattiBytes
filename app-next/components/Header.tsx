// app-next/components/Header.tsx
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SafeImage from './SafeImage';
import { useEffect, useRef, useState } from 'react';
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
import { useUnreadCounts } from '@/lib/unread';
import styles from '@/styles/Header.module.css';

export default function Header() {
  const { user, userProfile, isAdmin, signOut } = useAuth();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showBackButton, setShowBackButton] = useState(false);
  const [offline, setOffline] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hideBackOn = [
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
  useEffect(() => {
    setShowBackButton(!hideBackOn.includes(router.pathname));
  }, [hideBackOn, router.pathname]);

  // Connectivity chip
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // Collapse on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menu on outside click
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
          'caches' in window
            ? caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
            : Promise.resolve(),
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

  const handleBack = () => {
    if (navigator.vibrate) navigator.vibrate(10);
    router.back();
  };

  // Live unread badges
  const { notifications, messages } = useUnreadCounts(user?.uid || null);

  // Hide header on auth and chat id screens for a cleaner flow
    const hideOnAuth = router.pathname.startsWith('/auth/');
  const hideOnChat = router.pathname === '/community/[id]';

  if (hideOnAuth || hideOnChat) return null;


  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        <div className={styles.left}>
          {showBackButton ? (
            <button onClick={handleBack} className={styles.backBtn} aria-label="Go back">
              <FaChevronLeft />
            </button>
          ) : (
            <Link href={user ? '/dashboard' : '/'} className={styles.logo}>
              <SafeImage
                src="/icons/pwab-192.jpg"
                alt="PattiBytes"
                width={36}
                height={36}
                className={styles.logoImg}
              />
              <span className={styles.logoText}>PattiBytes</span>
            </Link>
          )}
        </div>

        <div className={styles.actions}>
          {offline && <span className={styles.offline}>Offline</span>}

          {user ? (
            <>
              <Link href="/community" className={styles.iconButton} aria-label="Community">
                <FaComments />
                {messages > 0 && <span className={styles.badge}>{messages > 9 ? '9+' : messages}</span>}
              </Link>

              <Link href="/notifications" className={styles.iconButton} aria-label="Notifications">
                <FaBell />
                {notifications > 0 && (
                  <span className={styles.badge}>{notifications > 9 ? '9+' : notifications}</span>
                )}
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
                            <Link
                              href="/admin/broadcast"
                              className={styles.dropdownItem}
                              onClick={() => setShowDropdown(false)}
                            >
                              <FaBullhorn /> Broadcast
                            </Link>
                            <Link
                              href="/admin/permissions"
                              className={styles.dropdownItem}
                              onClick={() => setShowDropdown(false)}
                            >
                              <FaUserShield /> Permissions
                            </Link>
                            <Link
                              href="/admin/users"
                              className={styles.dropdownItem}
                              onClick={() => setShowDropdown(false)}
                            >
                              <FaUsers /> Users
                            </Link>
                            <Link
                              href="/admin/posts"
                              className={styles.dropdownItem}
                              onClick={() => setShowDropdown(false)}
                            >
                              <FaFileAlt /> Posts
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
