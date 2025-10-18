'use client';

interface SortMenuProps {
  sortField: 'number' | 'title' | 'order';
  sortOrder: 'asc' | 'desc';
  onSortFieldChange: (field: 'number' | 'title' | 'order') => void;
  onSortOrderChange: (order: 'asc' | 'desc') => void;
}

const sortOptions: { label: string; value: 'number' | 'title' | 'order' }[] = [
  { label: 'Numéro', value: 'number' },
  { label: 'Titre', value: 'title' },
  { label: 'Ordre d’apparition', value: 'order' },
];

export function SortMenu({ sortField, sortOrder, onSortFieldChange, onSortOrderChange }: SortMenuProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}
    >
      <label style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>Trier par</label>
      <select
        value={sortField}
        onChange={(event) => onSortFieldChange(event.target.value as 'number' | 'title' | 'order')}
        style={{
          borderRadius: '999px',
          border: '1px solid var(--border)',
          padding: '0.45rem 1.1rem',
          background: '#fff',
          fontWeight: 600,
        }}
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
        style={{
          borderRadius: '999px',
          border: '1px solid var(--border)',
          padding: '0.45rem 1.1rem',
          background: '#fff',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {sortOrder === 'asc' ? '⬆️ Ascendant' : '⬇️ Descendant'}
      </button>
    </div>
  );
}
