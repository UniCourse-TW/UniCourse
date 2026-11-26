import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeEntities, htmlToText, oneLineText, remapExtra, stripControl, withExtra, withoutPlaceholderInstructors, type Offering } from './index.ts';

test('decodeEntities handles named, decimal and hex entities and leaves unknown ones', () => {
  assert.equal(decodeEntities('Mentor&#39;s Hours'), "Mentor's Hours");
  assert.equal(decodeEntities('藝術創作理論&amp;基礎課程'), '藝術創作理論&基礎課程');
  assert.equal(decodeEntities('a&#x27;b&nbsp;c &bogus; &#0;'), "a'b c &bogus; &#0;");
});

test('stripControl removes DEL and C0 controls but keeps newlines and tabs', () => {
  assert.equal(stripControl('須先修過\u007f語言學\n相關\t課程\u0001'), '須先修過語言學\n相關\t課程');
});

test('oneLineText collapses NBSP, tabs and ideographic spaces', () => {
  assert.equal(oneLineText('B02   循環經濟研究學院\t(研究所)　'), 'B02 循環經濟研究學院 (研究所)');
});

test('htmlToText turns br/div markup into lines', () => {
  assert.equal(
    htmlToText('<div>\n  擋修對象 : 全校 <br>\n  先修科目 : <BR><BR>未修過人工智慧導論<BR><br>上述條件&amp;規定</div>'),
    '擋修對象 : 全校\n先修科目 :\n未修過人工智慧導論\n上述條件&規定'
  );
});

test('remapExtra renames, drops, rewrites and is idempotent', () => {
  const rules = {
    unt_ls: null,
    core: '核心通識',
    cos_hours: (value: string | number | boolean | null) => ['上課時數', Number(value)] as [string, number]
  };
  const once = remapExtra({ unt_ls: '5000', core: '否', cos_hours: '2.00', 學制: '大學部' }, rules);
  assert.deepEqual(once, { 核心通識: '否', 上課時數: 2, 學制: '大學部' });
  assert.deepEqual(remapExtra(once, rules), once);
  assert.equal(remapExtra({ unt_ls: '1' }, rules), undefined);
});

test('withExtra drops an empty extra', () => {
  const offering = { sourceId: '1', courseCode: 'A', title: 't', instructors: [], sourceUrl: 'https://x.test/', extra: { a: 1 } } as Offering;
  assert.equal('extra' in withExtra(offering, undefined), false);
  assert.deepEqual(withExtra(offering, { b: 2 }).extra, { b: 2 });
});

test('withoutPlaceholderInstructors drops 未定/待聘 and bare staff numbers only', () => {
  const offering = { sourceId: '1', courseCode: 'A', title: 't', instructors: ['728933822', '林岳喬', '未定', '待聘', 'Ann Lee'], sourceUrl: 'https://x.test/' } as Offering;
  assert.deepEqual(withoutPlaceholderInstructors(offering).instructors, ['林岳喬', 'Ann Lee']);
  const clean = { ...offering, instructors: ['林岳喬'] };
  assert.equal(withoutPlaceholderInstructors(clean), clean);
});
