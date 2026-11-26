import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Offering } from '@unicourse/crawler-kit';
import { addArchivedEnrollment, catalogArchives, normalizeArchiveRows } from './archive.ts';
import { parseDepartments, parseOfferings } from './parse.ts';

const sample = JSON.parse(readFileSync(new URL('./samples/courses.json', import.meta.url), 'utf8'));
const departments = parseDepartments(readFileSync(new URL('./samples/departments.html', import.meta.url), 'utf8'));
const offerings = parseOfferings(sample, '115-1', departments);

test('reads normalized department, course and class identities from a padded 科號', () => {
  const first = offerings.find(({ sourceId }) => sourceId === '11510AES 450100');
  assert.ok(first);
  assert.equal(first.department, '分析與環境科學研究所');
  assert.equal(first.departmentCode, 'AES');
  assert.equal(first.courseCode, 'AES4501');
  assert.equal(first.classCode, '00');
  assert.equal(first.titleEn, 'Environmental Microbiology');
  assert.equal(first.credits, 3);
  assert.equal(first.capacity, undefined);
  assert.equal(first.notes, undefined);
  assert.equal(first.requirement, 'elective');
  assert.equal(first.language, '中');
  assert.equal(first.extra?.['新生保留人數'], '0');
});

test('uses the Chinese instructor name once per bilingual row and decodes entities', () => {
  const general = offerings.find(({ sourceId }) => sourceId === '11510AES 470200');
  assert.deepEqual(general?.instructors, ['陳俊銘', '周秀專']);
  assert.equal(general?.requirement, 'general');
  assert.equal(general?.capacity, 30);
  const mixed = offerings.find(({ sourceId }) => sourceId === '11510ANTH651000');
  assert.deepEqual(mixed?.instructors, ['許瀞文']);
  assert.equal(mixed?.requirement, undefined);
  assert.match(mixed?.requirementText ?? '', /選修.*\t.*必修/);
});

test('preserves the raw timetable and handles multiple rooms and noon periods', () => {
  const course = offerings.find(({ sourceId }) => sourceId === '11510BAI 500700');
  assert.equal(course?.scheduleText, 'LS II生二 113\tT2T3T4\nLS II生二220\tTnT5');
  assert.deepEqual(course?.schedule, [
    { day: 2, periods: ['2', '3', '4'], location: 'LS II生二 113' },
    { day: 2, periods: ['n', '5'], location: 'LS II生二220' }
  ]);
  const chemistry = offerings.find(({ sourceId }) => sourceId === '11510CHEM223001');
  assert.equal(chemistry?.grade, '2');
  assert.equal(chemistry?.classCode, '01');
  assert.deepEqual(chemistry?.instructors, []);
});

test('does not accept a duplicate or allow the rolling feed to be relabeled', () => {
  assert.throws(() => parseOfferings(sample, '114-2', departments), /source data is 115-1/);
  assert.throws(() => parseOfferings([sample[0], sample[0]], '115-1', departments), /duplicate sourceId/);
  assert.throws(() => parseOfferings([], '115-1', departments), /nonempty course list/);
  Offering.array().parse(offerings);
});

test('maps archived courses to the same identities using the post-withdrawal counts', () => {
  const rows = JSON.parse(readFileSync(new URL('./samples/archive-114-1.json', import.meta.url), 'utf8'));
  const url = catalogArchives['114-1']!.url;
  const courses = Offering.array().parse(parseOfferings(normalizeArchiveRows(rows), '114-1', new Map(), url));
  assert.equal(courses[0].sourceId, '11410BMES111100');
  assert.equal(courses[0].department, '生醫工程與環境科學系');
  assert.equal(courses[0].enrolled, 62);
  assert.equal(courses[0].capacity, 60);
  assert.equal(courses[0].sourceUrl, url);
  assert.deepEqual(courses[0].schedule, [{ day: 1, periods: ['7', '8', '9'], location: '醫環301' }]);
  assert.equal(courses[1].enrolled, 0);
  assert.equal(courses[2].enrolled, undefined);
  assert.equal(courses[3].title, 'Introduction to Programming (II)');
  assert.equal(courses[3].enrolled, 124);
  assert.equal(offerings[0].enrolled, undefined);
  assert.throws(() => normalizeArchiveRows([{ 科號: '11410BMES111100' }]), /missing required columns/);
});

test('joins archived counts by course identity without adding archived-only classes', () => {
  const [current, second] = offerings;
  const catalog = structuredClone([current, second]);
  const url = 'https://curricul.site.nthu.edu.tw/';
  addArchivedEnrollment(catalog, [{ ...current, sourceId: current.sourceId.replaceAll(' ', ''), enrolled: 0 },
    { ...second, sourceId: '11510AES 222200', enrolled: 3 }], url);
  assert.equal(catalog[0].enrolled, 0);
  assert.equal(catalog[0].extra?.選課人數來源, url);
  assert.equal(catalog[1].enrolled, undefined);
  assert.equal(catalog.length, 2);
});
