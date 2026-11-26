import { z } from 'zod';
import { SCHOOLS } from './schools.js';

// External review snapshots (docs/external-reviews.md): a search index of public review posts on other
// sites. Only what a search engine shows is kept: link, title, author handle, date, board, push count and
// an excerpt of at most 120 characters. `crates/ingest` accepts exactly this shape.

const text = z.string().trim().min(1).refine((value) => !value.includes('\u0000'), 'NUL is not allowed');
const httpUrl = text.refine((value) => {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password;
  } catch {
    return false;
  }
}, 'absolute HTTP(S) URL without credentials');
const utcInstant = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 19) === value.slice(0, 19);
}, 'expected an ISO-8601 UTC instant like 2026-11-26T12:00:00Z');

/** Maximum excerpt length in Unicode code points (what a search result snippet shows). */
export const EXCERPT_MAX = 120;

/** Sources whose policy is `index` (docs/external-reviews.md); link-only sources never produce snapshots. */
export const ExternalReviewSource = z.enum(['ptt']);

export const ExternalReviewPost = z
  .object({
    /** Canonical URL of the original post; `(source, url)` is the identity. */
    url: httpUrl,
    title: text,
    /** Author handle as shown publicly (PTT ID), without the nickname. */
    author: text.optional(),
    postedAt: utcInstant.optional(),
    /** PTT 推文 score: pushes minus boos (list pages cap it at ±100). */
    pushScore: z.number().int().min(-1_000_000).max(1_000_000).optional(),
    /** At most 120 code points from the start of the body, whitespace collapsed, no images or comments. */
    excerpt: text.refine((value) => [...value].length <= EXCERPT_MAX, `at most ${EXCERPT_MAX} characters`).optional(),
    /** Title tag without brackets, e.g. 評價, 心得, 問題. */
    tag: text.optional(),
    /** Term parsed from the title, `YYY-N`. */
    term: z.string().regex(/^\d{3}-[123]$/, 'term must look like 113-1').optional(),
    /** Course title parsed from the post title. */
    courseTitle: text.optional(),
    /** Teacher names parsed from the post title. */
    teachers: z.array(text).min(1).optional()
  })
  .strict();

export const ExternalReviewSnapshot = z
  .object({
    format: z.literal('external-reviews'),
    version: z.literal(1),
    source: ExternalReviewSource,
    /** Board or forum name, e.g. NTUcourse. */
    board: text,
    boardUrl: httpUrl,
    /** School the board belongs to; omitted for cross-school boards. */
    school: z.enum(Object.keys(SCHOOLS) as [keyof typeof SCHOOLS, ...(keyof typeof SCHOOLS)[]]).optional(),
    isDemo: z.boolean(),
    fetchedAt: utcInstant,
    posts: z.array(ExternalReviewPost)
  })
  .strict()
  .superRefine((snapshot, ctx) => {
    const seen = new Set<string>();
    snapshot.posts.forEach((post, index) => {
      if (seen.has(post.url)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['posts', index, 'url'], message: `duplicate url ${post.url}` });
      }
      // Real PTT posts must link to PTT itself; demo data uses example URLs.
      if (snapshot.source === 'ptt' && !snapshot.isDemo && !post.url.startsWith('https://www.ptt.cc/')) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['posts', index, 'url'], message: 'ptt url must start with https://www.ptt.cc/' });
      }
      seen.add(post.url);
    });
  });

export type ExternalReviewPost = z.infer<typeof ExternalReviewPost>;
export type ExternalReviewSnapshot = z.infer<typeof ExternalReviewSnapshot>;

/** Cut text to at most `max` code points (never splits a surrogate pair). */
export function truncateCodePoints(value: string, max = EXCERPT_MAX): string {
  const points = [...value];
  return points.length <= max ? value : points.slice(0, max).join('');
}
