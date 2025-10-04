import Link from 'next/link';
import { FaGithub, FaTwitter, FaInstagram, FaYoutube } from 'react-icons/fa';
import styles from '@/styles/Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.section}>
            <h3>PattiBytes</h3>
            <p>Your community platform for sharing stories, news, and experiences.</p>
            <div className={styles.social}>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
                <FaTwitter />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
                <FaInstagram />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">
                <FaYoutube />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <FaGithub />
              </a>
            </div>
          </div>

          <div className={styles.section}>
            <h4>Platform</h4>
            <Link href="/about">About</Link>
            <Link href="/news">News</Link>
            <Link href="/places">Places</Link>
            <Link href="/community">Community</Link>
          </div>

          <div className={styles.section}>
            <h4>Support</h4>
            <Link href="/help">Help Center</Link>
            <Link href="/contact">Contact Us</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </div>

          <div className={styles.section}>
            <h4>Developers</h4>
            <Link href="/api">API</Link>
            <Link href="/docs">Documentation</Link>
            <Link href="/status">Status</Link>
          </div>
        </div>

        <div className={styles.bottom}>
          <p>&copy; {new Date().getFullYear()} PattiBytes. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
