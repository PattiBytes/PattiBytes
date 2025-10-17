// app-next/components/BottomNav.tsx
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SafeImage from './SafeImage';
import { FaHome, FaSearch, FaPlus, FaComments, FaUser, FaShieldAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { type IconType } from 'react-icons';
import { useUnreadCounts } from '@/lib/unread';
import styles from '@/styles/BottomNav.module.css';

interface NavItem {
  href: string;
  icon: IconType;
  label: string;
  highlight?: boolean;
  avatar?: string | null;
  badge?: number;
}

export default function BottomNav() {
  const { user, userProfile, isAdmin } = useAuth();
  const router = useRouter();

  // CALL HOOKS AT TOP LEVEL ALWAYS - before any conditional returns
  const unreadCounts = useUnreadCounts(user?.uid || null);
  const { messages } = unreadCounts;

  // Early return after hooks
  if (!user) return null;

  const isActiveRoute = (href: string) =>
    router.pathname === href || router.pathname.startsWith(`${href}/`);

  const baseNavItems: NavItem[] = [
    { href: '/dashboard', icon: FaHome, label: 'Home' },
    { href: '/search', icon: FaSearch, label: 'Search' },
    { href: '/create', icon: FaPlus, label: 'Create', highlight: true },
    { href: '/community', icon: FaComments, label: 'Chat', badge: messages },
    { href: '/profile', icon: FaUser, label: 'Profile', avatar: userProfile?.photoURL || user.photoURL },
  ];

  const navItems: NavItem[] = isAdmin
    ? [
        ...baseNavItems,
        { href: '/admin', icon: FaShieldAlt, label: 'Admin' },
      ]
    : baseNavItems;

  // Hide on auth
  if (router.pathname.startsWith('/auth/')) return null;

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
              <span className={styles.iconWrap}>
                {item.avatar ? (
                  <SafeImage src={item.avatar} alt={item.label} width={28} height={28} className={styles.avatar} />
                ) : (
                  <Icon className={styles.icon} />
                )}
                {!!item.badge && item.badge > 0 && (
                  <span className={styles.badge}>{item.badge > 9 ? '9+' : item.badge}</span>
                )}
              </span>
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
              <span className={styles.iconWrap}>
                {item.avatar ? (
                  <SafeImage src={item.avatar} alt={item.label} width={28} height={28} className={styles.avatar} />
                ) : (
                  <Icon className={styles.icon} />
                )}
                {!!item.badge && item.badge > 0 && (
                  <span className={styles.badge}>{item.badge > 9 ? '9+' : item.badge}</span>
                )}
              </span>
              <span className={styles.label}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
