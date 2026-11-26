import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Offering } from '@unicourse/crawler-kit';
import { parseDescription, parseOfferings, parseSchedule, preferredCourse } from './parse.ts';

const sample = JSON.parse(readFileSync(new URL('./samples/department.json', import.meta.url), 'utf8'));
const candidates = parseOfferings(sample, '115', '1');

test('maps timetable identities, staff, credits, select type and syllabus link', () => {
  const candidate = candidates.find(({ offering, primary }) => offering.sourceId === '515611' && primary);
  assert.ok(candidate);
  const { offering } = candidate;
  assert.equal(offering.courseCode, 'CSCS20012');
  assert.equal(offering.department, '資訊工程學系');
  assert.equal(offering.departmentCode, '550');
  assert.deepEqual(offering.instructors, ['顏羽君', '張永儒']);
  assert.equal(offering.credits, 3);
  assert.equal(offering.capacity, 50);
  assert.equal(offering.enrolled, 19);
  assert.equal(offering.requirement, 'elective');
  assert.equal(offering.language, 'zh-tw');
  assert.equal(offering.scheduleText, 'T56-ED301[GF]');
  assert.equal(offering.campus, '新竹光復校區');
  assert.equal(offering.grade, '4');
  assert.match(offering.notes ?? '', /3&4年級/);
  assert.equal(offering.sourceUrl, 'https://timetable.nycu.edu.tw/?r=main/crsoutline&Acy=115&Sem=1&CrsNo=515611&lang=zh-tw');
  assert.equal(offering.syllabusUrl, offering.sourceUrl);
  assert.equal(offering.extra?.cos_hours, '3.00');
  assert.equal(offering.extra?.TURL, undefined);
  Offering.array().parse(candidates.map(({ offering }) => offering));
});

test('ignores hidden registered counts and preserves zero', () => {
  const payload = structuredClone(sample) as Record<string, { '1': Record<string, { cos_id: string; reg_num: string }> }>;
  const row = Object.values(payload).flatMap((bucket) => Object.values(bucket['1'])).find((row) => row.cos_id === '515611')!;
  const enrolled = () => parseOfferings(payload, '115', '1')
    .find(({ primary, offering }) => primary && offering.sourceId === '515611')?.offering.enrolled;
  row.reg_num = '-999';
  assert.equal(enrolled(), undefined);
  row.reg_num = '0';
  assert.equal(enrolled(), 0);
});

test('parses leading-dot fractional and zero credits in the live export', () => {
  const medicine = JSON.parse(readFileSync(new URL('./samples/medical-department.json', import.meta.url), 'utf8'));
  const rows = parseOfferings(medicine, '115', '1').map(({ offering }) => offering);
  assert.equal(rows.find(({ sourceId }) => sourceId === '110063')?.credits, 0.3);
  assert.equal(rows.find(({ sourceId }) => sourceId === '110068')?.credits, 0);
});

test('keeps the primary occurrence independently of the order of queries', () => {
  const [primary, secondary] = candidates.filter(({ offering }) => offering.sourceId === '515611');
  assert.ok(primary?.primary);
  assert.equal(secondary?.primary, false);
  assert.equal(preferredCourse(secondary, primary), primary);
  assert.equal(preferredCourse(primary, secondary), primary);
  assert.equal(candidates.find(({ offering }) => offering.sourceId === '131106')?.offering.capacity, undefined);
});

test('handles rooms, concatenated periods and multiple campuses', () => {
  const real = candidates.find(({ offering, primary }) => offering.sourceId === '515607' && primary);
  assert.deepEqual(real?.offering.schedule, [
    { day: 3, periods: ['7', '8'], location: 'EC114' },
    { day: 3, periods: ['7', '8'], location: 'EC122' }
  ]);
  assert.deepEqual(parseSchedule('M3M4Rz-EC115[GF],S3n-YT305[YM],未排定'), {
    schedule: [
      { day: 1, periods: ['3', '4'], location: 'EC115' },
      { day: 4, periods: ['z'], location: 'EC115' },
      { day: 6, periods: ['3', 'n'], location: 'YT305' }
    ],
    campus: undefined
  });
});

test('extracts only the public course description and rejects a wrong-term course response', () => {
  const outline = JSON.parse(readFileSync(new URL('./samples/outline.json', import.meta.url), 'utf8'));
  assert.match(parseDescription(outline) ?? '', /^This course is designed/);
  assert.equal(parseDescription({ crs_contact: 'not a public snapshot field' }), undefined);
  assert.throws(() => parseOfferings(sample, '114', '1'), /unexpected term/);
  assert.deepEqual(parseOfferings('', '115', '1'), []);
});
