/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { eventTime, recruitingCounts } from '@/features/events/adapter';
import { type CardView, cardId, line, type MapSources } from './adapter';
import { eventPins } from './event-pins';
import { shortTitle } from './short-name';

// The cards of the Global Events that stand on the map (`event-pins.ts`), a Favorite Event's with the star. Things at
// one place are grouped on the main screen (`place-groups.ts`). The others are in the 행사 tab only.
export function eventCards(sources: MapSources): CardView[] {
  const { globalEvents, globalEventAnnouncers, recruiting: gathering, now, forInterestMarks } = sources;
  const counts = recruitingCounts(gathering);
  return eventPins(globalEvents, forInterestMarks).map(({ event, look }): CardView => {
    const announcer = globalEventAnnouncers.find(({ eventId }) => eventId === event.id)?.announcer;
    const recruiting = counts.get(event.id) ?? 0;
    return {
      id: cardId.globalEvent(event.id),
      kind: 'global-event',
      mark: { type: 'place', place: 'official', ...(look === 'favorite' ? { starred: true } : {}) },
      marker: {
        name: `공식 행사 · ${event.title}`,
        short: shortTitle(event.title),
        count: recruiting > 1 ? recruiting : 0,
        minutesOld: null,
      },
      subLabel: announcer === undefined ? '공식 행사' : `공식 행사 · ${announcer}`,
      title: event.title,
      lines: [
        line('clock', eventTime(event, now)),
        ...(event.place === null ? [] : [line('pin', event.place)]),
        ...(recruiting === 0 ? [] : [line('users', `같이 갈 파티 ${recruiting}개 모집 중`)]),
      ],
      primary: { label: '같이 갈 사람 찾기', action: 'recruit', eventId: event.id },
      secondary: null,
      position: { latitude: event.latitude, longitude: event.longitude },
      event: { id: event.id, favorite: event.favorite },
    };
  });
}
