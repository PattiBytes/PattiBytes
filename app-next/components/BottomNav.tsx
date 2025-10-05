import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SafeImage from './SafeImage';
import { FaHome, FaSearch, FaPlus, FaComments, FaUser } from 'react-icons/fa';
import { motion } from 'framer-motion';
import styles from '@/styles/BottomNav.module.css';

export default function BottomNav() {
  const { user, userProfile } = useAuth();
  const router = useRouter();

  // Don't show if not logged in
  if (!user) return null;

  const navItems = [
    { 
      href: '/dashboard', 
      icon: FaHome, 
      label: 'Home'
    },
    { 
      href: '/search', 
      icon: FaSearch, 
      label: 'Search'
    },
    { 
      href: '/create', 
      icon: FaPlus, 
      label: 'Create', 
      highlight: true 
    },
    { 
      href: '/community', 
      icon: FaComments, 
      label: 'Chat'
    },
    { 
      href: '/profile', 
      icon: FaUser, 
      label: 'Profile',
      avatar: userProfile?.photoURL || user.photoURL
    },
  ];

  const isActiveRoute = (href: string) => {
    return router.pathname === href || router.pathname.startsWith(`${href}/`);
  };

  return (
    <nav className={styles.bottomNav}>
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
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            
            {item.avatar ? (
              <SafeImage 
                src={item.avatar} 
                alt={item.label} 
                width={28} 
                height={28} 
                className={styles.avatar}
              />
            ) : (
              <Icon className={styles.icon} />
            )}
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
