/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// The health answer on its checks: all up, one down, none. Expected answers from the servers' READMEs (503 naming the
// check that is down) in @nestjs/terminus's shape, which admin's site tests read from /health/live and /health/ready.

import { healthAnswer } from '@/app/health/health-answer';

const UP = { status: 'up' } as const;
const DOWN = { status: 'down' } as const;

describe('The health answer', () => {
  it('the main server up → 200 ok, the main server under info', async () => {
    const answer = healthAnswer({ mainServer: UP });

    expect(answer.status).toBe(200);
    expect(await answer.json()).toEqual({
      status: 'ok',
      info: { mainServer: UP },
      error: {},
      details: { mainServer: UP },
    });
  });

  it.each([
    ['the main server down, the only check', { mainServer: DOWN }, {}],
    ['the main server down, beside a check that is up', { mainServer: DOWN, another: UP }, { another: UP }],
  ])('%s → 503 error, the main server under error', async (_, checks, info) => {
    const answer = healthAnswer(checks);

    expect(answer.status).toBe(503);
    expect(await answer.json()).toEqual({ status: 'error', info, error: { mainServer: DOWN }, details: checks });
  });

  it('no checks, as for liveness → 200 ok', async () => {
    const answer = healthAnswer({});

    expect(answer.status).toBe(200);
    expect(await answer.json()).toEqual({ status: 'ok', info: {}, error: {}, details: {} });
  });

  it.each([
    ['every check up', { mainServer: UP }],
    ['a check down', { mainServer: DOWN }],
    ['no checks', {}],
  ])('%s → never cached (no-store)', (_, checks) => {
    expect(healthAnswer(checks).headers.get('cache-control')).toBe('no-store');
  });
});
