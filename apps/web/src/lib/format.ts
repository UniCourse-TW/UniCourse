import type { ExtraValue, Meeting, Offering, Requirement } from '@unicourse/api-client';

const taipei = new Intl.DateTimeFormat('zh-TW', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Taipei'
});

export function importedAt(value: string) {
  return taipei.format(new Date(value));
}

const taipeiShort = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Taipei', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});

export function shortImportedAt(value: string) {
  const parts = Object.fromEntries(taipeiShort.formatToParts(new Date(value)).map(({ type, value }) => [type, value]));
  return `${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

const requirementLabels: Record<Requirement, string> = {
  required: '必修',
  elective: '選修',
  general: '通識',
  other: '其他'
};

/** The school's own 必選修 wording when present, otherwise the coarse category. */
export function requirement(course: Pick<Offering, 'requirement' | 'requirementText'>) {
  return course.requirementText ?? (course.requirement ? requirementLabels[course.requirement] : undefined);
}

export function credits(value: number | null | undefined) {
  return value == null ? undefined : `${value} 學分`;
}

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];

export function meeting(value: Meeting) {
  return `週${weekdays[value.day - 1] ?? value.day} 第 ${value.periods.join('、')} 節`;
}

export function extraValue(value: ExtraValue) {
  if (value === null) return '—';
  if (typeof value === 'boolean') return value ? '是' : '否';
  return String(value);
}

/** Ingest only accepts absolute http(s) URLs; anything else is shown as text, never as a link. */
export function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}
