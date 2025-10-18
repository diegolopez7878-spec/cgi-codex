'use client';

interface PaginationProps {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pages, onPageChange }: PaginationProps) {
  if (pages <= 1) {
    return null;
  }

  const previousDisabled = page <= 1;
  const nextDisabled = page >= pages;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '1rem',
        marginTop: '3rem',
      }}
    >
      <button
        type="button"
        disabled={previousDisabled}
        onClick={() => onPageChange(page - 1)}
        style={{
          padding: '0.6rem 1.4rem',
          borderRadius: '999px',
          border: '1px solid var(--border)',
          background: previousDisabled ? '#f2f2f2' : '#fff',
          color: previousDisabled ? '#9ca3af' : 'var(--foreground)',
          cursor: previousDisabled ? 'not-allowed' : 'pointer',
          fontWeight: 600,
        }}
      >
        ← Précédent
      </button>
      <span style={{ color: 'var(--muted)', fontWeight: 600 }}>
        Page {page} sur {pages}
      </span>
      <button
        type="button"
        disabled={nextDisabled}
        onClick={() => onPageChange(page + 1)}
        style={{
          padding: '0.6rem 1.4rem',
          borderRadius: '999px',
          border: '1px solid var(--border)',
          background: nextDisabled ? '#f2f2f2' : '#fff',
          color: nextDisabled ? '#9ca3af' : 'var(--foreground)',
          cursor: nextDisabled ? 'not-allowed' : 'pointer',
          fontWeight: 600,
        }}
      >
        Suivant →
      </button>
    </div>
  );
}
