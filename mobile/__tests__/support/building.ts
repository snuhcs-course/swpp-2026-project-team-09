/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, within } from '@testing-library/react-native';
import type { Lookup } from '@/api/lookup-types';
import type { Place } from '@/api/types';
import type { TouchEventLike } from '@/screens/main/tutorial/use-map-tap';
import { pass, screen } from './app';
import type { FakeServer } from './fake-server';

// A building pressed on the everyday map (P02 ticket 22), against the fake main server.

// The main server's Places of boards a1, a3, a14, and a2, with the ids, numbers, names, and points of the stored cards
// (`tap-lookups.json`).
export const STUDENT_HALL: Place = {
  id: 'e3b13da4-ec15-5b6e-ba98-a0fd4346e08b',
  number: '63',
  name: '학생회관',
  latitude: 37.45932,
  longitude: 126.95058,
};
export const GRADUATE_HALL: Place = {
  id: '567ed1bd-92d1-549f-9ae2-32375c75e818',
  number: '39',
  name: '대학원연구동(1단계)',
  latitude: 37.45465,
  longitude: 126.95157,
};
export const ENGINEERING_2: Place = {
  id: 'fba342e9-4edb-560d-9ac4-2a4d2454f9d3',
  number: '302',
  name: '제2공학관',
  latitude: 37.44887,
  longitude: 126.95265,
};
export const CULTURE_HALL: Place = {
  id: '1d3c1a4b-333a-50a9-b092-e142be72e481',
  number: '73',
  name: '문화관',
  latitude: 37.46159,
  longitude: 126.95104,
};

// Somewhere on the plain ground, away from its marks.
export const GROUND = { x: 40, y: 1200 };

// A touch of one finger on the map, as the View around it sees it.
function touchAt(
  x: number,
  y: number,
  timestamp: number,
  fingers: number,
): { nativeEvent: TouchEventLike['nativeEvent'] } {
  return { nativeEvent: { pageX: x, pageY: y, timestamp, touches: Array.from({ length: fingers }, () => ({})) } };
}

// A finger put on the map at a point and lifted after `ms`, `moved` points to the right.
export async function touchAndLift(at = GROUND, { moved = 0, ms = 100 } = {}): Promise<void> {
  const around = screen.getByTestId('main-map-touches');
  await fireEvent(around, 'touchStart', touchAt(at.x, at.y, 1000, 1));
  await fireEvent(around, 'touchEnd', touchAt(at.x + moved, at.y, 1000 + ms, 0));
}

// A tap on the ground, and the time for the map to count it and the main server to answer. The card the Place's answer
// opens is drawn as the first wait ends, and asks for the Place's card in the second.
export async function tapGround(at = GROUND): Promise<void> {
  await touchAndLift(at);
  await pass(500);
  await pass(500);
}

// The main server answers a point with the Place and a press on it with the card.
export function answerBuilding(server: FakeServer, place: Place, card: Lookup): void {
  server.on('GET /places/at', { status: 200, body: { place, relation: 'inside' } });
  server.on('POST /assistant/taps', { status: 200, body: card });
}

export async function pressBuilding(server: FakeServer, place: Place, card: Lookup): Promise<void> {
  answerBuilding(server, place, card);
  await tapGround();
}

export function buildingCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('map-card'));
}

// The card's fact lines in order, as they read.
export function factLines(): string[] {
  return buildingCard()
    .getAllByTestId('card-fact')
    .map((fact): unknown => fact.props.accessibilityLabel)
    .filter((words): words is string => typeof words === 'string');
}
