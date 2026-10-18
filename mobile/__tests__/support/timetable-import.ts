/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { pass, screen } from './app';
import { openMain } from './main';
import type { Place } from '@/api/types';
import type { ReadClass } from '@/features/timetable-ocr/classes';
import type { NativeOcrResult } from '@/features/timetable-ocr/native-ocr';
import type { Reading } from '@/features/timetable-ocr/read-timetable';

// `이미지로 불러오기`'s tests: fake readings of the pipeline's shape, and the week card's tile and toast.

// A reading of the pipeline's shape, with `leftOut` blocks left out.
export function read(title: string | null, classes: ReadClass[], leftOut = 0): Reading {
  const left = { weekday: 'monday', name: '?', start: null, end: null, reason: 'end-uncertain' } as const;
  return { kind: 'read', title, classes, leftOut: Array.from({ length: leftOut }, () => left) };
}

export const OCR: NativeOcrResult = {
  width: 1320,
  height: 2868,
  lines: [],
  pixels: { width: 330, height: 717, scale: 4, rgba: '' },
};

export type User = Awaited<ReturnType<typeof openMain>>;

export function lesson(
  name: string,
  weekday: ReadClass['times'][number]['weekday'],
  start: string,
  end: string,
): ReadClass {
  return { name, times: [{ weekday, start, end, room: null, placeId: null }] };
}

// 컴파일러 at 302동 311-1, linked with the Places the import passed, and 데이터베이스 without a building.
export function twoClasses(places: readonly Place[]): Reading {
  const building = places.find(({ number }) => number === '302');
  return read('2026년 2학기 최종', [
    {
      name: '컴파일러',
      times: [{ weekday: 'monday', start: '09:00', end: '10:15', room: '311-1', placeId: building?.id ?? null }],
    },
    lesson('데이터베이스', 'tuesday', '13:00', '14:15'),
  ]);
}

// 16 classes: monday and friday, 09 to 16 each.
export function sixteen(): ReadClass[] {
  const hours = ['09', '10', '11', '12', '13', '14', '15', '16'];
  return (['friday', 'monday'] as const).flatMap((weekday) =>
    hours.map((hour) => lesson(`${weekday} ${hour}`, weekday, `${hour}:00`, `${hour}:50`)),
  );
}

export async function openMe(): Promise<User> {
  const user = await openMain();
  await user.press(screen.getByRole('tab', { name: '내 정보' }));
  await pass(500);
  return user;
}

export function tile(): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('button', { name: '이미지로 불러오기' });
}

export function toast(): ReturnType<typeof screen.getByTestId> {
  return screen.getByTestId('toast-layer');
}

// Passes time a little at a time until a toast shows, which lasts 2.4 seconds, after the reading and the switch.
export async function untilToast(): Promise<void> {
  for (let step = 0; step < 100 && screen.queryByTestId('toast-layer') === null; step += 1) {
    // oxlint-disable-next-line no-await-in-loop -- one step after another
    await pass(100);
  }
}
