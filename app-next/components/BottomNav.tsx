import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaHome, FaMapMarkerAlt, FaNewspaper, FaPen, FaUser } from 'react-icons/fa';
import styles from '@/styles/BottomNav.module.css';

export default function BottomNav() {
  const router = useRouter();
  
  const navItems = [
    { href: '/dashboard', icon: FaHome, label: 'Home' },
    { href: '/places', icon: FaMapMarkerAlt, label: 'Places' },
    { href: '/create', icon: FaPen, label: 'Create' },
    { href: '/news', icon: FaNewspaper, label: 'News' },
    { href: '/profile', icon: FaUser, label: 'Profile' },
  ];

  return (
    <nav className={styles.bottomNav}>
      {navItems.map((item) => {
        const isActive = router.pathname === item.href;
        const Icon = item.icon;
        
        return (
          <Link key={item.href} href={item.href} className={styles.navItem}>
            <motion.div
              className={`${styles.iconWrapper} ${isActive ? styles.active : ''}`}
              whileTap={{ scale: 0.9 }}
            >
              {isActive && (
                <motion.div
                  className={styles.activeIndicator}
                  layoutId="activeIndicator"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className={styles.icon} />
            </motion.div>
            <span className={`${styles.label} ${isActive ? styles.activeLabel : ''}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
