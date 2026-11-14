/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { NotificationSender } from '../src/notifications/notification-sender.js';
import { NotificationTicker } from '../src/notifications/notification-ticker.js';

// The timer of NOTIFICATIONS_TICK_SECONDS on fake timers, with a stand-in for the sender's step.

const sendDue = vi.fn<() => Promise<number>>();

async function tickerEvery(seconds: number): Promise<NotificationTicker> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      NotificationTicker,
      { provide: NotificationSender, useValue: { sendDue } },
      { provide: ConfigService, useValue: { get: (): number => seconds } },
    ],
  }).compile();
  return moduleRef.get(NotificationTicker);
}

beforeEach(() => {
  sendDue.mockReset().mockResolvedValue(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('The timer of NOTIFICATIONS_TICK_SECONDS', () => {
  it('at 0 starts no timer', async () => {
    const ticker = await tickerEvery(0);
    vi.useFakeTimers();

    ticker.onModuleInit();
    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(sendDue).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('at 15 runs a step every 15 seconds', async () => {
    const ticker = await tickerEvery(15);
    vi.useFakeTimers();

    ticker.onModuleInit();
    vi.advanceTimersByTime(14_999);
    expect(sendDue).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(sendDue).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30_000);
    expect(sendDue).toHaveBeenCalledTimes(3);

    ticker.onApplicationShutdown();
  });

  it('runs no step after the shutdown', async () => {
    const ticker = await tickerEvery(15);
    vi.useFakeTimers();
    ticker.onModuleInit();
    vi.advanceTimersByTime(15_000);

    ticker.onApplicationShutdown();
    vi.advanceTimersByTime(60_000);

    expect(sendDue).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
