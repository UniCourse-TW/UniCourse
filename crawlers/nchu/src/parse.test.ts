import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Offering } from '@unicourse/crawler-kit';
import { parseDescription, parseList, parseSchedule, parseSyllabusOffering } from './parse.ts';

const sample = (name: string) => readFileSync(new URL(`./samples/${name}`, import.meta.url), 'utf8');
const list = sample('list-115-1.html');

test('parses the bilingual list with published identities and instructor groups', () => {
  const offerings = parseList(list, '1151');
  assert.equal(Offering.array().parse(offerings).length, 5);
  const course = offerings.find((offering) => offering.sourceId === '5412');
  assert.ok(course);
  assert.equal(course.courseCode, '6906@1151');
  assert.equal(course.title, '循環經濟');
  assert.equal(course.titleEn, 'Circular Economy');
  assert.deepEqual(course.instructors.slice(0, 3), ['陳盈嵐', '顏佩翎', '黃姿碧']);
  assert.equal(course.instructors.length, 14);
  assert.equal(course.requirement, 'required');
  assert.equal(course.credits, 2);
  assert.equal(course.grade, '6');
  assert.equal(course.capacity, 69);
  assert.equal(course.enrolled, 68);
  assert.equal(course.language, '中文');
  assert.equal(course.syllabusUrl, course.sourceUrl);
  assert.equal(course.scheduleText, '167\nAC101');
  assert.deepEqual(course.schedule, [{ day: 1, periods: ['6', '7'], location: 'AC101' }]);
  assert.deepEqual(offerings.filter((row) => row.courseCode === '1078@1151').map((row) => row.sourceId), ['5717', '1474']);
});

test('omits enrollment when the published balance is missing or greater than capacity', () => {
  const enrolled = (balance: string) => parseList(list.replace('<td>1</td>', `<td>${balance}</td>`), '1151')[0].enrolled;
  assert.equal(enrolled('69'), 0);
  assert.equal(enrolled('70'), undefined);
  assert.equal(enrolled(''), undefined);
});

test('pairs multiple NCHU rooms without inventing schedule or grade for pending courses', () => {
  const offerings = parseList(list, '1151');
  const rooms = offerings.find((offering) => offering.sourceId === '2328');
  assert.deepEqual(rooms?.schedule, [
    { day: 1, periods: ['5', '6'], location: 'Y101' },
    { day: 1, periods: ['5', '6'], location: 'A318' }
  ]);
  const pending = offerings.find((offering) => offering.sourceId === '2047');
  assert.deepEqual(pending?.instructors, ['王雷']);
  assert.equal(pending?.scheduleText, '*\n*\n*');
  assert.equal(pending?.schedule, undefined);
  assert.equal(pending?.grade, undefined);
  assert.equal(pending?.credits, 0);
  assert.throws(() => parseList(list, '1142'), /requested term/);
});

test('understands compact periods, ranges, and parenthesized weekdays', () => {
  assert.deepEqual(parseSchedule(['1A-C', '(二)1,2'], ['T123', '*']), [
    { day: 1, periods: ['A', 'B', 'C'], location: 'T123' },
    { day: 2, periods: ['1', '2'] }
  ]);
});

test('extracts the short description from the syllabus', () => {
  assert.match(parseDescription(sample('syllabus-5412.html')) ?? '', /^全球的永續性/);
});

test('recovers the verified class identity and syllabus metadata without inferring enrollment', () => {
  const html = sample('syllabus-3746-1141.html');
  const url = new URL('https://onepiece.nchu.edu.tw/cofsys/plsql/Syllabus_main?v_strm=1141&v_class_nbr=3746');
  const course = Offering.parse(parseSyllabusOffering(html, url, '4302'));
  assert.equal(course.sourceId, '3746');
  assert.equal(course.courseCode, '4302@1141');
  assert.equal(course.title, '國內外自選實習(一)');
  assert.equal(course.titleEn, 'Elective Course-Domestic/International Clerkship(I)');
  assert.equal(course.department, '學士後醫學系');
  assert.equal(course.credits, 2);
  assert.equal(course.language, '中/英文');
  assert.deepEqual(course.instructors, ['朱旆億']);
  assert.equal(course.enrolled, undefined);
  assert.throws(() => parseSyllabusOffering(html, url, '4303'), /does not identify class/);
  url.searchParams.set('v_strm', '1142');
  assert.throws(() => parseSyllabusOffering(html, url, '4302'), /does not identify class/);
});

test('does not group different subjects under a recycled selection number', () => {
  const [oldCourse] = parseList(sample('list-114-2.html'), '1142');
  const newCourse = parseList(list, '1151').find((row) => row.sourceId === '5412');
  assert.equal(oldCourse.extra?.['選課號碼'], newCourse?.extra?.['選課號碼']);
  assert.equal(oldCourse.title, '綠色科學與永續發展');
  assert.equal(oldCourse.courseCode, '6906@1142');
  assert.notEqual(oldCourse.courseCode, newCourse?.courseCode);
});

test('keeps course notes while discarding contact clauses', () => {
  const html = list.replace('本課程為循環學院碩、博班核心課程，必修。', '必修。請洽 course@example.org。');
  assert.equal(parseList(html, '1151').find((row) => row.sourceId === '5412')?.notes, '必修。');
});
