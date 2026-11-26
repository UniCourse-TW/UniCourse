import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Offering } from '@unicourse/crawler-kit';
import { parseArchiveStages, parseCreditPage, parseDetail, parseStages } from './parse.ts';

const sample = (name: string) => readFileSync(new URL(`samples/${name}`, import.meta.url), 'utf8');

test('finds official extension credit stages with published terms', () => {
  const stages = parseStages(sample('credit.html'));
  assert.equal(stages.length, 6);
  assert.deepEqual(stages[0], { id: '895', name: '115-1 美術專業領域學分班(9-1月)', term: '115-1' });
  assert.throws(() => parseStages('<p>temporary error</p>'), /no published stages/);
});

test('keeps pagination in the requested stage and maps a real row', () => {
  const html = sample('credit.html');
  const [stage, other] = parseStages(html);
  const { offerings, pages } = parseCreditPage(html, stage);
  assert.deepEqual(pages, [2]);
  const [offering] = offerings.map((row) => Offering.parse(row));
  assert.equal(offering.sourceId, '25413');
  assert.equal(offering.sourceUrl, 'https://eec.ntua.edu.tw/Course/Detail/25413');
  assert.equal(offering.title, '繪畫基礎Ⅰ');
  assert.equal(offering.department, '美術系');
  assert.deepEqual(offering.instructors, ['林宏信']);
  assert.deepEqual(offering.schedule, [{ day: 6, periods: ['14:10-17:00'], location: '美術3003' }]);
  assert.equal(offering.scheduleText, '(六)14:10-17:00 / 美術3003');
  assert.equal(offering.extra?.資料範圍, '推廣教育學分班（非全校課表）');
  assert.throws(() => parseCreditPage(html, other), /mismatched stage/);
});

test('enriches a listing with syllabus, description, seats and credits', () => {
  const html = sample('credit.html');
  const [stage] = parseStages(html);
  const { offerings: [listing] } = parseCreditPage(html, stage);
  const detail = sample('detail.html');
  const offering = Offering.parse(parseDetail(detail, listing));
  assert.equal(offering.credits, 3);
  assert.equal(offering.capacity, 30);
  assert.equal(offering.extra?.時數, '54 hrs');
  assert.equal(offering.syllabusUrl, listing.sourceUrl);
  assert.match(offering.description ?? '', /^以水性材料技法為主/);
  assert.throws(() => parseDetail(detail.replaceAll('/25413', '/25414'), listing), /unexpected detail page/);
});

test('includes publicly archived credit stages and preserves multiple time ranges', () => {
  const stages = parseArchiveStages(sample('archive-index.html'));
  assert.deepEqual(stages.map(({ id }) => id), ['903', '877']);
  assert.equal(stages[0].term, '115-1');
  const { offerings: [archived] } = parseCreditPage(sample('archive-list.html'), stages[0]);
  assert.equal(archived.title, '動態素描Ⅱ');
  assert.equal(archived.sourceUrl, 'https://eec.ntua.edu.tw/PastCourse/Detail/25095');
  assert.deepEqual(archived.schedule, [{ day: 1, periods: ['13:10-16:00', '09:10-12:00'], location: '雕塑4003' }]);
});
