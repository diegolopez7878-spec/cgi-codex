'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ArticleCard } from './components/ArticleCard';
import { Pagination } from './components/Pagination';
import { SearchBar } from './components/SearchBar';
import { SortMenu } from './components/SortMenu';
import { TagFilter } from './components/TagFilter';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { getArticles, getTags } from './lib/api';

const PAGE_SIZE = 9;

const articlesFetcher = (_key: string, params: Parameters<typeof getArticles>[0]) =>
  getArticles(params);

const tagsFetcher = () => getTags().then((response) => response.tags);

export default function HomePage() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebouncedValue(searchValue, 350);
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [sortField, setSortField] = useState<'number' | 'title' | 'order'>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const articleParams = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      sortField,
      sortOrder,
      tag: selectedTag,
      search: debouncedSearch.trim() || undefined,
    }),
    [page, sortField, sortOrder, selectedTag, debouncedSearch]
  );

  const { data: tags } = useSWR('tags', tagsFetcher);

  const {
    data: articles,
    error,
    isLoading,
  } = useSWR(['articles', articleParams], ([, params]) => articlesFetcher('articles', params), {
    keepPreviousData: true,
  });

  const showEmptyState = !isLoading && !error && articles && articles.items.length === 0;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      <section style={{ display: 'grid', gap: '1.4rem', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '3rem', margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Explorez le Code Général des Impôts marocain
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '1.1rem', marginTop: '0.75rem', maxWidth: '780px' }}>
            Recherche en temps réel, navigation par tags et fiches détaillées pour chaque article. Une expérience pensée pour
            les fiscalistes, comptables et passionnés de veille juridique.
          </p>
        </div>
        <SearchBar
          value={searchValue}
          onChange={(value) => {
            setSearchValue(value);
            setPage(1);
          }}
          onSuggestionSelected={(suggestion) => {
            router.push(`/articles/${suggestion.id}`);
          }}
        />
      </section>

      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1.5rem',
          }}
        >
          <TagFilter
            tags={tags ?? []}
            selectedTag={selectedTag}
            onTagChange={(tag) => {
              setSelectedTag(tag);
              setPage(1);
            }}
          />
          <SortMenu
            sortField={sortField}
            sortOrder={sortOrder}
            onSortFieldChange={(field) => {
              setSortField(field);
              setPage(1);
            }}
            onSortOrderChange={(order) => {
              setSortOrder(order);
              setPage(1);
            }}
          />
        </div>
      </section>

      {error && (
        <div
          style={{
            padding: '2rem',
            borderRadius: '1rem',
            background: '#fff4f4',
            border: '1px solid #fdaaaa',
            color: '#a20000',
          }}
        >
          Une erreur est survenue lors du chargement des articles. Veuillez réessayer ultérieurement.
        </div>
      )}

      {isLoading && (
        <div
          style={{
            display: 'grid',
            gap: '1.75rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              style={{
                background: 'linear-gradient(120deg, #f5f5f5, #f0efea)',
                borderRadius: '1.25rem',
                padding: '2rem',
                height: '260px',
                animation: 'pulse 1.4s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      )}

      {showEmptyState && (
        <div
          style={{
            padding: '3rem',
            textAlign: 'center',
            borderRadius: '1.5rem',
            background: '#fff',
            border: '1px dashed var(--border)',
            color: 'var(--muted)',
          }}
        >
          Aucun article ne correspond à votre recherche. Essayez d’élargir vos mots-clés ou de retirer un filtre.
        </div>
      )}

      {articles && articles.items.length > 0 && (
        <div
          style={{
            display: 'grid',
            gap: '1.75rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          }}
        >
          {articles.items.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {articles && articles.pages > 1 && (
        <Pagination page={articles.page} pages={articles.pages} onPageChange={(nextPage) => setPage(nextPage)} />
      )}
    </div>
  );
}
