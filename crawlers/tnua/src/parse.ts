import { compact, loadHtml, requirementFromText, type Meeting, type Offering } from '@unicourse/crawler-kit';

export const advancedUrl = 'https://selcrs1.tnua.edu.tw/CourseSearch/AdvancedSearch.aspx';

export function parseFilters(html: string) {
  const $ = loadHtml(html);
  const terms = new Map<string, string>();
  for (const option of $('#Main_adsearch_yearterm_selector option').toArray()) {
    const value = $(option).attr('value');
    const term = $(option).text().trim().replace(/暑修$/, '3');
    if (value && /^\d{3}-[123]$/.test(term)) terms.set(term, value);
  }
  const departments = $('#Main_adsearch_semester_selector option[value!=""]').map((_, option) => {
    const code = $(option).attr('value')?.trim();
    if (!code) throw new Error('TNUA: missing department code');
    const label = $(option).text().trim();
    const name = label.startsWith(`${code}-`) ? label.slice(code.length + 1).trim() : label;
    if (!name) throw new Error(`TNUA: missing department name for ${code}`);
    return { code, name };
  }).get();
  if (!terms.size || !departments.length) throw new Error('TNUA: missing advanced search filters');
  return { terms, departments };
}

const courseKeys = ['Year', 'Term', 'CourseID', 'CourseName', 'Teacher', 'Field', 'Type', 'Credit',
  'Sect', 'UpLimit', 'Remark', 'Room', 'SumSelected', 'DepName', 'Target'] as const;
type CourseRow = Record<typeof courseKeys[number], string>;

export function parseSearch(payload: unknown): CourseRow[] {
  const result = (payload as { d?: { Status?: number; ReturnDatas?: { Class?: unknown } } })?.d;
  if (result?.Status === 2) return [];
  const rows = result?.ReturnDatas?.Class;
  if (result?.Status !== 0 || !Array.isArray(rows) || !rows.length) {
    throw new Error(`TNUA: invalid search result (status ${result?.Status ?? 'missing'})`);
  }
  for (const row of rows) {
    if (!row || !courseKeys.every((key) => typeof row[key] === 'string')) {
      throw new Error('TNUA: unexpected course row');
    }
  }
  return rows as CourseRow[];
}

function parseSchedule(time: string, room: string): Meeting[] {
  const meetings: Meeting[] = [];
  const normalized = time.normalize('NFKC');
  const pattern = /\(([一二三四五六日七])\)\s*([\dA-Z]+(?:\s*,\s*[\dA-Z]+)*)/gy;
  let end = 0;
  for (const match of normalized.matchAll(pattern)) {
    end = match.index + match[0].length;
    meetings.push(compact({
      day: match[1] === '七' ? 7 : '一二三四五六日'.indexOf(match[1]) + 1,
      periods: match[2].split(',').map((period) => period.trim()),
      location: room && !/另定|[,、;；\n]/.test(room) ? room : undefined
    }));
  }
  return end === normalized.length ? meetings : [];
}

function decimal(value: string): number | undefined {
  return /^\d+(?:\.\d+)?$/.test(value.trim()) ? Number(value) : undefined;
}

function redactContact(text: string): string {
  return text.replace(/[\w.+-]+@[\w.-]+\.[A-Z]{2,}/gi, '[電子郵件略]')
    .replace(/(?<!\d)(?:\+886[ -]?9\d|09\d{2})[ -]?\d{3}[ -]?\d{3}(?!\d)/g, '[手機號碼略]');
}

export function toOffering(row: CourseRow, sourceTerm: string, department: { code: string; name?: string }): Offering {
  const sourceId = row.CourseID.trim();
  const [title, titleEn] = row.CourseName.split(/\s*&nbsp;?\s*|\u00a0/, 2);
  if (row.Year + row.Term !== sourceTerm || !sourceId.startsWith(`${sourceTerm}-`) || !title?.trim()) {
    throw new Error(`TNUA: invalid identity for ${sourceId} in ${sourceTerm}`);
  }
  const requirementText = row.Type.trim();
  const sect = row.Sect.trim();
  const room = row.Room.trim();
  const capacity = row.UpLimit.trim();
  const selected = row.SumSelected.trim();
  const [target, duration] = row.Target.split(/\s*&nbsp;?\s*|\u00a0/, 2);
  return compact({
    sourceId,
    courseCode: sourceId,
    title,
    titleEn,
    instructors: row.Teacher.split(/[,，、;；\r\n]+/).map((name) => name.trim()).filter(Boolean),
    department: department.name,
    departmentCode: department.code,
    credits: decimal(row.Credit),
    requirement: requirementFromText(requirementText),
    requirementText,
    schedule: parseSchedule(sect, room),
    scheduleText: [sect, room].filter(Boolean).join(' / '),
    capacity: /^\d+$/.test(capacity) ? Number(capacity) : undefined,
    enrolled: /^\d+$/.test(selected) && Number(selected) <= 2_147_483_647 ? Number(selected) : undefined,
    sourceUrl: advancedUrl,
    notes: redactContact(row.Remark),
    extra: compact({ 領域: row.Field, 選課對象: target, 學期別: duration,
      上限: /^\d+$/.test(capacity) ? '' : capacity })
  });
}

export function parseIntroduction(payload: unknown): string | undefined {
  const intros = (payload as { d?: { Introduction?: string }[] | null })?.d;
  if (intros === null || (Array.isArray(intros) && !intros.length)) return undefined;
  if (!Array.isArray(intros)) throw new Error('TNUA: invalid introduction result');
  const descriptions = new Set<string>();
  for (const intro of intros) {
    if (typeof intro.Introduction !== 'string') throw new Error('TNUA: invalid introduction text');
    for (const entry of intro.Introduction.split('$$$')) {
      const $ = loadHtml(entry.replace(/<br\s*\/?\s*>|<\/p>/gi, '\n'));
      $('script, style').remove();
      const text = $.root().text();
      const description = text.match(/(?:課程簡介\s*(?:Course Description)?|Course Description)\s*[:：]?\s*([\s\S]*?)(?=\n\s*(?:課程目標|評分標準|每週授課進度|上課教材|參考書目)|$)/i)?.[1].trim();
      if (description) descriptions.add(redactContact(description));
    }
  }
  return [...descriptions].join('\n\n') || undefined;
}
