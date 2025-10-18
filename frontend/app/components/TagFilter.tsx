'use client';

interface TagFilterProps {
  tags: string[];
  selectedTag?: string;
  onTagChange: (tag: string | undefined) => void;
}

export function TagFilter({ tags, selectedTag, onTagChange }: TagFilterProps) {
  if (!tags.length) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.6rem',
      }}
    >
      <button
        type="button"
        onClick={() => onTagChange(undefined)}
        style={{
          borderRadius: '999px',
          border: '1px solid var(--border)',
          background: selectedTag ? '#fff' : 'var(--accent)',
          color: selectedTag ? 'var(--muted)' : '#fff',
          padding: '0.4rem 0.95rem',
          cursor: 'pointer',
          fontWeight: 600,
          transition: 'all 0.2s ease',
        }}
      >
        Tous
      </button>
      {tags.map((tag) => {
        const isActive = selectedTag === tag;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onTagChange(isActive ? undefined : tag)}
            style={{
              borderRadius: '999px',
              border: isActive ? '1px solid transparent' : '1px solid var(--border)',
              background: isActive ? 'var(--accent)' : '#fff',
              color: isActive ? '#fff' : 'var(--muted)',
              padding: '0.4rem 0.95rem',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s ease',
              boxShadow: isActive ? '0 10px 24px rgba(26, 137, 23, 0.25)' : 'none',
            }}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
