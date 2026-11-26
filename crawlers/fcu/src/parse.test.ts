import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Offering } from '@unicourse/crawler-kit';
import {
  DEGREES,
  buildOfferings,
  cleanText,
  descriptionFromDetail,
  parsePeriod,
  syllabusToken,
  unwrapAsmx,
  type CollectedRow,
  type FcuResult,
  type IdName
} from './parse.ts';
import { fullUnitName, tidyOffering } from './tidy.ts';

const sample = async <T>(name: string): Promise<T> =>
  JSON.parse(await readFile(new URL(`./samples/${name}`, import.meta.url), 'utf8')) as T;

async function build() {
  const type1 = await sample<Record<string, FcuResult>>('type1-results.json');
  const unitLists = await sample<Record<string, IdName[]>>('unit-lists.json');
  const colleges = await sample<IdName[]>('dept-list-degree1.json');
  const type2 = await sample<Record<string, FcuResult>>('type2-language-en.json');
  const init = await sample<{ languageList: { id: string; cht: string }[] }>('init.json');
  const rows: CollectedRow[] = [];
  for (const [key, result] of Object.entries(type1)) {
    const [degreeId, collegeId] = key.split('/');
    const degree = DEGREES.find((d) => d.id === degreeId)!;
    const college = colleges.find((c) => c.id === collegeId) ?? { id: collegeId, name: collegeId };
    for (const item of result.items!) rows.push({ degree, college, item });
  }
  const units = new Map(Object.values(unitLists).flat().map((u) => [u.id, u.name] as const));
  const languages = new Map<string, string>();
  const englishTitles = new Map<string, string>();
  for (const [id, result] of Object.entries(type2)) {
    const name = init.languageList.find((l) => l.id === id)!.cht;
    for (const item of result.items!) {
      languages.set(item.scr_selcode, name);
      englishTitles.set(item.scr_selcode, item.sub_name!);
    }
  }
  return buildOfferings({ year: 115, sms: 1, rows, units, languages, englishTitles });
}

test('parsePeriod splits slots, rooms and the trailing instructor list', () => {
  assert.deepEqual(parsePeriod('(二)06-07 語205 (五)09     資電404 劉維正', '劉維正'), {
    scheduleText: '(二)06-07 語205 (五)09 資電404',
    schedule: [
      { day: 2, periods: ['6', '7'], location: '語205' },
      { day: 5, periods: ['9'], location: '資電404' }
    ],
    instructors: ['劉維正']
  });
  // No room: the instructor must not be mistaken for one.
  assert.deepEqual(parsePeriod('(五)08       吳志超', '吳志超').schedule, [{ day: 5, periods: ['8'] }]);
  // Unscheduled placeholders and blank teacher.
  assert.deepEqual(parsePeriod('(一)00     待排', ' '), { scheduleText: '(一)00 待排', schedule: [], instructors: [] });
  assert.deepEqual(parsePeriod('(日)00-02 待排 陳介英', '陳介英').schedule, []);
  assert.deepEqual(parsePeriod('(二)05     未排教室', '').schedule, [{ day: 2, periods: ['5'] }]);
  // Names with spaces, stray DEL bytes.
  assert.deepEqual(
    parsePeriod('(二)02-04 V015教室(共善樓) 吳廣文,Ann-Catherine Wallin\u007f\u007f', '吳廣文,Ann-Catherine Wallin\u007f').instructors,
    ['吳廣文', 'Ann-Catherine Wallin']
  );
});

test('truncated scr_teacher is completed from the period text', () => {
  const parsed = parsePeriod('(二)05     未排教室 (三)05     未排教室 周兆龍,林志敏,陳錫民,桑慧敏', '周兆龍,林志敏,');
  assert.deepEqual(parsed.instructors, ['周兆龍', '林志敏', '陳錫民', '桑慧敏']);
  assert.equal(parsed.scheduleText, '(二)05 未排教室 (三)05 未排教室');
});

