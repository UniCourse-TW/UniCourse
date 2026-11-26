import { USER_AGENT, defineCrawler } from '@unicourse/crawler-kit';
import { COURSE_PATHS, ROBOTS_URL, robotsAllows } from './parse.ts';

export const crawler = defineCrawler({
  school: 'ncu',
  source: { name: '國立中央大學課程查詢系統', url: 'https://cis.ncu.edu.tw/Course/main/query/byKeywords' },
  async crawl(ctx) {
    // Only robots.txt itself is fetched; no course page is requested while it disallows /Course.
    const robots = await ctx.http.text(ROBOTS_URL);
    const blocked = COURSE_PATHS.filter((path) => !robotsAllows(robots, USER_AGENT, path));
    if (blocked.length) {
      throw new Error(
        `${ROBOTS_URL} disallows ${blocked.join(', ')} for ${USER_AGENT}; refusing to crawl NCU (see crawlers/ncu/README.md)`
      );
    }
    throw new Error(
      `${ROBOTS_URL} now allows the course query pages; the NCU parser still has to be implemented (see crawlers/ncu/README.md)`
    );
  }
});
