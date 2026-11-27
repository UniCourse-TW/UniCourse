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
  article: '心得',
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

const taipeiParts = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Taipei'
});

/** Year, month, day, hour and minute of an instant in Taipei time, zero-padded. */
function taipei(value: string | Date) {
  const parts = Object.fromEntries(
    taipeiParts.formatToParts(typeof value === 'string' ? new Date(value) : value).map((part) => [part.type, part.value])
  );
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute };
}

/** `11/27` this year, `2025/06/12` otherwise (Taipei time); for dense list columns. */
export function shortDate(value: string, now: Date = new Date()) {
  const date = taipei(value);
  return date.year === taipei(now).year ? `${date.month}/${date.day}` : `${date.year}/${date.month}/${date.day}`;
}

/** `2026/11/27 04:03` in Taipei time. */
export function dateTime(value: string) {
  const date = taipei(value);
  return `${date.year}/${date.month}/${date.day} ${date.hour}:${date.minute}`;
}

/** `11/27 03:58` this year, with the year otherwise. */
export function shortDateTime(value: string, now: Date = new Date()) {
  const date = taipei(value);
  return `${shortDate(value, now)} ${date.hour}:${date.minute}`;
}

/** `2026/11/27` in Taipei time. */
export function slashDate(value: string) {
  const date = taipei(value);
  return `${date.year}/${date.month}/${date.day}`;
}

/** `2026 年 11 月` in Taipei time. */
export function joinedMonth(value: string) {
  const date = taipei(value);
  return `${date.year} 年 ${Number(date.month)} 月`;
}

/** An excerpt on one line: runs of whitespace (including blank lines) become one space. */
export function oneLine(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

/** `+3`, `0` or `-2`. */
export function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

export function scoreSign(value: number) {
  return value > 0 ? 'up' : value < 0 ? 'down' : 'zero';
}

/** The first character of a display name, upper-cased, for an initial avatar. */
export function initial(name: string) {
  return [...name.trim()][0]?.toLocaleUpperCase('zh-TW') ?? '?';
}

/** Key of a cross-term course in title lookups: `fcu/GBCP101`. */
export function courseKey(school: string, courseCode: string) {
  return `${school}/${courseCode}`;
}

/**
 * The title without a leading course name that the row already shows (「公民參與 作業量如何？」 →
 * 「作業量如何？」). Titles that are only the course name, or do not start with it, stay as they are.
 */
export function titleWithoutCourse(title: string, courseTitle: string | undefined) {
  if (!courseTitle || !title.startsWith(courseTitle)) return title;
  const rest = title.slice(courseTitle.length).replace(/^[\s:：\-－｜|・,，]+/u, '');
  return rest.length >= 2 ? rest : title;
}
