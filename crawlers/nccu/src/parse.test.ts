import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Offering } from '@unicourse/crawler-kit';
import {
  cleanLabelled,
  courseQueryUrl,
  parseSubTime,
  parseSyllabus,
  realUnits,
  splitInstructors,
  toOffering,
  type NccuCourse,
  type UnitL1
} from './parse.ts';

const sample = async <T>(name: string): Promise<T> =>
  JSON.parse(await readFile(new URL(`./samples/${name}`, import.meta.url), 'utf8')) as T;

test('query URL matches the front end encoding', () => {
  assert.equal(
    courseQueryUrl('zh-TW', '1151', { dp1: '200', dp2: '1' }),
    'https://es.nccu.edu.tw/course/zh-TW/%3Asem%3D1151%20%3Adp1%3D200%20%3Adp2%3D1%20/'
  );
  assert.equal(
    decodeURIComponent(courseQueryUrl('en', '1151', { keyword: '未定或彈性', week: '3', dsec: '1' })),
    'https://es.nccu.edu.tw/course/en/:sem=1151 未定或彈性 :week=3 :dsec=1 /'
  );
});

test('unit placeholders are skipped', async () => {
  const units = await sample<UnitL1[]>('unit.json');
  const l1 = realUnits(units, 'utCodL1');
  assert.ok(l1.every((u) => u.utCodL1 !== '0'));
  assert.equal(l1[0].utCodL1, '01');
  assert.deepEqual(realUnits(l1[0].utL2, 'utCodL2').map((u) => u.utCodL2), ['A1', 'A2']);
});

test('subTime parsing', () => {
  assert.deepEqual(parseSubTime('三D56'), [{ day: 3, periods: ['D', '5', '6'] }]);
  assert.deepEqual(parseSubTime('一CD四78'), [
    { day: 1, periods: ['C', 'D'] },
    { day: 4, periods: ['7', '8'] }
  ]);
  assert.deepEqual(parseSubTime('六AB1'), [{ day: 6, periods: ['A', 'B', '1'] }]);
  assert.equal(parseSubTime('未定或彈性'), undefined);
  assert.equal(parseSubTime(''), undefined);
});

test('helpers', () => {
  assert.deepEqual(splitInstructors('莊弘鈺、鄭菀瓊'), ['莊弘鈺', '鄭菀瓊']);
  assert.deepEqual(splitInstructors(''), []);
  assert.equal(cleanLabelled('＠備註:無'), undefined);
  assert.equal(cleanLabelled('＠異動資訊:教室異動於2026/09/02;'), '教室異動於2026/09/02;');
  assert.equal(cleanLabelled('＠Note:N/A'), undefined);
});

test('API rows map to valid offerings', async () => {
  const zh = await sample<NccuCourse[]>('course-zh.json');
  const en = new Map((await sample<NccuCourse[]>('course-en.json')).map((r) => [r.subNum, r.subNam]));
  const offerings = zh.map((row) => Offering.parse(toOffering(row, en.get(row.subNum))));
  const bySource = new Map(offerings.map((o) => [o.sourceId, o]));

  const micro = bySource.get('000217041')!;
  assert.equal(micro.title, '個體經濟學');
  assert.equal(micro.titleEn, 'Microeconomics');
  assert.deepEqual(micro.instructors, ['黃柏鈞']);
  assert.equal(micro.department, '經濟系');
  assert.equal(micro.credits, 3);
  assert.equal(micro.requirement, 'required');
  assert.deepEqual(micro.schedule, [{ day: 3, periods: ['D', '5', '6'], location: '綜合中央大教室 (270751)' }]);
  assert.equal(micro.scheduleText, '三D56 綜合中央大教室 (270751)');
  assert.equal(micro.language, '中文');
  assert.equal(micro.notes, '本課程有實習課。本課程下學期由陳鎮洲老師授課。');
  assert.match(micro.syllabusUrl!, /^https:\/\/newdoc\.nccu\.edu\.tw\/teaschm\/1151\/schmPrv\.jsp/);
  assert.equal(micro.sourceUrl, micro.syllabusUrl);
  assert.equal(micro.extra?.smtQty, '全學年科目');
  assert.equal(micro.extra?.info, undefined);

  const ip = bySource.get('042139021')!;
  assert.deepEqual(ip.instructors, ['莊弘鈺', '鄭菀瓊']);
  assert.equal(ip.requirement, 'general');
  assert.equal(ip.requirementText, '社會通識');
  assert.equal(ip.extra?.info, '教室異動於2026/09/02;');

  const twoDays = bySource.get('042116041')!;
  assert.equal(twoDays.schedule?.length, 2);
  assert.ok(twoDays.schedule?.every((m) => m.location === undefined));

  const flexible = bySource.get('045062001')!;
  assert.equal(flexible.schedule, undefined);
  assert.equal(flexible.scheduleText, '未定或彈性');
  assert.equal(flexible.notes, undefined);

  assert.equal(bySource.get('000228021')!.requirementText, '群修');
  const crossField = bySource.get('044120001')!;
  assert.equal(crossField.requirement, 'general');
  assert.equal(crossField.requirementText, '跨領域(社會、自然)');
  const placeholder = toOffering({ ...zh[0], teaSchmUrl: 'https://newdoc.nccu.edu.tw/teaschm/emptyforqry.htm' });
  assert.equal(placeholder.syllabusUrl, undefined);
  assert.equal(placeholder.sourceUrl, 'https://qrysub.nccu.edu.tw/');
  for (const offering of offerings) {
    for (const [key, value] of Object.entries(offering)) assert.notEqual(value, '', key);
  }
});

test('syllabus page yields description and capacity', async () => {
  const html = await readFile(new URL('./samples/syllabus.html', import.meta.url), 'utf8');
  const detail = parseSyllabus(html);
  assert.equal(detail.capacity, 200);
  assert.match(detail.description!, /^This is a one-year course in intermediate microeconomics/);
  assert.match(detail.description!, /3\. Production and Costs\./);
  assert.doesNotMatch(detail.description!, /核心能力/);

  // Teacher-authored descriptions may start with a <div> instead of <p>.
  const divHtml = await readFile(new URL('./samples/syllabus-div.html', import.meta.url), 'utf8');
  const div = parseSyllabus(divHtml);
  assert.match(div.description!, /Macroeconomics is a year-long course/);
  assert.match(div.description!, /IS-LM-PC model/);
  assert.equal(div.capacity, undefined);
});
