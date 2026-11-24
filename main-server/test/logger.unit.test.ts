/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by TaeHyun79
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// Partitions of LOG_FORMAT: json, text, not set, anything else. Of a line: in a request's context or outside one.

import { type ConsoleLogger } from '@nestjs/common';
import { createLogger } from '../src/common/logger.js';
import { requestContext } from '../src/common/request-context.js';

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

  // The other invalid values: test/settings-log-format.unit.test.ts.
  it('JSON → refused, naming LOG_FORMAT', () => {
    expect(() => createLogger({ LOG_FORMAT: 'JSON' })).toThrow('LOG_FORMAT');
  });
});

function inRequest(write: () => void): void {
  requestContext.run({ reqId: 'req-1', userId: 'user-1', startedAt: 0 }, write);
}

function parsed(line: string | undefined): unknown {
  return JSON.parse(line ?? '');
}

describe('A JSON line in a request', () => {
  it('→ holds req_id and user_id beside the usual fields', () => {
    const lines = linesWritten(createLogger({ LOG_FORMAT: 'json' }), (logger) => {
      inRequest(() => {
        warnAndError(logger);
      });
    });

    expect(lines.map((line) => parsed(line))).toEqual([
      expect.objectContaining({ level: 'warn', context: 'WalkingRouteService', req_id: 'req-1', user_id: 'user-1' }),
      expect.objectContaining({ level: 'error', stack: STACK, req_id: 'req-1', user_id: 'user-1' }),
    ]);
  });

  it('before a sign-in is known → req_id only', () => {
    const lines = linesWritten(createLogger({ LOG_FORMAT: 'json' }), (logger) => {
      requestContext.run({ reqId: 'req-2', startedAt: 0 }, () => {
        logger.warn('A warning', 'SignalsService');
      });
    });

    expect(parsed(lines[0])).toHaveProperty('req_id', 'req-2');
    expect(parsed(lines[0])).not.toHaveProperty('user_id');
  });

  it("with a plain object after the message → its fields on the line, the logger's own fields kept", () => {
    const lines = linesWritten(createLogger({ LOG_FORMAT: 'json' }), (logger) => {
      inRequest(() => {
        logger.log('PUT /quests/q-1 200 8ms', { req_body: '{}', level: 'error' }, 'HTTP');
      });
    });

    expect(parsed(lines[0])).toEqual(
      expect.objectContaining({
        level: 'log',
        context: 'HTTP',
        message: 'PUT /quests/q-1 200 8ms',
        req_body: '{}',
        req_id: 'req-1',
      }),
    );
  });
});

// The process ID and the time come before the level.
function fromLevel(line: string): string {
  return line.replace(/^.*?(?= *(?:WARN|ERROR) )/u, '');
}

describe('A line outside a request, or in text', () => {
  it('json, outside a request → no req_id or user_id', () => {
    const lines = linesWritten(createLogger({ LOG_FORMAT: 'json' }), warnAndError);

    for (const line of lines) {
      expect(parsed(line)).not.toHaveProperty('req_id');
      expect(parsed(line)).not.toHaveProperty('user_id');
    }
  });

  it('text, in a request → the same text as outside one', () => {
    const outside = linesWritten(createLogger({ LOG_FORMAT: 'text' }), warnAndError);
    const inside = linesWritten(createLogger({ LOG_FORMAT: 'text' }), (logger) => {
      inRequest(() => {
        warnAndError(logger);
      });
    });

    expect(inside.map((line) => fromLevel(line))).toEqual(outside.map((line) => fromLevel(line)));
    expect(inside.join('\n')).not.toContain('req-1');
  });
});
