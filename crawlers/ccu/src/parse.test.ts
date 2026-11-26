import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Offering } from '@unicourse/crawler-kit';
import { parseDepartment, parseDepartments, parseSchedule, parseSyllabus, sourceUrl } from './parse.ts';

const sample = (name: string) => readFileSync(new URL(`./samples/${name}`, import.meta.url), 'utf8');
const department = (code: string) => new URL(`${sourceUrl}?cd=${code}&yearterm=115_1`);

test('discovers official department queries from the public directory', () => {
  const links = parseDepartments(sample('departments.html'));
  assert.deepEqual(links.map((url) => url.searchParams.get('cd')), ['1014', '1104', '1106']);
  assert.throws(() => parseDepartments('<html></html>'), /no.*department|did not contain/i);
});

test('parses CCU section identities, credits, teachers, and letter periods', () => {
  const courses = parseDepartment(sample('department-I001-115-1.html'), department('I001'), 115, 1);
  assert.equal(Offering.array().parse(courses).length, 2);
  const [writing, psychology] = courses;
  assert.equal(writing.sourceId, '7101155_01');
  assert.equal(writing.courseCode, '7101155');
  assert.equal(writing.classCode, '01');
  assert.equal(writing.department, '通識教育中心');
  assert.equal(writing.departmentCode, 'I001');
  assert.equal(writing.credits, 2);
  assert.equal(writing.requirement, 'elective');
  assert.equal(writing.requirementText, '選修');
  assert.equal(writing.syllabusUrl, writing.sourceUrl);
  assert.deepEqual(writing.instructors, ['王櫻芬', '江寶釵']);
  assert.deepEqual(writing.schedule, [{ day: 2, periods: ['2', '3'] }]);
  assert.equal(psychology.scheduleText, '週二 B & 週四 B');
  assert.deepEqual(psychology.schedule, [{ day: 2, periods: ['B'] }, { day: 4, periods: ['B'] }]);
});

test('recognizes published empty terms without accepting the wrong department or term', () => {
  assert.deepEqual(parseDepartment(sample('department-1334-empty.html'), department('1334'), 115, 1), []);
  assert.throws(() => parseDepartment(sample('department-1334-empty.html'), department('9999'), 115, 1), /requested term/);
  assert.throws(() => parseDepartment(sample('department-I001-115-1.html'), department('I001'), 114, 2), /requested term/);
  assert.deepEqual(parseSchedule('未排定'), []);
});

test('enriches the offering from the public syllabus without importing attachments', () => {
  const { titleEn, description } = parseSyllabus(sample('syllabus-1101620.html'));
  assert.equal(titleEn, 'Folklore and Iconography');
  assert.match(description, /^概論民俗圖像/);
});

test('parses an archived 2016 term page (105-1) and keeps rows without a syllabus link', () => {
  const html = sample('department-I001-105-1.html');
  const listUrl = new URL(`${sourceUrl}?cd=I001&yearterm=105_1`);
  const courses = parseDepartment(html, listUrl, 105, 1);
  assert.equal(Offering.array().parse(courses).length, 2);
  const [linked, unlinked] = courses;
  assert.equal(linked.syllabusUrl, `https://ecourse2.ccu.edu.tw/local/syllabus/syllabus.php?year=105&term=1&course_no=${linked.sourceId}`);
  assert.equal(unlinked.sourceId, '7101133_45');
  assert.equal(unlinked.syllabusUrl, undefined);
  assert.equal(unlinked.sourceUrl, listUrl.href);
  assert.deepEqual(unlinked.schedule, [{ day: 5, periods: ['2', '3'] }]);
  assert.equal(unlinked.enrolled, undefined);
  assert.throws(() => parseDepartment(html, listUrl, 106, 1), /requested term/);
});
