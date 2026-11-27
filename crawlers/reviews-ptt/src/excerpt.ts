import { EXCERPT_MAX } from '@unicourse/crawler-kit';

/**
 * Bumped whenever excerpt selection changes, so cached articles parsed by an older version are refetched
 * (the cache keeps parsed fields only, never the article text).
 */
export const EXCERPT_VERSION = 2;

/*
 * Excerpt selection. Most review posts follow a board template whose first lines are facts (teacher, credits,
 * textbook, grading), so the start of the body says nothing about the course. The excerpt is instead taken from
 * the free text of the template's opinion fields:
 *
 *   NTUcourse     `Ψ 總結`, `ω 其它(…)`, `Ω 私心推薦指數(以五分計)`   (Greek letter + label, hint in parentheses)
 *   NCTU-Teacher  `￠最後想說的話￠`, `￥其他￥（…）`                  (label wrapped in the same symbol)
 *   NCHU-Courses  `【心得/結語】`, `【注意事項】（…）`                 (label in 【】)
 *   NTHU_Course   `老師的喜好、個性：`, `補充:`                       (label and colon)
 *
 * A post without a recognisable template is free text and qualifies as a whole. Lines that are template facts
 * (`學分：3`, `涼度：★★★★`, `10% 期中考`, `90 ~ 100 3`) never count. When nothing qualifies, there is no excerpt.
 * docs/external-reviews.md (Excerpts) describes the order.
 */

interface Section {
  /** Normalised label, or undefined for text outside any template field. */
  label?: string;
  /** Lines with their indentation, which tells lines the editor wrapped apart (see `sentences`). */
  lines: string[];
}

// Template field labels that hold facts, not opinions. Matched against the start of a normalised label.
const FACT_LABEL =
  /^(哪一?學年|修課|學年|學期|年度|上課時|時段|時間|節次|課名|課程名|課號|科號|課程編|流水號|授課|老師|教師|教授|開課|系所|類別|課別|學分|必選修|選別|對象|用書|課本|教科書|教材|講義|參考書|大綱|課程大概|課程內容|內容|教了什麼|上課方式|上課地點|教室|評分|評量|成績|給分|考試|考題|作業|分數|涼度|甜度|難度|深度|負擔|推薦度|推薦指數|點名|出席|人數|修課人數|先修|建議先修|擋修|加簽|給加簽|英文授課|語言|前言|網址|連結|總成績|班上排名|成績分布|申請)/;
// Labels whose answers are opinions, best first.
const OPINION_LABELS: RegExp[] = [
  /總結|心得|結語|感想|總評|評價|感受|想法|想說|後記|閒聊|碎念|評論/,
  /建議|其[它他]|備註|補充|雜談|優缺|優點|缺點|個性|喜好|教學風格/,
  /推薦|注意/
];
// Descriptive fields whose answers are often opinions too (`μ 上課方式`: 老師講話很慢…); used last.
const STYLE_LABEL = /^(上課方式|教學方式|上課風格|上課情形|上課狀況)/;

const CJK = /[㐀-鿿豈-﫿]/u;
// Characters that decorate templates: stars, bullets, arrows, boxes, Greek letters used as field markers.
const SYMBOLS = /[★☆✩✪✰●○◎◉◆◇■□▲△▼▽►▸◄◀▶⊕⊙⊿※→←↑↓⇒＊*♦♥♠♣♪♫✔✓✗✘❤☺☻◐◑◒◓▪▫•·‧＃#￡￥＄＠@|｜＿_=＝~～─━═\-‐–—]/gu;
const STARS = /[★☆✩✪✰]/u;
const SENTENCE_END = /[。！？!?…]|～(?=\s|$)/u;

/** Normalise a template label: drop hints in parentheses, symbols and spaces. */
function normaliseLabel(raw: string): string {
  return raw
    .replace(/[（(][^）)]*[）)]?/gu, '')
    .replace(SYMBOLS, '')
    .replace(/[\s:：/／\\、?？]+/gu, '')
    .trim();
}

/** Opinion tier of a label (0 is best), or -1. */
function isOpinionLabel(label: string): number {
  // `建議先修課程` is a fact despite the keyword.
  for (const [tier, pattern] of OPINION_LABELS.entries()) {
    if (pattern.test(label) && !/^(建議先修|先修)/.test(label)) return tier;
  }
  return -1;
}

const isFactLabel = (label: string) => FACT_LABEL.test(label) && isOpinionLabel(label) < 0;

