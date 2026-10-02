// Post numbers from `first` on, one per call. Each test file takes numbers of its own, because the files share the
// database and a post is stored once.
export function postNumbersFrom(first: number): () => number {
  let next = first;
  return (): number => {
    next += 1;
    return next;
  };
}

// A post as the worker reads it, with `changes` applied: a time from the body's time line and a place in 132동.
export function collectedEvent(postNumber: number, changes: object = {}): Record<string, unknown> {
  return {
    postNumber,
    sourceUrl: `https://www.snu.ac.kr/snunow/events?md=v&bbsidx=${postNumber}`,
    title: '[연합전공 지능형통신] 2027학년도 1학기 선발 및 설명회 안내',
    description: '- 일시: 2026. 10. 13.(화) 17:00\n- 장소: 뉴미디어통신공동연구소 이충웅홀(132동 103호)',
    start: '2026-10-13T17:00:00+09:00',
    end: null,
    readFrom: 'body',
    place: '뉴미디어통신공동연구소 이충웅홀(132동 103호)',
    ...changes,
  };
}

// An events message of the worker, with `changes` applied.
export function eventsMessage(events: object[], changes: object = {}): object {
  return { source: 'snu_events', collectedAt: '2026-10-02T06:00:00+09:00', events, ...changes };
}

// A time no stored message carries, so that a success recorded for a refused message would be seen.
const refusedAt = { collectedAt: '2026-10-31T06:00:00+09:00' };

// The post `valid`, then the post `other` with `changes`, so that storing nothing is seen.
function secondChanged(valid: number, other: number, changes: object): object {
  return eventsMessage([collectedEvent(valid), collectedEvent(other, changes)], refusedAt);
}

// The problem, the message for two posts of the test's own and what the answer names.
export const invalidEventsMessages: [string, (valid: number, other: number) => object, string][] = [
  [
    'a start that is neither a time nor a day',
    (valid, other) => secondChanged(valid, other, { start: '10. 13.(화) 17:00' }),
    'events.1.start: ',
  ],
  [
    'a time without its offset',
    (valid, other) => secondChanged(valid, other, { end: '2026-10-13T19:00:00' }),
    'events.1.end: ',
  ],
  [
    'a source other than the time line or the header',
    (valid, other) => secondChanged(valid, other, { readFrom: 'title' }),
    'events.1.readFrom: ',
  ],
  [
    'a post number that is not a number',
    (valid, other) => secondChanged(valid, other, { postNumber: String(other) }),
    'events.1.postNumber: ',
  ],
  [
    'a field the schema does not know',
    (valid, other) => secondChanged(valid, other, { poster: 'poster.jpg' }),
    'events.1: ',
  ],
  [
    'the same post twice',
    (valid) => eventsMessage([collectedEvent(valid), collectedEvent(valid)], refusedAt),
    'events: Each post must appear once',
  ],
  [
    'a Source that has no events',
    (valid) => eventsMessage([collectedEvent(valid)], { ...refusedAt, source: 'coop_menus' }),
    'source: ',
  ],
];
