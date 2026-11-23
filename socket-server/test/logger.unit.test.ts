/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions of LOG_FORMAT: json, text, not set, anything else.

import { type ConsoleLogger } from '@nestjs/common';
import { createLogger } from '../src/common/logger.js';

const STACK = 'Error: The library did not answer\n    at LibraryClient.book (src/library/library.ts:10:5)';

// What the logger writes to the process's output and error output while `write` runs, line by line.
function linesWritten(logger: ConsoleLogger, write: (logger: ConsoleLogger) => void): string[] {
  const chunks: string[] = [];
  const keep = (chunk: string | Uint8Array): boolean => {
    chunks.push(String(chunk));
    return true;
  };
  const spies = [
    vi.spyOn(process.stdout, 'write').mockImplementation(keep),
    vi.spyOn(process.stderr, 'write').mockImplementation(keep),
  ];
  try {
    write(logger);
  } finally {
    for (const spy of spies) {
      spy.mockRestore();
    }
  }
  return chunks
    .join('')
    .split('\n')
    .filter((line) => line !== '');
}

function isJson(line: string): boolean {
  try {
    JSON.parse(line);
    return true;
  } catch {
    return false;
  }
}

function warnAndError(logger: ConsoleLogger): void {
  logger.warn('Kakao did not answer: timeout', 'WalkingRouteService');
  logger.error('The Collection could not be recorded', STACK, 'CollectionService');
}

describe('createLogger', () => {
  it('json → a warn and an error each write one JSON line with their level and message', () => {
    const lines = linesWritten(createLogger({ LOG_FORMAT: 'json' }), warnAndError);

    expect(lines.map((line) => JSON.parse(line) as unknown)).toEqual([
      expect.objectContaining({
        level: 'warn',
        message: 'Kakao did not answer: timeout',
        context: 'WalkingRouteService',
      }),
      expect.objectContaining({
        level: 'error',
        message: 'The Collection could not be recorded',
        context: 'CollectionService',
        stack: STACK,
      }),
    ]);
  });

  it.each([
    ['text', { LOG_FORMAT: 'text' }],
    ['not set', {}],
  ])('%s → writes no line as JSON', (_as, env) => {
    const lines = linesWritten(createLogger(env), warnAndError);

    expect(lines.join('\n')).toContain('Kakao did not answer: timeout');
    expect(lines.filter((line) => isJson(line))).toEqual([]);
  });

  it.each(['json', 'text'])('%s → writes log, warn, error and fatal, and no debug or verbose', (format) => {
    const lines = linesWritten(createLogger({ LOG_FORMAT: format }), (logger) => {
      for (const level of ['log', 'warn', 'error', 'fatal', 'debug', 'verbose'] as const) {
        logger[level](`A line at ${level}`);
      }
    });

    expect(lines.join('\n')).toContain('A line at fatal');
    expect(lines.filter((line) => line.includes('A line at'))).toHaveLength(4);
    expect(lines.join('\n')).not.toMatch(/A line at (?:debug|verbose)/u);
  });

  // The other invalid values: test/settings.unit.test.ts.
  it('JSON → refused, naming LOG_FORMAT', () => {
    expect(() => createLogger({ LOG_FORMAT: 'JSON' })).toThrow('LOG_FORMAT');
  });
});
