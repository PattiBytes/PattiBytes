import Link from 'next/link';
import Layout from '@/components/Layout';
import AuthGuard from '@/components/AuthGuard';
import styles from '@/styles/Shop.module.css';

const DEMO_PRODUCTS = [
  { id: 'pb-tee', title: 'PattiBytes T‑Shirt', price: 499, tag: 'Popular' },
  { id: 'pb-cap', title: 'PB Cap', price: 299, tag: 'New' },
  { id: 'pb-mug', title: 'PB Mug', price: 249, tag: 'Hot' },
];

export default function ShopPage() {
  return (
    <AuthGuard>
      <Layout title="Shop - PattiBytes">
        <div className={styles.page}>
          <div className={styles.header}>
            <h1>Shop</h1>
            <p>Small demo store page (wire products later).</p>
          </div>

          <div className={styles.grid}>
            {DEMO_PRODUCTS.map((p) => (
              <Link key={p.id} href={`/shop/${p.id}`} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.badge}>{p.tag}</span>
                </div>
                <div className={styles.title}>{p.title}</div>
                <div className={styles.price}>₹{p.price}</div>
                <button className={styles.btn} type="button">
                  View
                </button>
              </Link>
            ))}
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
