import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { USER_AGENT } from '@unicourse/crawler-kit';
import { COURSE_PATHS, robotsAllows } from './parse.ts';

test('cis.ncu.edu.tw robots.txt (fetched 2026-11-26) blocks the course query system', async () => {
  const robots = await readFile(new URL('./samples/cis-robots.txt', import.meta.url), 'utf8');
  for (const path of COURSE_PATHS) assert.equal(robotsAllows(robots, USER_AGENT, path), false, path);
  assert.equal(robotsAllows(robots, USER_AGENT, '/ApcourseSys/search/searchCrs'), true);
  assert.equal(robotsAllows(robots, USER_AGENT, '/iTeacher/x'), true);
});

test('robotsAllows: longest match, wildcards, agent groups', () => {
  const robots = ['User-agent: *', 'Disallow: /', 'Allow: /Course/*', '', 'User-agent: UniCourseBot', 'Disallow: /Course/private$'].join('\n');
  assert.equal(robotsAllows(robots, 'SomeBot', '/Course/main'), true);
  assert.equal(robotsAllows(robots, 'SomeBot', '/other'), false);
  assert.equal(robotsAllows(robots, USER_AGENT, '/Course/private'), false);
  assert.equal(robotsAllows(robots, USER_AGENT, '/Course/private/x'), true);
  assert.equal(robotsAllows('', USER_AGENT, '/anything'), true);
});
