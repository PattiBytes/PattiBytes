import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SafeImage from './SafeImage';
import { FaHome, FaSearch, FaPlus, FaComments, FaUser, FaShieldAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { type IconType } from 'react-icons';
import styles from '@/styles/BottomNav.module.css';

interface NavItem {
  href: string;
  icon: IconType;
  label: string;
  highlight?: boolean;
  avatar?: string | null;
}

export default function BottomNav() {
  const { user, userProfile, isAdmin } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const baseNavItems: NavItem[] = [
    { href: '/dashboard', icon: FaHome, label: 'Home' },
    { href: '/search', icon: FaSearch, label: 'Search' },
    { href: '/create', icon: FaPlus, label: 'Create', highlight: true },
    { href: '/community', icon: FaComments, label: 'Chat' },
  ];

  const navItems: NavItem[] = isAdmin
    ? [
        ...baseNavItems,
        { href: '/admin', icon: FaShieldAlt, label: 'Admin' },
        { href: '/profile', icon: FaUser, label: 'Profile', avatar: userProfile?.photoURL || user.photoURL },
      ]
    : [
        ...baseNavItems,
        { href: '/profile', icon: FaUser, label: 'Profile', avatar: userProfile?.photoURL || user.photoURL },
      ];

  const isActiveRoute = (href: string) => router.pathname === href || router.pathname.startsWith(`${href}/`);

  return (
    <nav className={styles.shell} aria-label="Primary">
      {/* Desktop/Large screens: vertical rail */}
      <div className={styles.rail}>
        {navItems.map((item) => {
          const isActive = isActiveRoute(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.railItem} ${isActive ? styles.active : ''} ${item.highlight ? styles.highlight : ''}`}
              title={item.label}
            >
              {isActive && (
                <motion.div
                  className={styles.railIndicator}
                  layoutId="activeRail"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              {item.avatar ? (
                <SafeImage src={item.avatar} alt={item.label} width={28} height={28} className={styles.avatar} />
              ) : (
                <Icon className={styles.icon} />
              )}
              <span className={styles.railLabel}>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Mobile: bottom bar */}
      <div className={styles.bottomNav}>
        {navItems.map((item) => {
          const isActive = isActiveRoute(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''} ${item.highlight ? styles.highlight : ''}`}
            >
              {isActive && (
                <motion.div
                  className={styles.activeIndicator}
                  layoutId="activeTab"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              {item.avatar ? (
                <SafeImage src={item.avatar} alt={item.label} width={28} height={28} className={styles.avatar} />
              ) : (
                <Icon className={styles.icon} />
              )}
              <span className={styles.label}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