test('buildOfferings maps the sample rows into valid offerings', async () => {
  const offerings = await build();
  for (const offering of offerings) Offering.parse(offering);
  assert.equal(new Set(offerings.map((o) => o.sourceId)).size, offerings.length);

  const math = offerings.find((o) => o.sourceId === '2107')!;
  assert.deepEqual(math, {
    sourceId: '2107',
    courseCode: 'IEE2000',
    classCode: '001',
    title: '工程數學(一)',
    titleEn: 'ENGINEERING MATHEMATICS(1)',
    instructors: ['劉維正'],
    department: '資電學院',
    departmentCode: 'CI00',
    credits: 3,
    requirement: 'required',
    requirementText: '必修',
    schedule: [
      { day: 2, periods: ['6', '7'], location: '語205' },
      { day: 5, periods: ['9'], location: '資電404' }
    ],
    scheduleText: '(二)06-07 語205 (五)09 資電404',
    capacity: 72,
    enrolled: 70,
    language: '中文',
    syllabusUrl: 'https://coursesearch02.fcu.edu.tw/CourseOutline.aspx?lang=cht&courseid=11512107',
    sourceUrl: 'https://coursesearch02.fcu.edu.tw/CourseOutline.aspx?lang=cht&courseid=11512107',
    extra: {
      科目代碼: '02270',
      開課班級: '資電學院綜合班',
      班級代碼: 'CI00101',
      學制: '大學部',
      開課學院: '資電學院',
      期中考: false,
      期末考: false,
      提前考: false,
      上課方式: '課堂教學',
      開課期程: '全學期',
      EMI課程: false
    }
  });

  // One 選課代碼 listed under four classes becomes one offering.
  const ds = offerings.find((o) => o.sourceId === '1384')!;
  assert.equal(ds.extra?.開課班級, '資訊二甲、資訊二乙、資訊二丙、資訊二丁');
  assert.equal(ds.department, '資訊系');
  assert.equal(ds.notes, undefined);

  const emi = offerings.find((o) => o.sourceId === '2990')!;
  assert.equal(emi.language, '英語');
  assert.equal(emi.notes, '是否列入畢業學分請至各系確認。\n全英課程');
  assert.equal(emi.extra?.EMI課程, true);

  const tba = offerings.find((o) => o.sourceId === '1212')!;
  assert.deepEqual(tba.instructors, []);
  assert.equal(tba.schedule, undefined);
  assert.equal(tba.scheduleText, '(一)00 待排');
});

test('old term (105-1): hidden degree 2 evening general-education rows and blank placeholders', async () => {
  const old = await sample<{
    units: IdName[];
    degree2_XC: FcuResult;
    degree1_CI: FcuResult;
  }>('old-term-105-1.json');
  const rows: CollectedRow[] = [
    ...old.degree2_XC.items!.map((item) => ({
      degree: DEGREES.find((d) => d.id === '2')!,
      college: { id: 'XC', name: '通識核心課' },
      item
    })),
    ...old.degree1_CI.items!.map((item) => ({ degree: DEGREES[0], college: { id: 'CI', name: '資電學院' }, item }))
  ];
  const units = new Map(old.units.map((u) => [u.id, u.name] as const));
  const offerings = buildOfferings({ year: 105, sms: 1, rows, units, languages: new Map(), englishTitles: new Map() });
  for (const offering of offerings) Offering.parse(offering);
  const night = offerings.find((o) => o.sourceId === '3628')!;
  assert.equal(night.departmentCode, 'XC01');
  assert.equal(night.extra?.班級代碼, 'XC01220');
  assert.deepEqual(night.schedule, [{ day: 3, periods: ['13', '14'], location: '資電107' }]);
  assert.match(night.sourceUrl, /courseid=10513628$/);
  // Row published with period `00` (time not scheduled) keeps no schedule but still maps.
  assert.equal(offerings.find((o) => o.sourceId === '2398')!.schedule, undefined);
  // Blank placeholders from older terms are dropped rather than copied.
  const blank = buildOfferings({
    year: 104,
    sms: 1,
    rows: [{ degree: DEGREES[0], college: { id: 'CI', name: '資電學院' }, item: { ...old.degree1_CI.items![0], scr_ldl: '無', scr_date: ' ~' } }],
    units,
    languages: new Map(),
    englishTitles: new Map()
  })[0];
  assert.equal(blank.extra?.上課方式, undefined);
  assert.equal(blank.extra?.開課期程, undefined);
});

test('ASMX helpers', async () => {
  assert.deepEqual(unwrapAsmx({ d: [1] }, 'x'), [1]);
  assert.throws(() => unwrapAsmx({ Message: '處理此要求時發生錯誤。', StackTrace: '' }, 'x'), /server error/);
  assert.equal(cleanText('  a\r\n b \u007f\r\n'), 'a\nb');
  assert.equal(cleanText(' '), undefined);
  assert.equal(syllabusToken('https://ilearntools.fcu.edu.tw/W320104/W320104_SyllabusFullVer.aspx?token=abc.def#!/fullVer/cht'), 'abc.def');
  const detail = await sample('syllabus-detail-2107.json');
  assert.match(descriptionFromDetail(detail)!, /^本課程主要設計給大學部工程與科學科系初級學生/);
});

