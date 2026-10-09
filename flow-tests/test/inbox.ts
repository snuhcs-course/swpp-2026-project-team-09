/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { Socket } from 'socket.io-client';
import { z } from 'zod';

interface Message {
  name: string;
  payload: unknown;
}

const WAIT_MS = 10_000;

// How long a message that should not come is waited for. Delivered messages take milliseconds.
const QUIET_MS = 1500;

// What a User's app receives over the socket, kept in the order it arrived until a test takes it.
export class Inbox {
  private messages: Message[] = [];
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly owner: string,
    socket: Socket,
  ) {
    socket.onAny((name: string, payload: unknown) => {
      this.messages.push({ name, payload });
      for (const listener of this.listeners) {
        listener();
      }
    });
  }

  // A signal that carries nothing, such as `quests-changed`.
  async receivesSignal(name: string, waitMs = WAIT_MS): Promise<void> {
    await this.receives(name, z.unknown(), () => true, waitMs);
  }

  // The first message of that name whose payload matches, waiting for it when none came yet. It and the messages
  // before it are taken, so that the next wait sees only later ones.
  async receives<T>(
    name: string,
    schema: z.ZodType<T>,
    matches: (payload: T) => boolean,
    waitMs = WAIT_MS,
  ): Promise<T> {
    const take = (): { payload: T } | undefined => {
      const index = this.messages.findIndex((message) => this.matching(message, name, schema, matches) !== undefined);
      const message = this.messages[index];
      if (message === undefined) {
        return undefined;
      }
      this.messages = this.messages.slice(index + 1);
      return this.matching(message, name, schema, matches);
    };
    const found = take() ?? (await this.until(take, waitMs));
    if (found === undefined) {
      throw new Error(`${this.owner} did not receive ${name} within ${waitMs} ms; received ${this.names()}`);
    }
    return found.payload;
  }

  // No message of that name whose payload matches arrives within a short window.
  async receivesNo<T>(name: string, schema: z.ZodType<T>, matches: (payload: T) => boolean): Promise<void> {
    const find = (): { payload: T } | undefined =>
      this.messages
        .map((message) => this.matching(message, name, schema, matches))
        .find((found) => found !== undefined);
    const found = find() ?? (await this.until(find, QUIET_MS));
    if (found !== undefined) {
      throw new Error(`${this.owner} received ${name} that should not come: ${JSON.stringify(found.payload)}`);
    }
  }

  private matching<T>(
    message: Message,
    name: string,
    schema: z.ZodType<T>,
    matches: (payload: T) => boolean,
  ): { payload: T } | undefined {
    const parsed = schema.safeParse(message.payload);
    return message.name === name && parsed.success && matches(parsed.data) ? { payload: parsed.data } : undefined;
  }

  private until<T>(check: () => T | undefined, waitMs: number): Promise<T | undefined> {
    return new Promise((resolve) => {
      const done = (found?: T): void => {
        clearTimeout(timer);
        this.listeners.delete(listener);
        resolve(found);
      };
      const listener = (): void => {
        const found = check();
        if (found !== undefined) {
          done(found);
        }
      };
      const timer = setTimeout(done, waitMs);
      this.listeners.add(listener);
    });
  }

  private names(): string {
    return this.messages.length === 0 ? 'nothing else' : this.messages.map((message) => message.name).join(', ');
  }
}
