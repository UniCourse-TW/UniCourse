export const partialTermLabel = '只收錄部分班次';
export const partialShare = 1 / 3;
const partialMinUsual = 6;

export function usualSectionsForPartial(count: number, otherCounts: readonly number[]): number | null {
  const sorted = otherCounts.filter((other) => other > 0).sort((left, right) => left - right);
  if (count <= 0 || sorted.length < 2) return null;
  const middle = Math.floor(sorted.length / 2);
  const usual = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return usual >= partialMinUsual && count <= usual * partialShare ? Math.round(usual) : null;
}

export function partialTerms(sections: Iterable<readonly [string, number]>) {
  const terms = [...sections];
  return new Set(terms.filter(([term, count]) => usualSectionsForPartial(count,
    terms.flatMap(([other, sections]) => other === term ? [] : [sections])) !== null).map(([term]) => term));
}
