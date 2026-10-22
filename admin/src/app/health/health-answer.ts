/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import 'server-only';

type Checks = Record<string, { status: 'up' | 'down' }>;

// A health check's answer in the shape the servers' @nestjs/terminus checks give, 503 when a check is down.
export function healthAnswer(checks: Checks): Response {
  const entries = Object.entries(checks);
  const up = Object.fromEntries(entries.filter(([, check]) => check.status === 'up'));
  const down = Object.fromEntries(entries.filter(([, check]) => check.status === 'down'));
  const ok = Object.keys(down).length === 0;
  return Response.json(
    { status: ok ? 'ok' : 'error', info: up, error: down, details: checks },
    { status: ok ? 200 : 503, headers: { 'cache-control': 'no-store' } },
  );
}
