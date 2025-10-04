import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SafeImage from './SafeImage';
import { useState } from 'react';
import { FaBell, FaSignOutAlt, FaUser, FaCog } from 'react-icons/fa';
import styles from '@/styles/Header.module.css';

export default function Header() {
  const { user, userProfile, signOut } = useAuth();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <SafeImage src="/images/logo.png" alt="PattiBytes" width={40} height={40} />
          <span className={styles.logoText}>PattiBytes</span>
        </Link>

        <div className={styles.actions}>
          {user ? (
            <>
              <button className={styles.iconButton}>
                <FaBell />
                <span className={styles.badge}>3</span>
              </button>

              <div className={styles.userMenu}>
                <button 
                  className={styles.userButton}
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <SafeImage
                    src={user.photoURL}
                    alt={userProfile?.displayName || 'User'}
                    width={36}
                    height={36}
                    className={styles.avatar}
                  />
                </button>

                {showDropdown && (
                  <div className={styles.dropdown}>
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

                    <Link href={`/user/${userProfile?.username}`} className={styles.dropdownItem}>
                      <FaUser /> Profile
                    </Link>
                    <Link href="/settings" className={styles.dropdownItem}>
                      <FaCog /> Settings
                    </Link>
                    <button onClick={handleLogout} className={styles.dropdownItem}>
                      <FaSignOutAlt /> Logout
                    </button>
                  </div>
                )}
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
