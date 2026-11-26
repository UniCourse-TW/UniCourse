import type { SearchSort } from '@unicourse/api-client';

export const searchPageSize = 50;
export const searchSorts = [
  { value: 'relevance', label: '最相關' },
  { value: 'enrolled', label: '修課人數高到低' },
  { value: 'title', label: '依課名排序' }
] as const satisfies readonly { value: SearchSort; label: string }[];

export interface OverviewSearchFilters {
  query: string;
  school: string;
  term: string;
  department: string;
  sort: SearchSort;
}

export function overviewSearchHref(filters: Partial<OverviewSearchFilters> & { page?: number }) {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.school) params.set('school', filters.school);
  if (filters.term) params.set('term', filters.term);
  if (filters.department) params.set('department', filters.department);
  if (filters.sort && filters.sort !== 'relevance') params.set('sort', filters.sort);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

export function schoolHref(school: string) {
  return `/schools/${encodeURIComponent(school)}`;
}

export function departmentHref(school: string, department: string) {
  return `${schoolHref(school)}/departments/${encodeURIComponent(department)}`;
}

export function instructorHref(school: string, name: string) {
  return `/instructors/${encodeURIComponent(school)}/${encodeURIComponent(name)}`;
}
