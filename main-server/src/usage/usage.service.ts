/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Inject, Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog, type PostHogOptions } from 'posthog-node';
import { Settings } from '../common/settings.js';
import { UsersService } from '../users/users.service.js';
import { type JoinPolicy } from '../generated/prisma/client.js';
import { type FriendshipHow, type UsageEvent, type UsageEvents, visibilityOf } from './usage-events.js';

// PostHog Cloud US, a constant rather than a setting (P08 spec: Settings).
export const POSTHOG_HOST = 'https://us.i.posthog.com';
// Without a limit of its own, posthog-node waits 10 seconds for an answer.
export const POSTHOG_TIMEOUT_MS = 5000;
// How long the application's close waits for the events still being sent.
export const SHUTDOWN_TIMEOUT_MS = 3000;

// One event as the service hands it to PostHog.
export interface UsageMessage {
  distinctId: string;
  event: UsageEvent;
  properties: Record<string, string>;
}

// What the service needs of PostHog's client. The tests give a stand-in in its place (test/usage.ts).
export interface UsageClient {
  // Resolves once the event is sent or dropped; a failure arrives through `onError` or as a rejection.
  capture(message: UsageMessage): Promise<void>;
  // Sends what is still pending, waiting at most `timeoutMs`.
  shutdown(timeoutMs: number): Promise<void>;
}

// Makes the client for the token; `onError` hears each failure of a send.
export type UsageClientFactory = (token: string, onError: (error: unknown) => void) => UsageClient;

// Injection token of the factory. The tests replace it with a stand-in.
export const USAGE_CLIENT_FACTORY = 'USAGE_CLIENT_FACTORY';

// posthog-node 6.0.6, the only place that imports it. Each event is its own request (`captureImmediate`), tried once
// and given 5 seconds, so that a failure or a timeout drops that event and is told once through 'error'. GeoIP is off
// and no person property is ever set. `fetch` is for the adapter's own test only.
export function posthogClient(
  token: string,
  onError: (error: unknown) => void,
  fetch?: PostHogOptions['fetch'],
): UsageClient {
  const client = new PostHog(token, {
    host: POSTHOG_HOST,
    disableGeoip: true,
    requestTimeout: POSTHOG_TIMEOUT_MS,
    captureMaxRetries: 0,
    ...(fetch === undefined ? {} : { fetch }),
  });
  // With a listener, posthog-node prints nothing of its own about a lost event.
  client.on('error', onError);
  return {
    capture: async (message) => {
      await client.captureImmediate(message);
    },
    shutdown: async (timeoutMs) => {
      await client.shutdown(timeoutMs);
    },
  };
}

// The error's type, and its cause's, never their messages, which could quote a request.
function typeOf(error: unknown): string {
  const name = error instanceof Error ? error.name : typeof error;
  const cause: unknown = error instanceof Error ? error.cause : undefined;
  return cause instanceof Error ? `${name} (${cause.name})` : name;
}

// Sends the main server's usage events to PostHog (README.md: Usage data), only for a User whose account chose usage
// data, and never fails the request that called it. No line it logs holds the token or an error's own text.
@Injectable()
export class UsageService implements OnApplicationShutdown {
  private readonly logger = new Logger(UsageService.name);
  private readonly client: UsageClient | null;

  constructor(
    @Inject(USAGE_CLIENT_FACTORY) clients: UsageClientFactory,
    settings: ConfigService<Settings, true>,
    private readonly users: UsersService,
  ) {
    const token = settings.get('POSTHOG_PROJECT_TOKEN', { infer: true });
    this.client =
      token === ''
        ? null
        : clients(token, (error) => {
            this.failed(error);
          });
  }

  // Call once the work is committed, outside any transaction. It returns at once: the consent's read and the send
  // happen after, and the caller's answer waits for neither.
  sent<E extends UsageEvent>(userId: string, event: E, properties: UsageEvents[E]): void {
    if (this.client !== null) {
      void this.send(this.client, { distinctId: userId, event, properties: { ...properties, source: 'server' } });
    }
  }

  async onApplicationShutdown(): Promise<void> {
    try {
      await this.client?.shutdown(SHUTDOWN_TIMEOUT_MS);
    } catch (error) {
      this.logger.warn(`The usage events still pending were not sent to PostHog at shutdown: ${typeOf(error)}`);
    }
  }

  // The account is read for each event, with no copy kept, so that the switch in 내 정보 holds from the next one.
  private async send(client: UsageClient, message: UsageMessage): Promise<void> {
    let chosen: boolean;
    try {
      chosen = await this.users.usageMayBeSent(message.distinctId);
    } catch (error) {
      this.logger.warn(
        `The usage event ${message.event} of User ${message.distinctId} was dropped: its consent could not be read (${typeOf(error)})`,
      );
      return;
    }
    if (!chosen) {
      return;
    }
    try {
      await client.capture(message);
    } catch (error) {
      this.failed(error);
    }
  }

  private failed(error: unknown): void {
    this.logger.warn(`A usage event was not sent to PostHog: ${typeOf(error)}`);
  }
}

// A 파티 made, with the stored Quest's visibility, for a Quest as its maker reads it or a Plan's answer holding one.
// Answers what it was given, so that a caller returns it as it is.
export function partyMade<T extends { joinPolicy: JoinPolicy } | { quest: { joinPolicy: JoinPolicy } }>(
  usage: UsageService,
  userId: string,
  made: T,
): T {
  const { joinPolicy } = 'quest' in made ? made.quest : made;
  usage.sent(userId, 'party_creation_completed', { visibility: visibilityOf(joinPolicy) });
  return made;
}

// A friendship stored: one event for each of the two Users.
export function friendsMade(usage: UsageService, { userAId, userBId }: FriendPair, how: FriendshipHow): void {
  usage.sent(userAId, 'friendship_creation_completed', { how });
  usage.sent(userBId, 'friendship_creation_completed', { how });
}

export interface FriendPair {
  userAId: string;
  userBId: string;
}
