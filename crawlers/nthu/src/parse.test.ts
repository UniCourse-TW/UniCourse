import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Offering } from '@unicourse/crawler-kit';
import {
  addArchivedEnrollment, addArchivedRequirements, catalogArchives, normalizeArchiveRows, requirementArchives, selectTermRows
} from './archive.ts';
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

const sampleRows = (name: string) => JSON.parse(readFileSync(new URL(`./samples/${name}`, import.meta.url), 'utf8'));

test('reads the 105–107 workbook: one row per instructor, serial-only rows, padded names, joined requirements', () => {
  const { rows, unidentified } = selectTermRows(sampleRows('archive-104-107.json'), '106-1');
  assert.equal(unidentified, 1);
  assert.equal(rows.length, 2);
  for (const row of rows) row['英文課名'] = '';
  const url = requirementArchives['106-1']!.url;
  addArchivedRequirements(rows, sampleRows('requirements-105-107.json'), url);
  const [first] = Offering.array().parse(parseOfferings(normalizeArchiveRows(rows), '106-1', new Map(), catalogArchives['106-1']!.url));
  assert.equal(first.sourceId, '10610ANTH651000');
  assert.equal(first.titleEn, undefined);
  assert.equal(first.department, '人類所');
  assert.equal(first.enrolled, 14);
  assert.equal(first.capacity, undefined);
  assert.equal(first.schedule, undefined);
  assert.equal(first.requirementText, 'ANTH106M  必\tGPTS106P  選\tANTH106D  選');
  assert.equal(first.requirement, undefined);
  assert.equal(first.extra?.課程屬性, '研究所');
  assert.equal(first.extra?.必選修來源, url);
  assert.throws(() => selectTermRows(sampleRows('archive-104-107.json'), '108-1'), /no rows for 108-1/);
});

test('merges instructor rows, trims padded names and drops organisation placeholders', () => {
  const base = sampleRows('archive-104-107.json')[0];
  const rows = [
    { ...base, 教師: '許瀞文' }, { ...base, 教師: '沈  琪' }, { ...base, 教師: 'TIGP Program' },
    { ...base, 教師: 'BME／CHE' }, { ...base, 教師: '許瀞文' }
  ];
  const [course] = parseOfferings(normalizeArchiveRows(rows), '106-1', new Map());
  assert.deepEqual(course.instructors, ['許瀞文', '沈琪']);
  const conflicting = [{ ...base, 教師: 'A' }, { ...base, 教師: 'B', 總人數: '99' }];
  assert.throws(() => parseOfferings(normalizeArchiveRows(conflicting), '106-1', new Map()), /duplicate sourceId/);
});

test('reads the 104 sheet with its English title and the 108–112 layouts', () => {
  const rows = sampleRows('archive-104-107.json').filter((row: Record<string, string>) => row['學年'] === '104');
  const [ee] = parseOfferings(normalizeArchiveRows(rows), '104-1', new Map());
  assert.equal(ee.titleEn, 'English: Comprehension & Speech I');
  assert.equal(ee.department, '電機工程學系');
  const [aes, remote] = parseOfferings(normalizeArchiveRows(sampleRows('archive-108-110.json')), '108-1', new Map());
  assert.equal(aes.sourceId, '10810AES 510000');
  assert.equal(aes.enrolled, 16);
  assert.equal(aes.requirement, 'required');
  assert.equal(aes.capacity, undefined);
  assert.deepEqual(aes.schedule, [{ day: 3, periods: ['7', '8'], location: '醫環401' }]);
  assert.equal(remote.language, '英');
  const { rows: later } = selectTermRows(sampleRows('archive-111-112.json'), '112-1');
  const [first] = parseOfferings(normalizeArchiveRows(later), '112-1', new Map());
  assert.equal(first.department, '分析與環境科學研究所');
  assert.ok(first.enrolled !== undefined);
});
