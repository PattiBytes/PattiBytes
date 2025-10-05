import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SafeImage from './SafeImage';
import { useState, useEffect, useRef } from 'react';
import { FaBell, FaSignOutAlt, FaUser, FaCog, FaChevronLeft, FaComments } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import styles from '@/styles/Header.module.css';

export default function Header() {
  const { user, userProfile, signOut } = useAuth();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showBackButton, setShowBackButton] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const noBackPaths = ['/', '/dashboard', '/search', '/notifications', '/create', '/profile', '/settings', '/community'];
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
    if (loggingOut) return;
    
    setLoggingOut(true);
    setShowDropdown(false);
    
    try {
      // Show loading toast
      const toastId = toast.loading('Logging out...');
      
      // Sign out
      await signOut();
      
      // Clear all caches and storage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear service worker cache if exists
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
          });
        }
      }
      
      // Success toast
      toast.success('Logged out successfully!', { id: toastId });
      
      // Redirect to home
      await router.push('/');
      
      // Force reload to clear all state
      window.location.href = '/';
      
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout. Please try again.');
      setLoggingOut(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.left}>
          {showBackButton ? (
            <button onClick={handleBack} className={styles.backBtn} aria-label="Go back">
              <FaChevronLeft />
            </button>
          ) : (
            <Link href={user ? "/dashboard" : "/"} className={styles.logo}>
              <SafeImage src="/images/logo.png" alt="PattiBytes" width={32} height={32} />
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
                <span className={styles.badge}>3</span>
              </Link>

              <div className={styles.userMenu} ref={dropdownRef}>
                <button 
                  className={styles.userButton}
                  onClick={() => setShowDropdown(!showDropdown)}
                  aria-label="User menu"
                  disabled={loggingOut}
                >
                  <SafeImage
                    src={user.photoURL}
                    alt={userProfile?.displayName || 'User'}
                    width={32}
                    height={32}
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
                          src={user.photoURL}
                          alt={userProfile?.displayName || 'User'}
                          width={48}
                          height={48}
                          className={styles.dropdownAvatar}
                        />
                        <div>
                          <h4>{userProfile?.displayName}</h4>
                          <p>@{userProfile?.username}</p>
                        </div>
                      </div>

                      <Link 
                        href="/profile"
                        className={styles.dropdownItem}
                        onClick={() => setShowDropdown(false)}
                      >
                        <FaUser /> My Profile
                      </Link>
                      
                      <Link 
                        href="/community" 
                        className={styles.dropdownItem}
                        onClick={() => setShowDropdown(false)}
                      >
                        <FaComments /> Community
                      </Link>
                      
                      <Link 
                        href="/settings" 
                        className={styles.dropdownItem}
                        onClick={() => setShowDropdown(false)}
                      >
                        <FaCog /> Settings
                      </Link>
                      
                      <button 
                        onClick={handleLogout} 
                        className={`${styles.dropdownItem} ${styles.logoutItem}`}
                        disabled={loggingOut}
                      >
                        <FaSignOutAlt /> {loggingOut ? 'Logging out...' : 'Logout'}
                      </button>
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
