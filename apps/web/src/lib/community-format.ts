import type { PostType } from '$lib/community-types';

const taipeiDate = new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeZone: 'Asia/Taipei' });
const taipeiDateTime = new Intl.DateTimeFormat('zh-TW', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Taipei'
});

export function postedAt(value: string) {
  return taipeiDateTime.format(new Date(value));
}

export function joinedAt(value: string) {
  return taipeiDate.format(new Date(value));
}

export function authorName(author: { username: string; displayName?: string | null }) {
  return author.displayName || author.username;
}

export const postTypeLabels: Record<PostType, string> = {
  announcement: '公告',
  article: '文章',
  question: '提問',
  reply: '回覆'
};

/** Mean score with one decimal, or a dash without ratings. */
export function averageScore(value: number | null | undefined) {
  return value == null ? '—' : value.toFixed(1);
}

export function stars(score: number) {
  return '★'.repeat(score) + '☆'.repeat(Math.max(0, 5 - score));
}

/** Splits a free-form tag list on commas (half or full width), 、 and line breaks. */
export function parseTags(raw: string) {
  return [...new Set(raw.split(/[,，、\n]/).map((tag) => tag.trim()).filter(Boolean))];
}
