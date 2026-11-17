import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const tempDirs: string[] = [];

function createRunsDir() {
  const dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('digest page', () => {
  it('renders one table sorted by job and marks failures and frequent retries', async () => {
    const runsDir = createRunsDir();
    writeFileSync(
      join(runsDir, '2026-10-28.jsonl'),
      [
        JSON.stringify({ at: '2026-10-29T01:37:00+01:00', job: 'zeta/job', status: 'fail', owner: 'rook', error: 'upstream 503' }),
        JSON.stringify({ at: '2026-10-29T01:30:00+01:00', job: 'alpha/job', status: 'retry', owner: null }),
        JSON.stringify({ at: '2026-10-29T01:31:00+01:00', job: 'alpha/job', status: 'retry', owner: null }),
        JSON.stringify({ at: '2026-10-29T01:32:00+01:00', job: 'alpha/job', status: 'retry', owner: null }),
      ].join('\n'),
    );

    const response = await createApp({
      adapter: 'shim',
      installed: '2026-10-29T14:06:00+01:00',
      beatEverySeconds: 60,
      runsDir,
    }).request('/digest/2026-10-28');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html.match(/<table>/g)).toHaveLength(1);
    expect(html.indexOf('alpha/job')).toBeLessThan(html.indexOf('zeta/job'));
    expect(html).toContain('<td class="warn">3</td>');
    expect(html).toContain('<td class="warn">fail</td>');
    expect(html).toContain('2026-10-29T01:37:00+01:00');
    expect(html).toContain('upstream 503');
    expect(html).toContain('—');
    expect(html).not.toContain('<script');
  });

  it('renders an empty night as nothing ran', async () => {
    const runsDir = createRunsDir();
    writeFileSync(join(runsDir, '2026-10-28.jsonl'), '');

    const response = await createApp({
      adapter: 'shim',
      installed: '2026-10-29T14:06:00+01:00',
      beatEverySeconds: 60,
      runsDir,
    }).request('/digest/2026-10-28');

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('nothing ran');
  });

  it('returns 404 when the night file is missing', async () => {
    const runsDir = createRunsDir();

    const response = await createApp({
      adapter: 'shim',
      installed: '2026-10-29T14:06:00+01:00',
      beatEverySeconds: 60,
      runsDir,
    }).request('/digest/2026-10-28');

    expect(response.status).toBe(404);
  });

  it('shows valid rows when a night also contains a bad line', async () => {
    const runsDir = createRunsDir();
    writeFileSync(
      join(runsDir, '2026-10-28.jsonl'),
      `${JSON.stringify({ at: '2026-10-29T01:37:00+01:00', job: 'job/ok', status: 'ok', owner: 'rook' })}\nnot json\n`,
    );

    const response = await createApp({
      adapter: 'shim',
      installed: '2026-10-29T14:06:00+01:00',
      beatEverySeconds: 60,
      runsDir,
    }).request('/digest/2026-10-28');

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('job/ok');
  });
});
