import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Offering } from '@unicourse/crawler-kit';
import {
  isCrossSchoolCode,
  isProgramCode,
  parseDepartments,
  parseGrid,
  parseSyllabusBrief,
  parseTime,
  splitInstructors,
  splitName,
  toOffering,
  verifyGridTerm
} from './parse.ts';

const sample = (name: string) => readFile(new URL(`./samples/${name}`, import.meta.url), 'utf8');

test('grid JSON parses and rejects empty bodies', async () => {
  const grid = parseGrid(await sample('grid.json'));
  assert.ok(grid.List.length >= 10);
  verifyGridTerm(grid.List, 115, 1);
  assert.throws(() => verifyGridTerm(grid.List, 114, 2), /got 115-1/);
  assert.throws(() => parseGrid(''), /empty grid response/);
});

test('uses the published selection count that excludes authorization codes', async () => {
  const row = parseGrid(await sample('grid.json')).List.find((entry) => entry.counter_exceptAuth !== entry.counter)!;
  assert.equal(toOffering(row).enrolled, 50);
  assert.equal(toOffering({ ...row, counter_exceptAuth: '0' }).enrolled, 0);
  assert.equal(toOffering({ ...row, counter_exceptAuth: '' }).enrolled, undefined);
});

test('department list', async () => {
  const depts = parseDepartments(await sample('departments.txt'));
  assert.deepEqual(depts[0], { code: 'GU', name: '通識' });
  assert.ok(depts.some((d) => d.code === 'EU00' && d.name === '教育系（學）'));
  assert.ok(isProgramCode('ZU32') && !isProgramCode('EU00'));
  assert.ok(isCrossSchoolCode('9UAA') && !isCrossSchoolCode('GU'));
});

test('name splitting keeps credit programs separately', () => {
  assert.deepEqual(splitName('音樂鑑賞 </br>[ 學分學程：社區高齡者服務人才培力學分學程 社團人專業領導培力學分學程 ]'), {
    name: '音樂鑑賞',
    programs: '社區高齡者服務人才培力學分學程 社團人專業領導培力學分學程'
  });
  assert.deepEqual(splitName('Music Appreciation </br>[ Program: The X Program ]'), {
    name: 'Music Appreciation',
    programs: 'The X Program'
  });
  assert.deepEqual(splitName('邏輯'), { name: '邏輯', programs: undefined });
});

test('time parsing', () => {
  assert.deepEqual(parseTime('二 6-7 公館 Ｓ102'), {
    schedule: [{ day: 2, periods: ['6', '7'], location: '公館 Ｓ102' }],
    campus: '公館'
  });
  assert.deepEqual(parseTime('三 10-A 和平 教315'), {
    schedule: [{ day: 3, periods: ['10', 'A'], location: '和平 教315' }],
    campus: '和平'
  });
  assert.deepEqual(parseTime('六 2-4 請洽系所辦, 六 6-9 請洽系所辦'), {
    schedule: [
      { day: 6, periods: ['2', '3', '4'] },
      { day: 6, periods: ['6', '7', '8', '9'] }
    ],
    campus: undefined
  });
  assert.deepEqual(parseTime('一 3 共103'), { schedule: [{ day: 1, periods: ['3'], location: '共103' }], campus: undefined });
  assert.deepEqual(parseTime('◎面授/同步'), { schedule: undefined, campus: undefined });
  assert.deepEqual(parseTime(''), { schedule: undefined, campus: undefined });
});

test('offerings validate and map fields', async () => {
  const grid = parseGrid(await sample('grid.json'));
  const offerings = grid.List.map((raw) => toOffering(raw));
  for (const offering of offerings) Offering.parse(offering);

  const music = offerings.find((o) => o.sourceId === '1024')!;
  assert.equal(music.title, '音樂鑑賞');
  assert.equal(music.titleEn, 'Music Appreciation');
  assert.equal(music.courseCode, '01UG004');
  assert.equal(music.classCode, 'A');
  assert.equal(music.requirement, 'general');
  assert.equal(music.requirementText, '通');
  assert.equal(music.language, '英語');
  assert.equal(music.extra?.學分學程, '社區高齡者服務人才培力學分學程 社團人專業領導培力學分學程');
  assert.equal(music.campus, '公館');
  assert.equal(
    music.sourceUrl,
    'https://courseap2.itc.ntnu.edu.tw/acadmOpenCourse/SyllabusCtrl?year=115&term=1&courseCode=01UG004&courseGroup=A&deptCode=GU&formS=&classes1=&deptGroup='
  );

  const multi = offerings.find((o) => o.instructors.length > 1)!;
  assert.ok(multi.instructors.every((name) => name === name.trim() && name.length > 0));

  const graded = offerings.find((o) => o.grade)!;
  assert.match(graded.grade!, /^[1-4]$/);

  const required = offerings.find((o) => o.requirementText === '必')!;
  assert.equal(required.requirement, 'required');

  for (const offering of offerings) {
    for (const value of Object.values(offering)) {
      if (typeof value === 'string') assert.ok(value.length > 0 && value === value.trim());
    }
  }
});

test('instructor splitting keeps romanised names together', async () => {
  assert.deepEqual(splitInstructors('李玉馨 張宜君'), ['李玉馨', '張宜君']);
  assert.deepEqual(splitInstructors('汪明輝 Richard Howitt'), ['汪明輝', 'Richard Howitt']);
  assert.deepEqual(splitInstructors('Philip X. Fuchs'), ['Philip X. Fuchs']);
  assert.deepEqual(splitInstructors(''), []);
  const offerings = parseGrid(await sample('grid.json')).List.map((raw) => toOffering(raw));
  assert.deepEqual(offerings.find((o) => o.sourceId === '2007')!.instructors, ['汪明輝', 'Richard Howitt']);
  assert.deepEqual(offerings.find((o) => o.sourceId === '3639')!.schedule, [
    { day: 5, periods: ['8', '9'], location: 'TR-410' },
    { day: 4, periods: ['9'], location: 'TR-410' }
  ]);
});

test('syllabus brief', async () => {
  const brief = parseSyllabusBrief(await sample('syllabus.html'));
  assert.match(brief!, /^在當代哲學的課程架構中，邏輯是必備的基礎學科/);
  assert.equal(parseSyllabusBrief('<html></html>'), undefined);
});

test('old-term (105-1) grid rows use the same format', async () => {
  const grid = parseGrid(await sample('grid-105-1.json'));
  verifyGridTerm(grid.List, 105, 1);
  const [noTime, timed] = grid.List.map((row) => toOffering(row));
  // 服務學習 rows carry 0 credits and no meeting time.
  assert.equal(noTime.credits, 0);
  assert.equal(noTime.schedule, undefined);
  assert.equal(noTime.enrolled, 26);
  // Older terms label the main campus 本部 and end time_inf with a trailing comma.
  assert.deepEqual(timed.schedule, [{ day: 2, periods: ['6', '7'], location: '本部 教9樓綜合教室' }]);
  assert.equal(timed.campus, '本部');
  assert.equal(timed.enrolled, 50);
  assert.equal(timed.capacity, 50);
  Offering.parse(timed);
});
