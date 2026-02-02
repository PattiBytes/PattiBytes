'use client';

export default function PageLoadingSpinner() {
  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', color: '#6b7280' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '999px',
            border: '4px solid #e5e7eb',
            borderTopColor: '#f97316',
            margin: '0 auto 12px',
            animation: 'spin 900ms linear infinite',
          }}
        />
        <div style={{ fontWeight: 700 }}>Loading...</div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
