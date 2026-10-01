import { INestApplication } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { Server } from 'node:http';
import { lastValueFrom } from 'rxjs';
import { inject } from 'vitest';
import { z } from 'zod';
import { redisSettings, startRedis } from './containers.js';
import { startApp } from './start-app.js';

export interface WorkerHarness {
  app: INestApplication<Server>;
  // Sends messages as the worker server does.
  worker: ClientProxy;
  close: () => Promise<void>;
}

// Every test file's server listens on the shared test Redis, and each of them would handle and answer a message. A
// file that sends messages therefore starts its server on a Redis of its own. The database stays the shared one.
export async function startWithWorker(): Promise<WorkerHarness> {
  const redis = await startRedis();
  const settings = { ...inject('settings'), ...redisSettings(redis) };
  const app = await startApp(settings);
  const worker = ClientProxyFactory.create({
    transport: Transport.REDIS,
    options: { host: settings.REDIS_HOST, port: Number(settings.REDIS_PORT) },
  });
  await worker.connect();
  return {
    app,
    worker,
    close: async (): Promise<void> => {
      await worker.close();
      await app.close();
      await redis.stop();
    },
  };
}

// Sends a message as the worker does and resolves with the answer. A refused message rejects with the answer.
export function sendAsWorker(worker: ClientProxy, pattern: string, data: unknown): Promise<unknown> {
  return lastValueFrom(worker.send(pattern, data));
}

const refusalSchema = z.strictObject({ status: z.literal('error'), message: z.string() });

// Sends a message that the server should refuse and resolves with the problem its answer names.
export async function refusal(worker: ClientProxy, pattern: string, data: unknown): Promise<string> {
  try {
    await sendAsWorker(worker, pattern, data);
  } catch (answer) {
    return refusalSchema.parse(answer).message;
  }
  throw new Error(`The server did not refuse ${pattern}`);
}
