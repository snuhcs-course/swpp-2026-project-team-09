import { fireEvent, screen } from '@testing-library/react';

import type { GlobalEvent } from '@/main-server';

import { fakeMainServer } from './fake-main-server';
import { openEvent, signInAs } from './pages';

export const COLLECTED: Partial<GlobalEvent> = {
  title: '[연합전공 지능형통신] 2027학년도 1학기 선발 설명회',
  description: '일시: 2026. 10. 12.(월) 18:30\n장소: 뉴미디어통신공동연구소 이충웅홀(132동 103호)',
  startsAt: '2026-10-12T09:30:00.000Z',
  endsAt: '2026-10-12T11:00:00.000Z',
  place: '뉴미디어통신공동연구소 이충웅홀(132동 103호)',
  latitude: 37.45487,
  longitude: 126.95407,
  postNumber: 176525,
  sourceUrl: 'https://www.snu.ac.kr/snunow/events?md=v&bbsidx=176525',
};

// Signs in with a few Places stored, and answers the token.
export function signedInWithPlaces(): string {
  fakeMainServer.hasAdministrators('kim@snu.ac.kr');
  fakeMainServer.hasPlaces(
    { number: '301', name: '제1공학관', latitude: 37.45016, longitude: 126.95259 },
    { number: '62', name: '중앙도서관', latitude: 37.45943, longitude: 126.95184 },
    { number: null, name: '자하연', latitude: 37.46071, longitude: 126.9521 },
  );
  return signInAs('kim@snu.ac.kr');
}

// Stores the event and opens its page.
export async function opened(event: Partial<GlobalEvent>): Promise<GlobalEvent> {
  const [stored] = fakeMainServer.hasGlobalEvents(event);
  if (stored === undefined) {
    throw new Error('No event was stored.');
  }
  await openEvent(stored.id);
  return stored;
}

export function type(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

export function click(name: string): void {
  fireEvent.click(screen.getByRole('button', { name }));
}
