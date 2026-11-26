import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Offering } from '@unicourse/crawler-kit';
import {
  htmlText,
  mergeRows,
  parseDepartments,
  parseDetail,
  parseResultRows,
  parseSchedule,
  parseTotal,
  toOffering,
  verifyResultTerm
} from './parse.ts';

const sample = (name: string) => readFile(new URL(`./samples/${name}`, import.meta.url), 'utf8');

test('result page: total and rows', async () => {
  const html = await sample('search-result-ch.html');
  assert.equal(parseTotal(html), 16034);
  const rows = parseResultRows(html);
  verifyResultTerm(rows, '115-1');
  assert.throws(() => verifyResultTerm(rows, '114-2'), /found 115-1/);
  assert.ok(rows.length >= 20);
  const placeholder = rows[0];
  assert.equal(placeholder.serial, undefined, 'common-course placeholder rows have no 流水號');
  assert.equal(placeholder.courseNo, 'Common1011');

  const pe = rows.find((row) => row.serial === '97001')!;
  assert.equal(pe.courseNo, 'PE1003');
  assert.equal(pe.classCode, '34');
  assert.equal(pe.title, '健康體適能');
  assert.equal(pe.dptCode, 'T010');
  assert.equal(pe.identifier, '002 50010');
  assert.deepEqual(pe.instructors, ['曾郁嫻']);
  assert.equal(pe.timeText, '一3,4(中央籃球場)');
  assert.equal(pe.capacity, '50');
  assert.equal(pe.courseWeb, 'https://cool.ntu.edu.tw/courses/64961');
  assert.equal(pe.cancelled, false);

  assert.ok(rows.some((row) => row.cancelled && !row.detailHref), 'cancelled rows have no detail link');
  assert.ok(rows.some((row) => row.changed));
});

test('mergeRows drops placeholders and cancelled rows and merges audiences', async () => {
  const rows = parseResultRows(await sample('search-result-ch.html'));
  const { merged, placeholders, cancelled } = mergeRows(rows);
  assert.ok(placeholders > 0);
  assert.ok(cancelled > 0);
  const serials = merged.map((row) => row.serial);
  assert.equal(new Set(serials).size, serials.length);
  const shared = merged.find((row) => row.serial === '28183')!;
  assert.deepEqual(shared.dptCodes, ['2232', '2231']);
  assert.equal(shared.audiences.length, 2);
});

test('schedule parsing', () => {
  assert.deepEqual(parseSchedule('一3,4(中央籃球場)'), [{ day: 1, periods: ['3', '4'], location: '中央籃球場' }]);
  assert.deepEqual(parseSchedule('一3,4(請洽系所辦) 五10,A,B(新102)'), [
    { day: 1, periods: ['3', '4'] },
    { day: 5, periods: ['10', 'A', 'B'], location: '新102' }
  ]);
  assert.deepEqual(parseSchedule('三7,8,9(博雅101(大))'), [{ day: 3, periods: ['7', '8', '9'], location: '博雅101(大)' }]);
  assert.equal(parseSchedule(undefined), undefined);
  assert.equal(parseSchedule('請洽系所辦'), undefined);
});

test('departments', async () => {
  const map = parseDepartments(await sample('dept-options.html'));
  assert.equal(map.get('0020'), '體育室');
  assert.equal(map.get('1000'), '文學院');
  assert.ok(map.size > 300);
});

