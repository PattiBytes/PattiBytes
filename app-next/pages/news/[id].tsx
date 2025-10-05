import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import SafeImage from '@/components/SafeImage';
import { FaArrowLeft, FaCalendar, FaUser, FaShare, FaClock } from 'react-icons/fa';
import Link from 'next/link';
import toast from 'react-hot-toast';
import styles from '@/styles/CMSArticle.module.css';

interface NewsArticle {
  id: string;
  title: string;
  date: string;
  preview: string;
  image?: string;
  author?: string;
  body: string;
}

interface NewsPageProps {
  article: NewsArticle;
}

// Fix relative image URLs to use main site
const fixImageUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/assets/uploads/') || url.startsWith('assets/uploads/')) {
    return `https://www.pattibytes.com${url.startsWith('/') ? url : '/' + url}`;
  }
  return url;
};

// Fix images inside HTML body content
const fixBodyImages = (html: string): string => {
  return html
    .replace(
      /src="(\/assets\/uploads\/[^"]+)"/g,
      'src="https://www.pattibytes.com$1"'
    )
    .replace(
      /src="(assets\/uploads\/[^"]+)"/g,
      'src="https://www.pattibytes.com/$1"'
    );
};

export default function NewsPage({ article }: NewsPageProps) {
  const router = useRouter();

  if (router.isFallback) {
    return (
      <Layout title="Loading...">
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading article...</p>
        </div>
      </Layout>
    );
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/news/${article.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.preview,
          url: shareUrl
        });
        toast.success('Shared successfully!');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Share error:', error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
      } catch {
        toast.error('Failed to copy link');
      }
    }
  };

  const formattedDate = new Date(article.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <Layout title={`${article.title} - PattiBytes News`} description={article.preview}>
      <article className={styles.article}>
        <Link href="/dashboard" className={styles.backBtn}>
          <FaArrowLeft /> Back to Feed
        </Link>

        {article.image && (
          <div className={styles.featuredImage}>
            <SafeImage
              src={fixImageUrl(article.image)!}
              alt={article.title}
              width={1200}
              height={600}
              className={styles.image}
            />
          </div>
        )}

        <div className={styles.articleHeader}>
          <span className={styles.badge}>News</span>
          <h1>{article.title}</h1>

          <div className={styles.meta}>
            <div className={styles.metaItem}>
              <FaUser />
              <span>{article.author || 'PattiBytes Desk'}</span>
            </div>
            <div className={styles.metaItem}>
              <FaCalendar />
              <span>{formattedDate}</span>
            </div>
            <div className={styles.metaItem}>
              <FaClock />
              <span>5 min read</span>
            </div>
          </div>

          {article.preview && (
            <p className={styles.preview}>{article.preview}</p>
          )}
        </div>

        <div className={styles.articleContent}>
          <div
            className={styles.prose}
            dangerouslySetInnerHTML={{ __html: fixBodyImages(article.body) }}
          />
        </div>

        <div className={styles.articleActions}>
          <button onClick={handleShare} className={styles.shareBtn}>
            <FaShare /> Share Article
          </button>
        </div>

        <div className={styles.articleFooter}>
          <p>Published by {article.author || 'PattiBytes Desk'}</p>
          <Link href="/news" className={styles.backToNews}>
            ← View All News
          </Link>
        </div>
      </article>
    </Layout>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pattibytes.com';
    const res = await fetch(`${ORIGIN}/news/index.json`, {
      next: { revalidate: 60 }
    });

    if (!res.ok) throw new Error('Failed to fetch news index');

    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.items || []);

    const paths = items
      .filter((item: { id?: string; slug?: string }) => item.id || item.slug)
      .map((item: { id?: string; slug?: string }) => ({
        params: { id: String(item.id || item.slug) }
      }));

    return {
      paths,
      fallback: true
    };
  } catch (error) {
    console.error('Error generating static paths for news:', error);
    return {
      paths: [],
      fallback: true
    };
  }
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  try {
    if (!params?.id) {
      return { notFound: true };
    }

    const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.pattibytes.com';
    const res = await fetch(`${ORIGIN}/news/${params.id}.json`, {
      next: { revalidate: 60 }
    });

    if (!res.ok) {
      console.error(`Article not found: ${params.id}`);
      return { notFound: true };
    }

    const article = await res.json();

    // Validate article data
    if (!article.title || !article.body) {
      console.error('Invalid article data');
      return { notFound: true };
    }

    return {
      props: {
        article: {
          ...article,
          id: params.id
        }
      },
      revalidate: 60
    };
  } catch (error) {
    console.error('Error fetching article:', error);
    return { notFound: true };
  }
};
