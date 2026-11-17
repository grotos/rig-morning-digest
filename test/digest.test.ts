import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

describe('readNight', () => {
  it('aggregates jobs and counts malformed lines in the 2026-10-28 fixture', () => {
    const digest = readNight('runs', '2026-10-28');
    const rows = new Map(digest.rows.map((row) => [row.job, row]));

    expect(digest.malformedLines).toBe(1);
    expect(digest.rows).toHaveLength(5);
    expect(rows.get('fixtures/refresh')).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
    expect(rows.get('lane/sync')).toEqual({
      job: 'lane/sync',
      owner: 'rook',
      runs: 8,
      retries: 1,
      lastStatus: 'ok',
      lastError: 'lock held',
      firstAt: '2026-10-28T23:00:06+01:00',
      lastAt: '2026-10-29T05:00:04+01:00',
    });
  });

  it('keeps a job whose owner is null', () => {
    const digest = readNight('runs', '2026-10-28');

    expect(digest.rows.find((row) => row.job === 'digest/render')).toMatchObject({
      job: 'digest/render',
      owner: null,
      runs: 1,
      retries: 0,
    });
  });
});
