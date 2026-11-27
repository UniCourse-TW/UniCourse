import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { ExternalReviewSnapshot, HttpClient, type ExternalReviewPost } from '@unicourse/crawler-kit';
import { BOARDS, REVIEW_TAGS, type Board } from './boards.ts';
import { EXCERPT_VERSION } from './excerpt.ts';
import { PTT_ORIGIN, parseArticle, parseListPage, parseReviewTitle, type Article, type ListEntry } from './parse.ts';

// docs/external-reviews.md: PTT's robots.txt allows search indexing (Content-Signal: search=yes). One request
// per second per host, identified as UniCourseBot.
const USER_AGENT = 'UniCourseBot/0.1 (+https://unicourse.observe.tw)';

const { values } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== '--'),
  options: {
    board: { type: 'string', multiple: true },
    out: { type: 'string', default: '../../snapshots/reviews' },
    since: { type: 'string', default: '2016-01-01' },
    'max-pages': { type: 'string' },
    'max-articles': { type: 'string' },
    'no-articles': { type: 'boolean', default: false }
  }
});

const since = Date.parse(`${values.since}T00:00:00+08:00`);
if (!Number.isFinite(since)) throw new Error(`invalid --since ${values.since}`);
const maxPages = values['max-pages'] ? Number(values['max-pages']) : Infinity;
let articleBudget = values['max-articles'] ? Number(values['max-articles']) : Infinity;
const boards = values.board?.length ? BOARDS.filter((board) => values.board!.includes(board.name)) : BOARDS;
if (!boards.length) throw new Error(`unknown --board; known: ${BOARDS.map((board) => board.name).join(', ')}`);

const http = new HttpClient({ concurrency: 1, delayMs: 1000, headers: { 'user-agent': USER_AGENT } });
http.cookies.set('over18', '1');

interface Cache {
  /** Parsed list pages by page number; the newest two pages are always refetched. */
  pages: Record<string, ListEntry[]>;
  /**
   * Parsed article fields by URL; `null` means the article is gone (404). Articles parsed by an older excerpt
   * selection (`excerptVersion` below `EXCERPT_VERSION`) are refetched when wanted; until then they are used
   * without their excerpt.
   */
  articles: Record<string, (Article & { excerptVersion?: number }) | null>;
}

async function loadCache(path: string): Promise<Cache> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as Cache;
  } catch {
    return { pages: {}, articles: {} };
  }
}

async function saveJson(path: string, value: unknown) {
  await writeFile(`${path}.tmp`, JSON.stringify(value) + '\n');
  await rename(`${path}.tmp`, path);
}

const log = (board: Board, message: string) => console.error(`[ptt ${board.name}] ${message}`);

async function crawlBoard(board: Board) {
  const cacheDir = join(values.out!, '.cache');
  await mkdir(cacheDir, { recursive: true });
  const cachePath = join(cacheDir, `ptt-${board.name}.json`);
  const cache = await loadCache(cachePath);
  const boardUrl = `${PTT_ORIGIN}/bbs/${board.name}/index.html`;

  const first = parseListPage(await http.text(boardUrl));
  const newest = (first.previous ?? 0) + 1;
  log(board, `newest list page ${newest}`);
  const entries: ListEntry[] = [...first.entries];
  let fetchedPages = 1;
  for (let page = newest - 1; page >= 1 && fetchedPages < maxPages; page -= 1) {
    let pageEntries = page < newest - 1 ? cache.pages[page] : undefined;
    if (!pageEntries) {
      pageEntries = parseListPage(await http.text(`${PTT_ORIGIN}/bbs/${board.name}/index${page}.html`)).entries;
      cache.pages[page] = pageEntries;
      fetchedPages += 1;
      if (fetchedPages % 50 === 0) {
        await saveJson(cachePath, cache);
        log(board, `list page ${page} (${fetchedPages} fetched)`);
      }
    }
    entries.push(...pageEntries);
    // Pages are chronological; stop once a whole page predates --since.
    const times = pageEntries.map((entry) => Date.parse(entry.postedAt ?? '')).filter(Number.isFinite);
    if (times.length && Math.max(...times) < since) break;
  }
  await saveJson(cachePath, cache);

  const unique = new Map<string, ListEntry>();
  for (const entry of entries) {
    const time = Date.parse(entry.postedAt ?? '');
    if (Number.isFinite(time) && time < since) continue;
    unique.set(entry.url, entry);
  }
  log(board, `${unique.size} posts since ${values.since}`);

  const posts: ExternalReviewPost[] = [];
  let fetchedArticles = 0;
  for (const entry of unique.values()) {
    const parsed = parseReviewTitle(entry.title);
    let article = cache.articles[entry.url];
    const wanted = !values['no-articles'] && parsed.tag != null && REVIEW_TAGS.has(parsed.tag);
    const stale = article != null && article.excerptVersion !== EXCERPT_VERSION;
    if ((article === undefined || stale) && wanted && articleBudget > 0) {
      articleBudget -= 1;
      const response = await http.fetch(entry.url);
      if (response.status === 404) {
        article = null;
      } else if (response.ok) {
        article = { ...parseArticle(await response.text()), excerptVersion: EXCERPT_VERSION };
      }
      if (article !== undefined) cache.articles[entry.url] = article;
      fetchedArticles += 1;
      if (fetchedArticles % 100 === 0) {
        await saveJson(cachePath, cache);
        log(board, `${fetchedArticles} articles fetched`);
      }
    }
    if (article === null) continue; // deleted since it was listed
    posts.push({
      url: entry.url,
      title: entry.title,
      author: article?.author ?? entry.author,
      postedAt: article?.postedAt ?? entry.postedAt,
      pushScore: article ? article.pushScore : entry.pushScore,
      excerpt: article?.excerptVersion === EXCERPT_VERSION ? article.excerpt : undefined,
      ...parsed
    });
  }
  await saveJson(cachePath, cache);

  posts.sort((a, b) => (b.postedAt ?? '').localeCompare(a.postedAt ?? '') || a.url.localeCompare(b.url));
  const snapshot = ExternalReviewSnapshot.parse({
    format: 'external-reviews',
    version: 1,
    source: 'ptt',
    board: board.name,
    boardUrl,
    school: board.school,
    isDemo: false,
    fetchedAt: new Date().toISOString(),
    posts
  });
  const out = join(values.out!, `ptt-${board.name}.json`);
  await saveJson(out, snapshot);
  const withExcerpt = posts.filter((post) => post.excerpt).length;
  log(board, `wrote ${posts.length} posts (${withExcerpt} with excerpt, ${fetchedArticles} articles fetched) to ${out}`);
}

for (const board of boards) await crawlBoard(board);
