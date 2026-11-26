import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Offering } from '@unicourse/crawler-kit';
import { parseFilters, parseIntroduction, parseSearch, toOffering } from './parse.ts';
import { fieldList, tidyOffering } from './tidy.ts';

const sample = (name: string) => readFileSync(new URL(`samples/${name}`, import.meta.url), 'utf8');

test('reads official term and department options, including summer term code', () => {
  const { terms, departments } = parseFilters(sample('filters.html'));
  assert.equal(terms.get('115-1'), '1151');
  assert.equal(terms.get('114-3'), '1144');
  assert.deepEqual(departments[0], { code: 'CA111', name: '音樂學系' });
  assert.equal(departments[1].code, 'CAA01');
  assert.throws(() => parseFilters('<p>temporary error</p>'), /missing advanced search filters/);
});

test('maps real music department rows and keeps official offering IDs', () => {
  const { departments } = parseFilters(sample('filters.html'));
  const rows = parseSearch(JSON.parse(sample('search.json')));
  const [forum, lecture, ensemble, workshop] = rows.map((row) => Offering.parse(toOffering(row, '1151', departments[0])));
  assert.equal(forum.sourceId, '1151-1110001');
  assert.equal(forum.courseCode, forum.sourceId);
  assert.equal(forum.title, '專題演講');
  assert.equal(forum.titleEn, 'Forum');
  assert.equal(forum.departmentCode, 'CA111');
  assert.equal(forum.requirement, 'required');
  assert.equal(forum.capacity, undefined);
  assert.equal(forum.enrolled, 213);
  assert.equal(forum.extra?.上限, '無');
  assert.deepEqual(forum.schedule, [{ day: 1, periods: ['5', '6'], location: 'M2601' }]);
  assert.equal(lecture.credits, 0.5);
  // 選課上限 0 with students enrolled by the department is not a capacity (see tidy.ts).
  assert.equal(lecture.capacity, undefined);
  assert.ok(lecture.enrolled! > 0);
  assert.equal(lecture.schedule, undefined);
  assert.equal(lecture.scheduleText, '師生商定');
  assert.deepEqual(ensemble.schedule, [{ day: 2, periods: ['5', '6', 'N'] }, { day: 3, periods: ['7', '8'] }]);
  assert.equal(ensemble.scheduleText, '(二)5,6,N(三)7,8 / M2601,M2602');
  assert.deepEqual(workshop.instructors, ['肯恩 保羅', '蔡佳憓']);
  assert.throws(() => toOffering(rows[0], '1142', departments[0]), /invalid identity/);
  assert.equal(toOffering({ ...rows[0], SumSelected: '0' }, '1151', departments[0]).enrolled, 0);
  assert.equal(toOffering({ ...rows[0], SumSelected: '—' }, '1151', departments[0]).enrolled, undefined);
});

test('distinguishes empty listings from server errors and malformed rows', () => {
  assert.deepEqual(parseSearch({ d: { Status: 2 } }), []);
  assert.throws(() => parseSearch({ d: { Status: 1 } }), /invalid search result/);
  assert.throws(() => parseSearch({ d: { Status: 0, ReturnDatas: { Class: [{ CourseID: '1151-1110001' }] } } }), /unexpected course row/);
});

test('extracts the course description without the rest of the syllabus', () => {
  const description = parseIntroduction(JSON.parse(sample('intro.json')));
  assert.match(description ?? '', /^本課程是針對不同背景/);
  assert.doesNotMatch(description ?? '', /評分標準/);
  assert.equal(parseIntroduction({ d: null }), undefined);
});

test('maps old-term rows from a unit that is absent from the department dropdown', () => {
  const rows = parseSearch(JSON.parse(sample('search-109-2-ca071.json')));
  assert.ok(rows.length > 0);
  for (const row of rows) {
    const offering = Offering.parse(toOffering(row, '1092', { code: 'CA071' }));
    assert.match(offering.sourceId, /^1092-071/);
    assert.equal(offering.departmentCode, 'CA071');
    assert.equal(offering.department, undefined);
    assert.equal(typeof offering.enrolled, 'number');
  }
});

test('tidyOffering decodes 領域 and drops a 0 limit with students', () => {
  assert.equal(
    fieldList('輔系理論組-藝術創作理論&amp;基礎課程,輔系理論組-藝術創作理論&amp;基礎課程,輔系創作組-理論課程,'),
    '輔系理論組-藝術創作理論&基礎課程、輔系創作組-理論課程'
  );
  const old = {
    sourceId: '1151-1110002',
    courseCode: '1151-1110002',
    title: '室內樂',
    instructors: [],
    capacity: 0,
    enrolled: 1,
    sourceUrl: 'https://selcrs1.tnua.edu.tw/CourseSearch/AdvancedSearch.aspx',
    extra: { 領域: '合唱或管絃樂合奏,', 選課對象: '不開放', 學期別: '學期' }
  } as Offering;
  const once = tidyOffering(old);
  assert.equal(once.capacity, undefined);
  assert.deepEqual(once.extra, { 領域: '合唱或管絃樂合奏', 選課對象: '不開放', 學期別: '學期' });
  assert.deepEqual(tidyOffering(once), once);
  assert.equal(tidyOffering({ ...old, enrolled: 0 }).capacity, 0);
});
