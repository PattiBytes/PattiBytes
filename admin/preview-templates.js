import CMS from 'netlify-cms-app';
import React from 'react';
import 'admin.css'; // Optional: match your site styles here

const NewsPreview = ({ entry, widgetFor }) => {
  const title = entry.getIn(['data', 'title']);
  const preview = entry.getIn(['data', 'preview']);
  const content = widgetFor('body');
  const image = entry.getIn(['data', 'image']);

  return (
    <main>
      <section className="latest-news">
        <div className="container">
          <h2 className="section-title">ਤਾਜ਼ਾ ਖ਼ਬਰਾਂ ਅਤੇ ਅਪਡੇਟਸ</h2>
          <div className="news-grid">
            <article className="news-card preview-card">
              {image && (
                <div className="media-container">
                  <button className="enlarge-btn" aria-label="Enlarge image">🔍</button>
                  <img
                    src={image}
                    alt={title}
                    style={{ maxWidth: '100%', height: 'auto', borderRadius: '6px' }}
                  />
                </div>
              )}
              <div className={`news-content${!image ? ' no-media' : ''}`}>
                <h4>{title}</h4>
                <p className="card-preview">{preview}</p>
                <div className="news-actions">
                  <button className="read-more-btn">ਪੂਰਾ ਪੜ੍ਹੋ →</button>
                  <button className="copy-link" title="Copy Link">🔗</button>
                </div>
                <div className="full-content" style={{ marginTop: '1em' }}>{content}</div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
};

CMS.registerPreviewTemplate('news', NewsPreview);
