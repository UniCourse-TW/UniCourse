import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Offering } from '@unicourse/crawler-kit';
import {
  departmentName,
  hiddenClasses,
  isCaptchaPage,
  parseEntryPage,
  parseResultRows,
  parseTimeLine,
  toOfferings
} from './parse.ts';

const sample = (name: string) => readFile(new URL(`./samples/${name}`, import.meta.url), 'utf8');

test('entry page: departments and crypt token', async () => {
  const entry = parseEntryPage(await sample('entry.html'));
  assert.equal(entry.departments.length, 12);
  assert.deepEqual(entry.departments[0], { code: 'A2', name: '體育室 OPE' });
  assert.deepEqual(entry.departments[7], { code: 'AJ', name: '校級校外實習' });
  assert.match(entry.crypt, /^[A-Za-z0-9+/=]+$/);
});

test('time lines', () => {
  assert.deepEqual(parseTimeLine('[1]2~3 建築系館 5101'), {
    raw: '[1]2~3 建築系館 5101',
    day: 1,
    periods: ['2', '3'],
    location: '建築系館 5101'
  });
  assert.deepEqual(parseTimeLine('[2]N~D')?.periods, ['N', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D']);
  assert.deepEqual(parseTimeLine('[4]9')?.periods, ['9']);
  assert.equal(parseTimeLine('[4]9')?.location, undefined);
  assert.equal(parseTimeLine('未定'), undefined);
  assert.equal(parseTimeLine('[3]5~2'), undefined);
});

test('helpers', async () => {
  assert.deepEqual(hiddenClasses(await sample('result-e7.html')), ['Qb5bc380bfcae5d07802a4853de2af2d6']);
  assert.equal(departmentName('建築系 ARCH'), '建築系');
  assert.equal(departmentName('校級校外實習'), '校級校外實習');
  assert.ok(isCaptchaPage('<div>請輸入驗證碼繼續！</div>'));
  assert.ok(!isCaptchaPage(await sample('result-e7.html')));
});

test('result rows are de-obfuscated and only the desktop table is read', async () => {
  const rows = parseResultRows(await sample('result-e7.html'));
  assert.equal(rows.length, 13);
  const first = rows[1];
  assert.equal(first.deptSeq, 'E7-006');
  assert.equal(first.courseCode, 'E712010');
  assert.equal(first.attrCode, 'ARCH1051');
  // Raw cell is `62/1</span><!--7-->8`: the comment and hidden <span>s must not leak into the text.
  assert.equal(first.enrollment, '62/18');
  assert.equal(rows[0].classCode, 'ZS');
  assert.equal(rows[0].deptSeq, undefined);
  assert.equal(rows[0].year, '0115');
  assert.equal(rows[0].semester, '1');
});

test('rows group into valid offerings', async () => {
  const offerings = toOfferings(parseResultRows(await sample('result-e7.html')));
  for (const offering of offerings) Offering.parse(offering);
  assert.deepEqual(
    offerings.map((o) => o.sourceId),
    ['E7-006', 'E7-007', 'E7-010', 'E7-056', 'E7-127', 'E7-202']
  );
  const design = offerings[0];
  assert.equal(design.title, '建築設計（一）');
  assert.equal(design.department, '建築系');
  assert.equal(design.departmentCode, 'E7');
  assert.equal(design.credits, 3);
  assert.equal(design.requirement, 'required');
  assert.equal(design.language, '英語');
  assert.equal(design.grade, '1');
  assert.deepEqual(design.instructors, ['鄭偉達', '呂武隆', '張庭嘉', '李思敏', '謝秉潔', '侯吉甲', '莊雋永']);
  assert.equal(design.notes, '5111及5112教室。需同時選修建築圖學');
  assert.equal(design.extra?.限選條件, '限本系');
  assert.equal(design.extra?.已選課人數, 62);
  assert.equal(design.extra?.餘額, 18);
  assert.equal(design.extra?.標籤, '英語授課、國考考試課程');
  assert.equal(
    design.sourceUrl,
    'https://class-qry.acad.ncku.edu.tw/syllabus/syllabus.php?syear=0115&sem=1&co_no=E712010&class_code='
  );
  // Lecture plus the 實習 continuation row (no group letter): all meetings are part of the timetable.
  assert.deepEqual(design.schedule, [
    { day: 2, periods: ['6'], location: '建築系館 5111' },
    { day: 2, periods: ['7', '8', '9'], location: '建築系館 5111' },
    { day: 5, periods: ['6', '7', '8'], location: '建築系館 5111' }
  ]);
  assert.equal(design.scheduleText, '[2]6 建築系館 5111; 實習: [2]7~9 建築系館 5111; 實習: [5]6~8 建築系館 5111');

  // 實習 groups A/B are alternatives: text only, and their instructors are added.
  const calculus = offerings[2];
  assert.equal(calculus.schedule?.length, 2);
  assert.match(calculus.scheduleText!, /實習 A: \[3\]1 建築系館 5101; 實習 B: \[3\]1 規劃設計大樓 5127$/);
  assert.deepEqual(calculus.instructors, ['舒宇宸', '黃郁芬']);

  // Flexible time: no schedule, flagged in extra.
  const flexible = offerings[3];
  assert.equal(flexible.schedule, undefined);
  assert.equal(flexible.scheduleText, undefined);
  assert.equal(flexible.extra?.彈性上課時間, true);

  for (const offering of offerings) {
    for (const [key, value] of Object.entries(offering)) assert.notEqual(value, '', key);
  }
});
