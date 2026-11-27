import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { EXCERPT_MAX } from '@unicourse/crawler-kit';
import { fitSentences, selectExcerpt } from './excerpt.ts';
import { parseArticle, parseListPage, parsePushScore, parsePttTime, parseReviewTitle, reuseConsent, timeFromArticleId } from './parse.ts';

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

test('articles: header fields, exact push tally, and no comments or images in the excerpt', async () => {
  const ntu = parseArticle(await sample('article-NTUcourse.html'));
  assert.equal(ntu.author, 'sample01');
  assert.equal(ntu.postedAt, '2026-07-11T09:00:21Z');
  assert.equal(ntu.pushScore, 1); // 推 推 噓 →
  assert.ok(ntu.excerpt && !ntu.excerpt.includes('推文內容'));

  const nchu = parseArticle(await sample('article-NCHU-Courses.html'));
  assert.ok(nchu.excerpt);
  assert.ok(!/imgur|https?:/.test(nchu.excerpt), nchu.excerpt);
  assert.ok(!nchu.excerpt.includes('發信站'));
});

test('excerpts are the opinion answer of each board template, not its fact header', async () => {
  // NTUcourse: Ψ 總結 wins over Ω (ratings only) and ω 其它; facts such as `10% 課堂出席及參與` never count.
  assert.equal(
    parseArticle(await sample('article-NTUcourse.html')).excerpt,
    '說真的這堂課 上課簡報到考題設計、作業規範等 對於了解社會科學研究方法的操作十分有限 但感覺也是因為大二必修 老師也沒有辦法講些很深入的東西 並且要把質化量化塞進一學期內 也不能說老師不用心 是各種原因使然導致整堂課感覺偏水'
  );
  // NCTU-Teacher: ￠最後想說的話￠ (symbol-wrapped labels); the author's line breaks become spaces.
  assert.equal(
    parseArticle(await sample('article-NCTU-Teacher.html')).excerpt,
    '沒有基礎可以直接修，loading 不會太重 我是期中考前一個禮拜開始準備，中間有一些表格要記熟 期末專題是靠大神隊友 carry，不過助教還是會教一下基本的介面操作 跟其他有開這門課的老師比起來應該算偏涼很多'
  );
  // NTHU_Course: `老師的喜好、個性：` (label and colon); the `給加簽嗎?` question is a field of its own.
  assert.equal(
    parseArticle(await sample('article-NTHU_Course.html')).excerpt,
    '老師人很好，很希望學生能和他在課堂上互動，但大部分的人好像很害羞?'
  );
  // NCHU-Courses: 【心得/結語】.
  assert.equal(parseArticle(await sample('article-NCHU-Courses.html')).excerpt, '這堂課真的會學到很多東西，是很棒的課 但是真的硬');

  for (const name of ['article-NTUcourse.html', 'article-NCTU-Teacher.html', 'article-NTHU_Course.html', 'article-NCHU-Courses.html']) {
    const excerpt = parseArticle(await sample(name)).excerpt ?? '';
    assert.ok([...excerpt].length <= EXCERPT_MAX, name);
    assert.ok(!/[★☆ψλδΩωΨ⊕▲￡￥￠【】]/u.test(excerpt), `${name}: ${excerpt}`);
  }
});

test('the NTUcourse reuse answer: 否 removes the excerpt, on its own line or after the prompt', async () => {
  const html = await sample('article-NTUcourse.html');
  assert.ok(parseArticle(html).excerpt);
  assert.equal(parseArticle(html.replace(/\n\s+是\n/, '\n        否\n')).excerpt, undefined);
  assert.equal(parseArticle(html.replace(/：\n\n\s+是\n/, '：否\n')).excerpt, undefined);
  assert.equal(parseArticle(html.replace(/\n\s+是\n/, '\n        不同意\n')).excerpt, undefined);
  // 是 and conditions keep it; the answer never becomes part of the excerpt.
  assert.ok(parseArticle(html.replace(/\n\s+是\n/, '\n        其他條件：註明出處\n')).excerpt);

  assert.equal(reuseConsent(['※ 本文是否可提供臺大同學轉作其他非營利用途？（須保留原作者 ID）', '（是／否／其他條件）：否']).answer, '否');
  assert.equal(reuseConsent(['※ 本文是否可提供臺大同學轉作其他非營利用途？（須保留原作者 ID） （是／否／其他條件）：', '', '是']).answer, '是');
  // Left blank: the next field is not taken for the answer.
  assert.equal(reuseConsent(['（是／否／其他條件）：', '哪一學年度修課：', '110-2']).answer, undefined);
  assert.equal(reuseConsent(['課名：微積分']).indexes.length, 0);
});

