import { compact, loadHtml, requirementFromText, type Meeting, type Offering } from '@unicourse/crawler-kit';

export const BASE_URL = 'https://course.ncku.edu.tw/';
export const ENTRY_URL = 'https://course.ncku.edu.tw/index.php?c=qry_all';

export interface Department {
  code: string;
  name: string;
}

export interface EntryPage {
  departments: Department[];
  /** Anti-CSRF token the page embeds for its `result_init` AJAX call. */
  crypt: string;
}

/** Parse the 全部課程 entry page: department buttons (`li.btn_dept[data-dept]`) and the `crypt` token. */
export function parseEntryPage(html: string): EntryPage {
  const $ = loadHtml(html);
  const seen = new Map<string, Department>();
  $('li.btn_dept[data-dept]').each((_, el) => {
    const code = String($(el).attr('data-dept') ?? '').trim();
    if (!code || seen.has(code)) return;
    // Label looks like `(E7)建築系 ARCH`.
    const name = $(el).text().replace(/^\([^)]*\)/, '').trim();
    seen.set(code, { code, name });
  });
  const crypt = /['"]crypt['"]\s*:\s*['"]([^'"]+)['"]/.exec(html)?.[1];
  if (!crypt) throw new Error('crypt token not found on the NCKU entry page');
  return { departments: [...seen.values()], crypt };
}

/**
 * The result page hides decoy characters in `<span class="Q…">` elements whose class is
 * `display:none` in an inline stylesheet (and in HTML comments). Collect those class names.
 */
export function hiddenClasses(html: string): string[] {
  const out: string[] = [];
  for (const style of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    const css = style[1].replace(/\/\*[\s\S]*?\*\//g, '');
    for (const rule of css.matchAll(/\.([A-Za-z_][\w-]*)\s*\{([^}]*)\}/g)) {
      if (/display\s*:\s*none/i.test(rule[2])) out.push(rule[1]);
    }
  }
  return out;
}

/**
 * After a handful of queries per IP the site replaces results with "請輸入驗證碼繼續！" (enter a
 * CAPTCHA to continue). The crawler never solves or evades it; it only detects it to back off.
 */
export function isCaptchaPage(html: string): boolean {
  return /請輸入驗證碼/.test(html) && !/class=["']tr-title["']/.test(html);
}

/** NCKU period labels in daily order (N = noon break, A–E evening). */
export const PERIODS = ['0', '1', '2', '3', '4', 'N', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E'];

export interface TimeSlot extends Meeting {
  raw: string;
}

/** `[1]2~3 建築系館 5101` -> `{ day: 1, periods: ['2','3'], location: '建築系館 5101' }`; undefined when unparseable. */
export function parseTimeLine(line: string): TimeSlot | undefined {
  const match = /^\[([1-7])\]\s*([0-9A-EN])(?:\s*~\s*([0-9A-EN]))?(?:\s+(.*))?$/.exec(line.trim());
  if (!match) return undefined;
  const from = PERIODS.indexOf(match[2]);
  const to = match[3] ? PERIODS.indexOf(match[3]) : from;
  if (from < 0 || to < from) return undefined;
  const location = match[4]?.trim();
  return compact({ raw: line.trim(), day: Number(match[1]), periods: PERIODS.slice(from, to + 1), location }) as TimeSlot;
}

/** One `<tr>` of the result table, already de-obfuscated and split into its 10 columns. */
export interface RawRow {
  deptName?: string;
  deptSeq?: string;
  courseCode: string;
  classCode?: string;
  attrCode?: string;
  grade?: string;
  classGroup?: string;
  group?: string;
  category?: string;
  title?: string;
  courseMapUrl?: string;
  labels: string[];
  remark?: string;
  condition?: string;
  credits?: string;
  requirement?: string;
  instructors: string[];
  enrollment?: string;
  timeLines: string[];
  flexTime: boolean;
  syllabusUrl?: string;
  year?: string;
  semester?: string;
}

const clean = (value: string | undefined) => {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  return text ? text : undefined;
};

/** Parse the desktop result table of `index.php?c=qry_all&m=result&i=…` into raw rows. */
export function parseResultRows(html: string): RawRow[] {
  const hidden = hiddenClasses(html);
  const $ = loadHtml(html.replace(/<!--[\s\S]*?-->/g, ''));
  for (const cls of hidden) $(`.${cls}`).remove();
  // The page repeats every course in a mobile-only table; the desktop table has a <thead>.
  const table = $('table').filter((_, el) => $(el).find('thead th').length >= 9).first();
  const rows: RawRow[] = [];
  table.find('tbody > tr').each((_, tr) => {
    const td = $(tr).children('td');
    if (td.length < 10) return;
    const lines = (index: number) => {
      const cell = td.eq(index).clone();
      cell.find('br').replaceWith('\n');
      return cell
        .text()
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim());
    };

    const codeCell = td.eq(1).clone();
    const deptSeq = clean(codeCell.find('.dept_seq').text());
    codeCell.find('.dept_seq').remove();
    codeCell.find('br').replaceWith('\n');
    const [codeLine = '', attrLine = ''] = codeCell.text().split('\n').map((line) => line.trim());
    const [courseCode = '', classCode] = codeLine.split('-').map((part) => part.trim());

    const [grade, classGroup, group] = lines(2);

    const nameCell = td.eq(4);
    const courseName = nameCell.find('.course_name');
    const condition = clean(nameCell.find('.cond').text());
    const labels = nameCell
      .find('.label')
      .map((_, el) => clean($(el).text()))
      .get()
      .filter((label): label is string => Boolean(label));
    const remarkCell = nameCell.clone();
    remarkCell.find('.course_name, .cond, .label').remove();
    const remark = clean(remarkCell.text());

    const [credits, requirement] = lines(5);
    const instructors = lines(6)
      .map((name) => name.replace(/\*$/, '').trim())
      .filter(Boolean);

    const timeCell = td.eq(8);
    const flexTime = timeCell.find('.flex_time').length > 0;
    const timeLines = flexTime ? [] : lines(8).filter(Boolean);

    const linkCell = td.eq(9);
    const syllabusUrl = linkCell.find('a[href*="syllabus"]').attr('href')?.trim();
    const moodle = /moodle\('(\d+)','(\d)'/.exec(linkCell.html() ?? '');
    const syllabusTerm = syllabusUrl ? /syear=(\d+)&sem=(\d)/.exec(syllabusUrl) : null;

    rows.push(
      compact({
        deptName: clean(td.eq(0).text()),
        deptSeq,
        courseCode,
        classCode: clean(classCode),
        attrCode: clean(attrLine.replace(/^\[|\]$/g, '')),
        grade: clean(grade),
        classGroup: clean(classGroup),
        group: clean(group),
        category: clean(td.eq(3).text()),
        title: clean(courseName.text()),
        courseMapUrl: courseName.find('a').attr('href')?.trim(),
        labels,
        remark,
        condition,
        credits: clean(credits),
        requirement: clean(requirement),
        instructors,
        enrollment: clean(td.eq(7).text()),
        timeLines,
        flexTime,
        syllabusUrl,
        year: moodle?.[1] ?? syllabusTerm?.[1],
        semester: moodle?.[2] ?? syllabusTerm?.[2]
      }) as unknown as RawRow
    );
  });
  // compact() drops empty arrays; restore the always-present ones.
  for (const row of rows) {
    row.labels ??= [];
    row.instructors ??= [];
    row.timeLines ??= [];
  }
  return rows;
}

/** `建築系 ARCH` -> `建築系` (the trailing ASCII token is the English abbreviation). */
export function departmentName(raw: string | undefined): string | undefined {
  return clean(raw?.replace(/\s+[A-Z][A-Z0-9&.\-]*$/, ''));
}

/**
 * Group raw rows into offerings. A row with a 系號-序號 starts an offering; following rows with the
 * same 課程碼 and no title are extra components (實習 / 演習 sessions) of it. Rows without a 序號 but
 * with a title are cross-listings of another department's offering and are skipped here (they are
 * collected from their owning department's list).
 */
export function toOfferings(rows: RawRow[]): Offering[] {
  const offerings: Offering[] = [];
  let current:
    | { offering: Offering; courseCode: string; lines: string[]; meetings: Meeting[]; parsed: boolean }
    | undefined;
  const flush = () => {
    if (!current) return;
    current.offering.scheduleText = clean(current.lines.join('; '));
    // Only publish a timetable when every time line was understood.
    current.offering.schedule = current.parsed && current.meetings.length ? current.meetings : undefined;
    offerings.push(compact(current.offering) as Offering);
    current = undefined;
  };

  for (const row of rows) {
    if (row.deptSeq) {
      flush();
      if (!row.title) continue; // never seen; a title is required and is not invented
      const slots = row.timeLines.map(parseTimeLine);
      const [deptCode] = row.deptSeq.split('-');
      const credits = row.credits !== undefined ? Number(row.credits) : NaN;
      const [selected, remaining] = (row.enrollment ?? '').split('/').map((part) => part.trim());
      const extra = compact({
        屬性碼: row.attrCode,
        班別: row.classGroup,
        組別: row.group,
        類別: row.category,
        標籤: row.labels.length ? row.labels.join('、') : undefined,
        限選條件: row.condition,
        已選課人數: selected && /^\d+$/.test(selected) ? Number(selected) : selected,
        餘額: remaining && /^\d+$/.test(remaining) ? Number(remaining) : remaining,
        彈性上課時間: row.flexTime ? true : undefined,
        課程地圖: row.courseMapUrl
      } as Record<string, string | number | boolean | undefined>);
      current = {
        courseCode: row.courseCode,
        lines: [...row.timeLines],
        meetings: slots.filter((slot): slot is TimeSlot => Boolean(slot)).map(meeting),
        parsed: slots.every(Boolean),
        offering: {
          sourceId: row.deptSeq,
          courseCode: row.courseCode,
          classCode: row.classCode,
          title: row.title,
          instructors: [...row.instructors],
          department: departmentName(row.deptName),
          departmentCode: deptCode,
          credits: Number.isFinite(credits) ? credits : undefined,
          requirement: requirementFromText(row.requirement),
          requirementText: row.requirement,
          language: row.labels.includes('英語授課') ? '英語' : undefined,
          grade: row.grade,
          syllabusUrl: row.syllabusUrl,
          sourceUrl: row.syllabusUrl ?? ENTRY_URL,
          notes: row.remark,
          extra: Object.keys(extra).length ? (extra as Record<string, string | number | boolean>) : undefined
        }
      };
      continue;
    }
    if (current && !row.title && row.courseCode === current.courseCode) {
      // Additional component of the current offering (e.g. 實習). Sessions split into lettered
      // groups (組別 A/B…) are alternatives, so they only go into the text, not the timetable.
      const label = [row.category, row.group].filter(Boolean).join(' ');
      for (const line of row.timeLines) current.lines.push(label ? `${label}: ${line}` : line);
      if (!row.group) {
        const slots = row.timeLines.map(parseTimeLine);
        if (!slots.every(Boolean)) current.parsed = false;
        current.meetings.push(...slots.filter((slot): slot is TimeSlot => Boolean(slot)).map(meeting));
      }
      for (const name of row.instructors) {
        if (!current.offering.instructors.includes(name)) current.offering.instructors.push(name);
      }
      continue;
    }
    flush();
  }
  flush();
  return offerings;
}

function meeting(slot: TimeSlot): Meeting {
  return compact({ day: slot.day, periods: slot.periods, location: slot.location }) as Meeting;
}
