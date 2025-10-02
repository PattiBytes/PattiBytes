import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBell, FaSearch, FaCog, FaSignOutAlt, FaUser } from 'react-icons/fa';
import styles from '@/styles/Header.module.css';

export default function Header() {
  const { userProfile, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Logo */}
        <Link href="/dashboard" className={styles.logo}>
          <Image
            src="/images/logo.png"
            alt="PattiBytes"
            width={40}
            height={40}
          />
          <span className={styles.logoText}>PattiBytes</span>
        </Link>

        {/* Search */}
        <div className={styles.searchWrapper}>
          <button 
            className={styles.searchButton}
            onClick={() => setShowSearch(!showSearch)}
          >
            <FaSearch />
          </button>
          
          <AnimatePresence>
            {showSearch && (
              <motion.div
                className={styles.searchBar}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 300, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
              >
                <input
                  type="text"
                  placeholder="Search PattiBytes..."
                  className={styles.searchInput}
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          {/* Notifications */}
          <button className={styles.iconButton}>
            <FaBell />
            <span className={styles.badge}>3</span>
          </button>

          {/* Profile Menu */}
          <div className={styles.profileMenu}>
            <button 
              className={styles.profileButton}
              onClick={() => setShowMenu(!showMenu)}
            >
              {userProfile?.photoURL ? (
                <Image
                  src={userProfile.photoURL}
                  alt={userProfile.displayName}
                  width={36}
                  height={36}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {userProfile?.displayName?.charAt(0).toUpperCase()}
                </div>
              )}
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  className={styles.dropdown}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className={styles.dropdownHeader}>
                    <p className={styles.userName}>{userProfile?.displayName}</p>
                    <p className={styles.userHandle}>@{userProfile?.username}</p>
                  </div>

                  <div className={styles.dropdownDivider} />

                  <Link href="/profile" className={styles.dropdownItem}>
                    <FaUser />
                    Profile
                  </Link>

                  <Link href="/settings" className={styles.dropdownItem}>
                    <FaCog />
                    Settings
                  </Link>

                  <div className={styles.dropdownDivider} />

                  <button 
                    className={styles.dropdownItem}
                    onClick={handleSignOut}
                  >
                    <FaSignOutAlt />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
