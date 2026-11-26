import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, cookies }) => {
  const preference = cookies.get('uc_theme');
  const theme = preference === 'light' || preference === 'dark' ? preference : undefined;
  return { user: locals.user, theme };
};
