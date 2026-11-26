import { EXCERPT_MAX, loadHtml, truncateCodePoints } from '@unicourse/crawler-kit';

export const PTT_ORIGIN = 'https://www.ptt.cc';

export interface ListEntry {
  url: string;
  title: string;
  author?: string;
  /** From the article id `M.<unix seconds>.A.xxx` (the list page only shows M/DD). */
  postedAt?: string;
  /** PTT nrec: pushes minus boos, capped by PTT at 爆 (100) and XX (-100). */
  pushScore: number;
}

export interface ListPage {
  entries: ListEntry[];
  /** Page number of the 上頁 link, if any. */
  previous?: number;
}

/** `爆` = 100+, `X1`…`X9` = -10…-90, `XX` = -100+, digits as is, blank = 0. */
export function parsePushScore(raw: string): number {
  const value = raw.trim();
  if (!value) return 0;
  if (value === '爆') return 100;
  if (value === 'XX') return -100;
  const boo = /^X(\d)$/.exec(value);
  if (boo) return -10 * Number(boo[1]);
  return /^\d+$/.test(value) ? Number(value) : 0;
}

/** Post time from a PTT article id such as `M.1783760423.A.F3A`. */
export function timeFromArticleId(url: string): string | undefined {
  const seconds = /\/M\.(\d{9,10})\.A\.[0-9A-F]{3}\.html$/.exec(url)?.[1];
  return seconds ? new Date(Number(seconds) * 1000).toISOString().replace('.000Z', 'Z') : undefined;
}

/** Parse a board list page (`/bbs/<board>/index<N>.html`). Deleted posts (no link) are skipped. */
export function parseListPage(html: string): ListPage {
  const $ = loadHtml(html);
  const entries: ListEntry[] = [];
  // Pinned posts come after `.r-list-sep`; they are 公告/板規 and repeat on every page.
  const listed = $('.r-list-sep').length ? $('.r-list-sep').prevAll('.r-ent').get().reverse() : $('.r-ent').get();
  for (const element of listed) {
    const row = $(element);
    const link = row.find('.title a');
    const href = link.attr('href');
    if (!href) continue;
    const url = new URL(href, PTT_ORIGIN).toString();
    const title = link.text().trim();
    if (!title) continue;
    const author = row.find('.meta .author').text().trim();
    entries.push({
      url,
      title,
      author: author && author !== '-' ? author : undefined,
      postedAt: timeFromArticleId(url),
      pushScore: parsePushScore(row.find('.nrec').text())
    });
  }
  const previousHref = $('.btn-group-paging a')
    .filter((_, a) => $(a).text().includes('上頁'))
    .attr('href');
  const previous = previousHref ? Number(/index(\d+)\.html/.exec(previousHref)?.[1]) : undefined;
  return { entries, previous: Number.isFinite(previous) ? previous : undefined };
}

export interface Article {
  author?: string;
  postedAt?: string;
  excerpt?: string;
  /** Exact pushes minus boos counted from the article page. */
  pushScore: number;
}

const MONTHS: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12
};

/** `Sat Jul 11 17:00:21 2026` (Asia/Taipei, UTC+8) to an ISO UTC instant. */
export function parsePttTime(raw: string): string | undefined {
  const match = /^\w{3}\s+(\w{3})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+(\d{4})$/.exec(raw.trim());
  if (!match) return undefined;
  const [, month, day, hour, minute, second, year] = match;
  if (!MONTHS[month]) return undefined;
  const utc = Date.UTC(Number(year), MONTHS[month] - 1, Number(day), Number(hour) - 8, Number(minute), Number(second));
  return Number.isFinite(utc) ? new Date(utc).toISOString().replace('.000Z', 'Z') : undefined;
}

const URL_PATTERN = /https?:\/\/\S+/g;

/**
 * Parse an article page. Only the header (author handle, time), the push tally and a short excerpt are kept:
 * the excerpt is the first `EXCERPT_MAX` code points of the body text, after dropping the header, `※` lines,
 * links (images are posted as links), the signature and every comment.
 */
