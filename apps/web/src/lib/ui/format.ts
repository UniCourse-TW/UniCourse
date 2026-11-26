const numberFormat = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 12 });

export const missingValue = '—';

export function finiteValue(value: number | null): number | null {
  return value !== null && Number.isFinite(value) ? value : null;
}

export function displayValue(value: string | number | null | undefined): string {
  if (typeof value === 'number') return Number.isFinite(value) ? numberFormat.format(value) : missingValue;
  return value ?? missingValue;
}

export function changeQuery(url: URL, update: (params: URLSearchParams) => void): string {
  const target = new URL(url);
  update(target.searchParams);
  return `${target.pathname}${target.search}${target.hash}`;
}
