import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Offering } from '@unicourse/crawler-kit';

const archiveBase = 'https://curricul.site.nthu.edu.tw/var/file/208/1208/img/';
export type CourseArchive = { url: string; sheet: string };

function workbook(path: string, sheet: string): CourseArchive {
  return { url: `${archiveBase}${path}`, sheet };
}

export const catalogArchives: Readonly<Partial<Record<string, CourseArchive>>> = {
  '114-2': workbook('1657/11420courses_1150603.xlsx', '11420課程'),
  '114-1': workbook('1350/11410_course_data_fin.xlsx', '11410'),
  '113-1': workbook('1657/111all-113all_courses_redo.xlsx', '11310'),
  '113-2': workbook('1657/111all-113all_courses_redo.xlsx', '11320')
};

export const enrollmentArchives: Readonly<Partial<Record<string, CourseArchive>>> = {
  '115-1': workbook('1657/11510_course_1150924.xlsx', '11510'),
  '114-2': workbook('1350/11420_course_1150312.xlsx', '11420')
};

export async function readArchiveRows(payload: Buffer, sheet: string): Promise<unknown[]> {
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
  return normalizeArchiveRows(JSON.parse(Buffer.concat(output).toString()));
}

export function normalizeArchiveRows(rows: unknown): unknown[] {
  if (!Array.isArray(rows) || !rows.length || !Object.hasOwn(rows[0] ?? {}, '科號') || !Object.hasOwn(rows[0], '英文課名')) {
    throw new Error('NTHU: archived course sheet is empty or missing required columns');
  }
  return rows.map((row: Record<string, string>) => {
    const times = row['上課時間']?.split(/[,，\t\r\n]+/).map((time) => time.trim()).filter(Boolean) ?? [];
    const room = row['教室']?.trim();
    const schedule = times.length === 1 && room && !/[,，\t\r\n]/.test(room) ? `${room}\t${times[0]}` :
      [row['上課時間'], room].filter(Boolean).join('\n');
    const enrolled = ['停修後人數', '停修後人數(TBA)', '加退選後人數', '3/9加退選後人數', '加退選截止後人數(選課資料庫)']
      .map((column) => row[column]?.trim()).find((value) => value && /^\d+$/.test(value) && Number(value) <= 2_147_483_647);
    return {
      科號: row['科號'],
      課程中文名稱: row['中文課名']?.trim() || row['英文課名'],
      課程英文名稱: row['英文課名'],
      學分數: row['學分數'] ?? row['學分'],
      人限: row['人限'],
      選課人數: enrolled,
      系所全名: row['系所全名'] ?? row['系所名稱'] ?? row['開課系所'],
      教室與上課時間: schedule,
      授課教師: row['教師']?.replace(/[,，、;；]/g, '\n'),
      授課語言: row['語言'] ?? row['語言(1140327資料)'] ?? row['授課語言(加退選截止)'] ?? row['授課語言'],
      必選修說明: (row['列必選修系所班別'] ?? row['此課程已列入之系所班別'])?.replace(/[,，\r\n]+\s*/g, '\t'),
      通識類別: row['通識分類'],
      通識對象: row['通識對象'] ?? row['通識'],
      學分學程對應: row['學分學程對應'] ?? row['學分學程'],
      第一二專長對應: row['第一二專長對應'] ?? row['專長'],
      擋修說明: row['擋修說明'] ?? row['擋修'],
      備註: row['備註']
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
