import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { motion } from 'framer-motion';
import { FaNewspaper, FaMapMarkerAlt, FaPen, FaUsers, FaRocket, FaShieldAlt } from 'react-icons/fa';
import styles from '@/styles/Home.module.css';

export default function Home() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && userProfile?.username) {
      router.replace('/dashboard');
    }
  }, [user, userProfile, loading, router]);

  if (loading) {
    return null;
  }

  if (user && userProfile?.username) {
    return null;
  }

  return (
    <Layout title="PattiBytes - Your Community Platform" showBottomNav={false}>
      <div className={styles.hero}>
        <motion.div 
          className={styles.heroContent}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <SafeImage 
            src="/images/logo.png" 
            alt="PattiBytes" 
            width={100} 
            height={100} 
            className={styles.heroLogo}
          />
          <h1>Welcome to PattiBytes</h1>
          <p>Share your stories, discover news, and explore places in your community</p>
          
          <div className={styles.heroButtons}>
            <Link href="/auth/register" className={styles.primaryBtn}>
              Get Started
            </Link>
            <Link href="/auth/login" className={styles.secondaryBtn}>
              Sign In
            </Link>
          </div>
        </motion.div>

        <motion.div 
          className={styles.heroImage}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <SafeImage 
            src="/images/hero-illustration.png" 
            alt="Community" 
            width={500} 
            height={400}
            fallbackSrc="/images/logo.png"
          />
        </motion.div>
      </div>

      <div className={styles.features}>
        <h2>What You Can Do</h2>
        <div className={styles.featureGrid}>
          <motion.div 
            className={styles.featureCard}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <FaNewspaper className={styles.featureIcon} />
            <h3>Latest News</h3>
            <p>Stay updated with local and community news</p>
          </motion.div>

          <motion.div 
            className={styles.featureCard}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <FaMapMarkerAlt className={styles.featureIcon} />
            <h3>Discover Places</h3>
            <p>Explore interesting locations in your area</p>
          </motion.div>

          <motion.div 
            className={styles.featureCard}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <FaPen className={styles.featureIcon} />
            <h3>Share Stories</h3>
            <p>Write and publish your own content</p>
          </motion.div>

          <motion.div 
            className={styles.featureCard}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <FaUsers className={styles.featureIcon} />
            <h3>Connect</h3>
            <p>Build connections with your community</p>
          </motion.div>

          <motion.div 
            className={styles.featureCard}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <FaRocket className={styles.featureIcon} />
            <h3>Fast & Modern</h3>
            <p>Enjoy a smooth, responsive experience</p>
          </motion.div>

          <motion.div 
            className={styles.featureCard}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <FaShieldAlt className={styles.featureIcon} />
            <h3>Secure</h3>
            <p>Your data is safe and protected</p>
          </motion.div>
        </div>
      </div>

      <div className={styles.cta}>
        <h2>Ready to Join?</h2>
        <p>Be part of our growing community today</p>
        <Link href="/auth/register" className={styles.ctaBtn}>
          Create Your Account
        </Link>
      </div>
    </Layout>
  );
}