/** Text after a field label that is still the label's hint, e.g. `(若為多人合授請寫開課教師…)`. */
function stripHint(rest: string): { value: string; open: boolean } {
  const value = rest.trim();
  const opener = /^[（(]/u.exec(value);
  if (!opener) return { value, open: false };
  const close = value.search(/[）)]/u);
  if (close < 0) return { value: '', open: true };
  return { value: value.slice(close + 1).trim(), open: false };
}

interface Header {
  label: string;
  value: string;
  /** The hint in parentheses continues on the next line(s). */
  open: boolean;
  /** Owns the lines that follow (false for `課名：xxx` style single-line facts). */
  block: boolean;
}

const GREEK = 'αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ';
const GREEK_HEADER = new RegExp(`^[${GREEK}]\\s*([\\u3400-\\u9fff][^\\s（(:：]{0,15})\\s*(.*)$`, 'u');
const BRACKET_HEADER = /^[【〖［\[]([^】〗］\]]{1,20})[】〗］\]]\s*[:：]?\s*(.*)$/u;
// `⊕課名⊕`, `▲教授▲`, `￡教了什麼￡`: a label wrapped in the same non-ASCII symbol.
const WRAPPED_HEADER = /^([^\s\p{L}\p{N}\p{P}\x00-\x7f]|[★☆●○◎◆◇■□▲△▼▽⊕⊙※＊￡￥＄＠＃])\s*([\p{Script=Han}][^\s]{0,14}?)\s*\1\s*[:：]?\s*(.*)$/u;
// `★心得：`, `◎ 推薦：` and `心得：` / `課名: 微積分`: a short label and a colon.
const COLON_HEADER = /^[^\p{L}\p{N}\s]{0,2}\s*([\p{Script=Han}][\p{Script=Han}A-Za-z/／、（）()\s]{0,11}?)\s*[:：]\s*(.*)$/u;

// NTHU_Course asks `給加簽嗎?` without a colon.
const QUESTION_HEADER = /^(給加簽嗎|會加簽嗎|加簽嗎|有點名嗎|會點名嗎)\s*[?？]?\s*(.*)$/u;

function parseHeader(line: string): Header | undefined {
  const question = QUESTION_HEADER.exec(line);
  if (question) return { label: normaliseLabel(question[1]), value: question[2].trim(), open: false, block: true };
  for (const pattern of [GREEK_HEADER, BRACKET_HEADER]) {
    const match = pattern.exec(line);
    if (match) {
      const label = normaliseLabel(match[1]);
      if (!label || !CJK.test(label)) continue;
      const { value, open } = stripHint(match[2]);
      return { label, value, open, block: true };
    }
  }
  const wrapped = WRAPPED_HEADER.exec(line);
  if (wrapped) {
    const label = normaliseLabel(wrapped[2]);
    if (label && CJK.test(label)) {
      const { value, open } = stripHint(wrapped[3]);
      return { label, value, open, block: true };
    }
  }
  const colon = COLON_HEADER.exec(line);
  if (colon) {
    const label = normaliseLabel(colon[1]);
    // Only known labels start a field; `期中期末:` or `優點：…` inside an answer stay part of that answer.
    if (label && (isFactLabel(label) || isOpinionLabel(label) >= 0)) {
      const { value, open } = stripHint(colon[2]);
      // `心得：` owns the following lines; `學分：3` is a one-line fact, and so is `心得：很涼` when a fact follows.
      return { label, value, open, block: isOpinionLabel(label) >= 0 || !value };
    }
  }
  return undefined;
}

/** Split body lines into template fields. */
function sections(lines: string[]): { sections: Section[]; fields: number } {
  const result: Section[] = [{ lines: [] }];
  let fields = 0;
  // Lines left in which the hint of the last header may still close: `加簽習慣？嚴禁遲到等…)`.
  let hint = 0;
  // The last header was a one-line fact whose value may wrap onto the next lines (`課本：…` + `Edition: …`).
  let fact = false;
  // The previous line was a header with no value; a line that is only a hint in parentheses may follow.
  let bare = false;
  for (const raw of lines) {
    const line = raw.trim();
    // A value cut from its line keeps the line's width.
    const value = (text: string) => ' '.repeat(Math.max(0, width(raw) - width(text))) + text;
    if (!line) {
      if (fact) {
        fact = false;
        result.push({ lines: [] });
      }
      result.at(-1)!.lines.push('');
      continue;
    }
    if (bare && /^[（(][^）)]*[）)]$/u.test(line)) {
      bare = false;
      continue;
    }
    bare = false;
    if (hint > 0) {
      hint -= 1;
      const close = line.search(/[）)]/u);
      if (close >= 0 && !/[（(]/u.test(line.slice(0, close))) {
        hint = 0;
        const rest = line.slice(close + 1).trim();
        if (rest) result.at(-1)!.lines.push(value(rest));
        continue;
      }
    }
    const header = parseHeader(line);
    if (!header) {
      result.at(-1)!.lines.push(raw);
      continue;
    }
    fields += 1;
    hint = header.open ? 2 : 0;
    bare = !header.value;
    fact = !header.block;
    result.push({ label: header.label, lines: header.value ? [value(header.value)] : [] });
  }
  return { sections: result.filter((section) => section.lines.some((line) => line.trim())), fields };
}