test('excerpt selection on trimmed template variants', () => {
  // A short verdict still counts when it is all there is; `爽課` alone (2 letters) does not.
  assert.equal(selectExcerpt(['甜度：3  涼度：4  難度：3', '【評分方式】期中期末一次', '【修課心得】算是好課']), '算是好課');
  assert.equal(selectExcerpt(['甜度：5  涼度：5  難度：1', '【評分方式】老師很愛點名，成績超好拿', '【修課心得】爽課']), undefined);
  // Prose right after one-line facts is the review, not the facts' value wrapping.
  assert.equal(
    selectExcerpt(['從天堂到人間', '', '甜度：2  涼度：5  難度：4', '簡單來講，', '課程的涼度是很夠的，', '但是因為學校政策的關係，', '學期的成績平均會控制在B，']),
    '簡單來講，課程的涼度是很夠的，但是因為學校政策的關係，學期的成績平均會控制在B'
  );
  // A free-form review after a fact with an inline value, and a `--` divider inside a field.
  assert.equal(selectExcerpt(['▲教授▲  林國瑞', '其實他是個好人，只是教學技巧有點跳。']), '其實他是個好人，只是教學技巧有點跳。');
  assert.equal(
    selectExcerpt(['￡教了什麼￡', '  整學期選擇六個實驗操作。', '  --', '  或可以自己做專題。', ...Array(10).fill('  內容'), '￥其他￥', '  助教人很好，報告不難寫。']),
    '助教人很好，報告不難寫。'
  );
  // Fields with other labels (`<學習>`, `【助教表現】`) are free text.
  assert.equal(selectExcerpt(['課名：離散數學', '學分：3', '<學習>', '老師會把一些觀念解釋得很清楚。']), '老師會把一些觀念解釋得很清楚。');
  // No opinion answer: an empty 【心得/結語】 gives no excerpt rather than template facts (`老師PPT`).
  assert.equal(
    selectExcerpt(['【修業學年度/學期】', '1072', '【上課方式/用書】（體育課請加註上課地點或範圍）', '老師PPT', '【評分方式】', '期末考', '【心得/結語】', '', '【成績參考】', '']),
    undefined
  );
  // A one-word 總結 loses to a later field with real sentences.
  assert.equal(
    selectExcerpt(['Ψ 總結', '一個字 修爆', 'ω 其它(是否注重出席率？)', '老師人很好，上課也很有趣，推薦大家來修這門課']),
    '老師人很好，上課也很有趣，推薦大家來修這門課'
  );
  // Free-form post: the text is the review; a quoted reply (`: …`) is not the author's text.
  assert.equal(
    selectExcerpt([': ψ 授課教師 王小明', ': 原文的心得很長', '', '同意原po，這門課作業很多但是學到很多。']),
    '同意原po，這門課作業很多但是學到很多。'
  );
  // NTHU style: one-line facts (a textbook wrapping onto the next line), then the review without a label.
  assert.equal(
    selectExcerpt([
      '課名：計算機結構',
      '課本：Computer Organization and Design RISC-V',
      'Edition: The Hardware/Software Interface',
      '學分：3',
      '涼度：★★★',
      '',
      '老師教得很清楚，作業份量適中。'
    ]),
    '老師教得很清楚，作業份量適中。'
  );
  // A hint in parentheses on the line after a bare label is not an answer.
  assert.equal(selectExcerpt(['心得：', '(有唸就有分?甜不甜?)', '給分超級甜，佛到不行讓我有一點愧疚。']), '給分超級甜，佛到不行讓我有一點愧疚。');
  // Templates copied without their symbols.
  assert.equal(
    selectExcerpt([
      '授課教師 (若為多人合授請寫開課教師，以方便收錄)',
      '林俊宏 教授',
      '私心推薦指數(以五分計) ★★★★★ 五顆星',
      '其它(是否注重出席率？如果為外系選修，需先有什麼基礎較好嗎？)',
      '不懂下課問老師，老師都會很樂意回答你。'
    ]),
    '不懂下課問老師，老師都會很樂意回答你。'
  );
  assert.equal(
    selectExcerpt(['課名', '哲學概論', '教授', '王冠生', '教了什麼（課程大概內容。或是額外學會了什麼東西。）', '整學期的重心建立批判性思考', '其他', '老師人很好，有問題可以直接提出來。']),
    '老師人很好，有問題可以直接提出來。'
  );
  // Mail-style forwards: `發信人:`/`標  題:` headers and `> ` quotes are skipped.
  assert.equal(
    selectExcerpt(['發信人: someone (x) 看板: NCTU-Teacher', '標  題: [心得] 胡正光老師的兩門通識', '發信站: 無名小站 (2008/03/04 Tue 20:38:05)', '> 作者: other (y) 看板: NCTU-Teacher', '> ⊕課名⊕', '', '之前的文章有人說胡正光老師的評價很兩極。']),
    '之前的文章有人說胡正光老師的評價很兩極。'
  );
  // Forward headers and signatures inside the body are skipped.
  assert.equal(
    selectExcerpt([
      '作者: someone (x) 看板: NCTU-Teacher',
      '標題: [心得] 王小明 微積分',
      '時間: Sun Jul 10 12:54:48 2016',
      '',
      '老師上課很認真，考試不難。',
      '--',
      '簽名檔很長很長很長很長'
    ]),
    '老師上課很認真，考試不難。'
  );
  // Lines the editor wrapped (long lines in a row) are joined; the author's own line breaks and numbered items
  // start a new sentence.
  const indent = ' '.repeat(17);
  assert.equal(
    selectExcerpt([
      'Ψ 總結',
      `${indent}期中期末的出題方式類似，大概都是前兩大題會有比較簡單的是非題問你這`,
      `${indent}個set是符合open還是closed，後面會出幾題跟上課類似的證明或是比較難的`,
      `${indent}證明。`,
      `${indent}1.老師人很好`,
      `${indent}2.助教也很好`
    ]),
    '期中期末的出題方式類似，大概都是前兩大題會有比較簡單的是非題問你這個set是符合open還是closed，後面會出幾題跟上課類似的證明或是比較難的證明。1.老師人很好 2.助教也很好'
  );
  // Colour-code residue before a field marker.
  assert.equal(selectExcerpt(['ω 其它', '常停課、補課。', '[▁      Ψ 總結', '老師人很好 不要欺負他']), '老師人很好 不要欺負他');
  // A wrapped paragraph written double-spaced.
  assert.equal(
    selectExcerpt(['Ψ 總結', `${indent}一開始覺得每週換老師、每次都要重新適應不同的教學有些難適應。但後來覺得能`, '', `${indent}學到不同老師的專長也很好。`]),
    '一開始覺得每週換老師、每次都要重新適應不同的教學有些難適應。但後來覺得能 學到不同老師的專長也很好。'
  );
  assert.equal(
    selectExcerpt(['【心得/結語】', '       期末專題是靠大神隊友 carry，不過助教還是會教一下基本的介面操作', '       跟其他老師比起來應該算偏涼很多']),
    '期末專題是靠大神隊友 carry，不過助教還是會教一下基本的介面操作 跟其他老師比起來應該算偏涼很多'
  );
});

