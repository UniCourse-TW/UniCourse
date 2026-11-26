import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { EXCERPT_MAX } from '@unicourse/crawler-kit';
import { parseArticle, parseListPage, parsePushScore, parsePttTime, parseReviewTitle, timeFromArticleId } from './parse.ts';

// Trimmed real pages (2026-11-27); author IDs, IPs and push texts replaced with placeholders.
const sample = (name: string) => readFile(new URL(`./samples/${name}`, import.meta.url), 'utf8');

test('list pages: entries, push scores, article-id times and the previous page', async () => {
  const page = parseListPage(await sample('list-NTUcourse-index600.html'));
  assert.equal(page.previous, 599);
  assert.equal(page.entries.length, 8);
  const review = page.entries.find((entry) => entry.title === '[通識] A4 從醫學看生死 周希諴 (100-1)');
  assert.ok(review);
  assert.equal(review.url, 'https://www.ptt.cc/bbs/NTUcourse/M.1329500686.A.4A1.html');
  assert.equal(review.postedAt, '2012-02-17T17:44:46Z');
  assert.equal(review.pushScore, 14);
  assert.match(review.author ?? '', /^sample\d\d$/);

  // Pinned posts after `.r-list-sep` are left out.
  const newest = parseListPage(await sample('list-NTUcourse-newest.html'));
  assert.equal(newest.previous, 1401);
  assert.deepEqual(
    newest.entries.map((entry) => entry.title),
    ['[評價] 114-2 郭昱瑩 社會科學研究方法', '[評價] 111-1 呂學一 量子演算法']
  );
  assert.equal(parseListPage(await sample('list-NCHU-Courses-newest.html')).entries.length, 6);
});

test('push scores and times', () => {
  assert.deepEqual(['', '7', '爆', 'X3', 'XX'].map(parsePushScore), [0, 7, 100, -30, -100]);
  assert.equal(parsePttTime('Sat Jul 11 17:00:21 2026'), '2026-07-11T09:00:21Z');
  assert.equal(parsePttTime('Thu Jan  1 07:00:00 2026'), '2025-12-31T23:00:00Z');
  assert.equal(parsePttTime('nonsense'), undefined);
  assert.equal(timeFromArticleId('https://www.ptt.cc/bbs/X/M.1783760423.A.F3A.html'), '2026-07-11T09:00:23Z');
  assert.equal(timeFromArticleId('https://www.ptt.cc/bbs/X/index.html'), undefined);
});

test('articles: header fields, exact push tally and a short excerpt without comments or images', async () => {
  const ntu = parseArticle(await sample('article-NTUcourse.html'));
  assert.equal(ntu.author, 'sample01');
  assert.equal(ntu.postedAt, '2026-07-11T09:00:21Z');
  assert.equal(ntu.pushScore, 1); // 推 推 噓 →
  assert.ok(ntu.excerpt);
  assert.ok([...ntu.excerpt].length <= EXCERPT_MAX);
  // The ※ consent line and its 是 answer are dropped; the body starts with the template.
  assert.ok(ntu.excerpt.startsWith('哪一學年度修課： 114-2 ψ 授課教師'), ntu.excerpt);
  assert.ok(!ntu.excerpt.includes('推文內容'));

  // An author who answered 否 gets no excerpt.
  const refused = (await sample('article-NTUcourse.html')).replace(/\n\s+是\n/, '\n        否\n');
  assert.equal(parseArticle(refused).excerpt, undefined);

  const nthu = parseArticle(await sample('article-NTHU_Course.html'));
  assert.ok(nthu.excerpt?.startsWith('課名：應用機率模型 科號：STAT502000 老師：黃文瀚'));

  const nchu = parseArticle(await sample('article-NCHU-Courses.html'));
  assert.ok(nchu.excerpt);
  assert.ok(!/imgur|https?:/.test(nchu.excerpt), nchu.excerpt);
  assert.ok(!nchu.excerpt.includes('發信站'));
});

test('review titles: term, course title and teachers', () => {
  const cases: [string, ReturnType<typeof parseReviewTitle>][] = [
    ['[評價] 113-1 普通物理 王小明', { tag: '評價', term: '113-1', courseTitle: '普通物理', teachers: ['王小明'] }],
    ['[評價] 114-2 郭昱瑩 社會科學研究方法', { tag: '評價', term: '114-2', courseTitle: '社會科學研究方法', teachers: ['郭昱瑩'] }],
    ['[評價] 111-1 呂學一 量子演算法', { tag: '評價', term: '111-1', courseTitle: '量子演算法', teachers: ['呂學一'] }],
    ['[評價] 100全 梁欣榮/侯慧如 英文作文一', { tag: '評價', term: undefined, courseTitle: '英文作文一', teachers: ['梁欣榮', '侯慧如'] }],
    ['[通識] A4 從醫學看生死 周希諴 (100-1)', { tag: '通識', term: '100-1', courseTitle: '從醫學看生死', teachers: ['周希諴'] }],
    ['[心得] 應用機率模型 黃文瀚', { tag: '心得', term: undefined, courseTitle: '應用機率模型', teachers: ['黃文瀚'] }],
    ['[心得] 電子所 劉志尉 計算機結構', { tag: '心得', term: undefined, courseTitle: '計算機結構', teachers: ['劉志尉'] }],
    ['[心得] 113-1 簡仁宗、梁伯嵩 大型語言模型', { tag: '心得', term: '113-1', courseTitle: '大型語言模型', teachers: ['簡仁宗', '梁伯嵩'] }],
    ['[心得] 通識/356/性別與親密關係/蔡素琴', { tag: '心得', term: undefined, courseTitle: '性別與親密關係', teachers: ['蔡素琴'] }],
    ['[心得] 1072/通識/356/性別與親密關係/蔡素琴', { tag: '心得', term: '107-2', courseTitle: '性別與親密關係', teachers: ['蔡素琴'] }],
    ['[評價] 106(全)梁明義 總體經濟學', { tag: '評價', term: undefined, courseTitle: '總體經濟學', teachers: ['梁明義'] }],
    ['[評價] 107-暑 王道一 經濟學原理上', { tag: '評價', term: '107-3', courseTitle: '經濟學原理上', teachers: ['王道一'] }],
    // Unknown name order falls back to course first; ingest also tries the swap.
    ['[評價] 107-暑 拉貝明契 德文一上下', { tag: '評價', term: '107-3', courseTitle: '拉貝明契', teachers: ['德文一上下'] }],
    ['Re: [問題] 請問何憲章老師投資學', { tag: '問題', term: undefined, courseTitle: '投資學', teachers: ['何憲章'] }],
    ['[公告] NTUCourse板板規', { tag: '公告', term: undefined, courseTitle: 'NTUCourse板板規', teachers: undefined }]
  ];
  for (const [title, expected] of cases) assert.deepEqual(parseReviewTitle(title), expected, title);
});