/** True for lines that carry no opinion text: facts, ratings, numbers, dividers, forward headers. */
function isNoise(line: string): boolean {
  if (/^(作者|標題|時間|看板|站內|發信站|轉信站|來源|Origin|Path)\s*[:：]/u.test(line)) return true;
  const letters = line.match(/[\p{L}]/gu)?.length ?? 0;
  const cjk = line.match(/[\p{Script=Han}]/gu)?.length ?? 0;
  if (letters === 0) return true;
  // `90 ~ 100 3`, `10% 課堂出席`, `Midterm 20%`, `總人數 81`.
  if (/\d+(\.\d+)?\s*[%％]/u.test(line) && cjk < 12) return true;
  if ((line.match(/\d/gu)?.length ?? 0) > letters) return true;
  // `想修涼課 ★★★★★`, `涼度：★★★☆`: a rating with a short label.
  if (STARS.test(line) && cjk < 12) return true;
  // `課本：xxx`, `學分: 3` lines inside an answer.
  const labelled = /^([\p{Script=Han}A-Za-z/／、]{1,10})\s*[:：]\s*(.*)$/u.exec(line);
  if (labelled && isFactLabel(normaliseLabel(labelled[1]))) return true;
  // A lone sub-label such as `團體作業:`.
  if (/^[^。！？!?，,]{1,12}[:：]$/u.test(line)) return true;
  return false;
}

/** Display width in terminal cells, the unit PTT wraps lines at. */
const width = (text: string) => [...text].reduce((sum, char) => sum + (/[ᄀ-￿]/u.test(char) ? 2 : 1), 0);