test('excerpts stop at a sentence boundary within 120 characters', () => {
  const sentence = '這門課很好。';
  assert.equal(fitSentences(Array(30).fill(sentence)), sentence.repeat(20));
  // A single sentence longer than the limit is cut at a clause and marked.
  const long = `${'老師人很好'.repeat(10)}，${'作業很多'.repeat(20)}`;
  const cut = fitSentences([long]) ?? '';
  assert.equal(cut, `${'老師人很好'.repeat(10)}…`);
  assert.ok([...cut].length <= EXCERPT_MAX);
  assert.ok([...(fitSentences(['字'.repeat(300)]) ?? '')].length <= EXCERPT_MAX);
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
    ['Fw: [心得] 台灣史-楊凡逸', { tag: '心得', term: undefined, courseTitle: '台灣史', teachers: ['楊凡逸'] }],
    ['[心得] 熱統計物理一--吳國安', { tag: '心得', term: undefined, courseTitle: '熱統計物理一', teachers: ['吳國安'] }],
    ['Fw: [心得] 張巧螓－日文(一)', { tag: '心得', term: undefined, courseTitle: '日文(一)', teachers: ['張巧螓'] }],
    ['[心得] [通識平台] 陳柏偉 音樂創作與台灣社會運', { tag: '心得', term: undefined, courseTitle: '音樂創作與台灣社會運', teachers: ['陳柏偉'] }],
    ['Fw: [心得] 德文(一)(二)  (轉錄)', { tag: '心得', term: undefined, courseTitle: '德文(一)(二)', teachers: undefined }],
    ['Re: [問題] 請問何憲章老師投資學', { tag: '問題', term: undefined, courseTitle: '投資學', teachers: ['何憲章'] }],
    ['[公告] NTUCourse板板規', { tag: '公告', term: undefined, courseTitle: 'NTUCourse板板規', teachers: undefined }]
  ];
  for (const [title, expected] of cases) assert.deepEqual(parseReviewTitle(title), expected, title);
});
