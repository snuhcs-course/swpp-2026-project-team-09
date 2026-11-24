/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { z } from 'zod';

const logLineSchema = z.looseObject({ level: z.string(), message: z.string() });

export type LogLine = z.infer<typeof logLineSchema>;

// Makes the started app log JSON lines, as in Production. startApp imports the server's modules afresh, so the logger
// is imported after it, from the same modules as the app's request context.
export async function useJsonLogs(app: INestApplication<Server>): Promise<void> {
  const { createLogger } = await import('../src/common/logger.js');
  app.useLogger(createLogger({ LOG_FORMAT: 'json' }));
}

// Each JSON line written to the process's output and error output from now on, and the whole output as text. Nothing
// reaches the terminal meanwhile.
export function captureJsonLines(): { lines: () => LogLine[]; text: () => string } {
  const chunks: string[] = [];
  const keep = (chunk: string | Uint8Array): boolean => {
    chunks.push(String(chunk));
    return true;
  };
  vi.spyOn(process.stdout, 'write').mockImplementation(keep);
  vi.spyOn(process.stderr, 'write').mockImplementation(keep);
  const text = (): string => chunks.join('');
  const lines = (): LogLine[] =>
    text()
      .split('\n')
      .filter((line) => line.startsWith('{'))
      .map((line) => logLineSchema.parse(JSON.parse(line)));
  return { lines, text };
}

// The request line of the one request whose message starts with `start`, once its response has been logged.
export function requestLine(lines: () => LogLine[], start: string): Promise<LogLine> {
  return vi.waitFor(() => {
    const found = lines().filter(
      (line) => line.context === 'HTTP' && line.level === 'log' && line.message.startsWith(start),
    );
    expect(found).toHaveLength(1);
    return found[0];
  });
}