/** Clean one line: template symbols, star ratings and links removed, spaces collapsed. */
function tidyLine(line: string): string {
  return line
    .replace(/https?:\/\/\S+/gu, ' ')
    .replace(/^[\s\p{P}\p{S}]*?(?=[\p{L}\p{N}（(「『"'])/u, '')
    .replace(/[★☆✩✪✰]+/gu, ' ')
    .replace(/[●○◎◉◆◇■□▲△▼▽►▸◄◀▶⊕⊙※→⇒♦♥♠♣♪♫✔✓✗✘▪▫•]+/gu, ' ')
    .replace(/[=＝_＿─━═]{2,}|-{3,}/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

interface Line {
  text: string;
  /** Width of the original line, indentation included. */
  width: number;
}

// Editors wrap at about 78 cells; the authors' own line breaks are usually shorter and uneven. A line at the
// limit was wrapped; a fairly long line only when a neighbour is fairly long too.
const WRAP_FULL = 74;
const WRAP_WIDTH = 66;

/**
 * Join the lines of one paragraph into sentences. A line ending in a comma continues on the next one; so does a
 * line the editor wrapped, recognised as a line at the width limit, or a long line next to another long line,
 * without final punctuation (a single long line among short ones is the author's own line break). Other line
 * breaks end a sentence.
 */
function sentences(lines: Line[]): string[] {
  const units: string[] = [];
  let current = '';
  let wrapped = false;
  for (const [index, { text: line, width: cells }] of lines.entries()) {
    // A numbered or bulleted item always starts a new sentence.
    const item = /^([（(]?\d{1,2}[.、)）]|[（(][一二三四五六七八九十][）)]|[一二三四五六七八九十][、.])/u.test(line);
    if (!current) current = line;
    else if (wrapped && !item) current += /[A-Za-z0-9]$/u.test(current) && /^[A-Za-z0-9]/u.test(line) ? ` ${line}` : line;
    else {
      units.push(current);
      current = line;
    }
    const last = line.at(-1) ?? '';
    const long = (other?: Line) => other != null && other.width >= WRAP_WIDTH;
    wrapped =
      /[，,、；;：:（(「『]/u.test(last) ||
      (!SENTENCE_END.test(last) &&
        (cells >= WRAP_FULL || (cells >= WRAP_WIDTH && (long(lines[index - 1]) || long(lines[index + 1])))));
  }
  if (current) units.push(current);
  // Split long units at sentence punctuation, keeping the punctuation.
  return units.flatMap((unit) => unit.match(/[^。！？!?…]+(?:[。！？!?…]+[」』）)]?|$)/gu) ?? [unit]).map((unit) => unit.trim()).filter(Boolean);
}

/** Take whole sentences up to `max` code points; a first sentence that is too long is cut at a clause. */
export function fitSentences(units: string[], max = EXCERPT_MAX): string | undefined {
  let excerpt = '';
  let used = 0;
  for (const unit of units) {
    const joined = !excerpt ? unit : /[。！？!?…，,、；;：:」』）)]$/u.test(excerpt) ? excerpt + unit : `${excerpt} ${unit}`;
    if ([...joined].length > max) break;
    excerpt = joined;
    used += 1;
  }
  // A clause that continues in the part left out (`…又蠻多驚喜的，`) is marked as cut.
  if (/[，,、；;：:]$/u.test(excerpt)) excerpt = `${excerpt.slice(0, -1)}${used < units.length ? '…' : ''}`;
  if (!excerpt && units.length) {
    const head = [...units[0]].slice(0, max - 1).join('');
    const clause = Math.max(...['，', ',', '、', '；', ';', '：', ' '].map((mark) => head.lastIndexOf(mark)));
    excerpt = `${(clause >= max / 3 ? head.slice(0, clause) : head).trim()}…`;
  }
  return excerpt || undefined;
}

/** Enough text to say something: `minLetters` letters (CJK characters count one each), not just `無`. */
function meaningful(text: string, minLetters: number): boolean {
  const letters = text.match(/[\p{L}]/gu)?.length ?? 0;
  return letters >= minLetters && !/^(無|沒有|同上|如上|略|N\/?A|none)$/iu.test(text);
}

function answer(section: Section, minLetters: number): string | undefined {
  // Paragraphs in order; the first with enough text wins. Dropped lines end a paragraph too, so text on both
  // sides of a fact is not joined.
  const paragraphs: Line[][] = [[]];
  for (const raw of section.lines) {
    const trimmed = raw.trim();
    const text = trimmed && !isNoise(trimmed) ? tidyLine(trimmed) : '';
    if (text && /^(無|沒有|略|同上|如上|以上|N\/?A)[。.!！]?$/iu.test(text)) continue;
    if (text) paragraphs.at(-1)!.push({ text, width: width(raw) });
    else if (paragraphs.at(-1)!.length) paragraphs.push([]);
  }
  for (const paragraph of paragraphs) {
    const excerpt = fitSentences(sentences(paragraph));
    if (excerpt && meaningful(excerpt, minLetters)) return excerpt;
  }
  return undefined;
}

/**
 * The most useful opinion text of a post, at most `EXCERPT_MAX` code points, or undefined when the post has
 * none (a template with empty opinion fields, a link-only post). `lines` are the body lines without the
 * article header, `※` lines, the signature and comments; their indentation is kept.
 */
export function selectExcerpt(lines: string[]): string | undefined {
  // A standalone `--` starts a signature (forwarded posts keep the original one inside the body).
  const end = lines.findIndex((line) => line.trim() === '--');
  const body = end >= 0 ? lines.slice(0, end) : lines;
  // Quoted text in replies (`: 原文`) is someone else's post.
  const own = body.map((line) => (/^[:：](\s|$)/u.test(line.trim()) ? '' : line.trimEnd()));
  const { sections: parts, fields } = sections(own);

  const ranked = parts
    .map((section, index) => ({ section, index, tier: section.label ? isOpinionLabel(section.label) : -1 }))
    .filter((entry) => entry.tier >= 0)
    .sort((a, b) => a.tier - b.tier || a.index - b.index);
  // Free text outside the template: the whole post when it has no template, else text after a run of
  // one-line facts (`課名：…` `老師：…` then the review). A line or two before the first field is an aside
  // (`手機排版抱歉`); a longer text there is a free-form review that happens to use 【subheadings】.
  const firstField = parts.findIndex((section) => section.label);
  const aside = (section: Section, index: number) =>
    fields >= 2 && index < firstField && section.lines.filter((line) => line.trim()).length <= 2;
  const free = parts.filter((section, index) => !section.label && !aside(section, index));
  const style = parts.filter((section) => section.label && STYLE_LABEL.test(section.label));
  const candidates = [...ranked.map((entry) => entry.section), ...free, ...style];
  // A substantial answer first (`一個字 修爆` loses to a later field with a real sentence), then any.
  for (const minLetters of [16, 8]) {
    for (const section of candidates) {
      const text = answer(section, minLetters);
      if (text) return text;
    }
  }
  return undefined;
}
