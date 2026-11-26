import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Offering } from '@unicourse/crawler-kit';

const archiveBase = 'https://curricul.site.nthu.edu.tw/var/file/208/1208/img/';
/** `multiTerm` sheets hold several terms; only rows of the requested term are used. */
export type CourseArchive = { url: string; sheet: string; multiTerm?: boolean; ignoreEnglishTitle?: boolean };
type Row = Record<string, string>;

function workbook(path: string, sheet: string, multiTerm = false): CourseArchive {
  return { url: `${archiveBase}${path}`, sheet, ...(multiTerm ? { multiTerm } : {}) };
}

const archive104 = workbook('1657/104_107cousedata.xlsx', '104-107', true);
// From 105 on, this workbook's 英文課名 column belongs to other courses for roughly three quarters of the rows
// (checked against the 108–112 workbooks), so it is ignored; the Chinese title and credits agree with later years.
const archive105to107: CourseArchive = { ...archive104, ignoreEnglishTitle: true };
const archive108to110 = workbook('1657/108-110coursedata_n(3).xlsx', '108-110', true);
const archive111to112 = workbook('1657/111all-113all_courses_redo.xlsx', '111全及112全', true);

export const catalogArchives: Readonly<Partial<Record<string, CourseArchive>>> = {
  '114-2': workbook('1657/11420courses_1150603.xlsx', '11420課程'),
  '114-1': workbook('1350/11410_course_data_fin.xlsx', '11410'),
  '113-1': workbook('1657/111all-113all_courses_redo.xlsx', '11310'),
  '113-2': workbook('1657/111all-113all_courses_redo.xlsx', '11320'),
  '112-1': archive111to112,
  '112-2': archive111to112,
  '111-1': archive111to112,
  '111-2': archive111to112,
  '110-1': archive108to110,
  '110-2': archive108to110,
  '109-1': archive108to110,
  '109-2': archive108to110,
  '108-1': archive108to110,
  '108-2': archive108to110,
  '107-1': archive105to107,
  '107-2': archive105to107,
  '106-1': archive105to107,
  '106-2': archive105to107,
  '105-1': archive105to107,
  '105-2': archive105to107,
  '104-1': archive104,
  '104-2': archive104
};

/**
 * The 104–107 catalogue has no 必選修 column; the office publishes it in separate workbooks
 * (one row per offering and listed program for 105–106, one row per offering for 107).
 */
const requirement105to106 = workbook('1657/(redo)105-106_required_optional.xlsx', '重做1105,106', true);
const requirement107 = workbook('1657/107-110_required_optional.xlsx', '109全', true);

export const requirementArchives: Readonly<Partial<Record<string, CourseArchive>>> = {
  '107-1': requirement107,
  '107-2': requirement107,
  '106-1': requirement105to106,
  '106-2': requirement105to106,
  '105-1': requirement105to106,
  '105-2': requirement105to106
};

export const enrollmentArchives: Readonly<Partial<Record<string, CourseArchive>>> = {
  '115-1': workbook('1657/11510_course_1150924.xlsx', '11510'),
  '114-2': workbook('1350/11420_course_1150312.xlsx', '11420')
};

export async function readArchiveRows(payload: Buffer, sheet: string): Promise<Row[]> {
  const reader = fileURLToPath(new URL('./read-xlsx.py', import.meta.url));
  const child = spawn('python3', [reader, sheet]);
  const output: Buffer[] = [];
  const errors: Buffer[] = [];
  child.stdout.on('data', (chunk: Buffer) => output.push(chunk));
  child.stderr.on('data', (chunk: Buffer) => errors.push(chunk));
  await new Promise<void>((resolve, reject) => {
    child.on('error', reject);
    child.stdin.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code !== 'EPIPE') reject(error);
    });
    child.on('close', (status) => {
      if (status === 0) resolve();
      else reject(new Error(`NTHU: cannot read workbook sheet ${sheet}: ${Buffer.concat(errors).toString().trim()}`));
    });
    child.stdin.end(payload);
  });
  return JSON.parse(Buffer.concat(output).toString());
}

/**
 * Keeps the rows of one term from a multi-term sheet. Some 106–107 rows (former NUTE units) carry only a
 * four-digit serial instead of a full 科號 and repeat across terms, so they have no stable offering identity;
 * they are counted but never converted.
 */
export function selectTermRows(rows: unknown, term: string): { rows: Row[]; unidentified: number } {
  if (!Array.isArray(rows)) throw new Error('NTHU: archived sheet is not a row list');
  const [year, semester] = term.split('-');
  const prefix = `${year}${semester}0`;
  const selected: Row[] = [];
  let unidentified = 0;
  for (const row of rows as Row[]) {
    const id = (row['科號'] ?? '').replace(/\s/g, '');
    if (id.startsWith(prefix)) selected.push(row);
    else if (/^\d{4}$/.test(id) && row['學年']?.trim() === year && row['學期']?.trim() === `${semester}0`) unidentified += 1;
  }
  if (!selected.length) throw new Error(`NTHU: archived sheet has no rows for ${term}`);
  return { rows: selected, unidentified };
}

/** Organisation placeholders (program or unit names) that the archives list in the instructor column. */
const instructorPlaceholder = /(?:Program|Prog|專班)$|^[A-Z]{2,6}(?:[／/][A-Z]{2,6})*$/;

