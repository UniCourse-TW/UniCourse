import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { EXCERPT_MAX, ExternalReviewSnapshot, truncateCodePoints } from './index.ts';

const fixture = async () =>
  JSON.parse(await readFile(new URL('../../../fixtures/external-reviews/ptt-demo.json', import.meta.url), 'utf8'));

test('the demo fixture validates', async () => {
  const snapshot = ExternalReviewSnapshot.parse(await fixture());
  assert.equal(snapshot.posts.length, 4);
  assert.equal(snapshot.school, 'nthu');
});

test('invalid external review snapshots are rejected (same rules as crates/ingest)', async () => {
  const base = await fixture();
  const post = base.posts[0];
  const withPost = (changes: Record<string, unknown>) => ({ ...base, posts: [{ ...post, ...changes }] });
  assert.ok(ExternalReviewSnapshot.safeParse(withPost({ excerpt: '字'.repeat(EXCERPT_MAX) })).success);
  for (const changes of [
    { excerpt: '字'.repeat(EXCERPT_MAX + 1) },
    { excerpt: '' },
    { author: null },
    { url: 'javascript:alert(1)' },
    { url: 'https:example.com/x' },
    { postedAt: '2026-07-01 08:00:00' },
    { pushScore: 1.5 },
    { term: '2026-1' },
    { teachers: [] },
    { comments: 'not allowed' }
  ]) {
    assert.ok(!ExternalReviewSnapshot.safeParse(withPost(changes)).success, JSON.stringify(changes));
  }
  for (const changes of [{ format: 'snapshot' }, { version: 2 }, { source: 'dcard' }, { school: 'harvard' }, { extra: 1 }]) {
    assert.ok(!ExternalReviewSnapshot.safeParse({ ...base, ...changes }).success, JSON.stringify(changes));
  }
  assert.ok(!ExternalReviewSnapshot.safeParse({ ...base, posts: [post, post] }).success);
  // Live PTT data must link to PTT.
  assert.ok(!ExternalReviewSnapshot.safeParse({ ...base, isDemo: false }).success);
  assert.ok(
    ExternalReviewSnapshot.safeParse({ ...base, isDemo: false, posts: [{ ...post, url: 'https://www.ptt.cc/bbs/X/M.1.A.ABC.html' }] })
      .success
  );
});

test('truncateCodePoints never splits a surrogate pair', () => {
  assert.equal(truncateCodePoints('😀😀😀', 2), '😀😀');
  assert.equal(truncateCodePoints('短', 120), '短');
});
