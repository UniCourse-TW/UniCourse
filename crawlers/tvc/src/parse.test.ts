import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Snapshot, buildSnapshot, type Institution } from '@unicourse/crawler-kit';
import { SITES, exportState, hiddenFields, normalizeSchoolName, parseRows, querySummary, sheetRows } from './parse.ts';
import { eligibleSchools, sitesFor } from './schools.ts';
import { readXlsx, xmlText } from './xlsx.ts';

const sample = (name: string) => readFile(new URL(`./samples/${name}`, import.meta.url));

test('WebForms page: hidden fields, totals and export state', async () => {
  const html = (await sample('web_nu-query.html')).toString('utf8');
  const fields = hiddenFields(html);
  assert.equal(fields.__VIEWSTATEGENERATOR, 'D48B8929');
  assert.equal(fields['ctl00$hfCSRFToken'], '00000000-0000-0000-0000-000000000000');
  assert.equal(fields['ctl00$QueryPH$SearchBar_Course1$Area2'], '');
  assert.deepEqual(querySummary(html), { courses: 2526, departments: 172, schools: 1 });
  assert.equal(exportState(html), '進度：處理完畢');
  assert.deepEqual(querySummary('<p>無相關課程</p>'), { courses: 0, departments: 0, schools: 0 });
  assert.equal(exportState('<p></p>'), undefined);
});

test('xlsx reader decodes inline and shared strings', async () => {
  assert.equal(xmlText('a&amp;b&#x4E2D;&#25991;_x000D_'), 'a&b中文\r');
  const [summary, data] = readXlsx(await sample('web_nt-ntust-115-1.xlsx'));
  assert.deepEqual(summary, [['學校數', '課程數'], ['1', '2']]);
  assert.equal(data[0][0], '系統序號');
  assert.equal(data.length, 3);
});

test('大學校院 rows: code sections, syllabus links, extra fields', async () => {
  const rows = sheetRows(readXlsx(await sample('web_nu-nsysu-115-1.xlsx')));
  const { offerings, skipped } = parseRows(rows, { schoolNames: ['國立中山大學'], year: 115, semester: 1, site: 'web_nu' });
  assert.deepEqual(skipped, { otherSchool: 0, otherTerm: 0, untitled: 0 });
  assert.deepEqual(
    offerings.map((offering) => offering.sourceId).sort(),
    ['GHRM503', 'GHRM652', 'PHYS309#1', 'PHYS309#2', 'PHYS309#3']
  );
  const hrm = offerings.find((offering) => offering.sourceId === 'GHRM503')!;
  assert.equal(hrm.courseCode, 'GHRM503');
  assert.equal(hrm.title, '人力資源管理');
  assert.deepEqual(hrm.instructors, ['施欣宜']);
  assert.equal(hrm.department, '人力資源管理全英語碩士學位學程');
  assert.equal(hrm.credits, 3);
  assert.equal(hrm.requirement, 'elective');
  assert.equal(hrm.enrolled, 28);
  assert.equal(hrm.language, '英語');
  assert.equal(hrm.grade, '1');
  assert.match(hrm.syllabusUrl!, /^http:\/\/selcrs\.nsysu\.edu\.tw\/menu5\/saveoutline\.asp\?SYEAR=115&SEM=1&CrsDat=GHRM503$/);
  assert.equal(hrm.sourceUrl, SITES.web_nu.url);
  assert.equal(hrm.extra?.['學院名稱'], '管理學院');
  assert.equal(hrm.extra?.['學制'], '碩士班');
  assert.equal(hrm.extra?.['女學生修課人數'], 26);
  // Grade 0 means 不分年級 and is omitted.
  assert.equal(offerings.find((offering) => offering.sourceId === 'GHRM652')!.grade, undefined);
  const snapshot = buildSnapshot({ school: 'nsysu', term: '115-1', source: SITES.web_nu, offerings });
  assert.equal(snapshot.schoolName, '國立中山大學');
  assert.ok(Snapshot.safeParse(snapshot).success);
});

