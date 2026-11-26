import type { SchoolSlug } from '@unicourse/crawler-kit';

export interface Board {
  name: string;
  school: SchoolSlug;
  /** Human description for docs and logs. */
  label: string;
}

/**
 * Dedicated course/teacher review boards for schools in the catalog, found by walking the PTT class tree
 * (2026-11-27). Schools without such a board (NCCU, NTNU, CCU, FCU, TNUA) only have general school boards,
 * which are not indexed; see docs/external-reviews.md.
 */
export const BOARDS: Board[] = [
  { name: 'NTUcourse', school: 'ntu', label: '臺大課程板' },
  { name: 'NTHU_Course', school: 'nthu', label: '清大選課心得板' },
  { name: 'NCTU-Teacher', school: 'nycu', label: '交大選課板' },
  { name: 'NCHU-Courses', school: 'nchu', label: '興大課程心得板' }
];

/** Tags whose posts are reviews; only these get their article page fetched for date/author/excerpt. */
export const REVIEW_TAGS = new Set(['評價', '心得', '通識', '評鑑', '課程', '分享', '推薦']);
