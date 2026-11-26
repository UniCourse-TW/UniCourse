import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/** The landscape used to be a static file; keep its old address working. */
export const GET: RequestHandler = ({ url }) => redirect(301, `/landscape${url.search}`);
