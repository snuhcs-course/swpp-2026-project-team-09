/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type GoldPair, type GoldPost, type SavedPost } from '../eval/collection/gold.ts';
import { type RunInput, type RunName } from '../eval/collection/run.ts';
import { type PlaceDto } from '../src/places/dto/place.dto.js';

// The posts, the worker's parser standing in and the settings of a whole run, for the tests of the collection eval runner.
// The sets hold none of these posts.

const PLACES: PlaceDto[] = [{ id: 'p-301', name: '제1공학관', number: '301', latitude: 0, longitude: 0 }];

const NOW = new Date('2026-10-31T00:00:00Z');

function saved(post: string, source: SavedPost['source'], key: string): SavedPost {
  return { post, source, key, fetchedAt: NOW };
}

const SAVED = new Map([
  ['snu-1', saved('snu-1', 'snu_events', '1')],
  ['snu-2', saved('snu-2', 'snu_events', '2')],
  ['extra-PGM1', saved('extra-PGM1', 'extra_snu', 'PGM1')],
]);

const TIME = '일시: 2026. 11. 2.(월) 14:00~15:00';

function collected(key: string, written: string, place: string | null, read: boolean, title: string): object {
  return {
    key,
    address: `https://example.com/${key}`,
    title,
    description: `${TIME}\n장소: ${written}\n문의: someone@snu.ac.kr`,
    links: [],
    sessions: [
      {
        number: 1,
        start: read ? '2026-11-02T14:00:00+09:00' : null,
        end: read ? '2026-11-02T15:00:00+09:00' : null,
        readFrom: read ? 'body' : null,
        place,
      },
    ],
  };
}

const PARSED: Record<string, object> = {
  1: collected('1', '서울대학교 301동', null, false, '특강'),
  2: collected('2', '서울대학교 301동', '서울대학교 301동', true, '특강'),
  PGM1: collected('PGM1', '서울대학교 제1공학관 117호', null, false, '다른 이름의 특강'),
};

const parsers = {
  snuEvents: (_html: string, key: string): object => PARSED[key] ?? {},
  extraSnu: (_html: string, key: string): object => PARSED[key] ?? {},
};

const GOLDS: GoldPost[] = [
  {
    id: 'a-1',
    post: 'snu-1',
    announcesEvent: true,
    sessions: [
      {
        n: 1,
        start: '2026-11-02T14:00',
        end: '2026-11-02T15:00',
        placeId: 'p-301',
        overPeriod: false,
        mayPublish: true,
      },
    ],
  },
];

export const PAIRS: GoldPair[] = [
  {
    id: 'b-1',
    a: { post: 'snu-2', session: null },
    b: { post: 'extra-PGM1', session: null },
    chosenAs: 'different-title',
    sameEvent: true,
  },
];

export function judgementAnswer(place: string): string {
  const line = TIME;
  return JSON.stringify({
    announcesEvent: true,
    sessions: [
      {
        start: '2026-11-02T14:00',
        end: '2026-11-02T15:00',
        place,
        overPeriod: false,
        lines: { start: [line], end: [line], place: [`장소: ${place}`] },
      },
    ],
  });
}

export function input(run: RunName, changes: Partial<RunInput> = {}): RunInput {
  return {
    run,
    part: 'development',
    golds: GOLDS,
    pairs: PAIRS,
    saved: SAVED,
    page: () => '<html></html>',
    parsers,
    places: PLACES,
    model: null,
    prices: { input: 1e-7, output: 5e-7, cacheRead: 1e-8, cacheWrite: 1e-7, source: 'openrouter' },
    budgetUsd: 1,
    limits: { timeoutMs: 1000, maxOutputTokens: 500 },
    calls: { judgements: {}, choices: {} },
    ...changes,
  };
}
