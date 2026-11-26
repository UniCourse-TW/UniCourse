export interface PlotPoint {
  x: number;
  y: number;
}

export function lineSegments(points: readonly (PlotPoint | null)[]): PlotPoint[][] {
  const segments: PlotPoint[][] = [];
  let segment: PlotPoint[] | undefined;
  for (const point of points) {
    if (point === null) {
      segment = undefined;
    } else {
      if (!segment) {
        segment = [];
        segments.push(segment);
      }
      segment.push(point);
    }
  }
  return segments;
}

export function linePath(points: readonly PlotPoint[]): string {
  return points.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
}

export function zeroBasedScale(values: readonly number[]) {
  let rawMin = 0;
  let rawMax = 0;
  for (const value of values) {
    rawMin = Math.min(rawMin, value);
    rawMax = Math.max(rawMax, value);
  }
  const interval = (rawMax - rawMin || 1) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(interval));
  const step = ([1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= interval) ?? 10) * magnitude;
  const tickSize = values.every(Number.isInteger) ? Math.max(1, Math.ceil(step)) : step;
  const first = Math.floor(rawMin / tickSize);
  const last = Math.max(first + 1, Math.ceil(rawMax / tickSize));
  return {
    min: first * tickSize,
    max: last * tickSize,
    ticks: Array.from({ length: last - first + 1 }, (_, index) => (first + index) * tickSize).reverse()
  };
}

export function spreadIndexes(length: number, limit: number): Set<number> {
  const size = Math.min(length, limit);
  return new Set(Array.from({ length: size }, (_, index) => Math.round(index * (length - 1) / Math.max(1, size - 1))));
}

export function barPercent(value: number | null, max: number): number {
  return value === null || !Number.isFinite(value) || !(max > 0) ? 0 : Math.min(100, Math.max(0, value / max * 100));
}
