import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, DigestStatus, ReadNight } from './types.js';

type RunRecord = {
  at: string;
  job: string;
  status: DigestStatus;
  owner: string | null;
  error?: string;
};

function isRunRecord(value: unknown): value is RunRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.at === 'string' &&
    typeof record.job === 'string' &&
    (record.status === 'ok' || record.status === 'retry' || record.status === 'fail') &&
    (typeof record.owner === 'string' || record.owner === null) &&
    (!('error' in record) || typeof record.error === 'string')
  );
}

export const readNight: ReadNight = (runsDir, night) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) {
    throw new TypeError(`Invalid night: ${night}`);
  }

  const contents = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  const lines = contents.length === 0 ? [] : contents.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();

  const rowsByJob = new Map<string, DigestRow>();
  let malformedLines = 0;

  for (const line of lines) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line) as unknown;
    } catch {
      malformedLines += 1;
      continue;
    }

    if (!isRunRecord(parsed)) {
      malformedLines += 1;
      continue;
    }

    const existing = rowsByJob.get(parsed.job);
    if (existing) {
      existing.runs += 1;
      if (parsed.status === 'retry') existing.retries += 1;
      existing.owner = parsed.owner;
      existing.lastStatus = parsed.status;
      existing.lastAt = parsed.at;
      if (parsed.error !== undefined) existing.lastError = parsed.error;
      continue;
    }

    rowsByJob.set(parsed.job, {
      job: parsed.job,
      owner: parsed.owner,
      runs: 1,
      retries: parsed.status === 'retry' ? 1 : 0,
      lastStatus: parsed.status,
      lastError: parsed.error ?? null,
      firstAt: parsed.at,
      lastAt: parsed.at,
    });
  }

  return { rows: [...rowsByJob.values()], malformedLines };
};
