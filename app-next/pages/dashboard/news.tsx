import { GetStaticProps } from 'next';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import Image from 'next/image';

type Article = { 
  id: string; 
  title: string; 
  preview?: string; 
  date: string; 
  url?: string; 
  image?: string;
  author?: string;
  category?: string;
};

export const getStaticProps: GetStaticProps = async () => {
  try {
    const ORIGIN = process.env.SITE_ORIGIN || 'https://www.pattibytes.com';
    const r = await fetch(`${ORIGIN}/news/index.json`);
    if (!r.ok) throw new Error(`Failed to fetch: ${r.status}`);
    const data = await r.json();
    const items: Article[] = Array.isArray(data) ? data : data.items || [];
    return { 
      props: { items: items.slice(0, 20) }, 
      revalidate: 300 
    };
  } catch (error) {
    console.error('Error fetching news:', error);
    return { 
      props: { items: [] }, 
      revalidate: 60 
    };
  }
};

export default function NewsPage({ items }: { items: Article[] }) {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pa-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <DashboardLayout>
      <div className="news-dashboard">
        <header className="page-header">
          <div className="header-content">
            <h1>ਤਾਜ਼ਾ ਖ਼ਬਰਾਂ</h1>
            <p>Latest news and updates from PattiBytes</p>
          </div>
          <div className="header-actions">
            <Link href="https://www.pattibytes.com/news" target="_blank" className="btn-secondary">
              View full website
            </Link>
          </div>
        </header>
        
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📰</div>
            <h3>No news available</h3>
            <p>Check back later for the latest updates.</p>
            <Link href="https://www.pattibytes.com" target="_blank" className="btn-primary">
              Visit main website
            </Link>
          </div>
        ) : (
          <>
            <div className="news-stats">
              <div className="stat-item">
                <span className="stat-number">{items.length}</span>
                <span className="stat-label">Articles available</span>
              </div>
            </div>

            <div className="news-grid">
              {items.map((article, index) => (
                <article key={article.id || index} className="news-card">
                  {article.image && (
                    <div className="news-image">
                      <Image
                        src={article.image}
                        alt={article.title}
                        width={300}
                        height={200}
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  )}
                  
                  <div className="news-content">
                    <div className="news-header">
                      <h3 className="news-title">{article.title}</h3>
                      {article.category && (
                        <span className="news-category">{article.category}</span>
                      )}
                    </div>
                    
                    {article.preview && (
                      <p className="news-preview">{article.preview}</p>
                    )}
                    
                    <div className="news-meta">
                      <div className="meta-left">
                        <time className="news-date">
                          {formatDate(article.date)}
                        </time>
                        {article.author && (
                          <span className="news-author">by {article.author}</span>
                        )}
                      </div>
                      
                      <div className="meta-right">
                        {article.url && (
                          <Link 
                            href={article.url} 
                            target="_blank" 
                            rel="noopener"
                            className="read-more-btn"
                          >
                            Read more →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="news-footer">
              <p>
                Want to see all news? 
                <Link href="https://www.pattibytes.com/news" target="_blank">
                  Visit our main news page
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
