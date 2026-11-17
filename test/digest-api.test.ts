import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir: '',
};

describe('digest JSON API', () => {
  it('returns the reader result with rows sorted by job', async () => {
    const runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-api-'));
    const night = '2026-10-28';
    writeFileSync(
      join(runsDir, `${night}.jsonl`),
      [
        JSON.stringify({
          at: '2026-10-28T23:00:00+01:00',
          job: 'zeta/job',
          status: 'ok',
          owner: 'rook',
        }),
        'not json',
        JSON.stringify({
          at: '2026-10-28T23:01:00+01:00',
          job: 'alpha/job',
          status: 'retry',
          owner: null,
        }),
      ].join('\n'),
    );

    try {
      const response = await createApp({ ...config, runsDir }).request(`/api/digest/${night}`);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        malformedLines: 1,
        rows: [
          {
            job: 'alpha/job',
            owner: null,
            runs: 1,
            retries: 1,
            lastStatus: 'retry',
            lastError: null,
            firstAt: '2026-10-28T23:01:00+01:00',
            lastAt: '2026-10-28T23:01:00+01:00',
          },
          {
            job: 'zeta/job',
            owner: 'rook',
            runs: 1,
            retries: 0,
            lastStatus: 'ok',
            lastError: null,
            firstAt: '2026-10-28T23:00:00+01:00',
            lastAt: '2026-10-28T23:00:00+01:00',
          },
        ],
      });
    } finally {
      rmSync(runsDir, { recursive: true });
    }
  });

  it('returns 404 when the night file is missing', async () => {
    const runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-api-'));

    try {
      const response = await createApp({ ...config, runsDir }).request('/api/digest/2026-10-28');

      expect(response.status).toBe(404);
    } finally {
      rmSync(runsDir, { recursive: true });
    }
  });
});
