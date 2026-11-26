import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { Snapshot, currentTerm, requirementFromText } from './index.ts';

test('v1 fixtures still validate as v2 snapshots', async () => {
  for (const name of ['ntnu-115-1', 'nycu-115-1']) {
    const raw = JSON.parse(await readFile(new URL(`../../../fixtures/${name}.json`, import.meta.url), 'utf8'));
    assert.equal(Snapshot.parse(raw).school, name.split('-')[0]);
  }
});

test('duplicate sourceId and unknown fields are rejected', () => {
  const base = {
    school: 'ntu', schoolName: 'x', term: '115-1', isDemo: true,
    offerings: [{ sourceId: 'a', courseCode: 'c', title: 't', instructors: [], sourceUrl: 'https://example.edu/' }]
  };
  assert.ok(Snapshot.safeParse(base).success);
  assert.ok(!Snapshot.safeParse({ ...base, offerings: [base.offerings[0], base.offerings[0]] }).success);
  assert.ok(!Snapshot.safeParse({ ...base, offerings: [{ ...base.offerings[0], bogus: 1 }] }).success);
  assert.ok(!Snapshot.safeParse({ ...base, term: '2026-fall' }).success);
  const one = base.offerings[0];
  assert.ok(!Snapshot.safeParse({ ...base, offerings: [{ ...one, sourceUrl: 'https:example.edu' }] }).success);
  assert.ok(!Snapshot.safeParse({ ...base, offerings: [{ ...one, sourceUrl: 'bad-url' }] }).success);
  assert.ok(!Snapshot.safeParse({ ...base, offerings: [{ ...one, title: 'A\u0000B' }] }).success);
  assert.ok(!Snapshot.safeParse({ ...base, offerings: [{ ...one, credits: 2.345 }] }).success);
  assert.ok(Snapshot.safeParse({ ...base, offerings: [{ ...one, credits: 2.2 }] }).success);
  assert.ok(!Snapshot.safeParse({ ...base, offerings: [{ ...one, schedule: [{ day: 1, periods: ['1'], room: 'x' }] }] }).success);
  assert.ok(Snapshot.safeParse({ ...base, source: { name: 's', url: 'https://example.edu/', fetchedAt: '2026-11-26T12:00:00Z' } }).success);
  assert.ok(!Snapshot.safeParse({ ...base, source: { name: 's', url: 'https://example.edu/', fetchedAt: '2026-11-26T12:00Z' } }).success);
  assert.ok(!Snapshot.safeParse({ ...base, source: { name: 's', url: 'https://example.edu/', fetchedAt: '2026-11-26T24:00:00Z' } }).success);
});

test('helpers', () => {
  assert.equal(currentTerm(new Date('2026-11-26T00:00:00Z')), '115-1');
  assert.equal(currentTerm(new Date('2027-03-01T00:00:00Z')), '115-2');
  assert.equal(requirementFromText('必修'), 'required');
  assert.equal(requirementFromText('通識選修'), 'general');
  assert.equal(requirementFromText(undefined), undefined);
});
