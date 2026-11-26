import { compact, loadHtml, requirementFromText, type Meeting, type Offering } from '@unicourse/crawler-kit';

export const sourceUrl = 'https://curricul.site.nthu.edu.tw/p/404-1208-111356.php?Lang=zh-tw#json';

const meetingDays = 'MTWRFSU';
const mappedColumns = new Set([
  '科號', '課程中文名稱', '課程英文名稱', '學分數', '人限', '授課語言', '備註',
  '教室與上課時間', '授課教師', '必選修說明', '選課人數', '系所全名'
]);

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

function decodedText(value: unknown): string | undefined {
  const raw = text(value);
  return raw && /&(?:#\d+|#x[\da-f]+|[a-z]+);/i.test(raw)
    ? text(loadHtml(raw.replaceAll('<', '&lt;'), undefined, false).root().text()) : raw;
}

function numeric(value: unknown, integer = false): number | undefined {
  const raw = typeof value === 'number' ? String(value) : text(value);
  if (!raw || !/^\d+(?:\.\d+)?$/.test(raw)) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && (!integer || Number.isSafeInteger(parsed)) ? parsed : undefined;
}

function withoutContactDetails(value: string | undefined): string | undefined {
  return value?.replace(/[\w.!#$%&'*+/=?^`{|}~-]+@[\w.-]+\.[a-z]{2,}/gi, '[redacted email]');
}

function parseSchedule(raw: string): Meeting[] {
  const meetings: Meeting[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const [room, codes] = line.includes('\t') ? line.split('\t') : ['', line];
    const times = codes.trim();
    if (!times || !/^(?:[MTWRFSU][1-9nabcd])+$/.test(times)) continue;
    const periodsByDay = new Map<number, string[]>();
    for (const [, weekday, period] of times.matchAll(/([MTWRFSU])([1-9nabcd])/g)) {
      const day = meetingDays.indexOf(weekday) + 1;
      const periods = periodsByDay.get(day) ?? [];
      periods.push(period);
      periodsByDay.set(day, periods);
    }
    for (const [day, periods] of periodsByDay) {
      meetings.push(compact({ day, periods, location: text(room) }));
    }
  }
  return meetings;
}

export function parseDepartments(html: string): Map<string, string> {
  const document = loadHtml(html);
  const table = document('table').filter((_, element) => {
    const header = document(element).find('thead').text();
    return header.includes('開課代碼Code') && header.includes('開課單位');
  }).first();
  if (!table.length) throw new Error('NTHU: offering department table not found');
  const departments = new Map<string, string>();
  table.find('tbody tr').each((_, row) => {
    const cells = document(row).children('td');
    const department = text(cells.eq(1).text());
    const code = text(cells.eq(2).text());
    if (department && code && /^[A-Z]{1,4}$/.test(code)) departments.set(code, department);
  });
  if (!departments.size) throw new Error('NTHU: offering department table is empty');
  return departments;
}

export function parseOfferings(payload: unknown, term: string, departments: ReadonlyMap<string, string>, listingUrl = sourceUrl): Offering[] {
  if (!Array.isArray(payload) || !payload.length) throw new Error('NTHU: expected a nonempty course list');
  const seen = new Set<string>();
  return payload.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`NTHU: invalid course row ${index + 1}`);
    }
    const row = entry as Record<string, unknown>;
    const sourceId = text(row['科號']);
    const title = decodedText(row['課程中文名稱']);
    const code = sourceId?.match(/^(\d{3})([123])0([A-Z]{1,4}) *(\d{4})(\d{2})$/);
    if (!sourceId || !code || !title) throw new Error(`NTHU: invalid identity or title in row ${index + 1}`);
    const [, year, semester, departmentCode, subject, classCode] = code;
    if (`${year}-${semester}` !== term) {
      throw new Error(`NTHU: source data is ${year}-${semester}, not requested term ${term}`);
    }
    if (seen.has(sourceId)) throw new Error(`NTHU: duplicate sourceId ${sourceId}`);
    seen.add(sourceId);

    const scheduleText = text(row['教室與上課時間']);
    const requirementText = text(row['必選修說明']);
    const generalEducation = text(row['通識類別']);
    const selected = text(row['選課人數']);
    const enrolled = selected && /^\d+$/.test(selected) && Number(selected) <= 2_147_483_647 ? Number(selected) : undefined;
    const requirements = new Set(requirementText?.split('\t').map(requirementFromText).filter(Boolean));
    const requirement = generalEducation ? requirementFromText('通識') :
      requirements.size === 1 ? requirements.values().next().value : undefined;
    const instructors = [...new Set(
      (text(row['授課教師']) ?? '').split(/\r?\n/).map((line) => {
        const [nameZh, nameEn] = line.split('\t');
        const name = decodedText(nameZh) ?? decodedText(nameEn);
        return name && !/(?:系|所|中心|學院)$/.test(name) ? name : undefined;
      }).filter((name): name is string => name !== undefined)
    )];

    const extra = Object.fromEntries(Object.entries(row).flatMap(([key, value]) => {
      if (mappedColumns.has(key)) return [];
      const scalar = typeof value === 'string' ? withoutContactDetails(text(value)) : value;
      return typeof scalar === 'string' || typeof scalar === 'boolean' ||
        (typeof scalar === 'number' && Number.isFinite(scalar)) || scalar === null ? [[key, scalar]] : [];
    }));

    return compact({
      sourceId,
      courseCode: `${departmentCode}${subject}`,
      classCode,
      title,
      titleEn: decodedText(row['課程英文名稱']),
      instructors,
      department: text(row['系所全名']) ?? departments.get(departmentCode),
      departmentCode,
      credits: numeric(row['學分數']),
      requirement,
      requirementText: requirementText ?? generalEducation,
      schedule: scheduleText ? parseSchedule(String(row['教室與上課時間'])) : undefined,
      scheduleText,
      capacity: numeric(row['人限'], true),
      enrolled,
      language: text(row['授課語言']),
      grade: /^[1-4]/.test(subject) ? subject[0] : undefined,
      sourceUrl: listingUrl,
      notes: withoutContactDetails(decodedText(row['備註'])),
      extra: Object.keys(extra).length ? extra : undefined
    });
  });
}
