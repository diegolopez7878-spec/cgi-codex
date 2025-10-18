'use client';

import Link from 'next/link';
import type { SuggestionItem } from '../lib/api';

interface ReferenceModalProps {
  open: boolean;
  onClose: () => void;
  references: SuggestionItem[];
  loading?: boolean;
}

export function ReferenceModal({ open, onClose, references, loading = false }: ReferenceModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.35rem' }}>Références liées</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '1.5rem',
              cursor: 'pointer',
            }}
            aria-label="Fermer la fenêtre des références"
          >
            ×
          </button>
        </div>
        {loading ? (
          <p style={{ color: 'var(--muted)' }}>Chargement des références…</p>
        ) : references.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>Aucune référence croisée identifiée pour cet article.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '1rem' }}>
            {references.map((reference) => (
              <li key={reference.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '0.75rem' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>
                  Article {reference.number}
                </div>
                <div style={{ color: 'var(--muted)', marginBottom: '0.5rem' }}>{reference.title}</div>
                <Link
                  href={`/articles/${reference.id}`}
                  onClick={onClose}
                  style={{
                    borderRadius: '999px',
                    padding: '0.45rem 1rem',
                    background: 'var(--foreground)',
                    color: '#fff',
                    display: 'inline-flex',
                    gap: '0.35rem',
                    alignItems: 'center',
                  }}
                >
                  Consulter →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
