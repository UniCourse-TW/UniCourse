import { compact, loadHtml, requirementFromText, type Meeting, type Offering } from '@unicourse/crawler-kit';

export const sourceUrl = 'https://timetable.nycu.edu.tw/';

const weekdays = 'MTWRFSU';
const campuses = new Map([
  ['YM', '台北陽明校區'], ['BA', '新竹博愛校區'], ['GF', '新竹光復校區'],
  ['BM', '台北北門校區'], ['GR', '台南歸仁校區'], ['LJ', '新竹六家校區'], ['KS', '高雄校區']
]);
const mappedColumns = new Set([
  'acy', 'sem', 'cos_id', 'cos_code', 'cos_cname', 'cos_ename', 'cos_credit', 'cos_type',
  'cos_time', 'num_limit', 'reg_num', 'dep_id', 'dep_cname', 'teacher', 'memo', 'TURL', 'URL'
]);

export type CourseCandidate = { offering: Offering; primary: boolean };

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

function numeric(value: unknown): number | undefined {
  const raw = typeof value === 'number' ? String(value) : text(value);
  if (!raw || !/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(raw)) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function publicUrl(value: unknown): string | undefined {
  try {
    const url = new URL(text(value) ?? '');
    if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return url.href;
  } catch {
    return undefined;
  }
}

function withoutContactDetails(value: string | undefined): string | undefined {
  return value?.replace(/[\w.!#$%&'*+/=?^`{|}~-]+@[\w.-]+\.[a-z]{2,}/gi, '[redacted email]');
}

function parseNotes(value: unknown): string | undefined {
  const raw = text(value);
  const notes = raw && /&(?:#\d+|#x[\da-f]+|[a-z]+);/i.test(raw)
    ? text(loadHtml(raw.replaceAll('<', '&lt;'), undefined, false).root().text()) : raw;
  return withoutContactDetails(notes);
}

function parseGrade(notes: string | undefined): string | undefined {
  const label = notes?.match(/主開\s*[:：]?\s*([1-7一二三四五六七])\s*年級/)?.[1];
  return label && (/^[1-7]$/.test(label) ? label : String('一二三四五六七'.indexOf(label) + 1));
}

export function parseSchedule(raw: string): { schedule: Meeting[]; campus?: string } {
  const schedule: Meeting[] = [];
  const campusCodes = new Set(Array.from(raw.matchAll(/\[([A-Z]{2})\]/g), ([, code]) => code));

  for (const entry of raw.split(/[,，;；\r\n]+/)) {
    const slot = entry.trim().match(/^((?:[MTWRFSU][1-9nabcdzy]+)+)(?:\s*-\s*(.*))?$/);
    if (!slot) continue;
    const [, times, room] = slot;
    const location = text(room?.replace(/\[(YM|BA|GF|BM|GR|LJ|KS)\]\s*$/, ''));
    const byDay = new Map<number, string[]>();
    for (const [, weekday, periods] of times.matchAll(/([MTWRFSU])([1-9nabcdzy]+)/g)) {
      const day = weekdays.indexOf(weekday) + 1;
      byDay.set(day, [...(byDay.get(day) ?? []), ...periods]);
    }
    for (const [day, periods] of byDay) schedule.push(compact({ day, periods, location }));
  }

  return {
    schedule,
    campus: campusCodes.size === 1 ? campuses.get(campusCodes.values().next().value ?? '') : undefined
  };
}

export function parseDescription(payload: unknown): string | undefined {
  const outline = text(record(payload)?.crs_outline);
  if (!outline) return undefined;
  const document = loadHtml(outline.replace(/<br\s*\/?>|<\/p>/gi, '\n'), undefined, false);
  document('script, style').remove();
  return withoutContactDetails(text(document.root().text()));
}

function syllabusUrl(year: string, semester: string, id: string, kind: unknown): string | undefined {
  const route = kind === 'file' ? 'crsoutlinefile' : kind === 'data' ? 'crsoutline' : undefined;
  return route ? `${sourceUrl}?${new URLSearchParams({
    r: `main/${route}`, Acy: year, Sem: semester, CrsNo: id, lang: 'zh-tw'
  }).toString().replace('%2F', '/')}` : undefined;
}

function metadata(value: unknown): string | undefined {
  const items = record(value);
  if (!items) return undefined;
  const nonempty = Object.fromEntries(Object.entries(items).filter(([key]) => key.trim()));
  return Object.keys(nonempty).length ? withoutContactDetails(JSON.stringify(nonempty)) : undefined;
}

export function parseOfferings(payload: unknown, year: string, semester: string): CourseCandidate[] {
  if (payload === '' || (Array.isArray(payload) && payload.length === 0)) return [];
  const buckets = record(payload);
  if (!buckets) throw new Error('NYCU: invalid department course response');
  const candidates: CourseCandidate[] = [];
  for (const [bucketId, entry] of Object.entries(buckets)) {
    const bucket = record(entry);
    if (!bucket || (!Object.hasOwn(bucket, '1') && !Object.hasOwn(bucket, '2'))) {
      throw new Error(`NYCU: invalid course bucket ${bucketId}`);
    }
    for (const section of ['1', '2']) {
      const sectionData = bucket[section];
      if (sectionData === undefined || (Array.isArray(sectionData) && !sectionData.length)) continue;
      const rows = record(sectionData);
      if (!rows) throw new Error(`NYCU: invalid course section ${bucketId}/${section}`);
      for (const [key, value] of Object.entries(rows)) {
        const row = record(value);
        const sourceId = text(row?.cos_id);
        const courseCode = text(row?.cos_code);
        const title = text(row?.cos_cname);
        if (!row || !sourceId || !courseCode || !title) throw new Error(`NYCU: invalid identity or title in ${key}`);
        if (row.acy !== year || row.sem !== semester) throw new Error(`NYCU: unexpected term in ${key}`);

        const syllabus = syllabusUrl(year, semester, sourceId, row.crsoutline_type);
        const scheduleText = text(row.cos_time);
        const timing = scheduleText ? parseSchedule(scheduleText) : undefined;
        const requirementText = text(row.cos_type);
        const rawCapacity = numeric(row.num_limit);
        const registered = typeof row.reg_num === 'number' ? String(row.reg_num) : text(row.reg_num);
        const enrolled = registered && /^\d+$/.test(registered) && Number(registered) <= 2_147_483_647
          ? Number(registered) : undefined;
        const rawLanguage = record(record(bucket.language)?.[key]);
        const url = publicUrl(row.URL);
        const notes = parseNotes(row.memo);
        const extra = Object.fromEntries(Object.entries(row).flatMap(([field, raw]) => {
          if (mappedColumns.has(field)) return [];
          const scalar = typeof raw === 'string' ? withoutContactDetails(text(raw)) : raw;
          return typeof scalar === 'string' || typeof scalar === 'boolean' ||
            (typeof scalar === 'number' && Number.isFinite(scalar)) || scalar === null ? [[field, scalar]] : [];
        }));
        const brief = metadata(record(bucket.brief)?.[key]);
        const costype = metadata(record(bucket.costype)?.[key]);
        if (brief) extra.brief = brief;
        if (costype) extra.costype = costype;
        if (url) extra.URL = url;

        candidates.push({
          primary: section === '1',
          offering: compact({
            sourceId,
            courseCode,
            title,
            titleEn: text(row.cos_ename),
            instructors: [...new Set((text(row.teacher) ?? '').split(/[、；;\r\n]+/).map(text)
              .filter((name): name is string => name !== undefined))],
            department: text(row.dep_cname) ?? text(bucket.dep_cname),
            departmentCode: text(row.dep_id),
            credits: numeric(row.cos_credit),
            requirement: requirementFromText(requirementText),
            requirementText,
            schedule: timing?.schedule,
            scheduleText,
            capacity: rawCapacity !== undefined && Number.isInteger(rawCapacity) && rawCapacity <= 999 ? rawCapacity : undefined,
            enrolled,
            language: text(rawLanguage?.['授課語言代碼']),
            campus: timing?.campus,
            grade: parseGrade(notes),
            syllabusUrl: syllabus,
            sourceUrl: syllabus ?? sourceUrl,
            notes,
            extra: Object.keys(extra).length ? extra : undefined
          })
        });
      }
    }
  }
  return candidates;
}

export function preferredCourse(previous: CourseCandidate | undefined, current: CourseCandidate): CourseCandidate {
  if (!previous) return current;
  if (previous.offering.courseCode !== current.offering.courseCode) {
    throw new Error(`NYCU: conflicting permanent codes for ${current.offering.sourceId}`);
  }
  return current.primary && !previous.primary ? current : previous;
}
