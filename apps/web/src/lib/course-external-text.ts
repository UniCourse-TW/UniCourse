/**
 * Display helpers for indexed external posts (PTT course boards). The index stores the first 120
 * characters of each post, which on most boards is the review template's own prompts
 * (「哪一學年度修課：ψ 授課教師 (若為多人合授請寫開課教師…)」). These helpers strip those prompts at display
 * time and keep only what the author wrote, labelled with a short field name.
 */

/** One field of a cleaned excerpt; `label` is null for free text before the first template field. */
export interface ExcerptPart {
  label: string | null;
  text: string;
}

/** Fields that repeat the title, term or teacher chips shown next to the excerpt. */
const redundant = ['學年度', '修課年度', '學期', '授課教師', '授課老師', '教授', '老師', '課名', '課程名稱', '修課名稱', '科號', '上課時段', '開課教師'];

/** Template field names mapped to the short labels shown in the list, checked in order. */
const shortLabels: [RegExp, string][] = [
  [/大概內容|教了什麼|課程內容|簡介|內容/, '內容'],
  [/授課對象|課別|所屬類別|開課系所/, '對象'],
  [/推薦/, '推薦'],
  [/評分|評量|給分|成績/, '評分'],
  [/考題|考試|作業/, '考試作業'],
  [/上課方式|上課風格|教學風格/, '上課'],
  [/用書|課本|教材/, '用書'],
  [/總結|心得/, '心得'],
  [/其它|其他/, '其他'],
  [/甜度/, '甜度'],
  [/涼度/, '涼度'],
  [/難度/, '難度'],
  [/學分/, '學分'],
  [/先修/, '先修']
];

/** The prompt in brackets after a field name, possibly cut off by the 120-character limit. */
const prompt = String.raw`(?:\s*[(（][^)）]*(?:[)）]|$))?`;
const colon = String.raw`(?:\s*[:：])?`;

/**
 * Field markers of the templates used on the indexed boards:
 * - NTUcourse: `ψ 授課教師 (…)`, `δ 課程大概內容`, `哪一學年度修課：`
 * - NCTU-Teacher: `⊕課名⊕`, `￡教了什麼￡（…）`
 * - NTHU_Course / NCHU-Courses: `課名：`, `【評分方式】`, `【上課時段 356`
 */
const fieldPattern = new RegExp(
  [
    String.raw`哪一學年度修課${colon}`,
    String.raw`[ψλδΩηµμσρωΨ]\s*(?<greek>[^\s(（:：ψλδΩηµμσρωΨ]{1,12})${prompt}${colon}`,
    String.raw`(?<sym>[⊕▲★￡◆▼●■◎※☆♥♦])(?<symLabel>[^⊕▲★￡◆▼●■◎※☆♥♦\s]{1,12})\k<sym>${prompt}${colon}`,
    String.raw`【(?<bracket>[^】\s]{1,16})(?:】|(?=\s))${prompt}${colon}`,
    String.raw`(?<plain>課名|科號|老師|課本|課別|學分|涼度|甜度|難度|建議先修課程|課程內容\\?\/?簡介|上課方式|給分|評分方式|修課心得)\s*[:：]`
  ].join('|'),
  'gu'
);

/** Header lines of forwarded posts (`作者: … 標題: … 時間: Sun Jul 10 01:48:40 2016`). */
const headerPattern = /(?:作者|標題|時間|看板|站內|發信站|轉信站)\s*[:：]/gu;
const headerDate = /^\s*[A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d{1,2}\s+\d{1,2}:\d{2}:\d{2}\s+\d{4}/u;

function stripForwardHeaders(text: string) {
  if (!/^\s*作者\s*[:：]/u.test(text)) return text;
  // Everything up to the last header field is header; after a date only the body remains.
  const marks = [...text.matchAll(headerPattern)];
  const last = marks.at(-1);
  if (!last || last.index === undefined) return '';
  const rest = text.slice(last.index + last[0].length);
  const date = last[0].startsWith('時間') ? headerDate.exec(rest) : null;
  return date ? rest.slice(date[0].length) : '';
}

/** Board instructions some authors leave in the post (NTUcourse's 「若是通識課程評價…刪除這兩行」). */
const boilerplate = [
  /若是通識課程評價[^)）]*?刪除這兩行[)）]?/gu,
  /[(（]?是\s*[／/]\s*否\s*[／/]\s*其他條件[)）]?\s*[:：]?/gu
];

/** Score-like fields keep one-character values (`甜度：4`). */
const scoreLabels = new Set(['推薦', '甜度', '涼度', '難度', '學分']);

function labelFor(raw: string) {
  if (redundant.some((word) => raw.includes(word)) && !/對象|內容|方式/.test(raw)) return undefined;
  for (const [pattern, label] of shortLabels) if (pattern.test(raw)) return label;
  return raw.length <= 6 ? raw : raw.slice(0, 6);
}

function tidy(text: string) {
  return text.replace(/\s+/gu, ' ').replace(/^[\s:：,，、;；.。\-–—|/]+|[\s:：,，、;；\-–—|/]+$/gu, '').trim();
}

/**
 * The parts of an excerpt worth showing, without template prompts and fields that repeat the title.
 * Returns an empty array when nothing the author wrote is left (the list then shows the title only).
 */
export function excerptParts(excerpt: string | null | undefined): ExcerptPart[] {
  if (!excerpt) return [];
  let text = stripForwardHeaders(excerpt.replace(/\s+/gu, ' '));
  for (const pattern of boilerplate) text = text.replace(pattern, ' ');
  const parts: ExcerptPart[] = [];
  let label: string | null | undefined = null;
  let cursor = 0;
  const push = (value: string) => {
    const cleaned = tidy(value);
    // Single characters are stray markup (`n 哪一學年度…`) or a value cut off at 120 characters.
    if (label === undefined || cleaned.length === 0) return;
    if (cleaned.length < 2 && !(label && scoreLabels.has(label))) return;
    parts.push({ label, text: cleaned });
  };
  for (const match of text.matchAll(fieldPattern)) {
    push(text.slice(cursor, match.index));
    const groups = match.groups ?? {};
    const raw = groups.greek ?? groups.symLabel ?? groups.bracket ?? groups.plain ?? '學年度';
    label = labelFor(raw);
    cursor = (match.index ?? 0) + match[0].length;
  }
  push(text.slice(cursor));
  // The last field is cut at 120 characters; a few letters of it (「第一周：Wha」 is fine, 「Centr」 is not) add nothing.
  const last = parts.at(-1);
  if (parts.length > 1 && last && last.text.length < 6 && !(last.label && scoreLabels.has(last.label))) parts.pop();
  const length = parts.reduce((sum, part) => sum + part.text.length, 0);
  return length >= 4 ? parts : [];
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