test('dual-degree programs get their full name, not the 13-character unit column', async () => {
  const nm = await sample<{ units: IdName[]; items: FcuResult['items'] }>('nm-dual-degree-115-1.json');
  const rows: CollectedRow[] = nm.items!.map((item) => ({ degree: DEGREES[0], college: { id: 'NM', name: '國際科技與管理學院' }, item }));
  const units = new Map(nm.units.map((u) => [u.id, u.name] as const));
  const offerings = buildOfferings({ year: 115, sms: 1, rows, units, languages: new Map(), englishTitles: new Map() });
  for (const offering of offerings) Offering.parse(offering);

  // The judges saw 「美國加州舊金山州立大學資訊」 on 班級活動 of 資工二(SFSU): the right program, cut at 13 characters.
  const homeroom = offerings.find((o) => o.sourceId === '2838')!;
  assert.equal(homeroom.title, '班級活動');
  assert.equal(homeroom.departmentCode, 'NM07');
  assert.equal(homeroom.department, '美國加州舊金山州立大學資訊工程雙學士學位學程');
  assert.equal(homeroom.capacity, 30);
  assert.equal(homeroom.enrolled, 6);
  assert.equal(homeroom.extra?.開放名額, undefined);
  for (const offering of offerings) assert.equal(offering.extra && 'unt_ls' in offering.extra, false);

  // 開放名額 0 / 30 with 18 and 51 students: the class is pre-registered, so it is not a capacity.
  const calculus = offerings.find((o) => o.sourceId === '2836')!;
  assert.equal(calculus.capacity, undefined);
  assert.equal(calculus.enrolled, 18);
  assert.equal(calculus.extra?.開放名額, 0);
  assert.equal(offerings.find((o) => o.sourceId === '2823')!.extra?.開放名額, 30);

  // One 選課代碼 under the SJSU and SFSU classes keeps the first program and lists both classes.
  const mechanics = offerings.find((o) => o.sourceId === '2832')!;
  assert.equal(mechanics.department, '美國加州聖荷西州立大學電機工程雙學士學位學程');
  assert.equal(mechanics.extra?.開課班級, '電機一(SJSU)、資工一(SFSU)');
});

test('fullUnitName completes known truncations and marks unknown ones', () => {
  assert.equal(fullUnitName('澳洲新南威爾斯大學設計雙學'), '澳洲新南威爾斯大學設計雙學士學位學程');
  assert.equal(fullUnitName('智能製造與工程管理碩士在職'), '智能製造與工程管理碩士在職學位學程');
  // 13 characters with a complete ending stay as they are.
  assert.equal(fullUnitName('合作經濟暨社會事業經營學系'), '合作經濟暨社會事業經營學系');
  assert.equal(fullUnitName('AI智慧城市與生活學分學程'), 'AI智慧城市與生活學分學程');
  // Unknown cut names are marked instead of shown as whole.
  assert.equal(fullUnitName('公共事務與社會創新碩士在職'), '公共事務與社會創新碩士在職…');
  assert.equal(fullUnitName('資訊系'), '資訊系');
});

test('tidyOffering repairs old snapshots and is idempotent', () => {
  const old = {
    sourceId: '0095',
    courseCode: 'MATH1001',
    title: '微積分(一)實習',
    instructors: [],
    capacity: 5,
    enrolled: 59,
    sourceUrl: 'https://coursesearch02.fcu.edu.tw/CourseOutline.aspx?lang=cht&courseid=11510095',
    extra: { 開課班級: '通識選修', 班級代碼: 'XC07111', 開課學院: '通識中心', unt_ls: '8888' }
  } as Offering;
  const once = tidyOffering(old);
  assert.deepEqual(once, {
    sourceId: '0095',
    courseCode: 'MATH1001',
    title: '微積分(一)實習',
    instructors: [],
    department: '通識中心',
    enrolled: 59,
    sourceUrl: old.sourceUrl,
    extra: { 開課班級: '通識選修', 班級代碼: 'XC07111', 開課學院: '通識中心', 開放名額: 5 }
  });
  assert.deepEqual(tidyOffering(once), once);
  // Several colleges: no guess.
  assert.equal(tidyOffering({ ...old, extra: { 開課學院: '工科學院、資電學院' } }).department, undefined);
});
