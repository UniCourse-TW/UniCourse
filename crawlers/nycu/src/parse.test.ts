import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Offering } from '@unicourse/crawler-kit';
import { parseDescription, parseOfferings, parseSchedule, preferredCourse } from './parse.ts';
import { briefs, courseCategories, tidyOffering } from './tidy.ts';

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

test('parses a pre-merger term (105-1, former National Yang-Ming University rows) served by the merged timetable', () => {
  const legacy = JSON.parse(readFileSync(new URL('./samples/legacy-105-1.json', import.meta.url), 'utf8'));
  const rows = parseOfferings(legacy, '105', '1').map(({ offering }) => offering);
  Offering.array().parse(rows);
  const psychology = rows.find(({ sourceId }) => sourceId === 'A025');
  assert.equal(psychology?.courseCode, 'A4792');
  assert.equal(psychology?.department, '醫學系');
  assert.equal(psychology?.enrolled, 38);
  assert.equal(psychology?.campus, '台北陽明校區');
  assert.deepEqual(psychology?.schedule, [{ day: 2, periods: ['3', '4'], location: 'YT206' }]);
  assert.deepEqual(rows.find(({ sourceId }) => sourceId === 'A024')?.instructors, []);
  assert.throws(() => parseOfferings(legacy, '109', '1'), /unexpected term/);
});

test('tidyOffering replaces raw timetable columns with readable labels', () => {
  const offerings = candidates.filter(({ primary }) => primary).map(({ offering }) => tidyOffering(offering));
  Offering.array().parse(offerings);
  for (const offering of offerings) {
    for (const key of Object.keys(offering.extra ?? {})) assert.doesNotMatch(key, /^[A-Za-z0-9_]+$/, key);
  }
  const course = offerings.find(({ sourceId }) => sourceId === '515611')!;
  assert.equal(course.extra?.上課時數, 3);
  assert.equal(course.extra?.cos_hours, undefined);
  const withCategories = offerings.find(({ extra }) => extra?.課程類別);
  assert.ok(withCategories, 'sample has a costype course');
  assert.doesNotMatch(String(withCategories.extra?.課程類別), /[{}_]/);
});

test('costype and brief JSON become short label lists', () => {
  assert.equal(
    courseCategories('{"大學導師_大學導師":{"course_category_cname":"大學導師_大學導師"},"x":{"course_category_cname":"通識校基本素養_通識校基本"}}'),
    '大學導師、通識校基本素養'
  );
  assert.equal(briefs('{"Z1":{"brief_code":"Z1","brief":"其它(87),語言與溝通-第二外語(111)"}}'), '其它(87)、語言與溝通-第二外語(111)');
  assert.equal(briefs('{"A":{"brief":"中級以上 Intermediate &amp; Up(98)"}}'), '中級以上 Intermediate & Up(98)');
  // Already-converted values (a second retidy) are left as they are, apart from entity decoding.
  assert.equal(briefs('中級以上 Intermediate &amp; Up(98)、華語(100)'), '中級以上 Intermediate & Up(98)、華語(100)');
});

test('tidyOffering repairs old snapshots and is idempotent', () => {
  const old = {
    sourceId: '517301',
    courseCode: 'X',
    title: '導師時間  -職涯學院',
    titleEn: 'Mentor&#39;s Hours (I)\u007f',
    instructors: [],
    capacity: 0,
    enrolled: 30,
    sourceUrl: 'https://timetable.nycu.edu.tw/',
    extra: {
      dep_limit: 'N', cos_hours: '.00', degree: '1', dep_primary: '1', cos_type_e: 'Required', crsoutline_type: null,
      depType: 'U', dep_ename: 'Department of Computer Science', URL: 'https://example.nycu.edu.tw/course'
    }
  } as Offering;
  const once = tidyOffering(old);
  assert.equal(once.titleEn, "Mentor's Hours (I)");
  assert.equal(once.title, '導師時間 -職涯學院');
  assert.equal(tidyOffering({ ...old, extra: { dep_ename: null } }).extra, undefined);
  // Values already relabelled by an earlier retidy: nulls dropped, entities decoded.
  assert.deepEqual(
    tidyOffering({ ...old, extra: { 開課單位英文名稱: null, 課程網頁: 'https://x.test/', 通識向度: 'Science &amp; Technology' } }).extra,
    { 課程網頁: 'https://x.test/', 通識向度: 'Science & Technology' }
  );
  assert.equal(once.capacity, undefined);
  assert.equal(once.enrolled, 30);
  assert.deepEqual(once.extra, { 開課單位英文名稱: 'Department of Computer Science', 課程網頁: 'https://example.nycu.edu.tw/course' });
  assert.deepEqual(tidyOffering(once), once);
  // A real zero-seat course without students keeps capacity 0.
  assert.equal(tidyOffering({ ...old, enrolled: 0 }).capacity, 0);
});
