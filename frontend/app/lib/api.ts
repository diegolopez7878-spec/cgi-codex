export interface ArticleContext {
  livre?: string;
  partie?: string;
  titre?: string;
  chapitre?: string;
  section?: string;
  sousSection?: string;
}

export interface ArticleListItem {
  id: string;
  number: string;
  title: string;
  summary: string;
  tags: string[];
  context: ArticleContext;
}

export interface ArticleDetail extends ArticleListItem {
  content: string;
  references: { label: string; articleId: string }[];
}

export interface PaginatedArticles {
  page: number;
  pageSize: number;
  pages: number;
  total: number;
  items: ArticleListItem[];
}

export interface SuggestionItem {
  id: string;
  number: string;
  title: string;
  summary: string;
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Une erreur est survenue.');
  }

  return response.json() as Promise<T>;
}

export function getArticles(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  sortField?: 'number' | 'title' | 'order';
  sortOrder?: 'asc' | 'desc';
  tag?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.search) searchParams.set('search', params.search);
  if (params.sortField) searchParams.set('sortField', params.sortField);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  if (params.tag) searchParams.set('tag', params.tag);
  const query = searchParams.toString();
  return fetchJSON<PaginatedArticles>(`/api/articles${query ? `?${query}` : ''}`);
}

export function getArticleById(id: string) {
  return fetchJSON<ArticleDetail>(`/api/articles/${id}`);
}

export function getArticleReferences(id: string) {
  return fetchJSON<{ references: SuggestionItem[] }>(`/api/articles/${id}/references`);
}

export function getSuggestions(query: string) {
  const params = new URLSearchParams({ q: query });
  return fetchJSON<{ suggestions: SuggestionItem[] }>(`/api/search/suggestions?${params.toString()}`);
}

export function getTags() {
  return fetchJSON<{ tags: string[] }>('/api/tags');
}

export function getArticlePdfUrl(id: string) {
  return `${API_BASE_URL}/api/articles/${id}/pdf`;
}
