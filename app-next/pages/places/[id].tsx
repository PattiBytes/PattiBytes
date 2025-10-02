import { GetStaticProps, GetStaticPaths } from 'next';
import { useRouter } from 'next/router';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';
import Layout from '@/components/Layout';
import Image from 'next/image';
import Link from 'next/link';
import { FaArrowLeft, FaCalendar, FaMapMarkerAlt, FaShare, FaHeart } from 'react-icons/fa';
import styles from '@/styles/Article.module.css';

interface PlaceArticle {
  id: string;
  title: string;
  date: string;
  preview: string;
  image?: string;
  tags?: string[];
  content: string;
}

interface PlacePageProps {
  article: PlaceArticle;
}

export default function PlacePage({ article }: PlacePageProps) {
  const router = useRouter();

  if (router.isFallback) {
    return (
      <Layout title="Loading...">
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading place...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`${article.title} - PattiBytes`} description={article.preview}>
      <article className={styles.article}>
        <Link href="/dashboard" className={styles.backButton}>
          <FaArrowLeft /> Back to Feed
        </Link>

        {article.image && (
          <div className={styles.featuredImage}>
            <Image
              src={article.image}
              alt={article.title}
              width={1200}
              height={600}
              className={styles.image}
              priority
            />
          </div>
        )}

        <div className={styles.articleHeader}>
          <div className={styles.badges}>
            <span className={`${styles.badge} ${styles.placeBadge}`}>
              <FaMapMarkerAlt /> Place
            </span>
            {article.tags?.map(tag => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
          </div>

          <h1>{article.title}</h1>

          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <FaMapMarkerAlt />
              <span>Patti, Punjab</span>
            </div>
            <div className={styles.metaItem}>
              <FaCalendar />
              <span>{new Date(article.date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}</span>
            </div>
          </div>
        </div>

        <div className={styles.articleContent}>
          <div 
            className={styles.prose}
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>

        <div className={styles.articleActions}>
          <button className={styles.actionButton}>
            <FaHeart />
            Like
          </button>
          <button className={styles.actionButton}>
            <FaShare />
            Share
          </button>
        </div>
      </article>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const placesDir = path.join(process.cwd(), '_places');
  
  let paths: { params: { id: string } }[] = [];
  
  if (fs.existsSync(placesDir)) {
    const files = fs.readdirSync(placesDir).filter(file => file.endsWith('.md'));
    paths = files.map(filename => ({
      params: { id: filename.replace('.md', '') }
    }));
  }

  return {
    paths,
    fallback: true
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const placesDir = path.join(process.cwd(), '_places');
  const filePath = path.join(placesDir, `${params?.id}.md`);

  if (!fs.existsSync(filePath)) {
    return { notFound: true };
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);
  
  const htmlContent = marked(content);

  return {
    props: {
      article: {
        id: params?.id,
        title: data.title || 'Untitled',
        date: data.date || new Date().toISOString(),
        preview: data.preview || '',
        image: data.image,
        tags: data.tags || ['places'],
        content: htmlContent
      }
    },
    revalidate: 60
  };
};
