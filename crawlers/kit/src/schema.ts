import { z } from 'zod';
import { isSchoolSlug } from './schools.js';

// Trimmed, non-empty, no NUL (PostgreSQL text cannot store it).
const text = z.string().trim().min(1).refine((value) => !value.includes('\u0000'), 'NUL is not allowed');
// Absolute http(s) URL without credentials; `https:example.edu` (no `//`) is rejected so it can never
// be rendered as a relative link.
const httpUrl = text.refine((value) => {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password;
  } catch {
    return false;
  }
}, 'absolute HTTP(S) URL without credentials');
const extraKey = z
  .string()
  .min(1)
  .refine((key) => key !== '__proto__' && !key.includes('\u0000'), 'invalid extra key');
// Same UTC instant format on both sides: YYYY-MM-DDTHH:MM:SS[.fff]Z with a real calendar date.
const utcInstant = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 19) === value.slice(0, 19);
}, 'expected an ISO-8601 UTC instant like 2026-11-26T12:00:00Z');

export const Requirement = z.enum(['required', 'elective', 'general', 'other']);

export const Meeting = z
  .object({
    day: z.number().int().min(1).max(7),
    periods: z.array(text).min(1),
    location: text.optional()
  })
  .strict();

export const Offering = z
  .object({
    sourceId: text,
    courseCode: text,
    classCode: text.optional(),
    title: text,
    titleEn: text.optional(),
    instructors: z.array(text),
    department: text.optional(),
    departmentCode: text.optional(),
    // numeric(5,2) in PostgreSQL: at most two decimals, below 1000.
    credits: z
      .number()
      .finite()
      .min(0)
      .max(999.99)
      .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, 'at most two decimals')
      .optional(),
    requirement: Requirement.optional(),
    requirementText: text.optional(),
    schedule: z.array(Meeting).optional(),
    scheduleText: text.optional(),
    capacity: z.number().int().min(0).max(2_147_483_647).optional(),
    // Students actually enrolled/registered as published by the school at crawl time (選課人數).
    enrolled: z.number().int().min(0).max(2_147_483_647).optional(),
    language: text.optional(),
    campus: text.optional(),
    grade: text.optional(),
    description: text.optional(),
    syllabusUrl: httpUrl.optional(),
    sourceUrl: httpUrl,
    notes: text.optional(),
    extra: z.record(extraKey, z.union([text, z.number().finite(), z.boolean(), z.null()])).optional()
  })
  .strict();

export const Snapshot = z
  .object({
    // Any slug in data/institutions.json.
    school: z.string().refine(isSchoolSlug, 'unknown school slug (see data/institutions.json)'),
    schoolName: text,
    schoolNameEn: text.optional(),
    term: z.string().regex(/^\d{3}-[123]$/, 'term must look like 115-1'),
    isDemo: z.boolean(),
    source: z
      .object({ name: text, url: httpUrl, fetchedAt: utcInstant })
      .strict()
      .optional(),
    offerings: z.array(Offering).min(1)
  })
  .strict()
  .superRefine((snapshot, ctx) => {
    const seen = new Set<string>();
    snapshot.offerings.forEach((offering, index) => {
      if (seen.has(offering.sourceId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['offerings', index, 'sourceId'],
          message: `duplicate sourceId ${offering.sourceId}`
        });
      }
      seen.add(offering.sourceId);
    });
  });

export type Snapshot = z.infer<typeof Snapshot>;
export type Offering = z.infer<typeof Offering>;
export type Meeting = z.infer<typeof Meeting>;
export type Requirement = z.infer<typeof Requirement>;

/** Map common Taiwanese 必選修 labels to the enum; returns undefined when unknown. */
export function requirementFromText(raw: string | undefined): Requirement | undefined {
  if (!raw) return undefined;
  const value = raw.trim();
  if (/通識|博雅|核心通識|General/i.test(value)) return 'general';
  if (/必修|必|Required|Compulsory/i.test(value)) return 'required';
  if (/選修|選|Elective/i.test(value)) return 'elective';
  return value ? 'other' : undefined;
}

/** Drop empty strings/undefined so optional fields are omitted rather than blank. */
export function compact<T extends Record<string, unknown>>(record: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    if (Array.isArray(value) && value.length === 0 && key !== 'instructors') continue;
    out[key] = typeof value === 'string' ? value.trim() : value;
  }
  return out as T;
}
