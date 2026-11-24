/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Settings } from '../common/settings.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { crashPostText, readAlert, signatureHolds } from './crash-post.js';

// Injection token of the HTTP call to Slack's Incoming Webhook. The tests replace it with a stand-in.
export const FETCH_SLACK = 'FETCH_SLACK';

// Without a limit of its own, fetch waits 300 seconds for an answer.
export const SLACK_TIMEOUT_MS = 5000;
export const POSTS_PER_MINUTE = 10;

const MINUTE_MS = 60_000;

// Passes Sentry's alerts about the app's crashes on to the team's Slack channel (README.md: Crash alerts from Sentry).
// No line it logs holds the webhook's URL, the secret, or an error's own text, which could quote the URL.
@Injectable()
export class CrashAlertsService {
  private readonly logger = new Logger(CrashAlertsService.name);
  private readonly secret: string;
  private readonly webhook: string;
  // The minute counted, since the epoch, with the posts made and the alerts dropped in it.
  private minute = Number.NaN;
  private posted = 0;
  private dropped = 0;

  constructor(
    @Inject(FETCH_SLACK) private readonly fetchSlack: typeof fetch,
    @Inject(CLOCK) private readonly clock: Clock,
    settings: ConfigService<Settings, true>,
  ) {
    this.secret = settings.get('SENTRY_WEBHOOK_SECRET', { infer: true });
    this.webhook = settings.get('APP_CRASH_SLACK_WEBHOOK', { infer: true });
  }

  get enabled(): boolean {
    return this.secret !== '' && this.webhook !== '';
  }

  signedBySentry(body: Buffer, signature: string | undefined): boolean {
    return signatureHolds(body, signature, this.secret);
  }

  // Takes a signed request. Only an issue alert is posted; Sentry's other resources are taken and left. The post is
  // not awaited, since Sentry waits 1 second for its answer and Slack is given 5.
  take(resource: string | undefined, body: Buffer): void {
    if (resource !== 'event_alert') {
      return;
    }
    let alert: unknown;
    try {
      alert = JSON.parse(body.toString('utf8'));
    } catch {
      this.logger.warn('A crash alert from Sentry was not posted to Slack: its body is not JSON');
      return;
    }
    if (this.withinCap()) {
      void this.post(crashPostText(readAlert(alert)));
    }
  }

  // Writes the count of the minute that ended, if any alert in it was dropped, also when no alert came after it.
  @Cron('30 * * * * *', { name: 'crash-alerts-dropped' })
  reportDropped(): void {
    this.countIn(this.clock.now());
  }

  private withinCap(): boolean {
    this.countIn(this.clock.now());
    if (this.posted >= POSTS_PER_MINUTE) {
      this.dropped += 1;
      return false;
    }
    this.posted += 1;
    return true;
  }

  // Starts counting the minute `now` is in, and reports the one before it.
  private countIn(now: Date): void {
    const minute = Math.floor(now.getTime() / MINUTE_MS);
    if (minute === this.minute) {
      return;
    }
    if (this.dropped > 0) {
      const from = new Date(this.minute * MINUTE_MS).toISOString();
      this.logger.warn(
        `${this.dropped} crash alerts from Sentry were not posted to Slack in the minute from ${from}: over ${POSTS_PER_MINUTE} a minute`,
      );
    }
    this.minute = minute;
    this.posted = 0;
    this.dropped = 0;
  }

  // Once, without a retry: a crash that keeps happening is alerted on again.
  private async post(text: string): Promise<void> {
    let failure: string;
    try {
      const response = await this.fetchSlack(this.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(SLACK_TIMEOUT_MS),
      });
      await response.body?.cancel();
      if (response.status === 200) {
        return;
      }
      failure = `Slack answered ${response.status}`;
    } catch (error) {
      failure =
        error instanceof Error && error.name === 'TimeoutError'
          ? `Slack did not answer within ${SLACK_TIMEOUT_MS / 1000} seconds`
          : `the request to Slack failed (${error instanceof Error ? error.name : 'unknown error'})`;
    }
    this.logger.warn(`A crash alert from Sentry was not posted to Slack: ${failure}`);
  }
}
