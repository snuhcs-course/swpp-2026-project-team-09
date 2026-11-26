/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type UsageClient, type UsageClientFactory, type UsageMessage } from '../src/usage/usage.service.js';

// A placeholder of a project token's shape: no real token is in a test.
export const POSTHOG_TOKEN = 'phc_testPlaceholderToken0123456789abcdef';
export const usageSettings = { POSTHOG_PROJECT_TOKEN: POSTHOG_TOKEN };

// Makes no client, so that no test that forgot its stand-in reaches PostHog.
export const refusePostHog: UsageClientFactory = () => {
  throw new Error('The test gave PostHog no stand-in');
};

// Stands for PostHog's client: keeps each event it is given, and answers as it was last told. `throws` fails the
// capture itself; `reports` sends the event and then tells a failure through `onError`, as posthog-node does after its
// request failed or timed out; `hangs` never answers.
export class PostHogStub {
  events: UsageMessage[] = [];
  tokens: string[] = [];
  shutdowns: number[] = [];
  private behaviour: { kind: 'sends' } | { kind: 'throws' | 'reports'; error: Error } | { kind: 'hangs' } = {
    kind: 'sends',
  };
  private onError: ((error: unknown) => void) | null = null;
  // The answers a hanging PostHog holds back.
  private held: (() => void)[] = [];

  reset(): void {
    this.events = [];
    this.shutdowns = [];
    this.behaviour = { kind: 'sends' };
  }

  throws(error: Error): void {
    this.behaviour = { kind: 'throws', error };
  }

  reports(error: Error): void {
    this.behaviour = { kind: 'reports', error };
  }

  hangs(): void {
    this.behaviour = { kind: 'hangs' };
  }

  // The events sent for this User, in the order given.
  of(userId: string): UsageMessage[] {
    return this.events.filter(({ distinctId }) => distinctId === userId);
  }

  readonly clients: UsageClientFactory = (token, onError) => {
    this.tokens.push(token);
    this.onError = onError;
    const client: UsageClient = {
      capture: (message) => {
        this.events.push(message);
        const behaviour = this.behaviour;
        if (behaviour.kind === 'throws') {
          return Promise.reject(behaviour.error);
        }
        if (behaviour.kind === 'reports') {
          this.onError?.(behaviour.error);
        }
        if (behaviour.kind === 'hangs') {
          return new Promise<void>((resolve) => {
            this.held.push(resolve);
          });
        }
        return Promise.resolve();
      },
      shutdown: (timeoutMs) => {
        this.shutdowns.push(timeoutMs);
        return Promise.resolve();
      },
    };
    return client;
  };
}

// Lets an event that was wrongly started reach the stand-in before a test checks that none did: the consent's read
// takes one query.
export async function settle(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 150);
  });
}
