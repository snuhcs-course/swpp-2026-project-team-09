import test from 'node:test';
import assert from 'node:assert/strict';
import { createRefreshQueue } from '../src/refresh-queue.ts';
const tick = () => new Promise(resolve => setTimeout(resolve, 10));
async function until(fn) { for (let i = 0; i < 100; i++) { if (fn()) return; await tick(); } assert.fail('refresh queue timed out'); }

test('100 simultaneous invalidation hints coalesce to one snapshot request', async () => {
  let calls = 0;
  const queue = createRefreshQueue(async () => { calls++; }, assert.fail, 1);
  for (let i = 0; i < 100; i++) queue.request();
  await until(() => calls === 1);
  await tick();
  assert.equal(calls, 1);
  queue.dispose();
});

test('hints during a request create one trailing refresh without overlap', async () => {
  let calls = 0, active = 0, maximum = 0, release;
  const queue = createRefreshQueue(async () => {
    calls++; active++; maximum = Math.max(maximum, active);
    if (calls === 1) await new Promise(resolve => { release = resolve; });
    active--;
  }, assert.fail, 1);
  queue.request();
  await until(() => calls === 1);
  for (let i = 0; i < 100; i++) queue.request();
  await tick();
  assert.equal(calls, 1);
  release();
  await until(() => calls === 2 && active === 0);
  assert.equal(maximum, 1);
  queue.dispose();
});

test('disposal cancels a pending refresh and suppresses a late failure callback', async () => {
  let calls = 0, errors = 0, reject;
  const pending = createRefreshQueue(async () => { calls++; }, () => { errors++; }, 1);
  pending.request(); pending.dispose();
  await tick();
  assert.equal(calls, 0);
  const running = createRefreshQueue(() => new Promise((_, r) => { calls++; reject = r; }), () => { errors++; }, 1);
  running.request();
  await until(() => calls === 1);
  running.dispose(); running.request(); reject(new Error('late network failure'));
  await tick();
  assert.equal(calls, 1);
  assert.equal(errors, 0);
});
