import type { NightDigest } from '../digest/types.js';

export function DigestPage({ night, digest }: { night: string; digest: NightDigest }) {
  const rows = [...digest.rows].sort((a, b) => a.job.localeCompare(b.job));

  return (
    <>
      <h1>digest · {night}</h1>
      <table>
        <thead>
          <tr>
            <th>job</th>
            <th>owner</th>
            <th>runs</th>
            <th>retries</th>
            <th>last status</th>
            <th>first at</th>
            <th>last at</th>
            <th>last error</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td class="mute" colspan={8}>nothing ran</td></tr>
          ) : (
            rows.map((row) => (
              <tr>
                <td>{row.job}</td>
                <td>{row.owner ?? '—'}</td>
                <td>{row.runs}</td>
                <td class={row.retries >= 3 ? 'warn' : undefined}>{row.retries}</td>
                <td class={row.lastStatus === 'fail' ? 'warn' : undefined}>{row.lastStatus}</td>
                <td>{row.firstAt}</td>
                <td>{row.lastAt}</td>
                <td>{row.lastError ?? '—'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}
