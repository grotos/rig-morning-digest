import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const night = '2026-01-02';

let runsDir: string;

function writeNight(contents: string) {
  writeFileSync(join(runsDir, `${night}.jsonl`), contents);
}

function app() {
  return createApp({
    adapter: 'shim',
    installed: '2026-01-01T00:00:00Z',
    beatEverySeconds: 60,
    runsDir,
  });
}

const validRun = JSON.stringify({
  at: '2026-01-02T01:00:00+01:00',
  job: 'digest/render',
  status: 'ok',
  owner: 'rook',
});

beforeEach(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
});

afterEach(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

describe('HTML digest route', () => {
  it('renders a night with run data', async () => {
    writeNight(`${validRun}\n`);

    const response = await app().request(`/digest/${night}`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(html).toContain('digest/render');
  });

  it('returns 404 when the night file is missing', async () => {
    const response = await app().request(`/digest/${night}`);

    expect(response.status).toBe(404);
  });

  it('renders an empty night as nothing ran', async () => {
    writeNight('');

    const response = await app().request(`/digest/${night}`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('nothing ran');
  });

  it('renders valid data when a line is malformed', async () => {
    writeNight(`${validRun}\nnot-json\n`);

    const response = await app().request(`/digest/${night}`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('digest/render');
    expect(html).not.toContain('not-json');
  });
});

describe('JSON digest route', () => {
  it('returns a night with run data as JSON', async () => {
    writeNight(`${validRun}\n`);

    const response = await app().request(`/api/digest/${night}`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toMatchObject({
      rows: [
        {
          job: 'digest/render',
          owner: 'rook',
          runs: 1,
          retries: 0,
          lastStatus: 'ok',
          lastError: null,
          firstAt: '2026-01-02T01:00:00+01:00',
          lastAt: '2026-01-02T01:00:00+01:00',
        },
      ],
      malformedLines: 0,
    });
  });

  it('returns 404 when the night file is missing', async () => {
    const response = await app().request(`/api/digest/${night}`);

    expect(response.status).toBe(404);
  });

  it('returns an empty rows list for an empty night', async () => {
    writeNight('');

    const response = await app().request(`/api/digest/${night}`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ rows: [], malformedLines: 0 });
  });

  it('returns valid rows and counts a malformed line', async () => {
    writeNight(`${validRun}\nnot-json\n`);

    const response = await app().request(`/api/digest/${night}`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      rows: [{ job: 'digest/render' }],
      malformedLines: 1,
    });
  });
});
