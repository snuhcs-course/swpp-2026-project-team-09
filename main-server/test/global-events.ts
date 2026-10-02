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
