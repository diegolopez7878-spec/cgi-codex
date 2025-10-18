import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'CGI Codex – Code Général des Impôts Marocain',
  description:
    'Consultez, recherchez et explorez les articles du Code Général des Impôts marocain avec une interface inspirée de Medium.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${inter.variable}`}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <header
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              backdropFilter: 'blur(12px)',
              background: 'rgba(253, 250, 245, 0.82)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                maxWidth: '1100px',
                margin: '0 auto',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 700 }}>CGI Codex</span>
                <span style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>
                  Le Code Général des Impôts marocain en version vivante.
                </span>
              </div>
              <span className="tag-pill">Edition 2025</span>
            </div>
          </header>
          <main style={{ flex: 1 }}>{children}</main>
          <footer
            style={{
              borderTop: '1px solid var(--border)',
              padding: '2rem 1.5rem',
              marginTop: '4rem',
            }}
          >
            <div style={{ maxWidth: '1100px', margin: '0 auto', color: 'var(--muted)', fontSize: '0.9rem' }}>
              <p>
                Données extraites du Code Général des Impôts 2025. Ce projet fournit une interface de consultation moderne avec
                recherche, filtres et export PDF.
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
