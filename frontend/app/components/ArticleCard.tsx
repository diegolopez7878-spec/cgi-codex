import Link from 'next/link';
import type { ArticleListItem } from '../lib/api';

interface ArticleCardProps {
  article: ArticleListItem;
}

function buildBreadcrumb(context: ArticleListItem['context']) {
  return [
    context.livre,
    context.partie,
    context.titre,
    context.chapitre,
    context.section,
    context.sousSection,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function ArticleCard({ article }: ArticleCardProps) {
  const breadcrumb = buildBreadcrumb(article.context);

  return (
    <article
      style={{
        background: 'var(--card-bg)',
        borderRadius: '1.25rem',
        padding: '2rem',
        boxShadow: '0 22px 45px rgba(15, 23, 42, 0.08)',
        border: '1px solid rgba(15, 23, 42, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.2rem',
      }}
    >
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="tag-pill">Article {article.number}</span>
        {article.tags.map((tag) => (
          <span key={tag} className="tag-pill" style={{ background: '#eef7ee', color: '#176217' }}>
            {tag}
          </span>
        ))}
      </div>
      <div>
        <h2 style={{ fontSize: '1.6rem', margin: 0, fontWeight: 700 }}>{article.title}</h2>
        {breadcrumb && <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>{breadcrumb}</p>}
      </div>
      <p style={{ fontSize: '1rem', color: 'rgba(0,0,0,0.75)' }}>{article.summary}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <Link
          href={`/articles/${article.id}`}
          style={{
            borderRadius: '999px',
            padding: '0.65rem 1.4rem',
            fontWeight: 600,
            background: 'var(--foreground)',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          Lire l’article complet →
        </Link>
      </div>
    </article>
  );
}
