/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { ShuttleRoute, ShuttleStop, ShuttleVehicle } from '@/api/shuttle-types';
import type { LatLng } from '@/api/types';
import { type userEvent, within } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';
import { pass, screen } from './app';
import type { FakeServer } from './fake-server';
import { LAYERS } from './lists';
import { socketServer } from './live';
import { openMain } from './main';
import { press } from './markers';
import { PHONE_NOW } from './server';

// The shuttle as the tests of its layer set it: a loop of four stops around a rectangle, from 정문 east to a corner,
// south through 법과대 to 자연대, west to a corner, and north through 농생대 back to 정문. Each side is about 442 m.

function stop(id: string, name: string, latitude: number, longitude: number): ShuttleStop {
  return { id, name, latitude, longitude };
}

export const GATE = stop('s1', '정문', 37.466, 126.9485);
export const LAW = stop('s2', '법과대', 37.462, 126.9535);
export const SCIENCE = stop('s3', '자연대', 37.458, 126.9535);
export const AGRICULTURE = stop('s4', '농생대', 37.462, 126.9485);

const NORTH_EAST: LatLng = { latitude: 37.466, longitude: 126.9535 };
const SOUTH_WEST: LatLng = { latitude: 37.458, longitude: 126.9485 };

function at({ latitude, longitude }: ShuttleStop): LatLng {
  return { latitude, longitude };
}

export const SERVICE_HOURS =
  '· 운행시간 안내(주말,공휴일,개교기념일 미운행)\n-  학기 8:00~21:00 / 계절학기, 방학 8:00~18:00';

export const ROUTE: ShuttleRoute = {
  serviceHours: SERVICE_HOURS,
  stops: [GATE, LAW, SCIENCE, AGRICULTURE],
  line: [at(GATE), NORTH_EAST, at(LAW), at(SCIENCE), SOUTH_WEST, at(AGRICULTURE), at(GATE)],
};

// A vehicle the operator reported at a stop, received when the phone's clock says by default.
export function vehicle(carId: string, where: ShuttleStop, receivedAt = new Date(Date.now())): ShuttleVehicle {
  return { carId, stop: where, receivedAt: receivedAt.toISOString() };
}

// `GET /shuttle` answers ROUTE, and `GET /shuttle/vehicles` the vehicles, one at 정문 by default.
export function answerShuttle(server: FakeServer, vehicles?: ShuttleVehicle[]): void {
  server.on('GET /shuttle', { status: 200, body: ROUTE });
  server.on('GET /shuttle/vehicles', { status: 200, body: vehicles ?? [vehicle('4522', GATE, PHONE_NOW)] });
}

// What a screen reader says for a stop's marker and a vehicle's.
export function stopMarker({ name }: ShuttleStop): string {
  return `셔틀버스 · ${name} 정류장`;
}

export function vehicleMarker({ name }: ShuttleStop): string {
  return `셔틀버스 · 운행 중 · ${name}에 있어요`;
}

type User = ReturnType<typeof userEvent.setup>;

export async function toggleShuttle(user: User): Promise<void> {
  await press(user, LAYERS);
  await user.press(screen.getByRole('togglebutton', { name: /^셔틀버스/u }));
  await press(user, '편의기능 레이어 닫기');
  await pass(500);
}

// The shuttle's line on the plain ground: its dashes, or none.
export function lineDashes(): ReturnType<typeof screen.queryAllByTestId> {
  const line = screen.queryByTestId('line:shuttle');
  return line === null ? [] : within(line).getAllByTestId('route-stroke');
}

// The main screen with its connection to the socket server open.
export async function openLiveMain(): Promise<Awaited<ReturnType<typeof openMain>>> {
  const user = await openMain();
  await socketServer((socket) => {
    socket.accept();
  });
  return user;
}

export function shown(name: string): boolean {
  return screen.queryByRole('button', { name }) !== null;
}

// Whether the plain ground draws a marker, which it leaves out while it is outside the view.
export function inView(name: string): boolean {
  const style: unknown = screen.getByRole('button', { name }).parent?.props.style;
  return StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]).width !== 1;
}
