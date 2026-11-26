import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
  if (!dev) error(404, '找不到這個頁面。');

  const page = url.searchParams.get('page');
  return {
    school: url.searchParams.get('school') ?? '',
    term: url.searchParams.get('term') ?? '',
    page: page === '2' || page === '3' ? Number(page) : 1
  };
};
