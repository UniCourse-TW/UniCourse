import { readFile, writeFile } from 'node:fs/promises';
import { Snapshot, type Offering } from './schema.js';

/** Value type of `Offering.extra`. */
export type ExtraValue = string | number | boolean | null;
export type ExtraRecord = Record<string, ExtraValue>;

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Decode the HTML entities school systems leak into JSON text (`&amp;`, `&#39;`, `&#x27;`, `&nbsp;`). */
export function decodeEntities(value: string): string {
  return value.replace(/&(#\d+|#x[\da-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** Remove C0 control characters except tab/newline, and DEL (several schools publish stray DEL bytes). */
export function stripControl(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
}

/** One-line text: NBSP/tabs/newlines collapse to single spaces. */
export function oneLineText(value: string): string {
  return value.replace(/[\s 　]+/g, ' ').trim();
}

/** Turn a small HTML fragment (`<br>`, `<div>`, `<p>`) into plain text lines. */
export function htmlToText(value: string): string {
  return decodeEntities(
    value
      .replace(/<\s*br\s*\/?\s*>/gi, '\n')
      .replace(/<\s*\/\s*(div|p|li|tr)\s*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
  )
    .split('\n')
    .map((line) => oneLineText(line))
    .filter(Boolean)
    .join('\n');
}

/**
 * Rename, drop or rewrite `extra` keys. `rules[key]` is either a new label (string), `null` to drop the key, or a
 * function returning `[label, value]` / `undefined` (drop). Keys without a rule are kept; keys that are already the
 * new label are left alone, so applying the same rules twice is a no-op.
 */
export function remapExtra(
  extra: ExtraRecord | undefined,
  rules: Record<string, string | null | ((value: ExtraValue, extra: ExtraRecord) => [string, ExtraValue] | undefined)>
): ExtraRecord | undefined {
  if (!extra) return undefined;
  const out: ExtraRecord = {};
  for (const [key, value] of Object.entries(extra)) {
    const rule = Object.hasOwn(rules, key) ? rules[key] : key;
    if (rule === null) continue;
    if (typeof rule === 'string') {
      if (!(rule in out)) out[rule] = value;
      continue;
    }
    const mapped = rule(value, extra);
    if (mapped && mapped[1] !== undefined && !(typeof mapped[1] === 'string' && !mapped[1].trim()) && !(mapped[0] in out)) {
      out[mapped[0]] = mapped[1];
    }
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Instructor entries that are not names: placeholders (`未定`, `待聘`, `TBA`) and bare staff numbers that some
 * systems print when the name is missing (`589142538`).
 */
export const PLACEHOLDER_INSTRUCTOR = /^(?:待聘|待定|未定|未指定|TBA|TBD|N\/?A|\d+)$/i;

/** Copy of `offering` without placeholder instructors (unchanged object when there are none). */
export function withoutPlaceholderInstructors(offering: Offering): Offering {
  const instructors = offering.instructors.filter((name) => !PLACEHOLDER_INSTRUCTOR.test(name.trim()));
  return instructors.length === offering.instructors.length ? offering : { ...offering, instructors };
}

/** Return a copy of `offering` with `extra` replaced (and removed when empty). */
export function withExtra(offering: Offering, extra: ExtraRecord | undefined): Offering {
  const { extra: _old, ...rest } = offering;
  return extra && Object.keys(extra).length ? { ...rest, extra } : (rest as Offering);
}

/**
 * Re-run a crawler's offering-level cleanup over snapshots that were written by an older crawler version (the
 * crawlers keep no raw responses). Each file is validated with the shared schema and rewritten in place in the
 * same format `runCrawler` writes. Returns the number of offerings changed per file.
 */
export async function retidySnapshots(school: string, tidy: (offering: Offering) => Offering, paths: string[]) {
  const results: { path: string; offerings: number; changed: number }[] = [];
  for (const path of paths.filter((arg) => arg !== '--')) {
    const before = JSON.parse(await readFile(path, 'utf8')) as Snapshot;
    if (before.school !== school) throw new Error(`${path}: school ${before.school}, expected ${school}`);
    let changed = 0;
    const offerings = before.offerings.map((offering) => {
      const after = tidy(offering);
      if (JSON.stringify(after) !== JSON.stringify(offering)) changed += 1;
      return after;
    });
    const snapshot = Snapshot.parse({ ...before, offerings });
    if (changed) await writeFile(path, JSON.stringify(snapshot, null, 2) + '\n');
    results.push({ path, offerings: offerings.length, changed });
    console.error(`[${school} retidy] ${path}: ${changed}/${offerings.length} offerings changed`);
  }
  return results;
}
