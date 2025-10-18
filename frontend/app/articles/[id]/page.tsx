'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { ReferenceModal } from '../../components/ReferenceModal';
import { getArticleById, getArticlePdfUrl, getArticleReferences } from '../../lib/api';
import type { SuggestionItem } from '../../lib/api';

const articleFetcher = (_key: string, id: string) => getArticleById(id);

export default function ArticlePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const articleId = params?.id;
  const [showReferences, setShowReferences] = useState(false);
  const [references, setReferences] = useState<SuggestionItem[]>([]);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [referencesLoadedFor, setReferencesLoadedFor] = useState<string | null>(null);

  const {
    data: article,
    error,
    isLoading,
  } = useSWR(articleId ? ['article', articleId] : null, ([, id]) => articleFetcher('article', id));

  useEffect(() => {
    if (!showReferences || !article) {
      return;
    }
    if (referencesLoadedFor === article.id) {
      return;
    }
    setLoadingReferences(true);
    getArticleReferences(article.id)
      .then((result) => {
        setReferences(result.references);
        setReferencesLoadedFor(article.id);
      })
      .catch(() => {
        setReferences([]);
        setReferencesLoadedFor(article.id);
      })
      .finally(() => {
        setLoadingReferences(false);
      });
  }, [showReferences, article, referencesLoadedFor]);

  if (isLoading) {
    return (
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={{ height: '18px', width: '160px', background: '#eee', borderRadius: '999px', marginBottom: '1.5rem' }} />
        <div style={{ height: '48px', background: '#f2f2f2', borderRadius: '1rem', marginBottom: '1.75rem' }} />
        <div style={{ height: '380px', background: '#f5f5f5', borderRadius: '1.5rem' }} />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--muted)',
            cursor: 'pointer',
            marginBottom: '2rem',
          }}
        >
          ← Retour
        </button>
        <div
          style={{
            padding: '2rem',
            background: '#fff4f4',
            borderRadius: '1rem',
            border: '1px solid #fdaaaa',
            color: '#a20000',
          }}
        >
          Impossible de récupérer cet article. Il se peut qu’il ait été déplacé.
        </div>
      </div>
    );
  }

  const breadcrumbs = [
    article.context.livre,
    article.context.partie,
    article.context.titre,
    article.context.chapitre,
    article.context.section,
    article.context.sousSection,
  ]
    .filter(Boolean)
    .join(' › ');

  const blocks = article.content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <Link href="/" style={{ color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
        ← Retour à la recherche
      </Link>

      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="tag-pill">Article {article.number}</span>
          {article.tags.map((tag) => (
            <span key={tag} className="tag-pill" style={{ background: '#eef7ee', color: '#176217' }}>
              {tag}
            </span>
          ))}
        </div>
        <h1 style={{ fontSize: '2.6rem', margin: 0, fontWeight: 700 }}>{article.title}</h1>
        {breadcrumbs && <p style={{ color: 'var(--muted)' }}>{breadcrumbs}</p>}
      </div>

      <div
        style={{
          marginTop: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <button
          type="button"
          onClick={() => setShowReferences(true)}
          style={{
            border: '1px solid var(--border)',
            borderRadius: '999px',
            padding: '0.6rem 1.3rem',
            background: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Références ({article.references.length})
        </button>
        <a
          href={getArticlePdfUrl(article.id)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            borderRadius: '999px',
            padding: '0.6rem 1.3rem',
            background: 'var(--foreground)',
            color: '#fff',
            fontWeight: 600,
          }}
        >
          Exporter en PDF
        </a>
      </div>

      <div
        style={{
          marginTop: '2.5rem',
          background: '#fff',
          borderRadius: '1.5rem',
          padding: '2.5rem',
          boxShadow: '0 24px 48px rgba(15, 23, 42, 0.12)',
          border: '1px solid rgba(15, 23, 42, 0.05)',
        }}
      >
        {blocks.map((block, index) => (
          <p key={`${index}-${block.slice(0, 12)}`} style={{ whiteSpace: 'pre-wrap', fontSize: '1.05rem' }}>
            {block}
          </p>
        ))}
      </div>

      <ReferenceModal
        open={showReferences}
        onClose={() => setShowReferences(false)}
        references={references}
        loading={loadingReferences}
      />
    </div>
  );
}
