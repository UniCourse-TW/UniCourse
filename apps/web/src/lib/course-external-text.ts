/**
 * Display helpers for indexed external posts (PTT course boards). The crawler stores at most 120
 * characters of each post's own opinion text (see docs/external-reviews.md), so excerpts are shown as is.
 */

/** One part of an excerpt; `label` is kept for callers that render labelled parts. */
export interface ExcerptPart {
  label: string | null;
  text: string;
}

/**
 * The excerpt to show next to the title. The crawler already stores only the author's opinion text
 * (≤ 120 characters, cut at a sentence boundary and marked with「…」when shortened), so the page shows
 * it as one plain part; an empty array means the list shows the title only.
 */
export function excerptParts(excerpt: string | null | undefined): ExcerptPart[] {
  const text = excerpt?.replace(/\s+/gu, ' ').trim();
  return text ? [{ label: null, text }] : [];
}

/** The stored excerpt already says when it was shortened, so the page never adds its own「…」. */
export function endsSentence(_parts: ExcerptPart[]) {
  return true;
}

/** PTT ids are 2–12 ASCII letters/digits starting with a letter; parser leftovers such as `http` are hidden. */
export function displayAuthor(author: string | null | undefined) {
  if (!author || !/^[A-Za-z][A-Za-z0-9_]{1,12}$/u.test(author)) return undefined;
  return /^(https?|www)$/iu.test(author) ? undefined : author;
}

/** Title tags grouped into what a student is looking for. */
export type PostKind = 'review' | 'question' | 'other';

const reviewTags = new Set(['評價', '心得', '通識', '推薦', '課程', '情報', '分享']);
const questionTags = new Set(['請問', '問題', '求救', '請益', '問', '徵求', '討論', '求助']);

export function postKind(tag: string | null | undefined): PostKind {
  if (!tag) return 'other';
  if (reviewTags.has(tag)) return 'review';
  if (questionTags.has(tag)) return 'question';
  return 'other';
}

export const postKindLabels: Record<PostKind, string> = { review: '心得評價', question: '提問', other: '其他' };

/** PTT shows ±100 as 爆 / XX. */
export function pushLabel(score: number) {
  if (score >= 100) return '爆';
  if (score <= -100) return 'XX';
  return score > 0 ? `+${score}` : `${score}`;
}
