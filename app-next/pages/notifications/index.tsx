import AuthGuard from '@/components/AuthGuard';
import Layout from '@/components/Layout';
import { FaBell } from 'react-icons/fa';
import styles from '@/styles/Notifications.module.css';

export default function Notifications() {
  return (
    <AuthGuard>
      <Layout title="Notifications - PattiBytes">
        <div className={styles.notifications}>
          <div className={styles.empty}>
            <FaBell className={styles.emptyIcon} />
            <h2>No notifications yet</h2>
            <p>When someone interacts with your posts, you will see it here</p>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