function cleanInstructors(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const names = value.split(/[,，、;；\r\n]+/)
    // Two-character names are padded with spaces in the older workbooks ("沈  琪").
    .map((name) => name.trim().replace(/(?<=\p{Script=Han})\s+(?=\p{Script=Han})/gu, ''))
    .filter((name) => name && !instructorPlaceholder.test(name));
  return [...new Set(names)].join('\n');
}

/** The 104–107 workbook lists one row per instructor; join rows that differ only in that column. */
function mergeInstructorRows(rows: Row[]): Row[] {
  const merged: Row[] = [];
  const byId = new Map<string, Row>();
  for (const row of rows) {
    const id = row['科號']?.replace(/\s/g, '');
    const previous = id ? byId.get(id) : undefined;
    const sameOffering = previous && Object.keys({ ...previous, ...row })
      .every((column) => column === '教師' || (previous[column] ?? '') === (row[column] ?? ''));
    if (previous && sameOffering && previous['教師'] !== row['教師']) {
      previous['教師'] = `${previous['教師']},${row['教師']}`;
      continue;
    }
    const copy = { ...row };
    merged.push(copy);
    if (id && !previous) byId.set(id, copy);
  }
  return merged;
}

/** Adds the 列必選修系所班別 column from the separate requirement workbooks, joined by full course/section identity. */
export function addArchivedRequirements(rows: Row[], requirementRows: Row[], url: string): void {
  const byId = new Map<string, string[]>();
  for (const row of requirementRows) {
    const id = row['科號']?.replace(/\s/g, '');
    const text = (row['列入之科系班别'] ?? row['access'])?.trim();
    if (!id || !text) continue;
    const texts = byId.get(id) ?? [];
    if (!texts.includes(text)) texts.push(text);
    byId.set(id, texts);
  }
  for (const row of rows) {
    const texts = byId.get(row['科號']?.replace(/\s/g, ''));
    if (!texts) continue;
    row['列必選修系所班別'] = texts.join('\t');
    row['必選修來源'] = url;
  }
}

export function normalizeArchiveRows(rows: unknown): unknown[] {
  if (!Array.isArray(rows) || !rows.length || !Object.hasOwn(rows[0] ?? {}, '科號') || !Object.hasOwn(rows[0], '英文課名')) {
    throw new Error('NTHU: archived course sheet is empty or missing required columns');
  }
  return mergeInstructorRows(rows as Row[]).map((row: Row) => {
    const times = row['上課時間']?.split(/[,，\t\r\n]+/).map((time) => time.trim()).filter(Boolean) ?? [];
    const room = row['教室']?.trim();
    const schedule = times.length === 1 && room && !/[,，\t\r\n]/.test(room) ? `${room}\t${times[0]}` :
      [row['上課時間'], room].filter(Boolean).join('\n');
    // 總人數 is the only count column of the 104–112 workbooks (the 111–112 sheet is dated after withdrawal).
    const enrolled = ['停修後人數', '停修後人數(TBA)', '加退選後人數', '3/9加退選後人數', '加退選截止後人數(選課資料庫)', '總人數']
      .map((column) => row[column]?.trim()).find((value) => value && /^\d+$/.test(value) && Number(value) <= 2_147_483_647);
    return {
      科號: row['科號'],
      課程中文名稱: (row['中文課名'] ?? row['課名'])?.trim() || row['英文課名'],
      課程英文名稱: row['英文課名'],
      學分數: row['學分數'] ?? row['學分'],
      人限: row['人限'],
      選課人數: enrolled,
      系所全名: row['系所全名'] ?? row['系所名稱'] ?? row['開課系所'] ?? row['開課單位'],
      教室與上課時間: schedule,
      授課教師: cleanInstructors(row['教師']),
      授課語言: row['語言'] ?? row['語言(1140327資料)'] ?? row['授課語言(加退選截止)'] ?? row['授課語言'],
      必選修說明: (row['列必選修系所班別'] ?? row['此課程已列入之系所班別'] ?? row['課程列入系所班別'])?.replace(/[,，\r\n]+\s*/g, '\t'),
      必選修來源: row['必選修來源'],
      通識類別: row['通識分類'],
      通識對象: row['通識對象'] ?? row['通識'],
      通識相關: row['通識相關'],
      領域別: row['領域別'],
      課程屬性: row['課程屬性'],
      學分學程對應: row['學分學程對應'] ?? row['學分學程'],
      第一二專長對應: row['第一二專長對應'] ?? row['專長'] ?? row['專長相關'],
      擋修說明: row['擋修說明'] ?? row['擋修'],
      備註: row['備註'] ?? row['備註欄']
    };
  });
}

export function addArchivedEnrollment(offerings: Offering[], archive: Offering[], url: string): void {
  const byId = new Map<string, number>();
  for (const { sourceId, enrolled } of archive) {
    if (enrolled === undefined) continue;
    const key = sourceId.replaceAll(' ', '');
    const previous = byId.get(key);
    if (previous !== undefined && previous !== enrolled) throw new Error(`NTHU: conflicting counts for ${sourceId}`);
    byId.set(key, enrolled);
  }
  for (const offering of offerings) {
    const enrolled = byId.get(offering.sourceId.replaceAll(' ', ''));
    if (offering.enrolled !== undefined || enrolled === undefined) continue;
    offering.enrolled = enrolled;
    offering.extra = { ...offering.extra, 選課人數來源: url };
  }
}