test('toOffering with English title validates against the kit schema', async () => {
  const ch = parseResultRows(await sample('search-result-ch.html'));
  const en = new Map(parseResultRows(await sample('search-result-en.html')).map((row) => [row.serial, row.title]));
  const departments = parseDepartments(await sample('dept-options.html'));
  const { merged } = mergeRows(ch);
  const offerings = merged.map((row) => toOffering(row, '115-1', departments, { titleEn: en.get(row.serial) }));
  for (const offering of offerings) Offering.parse(offering);

  const research = offerings.find((o) => o.sourceId === '43764')!;
  assert.equal(research.title, '專題研究');
  assert.equal(research.titleEn, 'Research Training');
  assert.equal(research.courseCode, 'Chem8000');
  assert.equal(research.language, '英語');
  assert.equal(research.requirement, 'required');
  assert.equal(research.departmentCode, '2232');
  assert.equal(research.extra?.課程識別碼, '223ED0020');
  assert.match(research.sourceUrl, /^https:\/\/nol\.ntu\.edu\.tw\/nol\/coursesearch\/print_table\.php\?course_id=223%20D0020&/);
  assert.equal(research.syllabusUrl, research.sourceUrl);
  for (const offering of offerings) {
    for (const value of Object.values(offering)) if (typeof value === 'string') assert.equal(value, value.trim());
  }
});

test('highlighted (yellow) rows and capacity with a note', async () => {
  const rows = parseResultRows(await sample('search-result-ch.html'));
  const yellow = rows.filter((row) => row.serial === '17208');
  assert.equal(yellow.length, 2);
  assert.equal(yellow[0].capacity, '100(含開放臺大系統人數:10)');
  const { merged } = mergeRows(rows);
  const offering = toOffering(merged.find((row) => row.serial === '17208')!, '115-1', new Map());
  assert.equal(offering.capacity, 100);
  assert.equal(offering.extra?.總人數, '100(含開放臺大系統人數:10)');
  assert.deepEqual(offering.schedule, [{ day: 1, periods: ['7', '8', '9'], location: '博雅301' }]);
  assert.equal(offering.requirementText, '選修');
});

test('old term (105-1): same layout, map-linked rooms, empty 學分 cell', async () => {
  const html = await sample('search-result-ch-105-1.html');
  assert.equal(parseTotal(html), 13586);
  const rows = parseResultRows(html);
  verifyResultTerm(rows, '105-1');
  assert.equal(rows.length, 12);

  const atm = rows.find((row) => row.serial === '73601')!;
  assert.equal(atm.courseNo, 'AtmSci1009');
  assert.equal(atm.audience, '地科學程');
  // Rooms are wrapped in a campus-map link in old terms; the text stays `二1,2(大氣B105)`.
  assert.equal(atm.timeText, '二1,2(大氣B105)');
  assert.equal(atm.courseWeb, 'http://ceiba.ntu.edu.tw/1051AtmSci1009_');

  const { merged, cancelled } = mergeRows(rows);
  assert.equal(cancelled, 2);
  const departments = parseDepartments(await sample('dept-options.html'));
  const offerings = merged.map((row) => toOffering(row, '105-1', departments));
  for (const offering of offerings) Offering.parse(offering);

  const probability = offerings.find((o) => o.sourceId === '51712')!;
  assert.equal(probability.extra?.授課對象, '應數所、數學所、數學系');
  assert.equal(probability.requirementText, '必修', 'first 授課對象 row wins');
  assert.deepEqual(probability.schedule, [{ day: 5, periods: ['6', '7', '8'], location: '天數302' }]);

  // Some 105-1 rows (e.g. 全民國防教育) publish no credits; the field is omitted, not guessed.
  const defence = offerings.find((o) => o.sourceId === '93001')!;
  assert.equal(defence.credits, undefined);
  assert.equal(defence.capacity, 41);
  assert.equal(defence.extra?.總人數, '41(含開放臺大系統人數:4)');
  assert.equal(defence.extra?.課程網頁, 'http://ceiba.ntu.edu.tw/1051MilTr1006_01');
  assert.match(defence.sourceUrl, /semester=105-1/);
});

test('detail page: English title and description', async () => {
  const detail = parseDetail(await sample('print-table.html'));
  assert.equal(detail.titleEn, 'Health Related Physical Fitness');
  assert.match(detail.description!, /^本課程旨在協助同學理解體適能與健康之關係/);
});

test('htmlText decodes entities and collapses whitespace', () => {
  assert.equal(htmlText(' a&nbsp;&amp;<b>b</b><br>c&#x41;&#66; '), 'a &b cAB');
});
