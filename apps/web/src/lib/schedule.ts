import type { Offering } from '@unicourse/api-client';
import { meeting } from './format';

const dayCodes = 'MTWRFSU';

function decodeLine(line: string) {
  const pattern = '((?:[MTWRFSU][1-9nabcdzy]+)+)';
  const trailingRoom = line.match(new RegExp(`^${pattern}(?:(?:\\s+-?\\s*|\\s*-\\s*)(.+))?$`));
  const leadingRoom = trailingRoom ? null : line.match(new RegExp(`^(.+?)\\s+${pattern}$`));
  const code = trailingRoom?.[1] ?? leadingRoom?.[2];
  if (!code) return line;

  const byDay = new Map<number, Set<string>>();
  for (const [, weekday, periods] of code.matchAll(/([MTWRFSU])([1-9nabcdzy]+)/g)) {
    const day = dayCodes.indexOf(weekday) + 1;
    const existing = byDay.get(day) ?? new Set<string>();
    for (const period of periods) existing.add(period);
    byDay.set(day, existing);
  }

  const time = [...byDay].map(([day, periods]) => meeting({ day, periods: [...periods] })).join('；');
  const location = trailingRoom?.[2] ?? leadingRoom?.[1];
  return location ? `${time} · ${location}` : time;
}

export function scheduleLines(offering: Pick<Offering, 'schedule' | 'scheduleText'>) {
  const slots = offering.schedule?.filter(({ day, periods }) => day >= 1 && day <= 7 && periods.length);
  if (slots?.length) return slots.map((slot) => [meeting(slot), slot.location].filter(Boolean).join(' · '));
  return offering.scheduleText?.split(/[;；\r\n]+/).map((line) => line.trim()).filter(Boolean).map(decodeLine) ?? [];
}