export function parseArticle(html: string): Article {
  const $ = loadHtml(html);
  const main = $('#main-content').first();
  const meta = new Map<string, string>();
  main.find('.article-metaline, .article-metaline-right').each((_, element) => {
    meta.set($(element).find('.article-meta-tag').text().trim(), $(element).find('.article-meta-value').text().trim());
  });
  let pushScore = 0;
  main.find('.push .push-tag').each((_, element) => {
    const tag = $(element).text().trim();
    if (tag === '推') pushScore += 1;
    else if (tag === '噓') pushScore -= 1;
  });

  const body = main.clone();
  body.find('.article-metaline, .article-metaline-right, .push, .richcontent, img, script, style').remove();
  let content = body.text();
  // The signature and 發信站 footer start at the last `\n--\n` separator.
  const footer = content.lastIndexOf('\n--\n');
  if (footer >= 0) content = content.slice(0, footer);

  const all = content.split('\n').map((line) => line.trim()).filter(Boolean);
  // NTUcourse asks authors whether the post may be reused (※ 本文是否可提供臺大同學轉作其他非營利用途？).
  // The answer is the next line; when it is 否, no excerpt is kept at all.
  const question = all.findIndex((line) => line.includes('非營利用途'));
  const answer = question >= 0 ? all[question + 1] : undefined;
  const refused = answer != null && /^(否|不)/.test(answer);
  const lines = all.filter(
    (line, index) =>
      !line.startsWith('※') && !line.startsWith('◆ From:') && !(question >= 0 && index === question + 1 && /^(是|否|不|其他)/.test(line))
  );
  const text = lines
    .join(' ')
    .replace(URL_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const author = meta.get('作者')?.split(/\s+/)[0];
  return {
    author: author || undefined,
    postedAt: parsePttTime(meta.get('時間') ?? ''),
    excerpt: refused || !text ? undefined : truncateCodePoints(text, EXCERPT_MAX).trim(),
    pushScore
  };
}

export interface ParsedTitle {
  tag?: string;
  term?: string;
  courseTitle?: string;
  teachers?: string[];
}

// Common Taiwanese surnames (single and compound) to tell a teacher name from a course title.
const COMPOUND_SURNAMES = ['歐陽', '司馬', '上官', '諸葛', '東方', '皇甫', '尉遲', '公孫', '慕容', '令狐', '長孫', '張簡', '范姜', '周黃', '江謝', '張廖', '簡'];
const SURNAMES = new Set(
  (
    '陳林黃張李王吳劉蔡楊許鄭謝洪郭邱曾廖賴徐周葉蘇莊呂江何蕭羅高潘簡朱鍾游彭詹胡施沈余盧梁趙顏柯翁魏孫戴范方宋' +
    '鄧杜傅侯曹薛丁卓阮馬董温温唐藍蔣石古紀姚連馮歐程湯黃田康姜白汪鄒尤巫鐘黎涂龔嚴韓袁金童陸夏柳凃邵錢伍倪' +
    '溫于譚駱熊任甘秦顧毛章史官萬俞雷粘饒張閻武孟衛殷辜崔易喬賀寇郝龍段樊應褚聶滕齊鄔麥梅祝符包池左利文舒' +
    '花關車項季阿艾單晏'
  ).split('')
);

/** True when `token` looks like a personal name (2–4 CJK characters starting with a common surname). */
export function looksLikeName(token: string): boolean {
  const name = token.replace(/(老師|教授|助教|講師)$/, '');
  if (!/^[一-鿿]{2,4}$/.test(name)) return false;
  // Course titles usually end in one of these characters (微積分, 普通物理, 量子演算法, 統計學, 憲法).
  if (/[學論法史程課驗計術育理分化器構統析式語典讀作究題務策習譯寫觀念導概會]$/.test(name)) return false;
  if (COMPOUND_SURNAMES.some((surname) => name.startsWith(surname) && name.length >= 3)) return true;
  return SURNAMES.has(name[0]);
}

/** `請問何憲章老師投資學` → teacher 何憲章, course 投資學. */
function teacherMention(text: string): { teacher: string; course?: string } | undefined {
  const match = /([一-鿿]{2,4})(?:老師|教授)(?:的)?([一-鿿A-Za-z0-9（）()]{2,30})?/.exec(text);
  if (!match) return undefined;
  for (const length of [3, 2, 4]) {
    const teacher = match[1].slice(-length);
    if (teacher.length === length && looksLikeName(teacher)) return { teacher, course: match[2] };
  }
  return undefined;
}

function splitTeachers(token: string): string[] {
  return token
    .split(/[、,，&＆/／]|\s+和\s+/)
    .map((name) => name.trim().replace(/(老師|教授|助教|講師)$/, ''))
    .filter(Boolean);
}

/** `113-1`, `113-01`, `1131`, `1072`, `(100-1)` style terms; 100全 / 100上 are years with half markers. */
function parseTerm(token: string): string | undefined {
  const cleaned = token.replace(/^[（(]|[）)]$/g, '');
  const match = /^(\d{2,3})[-_.]?(0?[123])$/.exec(cleaned) ?? /^(\d{3})([123])$/.exec(cleaned);
  if (match) {
    const year = Number(match[1]);
    const term = Number(match[2]);
    if (year >= 80 && year <= 130) return `${String(year).padStart(3, '0')}-${term}`;
  }
  const half = /^(\d{2,3})[-_]?[（(]?(上|下|暑)[）)]?$/.exec(cleaned);
  if (half) {
    const year = Number(half[1]);
    if (year >= 80 && year <= 130) return `${String(year).padStart(3, '0')}-${{ 上: 1, 下: 2, 暑: 3 }[half[2] as '上' | '下' | '暑']}`;
  }
  return undefined;
}

const TERM_ONLY = /^[（(]?\d{2,3}([-_.]?0?[123]|[-_]?[（(]?(全|上|下|暑)[）)]?)?[）)]?$/;
const PERIODS = /^([0-9A-Za-z]{1,8}|暑修|夜間)$/;

/**
 * Parse common review title formats into term, course title and teachers:
 * `[評價] 113-1 普通物理 王小明`, `[評價] 114-2 郭昱瑩 社會科學研究方法`, `[心得] 應用機率模型 黃文瀚`,
 * `[心得] 通識/356/性別與親密關係/蔡素琴` (NCHU: department/periods/course/teacher).
 * The course/teacher split is a best guess; matching in `crates/ingest` also tries the swapped reading.
 */
export function parseReviewTitle(raw: string): ParsedTitle {
  let title = raw.replace(/\s+/g, ' ').trim();
  const forwarded = /^(Fw|Re|RE|FW):\s*/.exec(title);
  if (forwarded) title = title.slice(forwarded[0].length);
  const tagMatch = /^[[【［]([^\]】］]{1,6})[\]】］]\s*/.exec(title);
  const tag = tagMatch?.[1].trim() || undefined;
  if (tagMatch) title = title.slice(tagMatch[0].length);
  // A second bracket is a category, not part of the course: `[心得] [通識平台] 聖經與人生`.
  title = title.replace(/^[[【［][^\]】］]{1,8}[\]】］]\s*/, '');
  const result: ParsedTitle = { tag };
  if (!title) return result;

  // NCHU-Courses: 系所/節次/課名/老師 (a leading term is sometimes included).
  if (/\//.test(title) && title.split('/').length >= 3) {
    const parts = title.split('/').map((part) => part.trim()).filter(Boolean);
    const teacher = parts.at(-1)!;
    const course = parts.at(-2)!;
    for (const part of parts.slice(0, -2)) result.term ??= parseTerm(part);
    if (teacher && looksLikeName(splitTeachers(teacher)[0] ?? '')) {
      result.teachers = splitTeachers(teacher);
      result.courseTitle = course;
    } else {
      result.courseTitle = parts.filter((part) => !PERIODS.test(part)).at(-1);
    }
    return finish(result);
  }

  // A leading term glued to the next word: `106(全)梁明義 總體經濟學`.
  title = title.replace(/^(\d{3}(?:[-_.]?0?[123]|[-_]?[（(]?(?:全|上|下|暑)[）)]?)?)(?![全上下暑])(?=[\u4e00-\u9fff])/, '$1 ');
  // Dashes between course and teacher (`台灣史-楊凡逸`, `日文(一)－張巧螓`, `熱統計物理一--吳國安`) become
  // spaces; a hyphen between digits (113-1) or inside Latin text is kept.
  title = title
    .replace(/\s*(?:-{2,}|[－─—–])\s*/g, ' ')
    .replace(/\s+-\s+/g, ' ')
    .replace(/(?<=[\u4e00-\u9fff）)])-(?=[\u4e00-\u9fff])/g, ' ')
    .trim();
  const tokens = title.split(' ').filter(Boolean);
  const rest: string[] = [];
  for (const token of tokens) {
    if (!result.term && TERM_ONLY.test(token) && parseTerm(token)) {
      result.term = parseTerm(token);
      continue;
    }
    if (TERM_ONLY.test(token)) continue; // e.g. 100全
    rest.push(token);
  }
  // Drop department or school prefixes such as 電子所 / 清大 / 通識 / A4 (NTU general-education area).
  const words = rest.filter((token, index) => !(index < rest.length - 1 && /^([A-Z]\d|通識|[一-鿿]{1,3}(所|系|學程)|清大|交大|陽明|台大|臺大)$/.test(token)));
  const nameIndex = words.findIndex((token) => splitTeachers(token).length > 0 && splitTeachers(token).every(looksLikeName));
  const mention = nameIndex < 0 ? teacherMention(words.join(' ')) : undefined;
  if (mention) {
    result.teachers = [mention.teacher];
    result.courseTitle = mention.course;
  } else if (nameIndex >= 0 && words.length >= 2) {
    result.teachers = splitTeachers(words[nameIndex]);
    result.courseTitle = words.filter((_, index) => index !== nameIndex).join(' ');
  } else if (words.length >= 2 && /[、/]/.test(words.at(-1)!)) {
    result.teachers = splitTeachers(words.at(-1)!);
    result.courseTitle = words.slice(0, -1).join(' ');
  } else if (words.length === 2) {
    // Unknown order: the board convention (course first) wins; ingest also tries the swap.
    result.courseTitle = words[0];
    result.teachers = splitTeachers(words[1]);
  } else if (words.length) {
    result.courseTitle = words.join(' ');
  }
  return finish(result);
}

function finish(result: ParsedTitle): ParsedTitle {
  const courseTitle = result.courseTitle?.replace(/[?？!！~～]+$/g, '').trim();
  const teachers = result.teachers?.filter((name) => name.length <= 20 && !/^[（(].*[）)]$/.test(name));
  return {
    tag: result.tag,
    term: result.term,
    courseTitle: courseTitle && courseTitle.length <= 60 ? courseTitle : undefined,
    teachers: teachers?.length ? teachers : undefined
  };
}
