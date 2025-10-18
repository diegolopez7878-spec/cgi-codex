'use client';

import { useEffect, useRef, useState } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { SuggestionItem, getSuggestions } from '../lib/api';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSuggestionSelected: (suggestion: SuggestionItem) => void;
}

export function SearchBar({ value, onChange, onSuggestionSelected }: SearchBarProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const latestQuery = useRef('');
  const debouncedValue = useDebouncedValue(inputValue, 300);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const query = debouncedValue.trim();
    if (!query) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    latestQuery.current = query;

    getSuggestions(query)
      .then((response) => {
        if (!cancelled && latestQuery.current === query) {
          setSuggestions(response.suggestions);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSuggestions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedValue]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.85rem 1.25rem',
          borderRadius: '999px',
          border: '1px solid var(--border)',
          background: '#fff',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
          transition: 'box-shadow 0.2s ease',
        }}
      >
        <span role="img" aria-hidden style={{ fontSize: '1.15rem' }}>
          🔍
        </span>
        <input
          value={inputValue}
          onChange={(event) => {
            const nextValue = event.target.value;
            setInputValue(nextValue);
            onChange(nextValue);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setTimeout(() => setOpen(false), 150);
          }}
          placeholder="Rechercher un article, un numéro ou un mot-clé"
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            flex: 1,
            fontSize: '1rem',
          }}
        />
        {isLoading ? (
          <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Recherche…</span>
        ) : (
          <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{suggestions.length} suggestion(s)</span>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div
          className="fade-in"
          style={{
            position: 'absolute',
            top: '110%',
            left: 0,
            right: 0,
            background: '#fff',
            borderRadius: '1rem',
            border: '1px solid var(--border)',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.12)',
            padding: '1rem',
            display: 'grid',
            gap: '0.75rem',
            zIndex: 10,
          }}
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => {
                onSuggestionSelected(suggestion);
                setOpen(false);
              }}
              style={{
                textAlign: 'left',
                border: 'none',
                background: 'transparent',
                padding: '0.4rem 0.25rem',
                borderBottom: '1px solid rgba(0,0,0,0.04)',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '0.15rem' }}>
                Article {suggestion.number} · {suggestion.title}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{suggestion.summary}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