test('技職校院 rows use 科系 and drop other schools and terms', async () => {
  const rows = sheetRows(readXlsx(await sample('web_nt-ntust-115-1.xlsx')));
  const extra = [
    { ...rows[0], 校名: '國立臺灣科技大學附設進修學院', 課號: 'X1' },
    { ...rows[0], 開課學期名稱: '下學期', 課號: 'X2' },
    { ...rows[0], 課程名稱: '', 課號: 'X3' }
  ];
  const result = parseRows([...rows, ...extra], { schoolNames: ['國立臺灣科技大學'], year: 115, semester: 1, site: 'web_nt' });
  assert.deepEqual(result.skipped, { otherSchool: 1, otherTerm: 1, untitled: 1 });
  assert.deepEqual(result.otherSchools, ['國立臺灣科技大學附設進修學院']);
  const [first] = result.offerings;
  assert.equal(first.sourceId, 'AC5004701');
  assert.equal(first.department, '自動化及控制研究所');
  assert.equal(first.extra?.['部別'], '日間部');
  assert.equal(first.sourceUrl, SITES.web_nt.url);
});

test('placeholders are not data', () => {
  const base = { 校名: '淡江大學學校財團法人淡江大學', 開課年度: '115', 開課學期名稱: '上學期', 課程名稱: '專題', 系所名稱: '資工系' };
  const { offerings } = parseRows(
    [
      { ...base, 系統序號: '2', 開課老師: '無', 課程大綱: '依規定免登', 學分數: 'x', 總修課人數: '', 課程連結: '詳見系網' },
      { ...base, 系統序號: '1', 開課老師: '王大明,李小華、王大明', 科目類別_: '通識科目', 必選修_: '必修', 學分數: '1.5' }
    ],
    { schoolNames: ['淡江大學'], year: 115, semester: 1, site: 'web_nu' }
  );
  // Without a 課號 the course code falls back to department/title, numbered by sort key.
  assert.deepEqual(offerings.map((offering) => offering.sourceId), ['資工系/專題#1', '資工系/專題#2']);
  // Ordered by department, grade, instructors: the row without instructors sorts first.
  const [empty, named] = offerings;
  assert.deepEqual(named.instructors, ['王大明', '李小華']);
  assert.equal(named.requirement, 'general');
  assert.equal(named.credits, 1.5);
  assert.deepEqual(empty.instructors, []);
  assert.equal(empty.description, undefined);
  assert.equal(empty.credits, undefined);
  assert.equal(empty.enrolled, undefined);
  assert.equal(empty.syllabusUrl, undefined);
  assert.equal(empty.extra?.['課程連結'], '詳見系網');
});

test('school names and eligibility', () => {
  assert.equal(normalizeSchoolName('淡江大學學校財團法人淡江大學'), '淡江大學');
  assert.equal(normalizeSchoolName('台北海洋科技大學'), '臺北海洋科技大學');
  const school = (slug: string, system: Institution['system'] = 'general') =>
    ({ slug, name: slug, code: '0000', nameEn: null, kind: 'university', ownership: 'public', city: null, website: null, system }) as Institution;
  const status = {
    ntu: { status: 'live', note: 'x', issue: null },
    ntua: { status: 'partial', note: 'x', issue: null },
    ncku: { status: 'live', note: 'x', issue: 1, source: 'tvc' }
  } as const;
  const eligible = eligibleSchools([school('ntu'), school('ntua'), school('ncku'), school('nsysu')], status);
  assert.deepEqual(eligible.map((item) => item.slug), ['ncku', 'nsysu']);
  assert.deepEqual(sitesFor(school('ntust', 'technical')), ['web_nt', 'web_nu']);
  assert.deepEqual(sitesFor(school('nsysu')), ['web_nu', 'web_nt']);
  // The real registry never hands a directly crawled school to this crawler.
  const real = eligibleSchools().map((item) => item.slug);
  for (const slug of ['ntu', 'ntnu', 'nycu', 'nthu', 'nccu', 'nchu', 'ccu', 'fcu', 'tnua', 'ntua']) {
    assert.ok(!real.includes(slug), slug);
  }
});
