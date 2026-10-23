/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { restaurant, vehicle } from './answers.js';
import { seoulDay } from './campus.js';
import { signIn } from './people.js';
import { workerCollects } from './stack.js';

const vehicles = z.array(vehicle);

// The operator reports car 4522 by the main gate on the saved answer.
function atTheMainGate(reported: z.infer<typeof vehicles>): boolean {
  return reported.some(({ carId, stop }) => carId === '4522' && stop.name === '정문');
}

it("a student finds today's menus and a shuttle at its stop, collected by the worker", async () => {
  const minji = await signIn('김민지');

  // The worker collects the menus and the shuttle from the Sources' pages.
  await workerCollects('coop_menus', 'dormitory_menus', 'shuttle_stops', 'shuttle_vehicles');

  // Today's menus of the Co-op and the dormitory are served.
  const menus = await minji.get(`/menus?date=${seoulDay()}`, z.array(restaurant));
  expect(menus.map(({ name }) => name)).toEqual(expect.arrayContaining(['학생회관식당', '생협기숙사(919동)']));
  const studentCenter = menus.find(({ name }) => name === '학생회관식당');
  expect(studentCenter?.meals.map(({ meal }) => meal)).toEqual(['breakfast', 'lunch', 'dinner']);

  // The vehicle is at the 정문 stop, pushed to the open app and through the route.
  await minji.inbox.receives('shuttle-vehicles-updated', vehicles, atTheMainGate);
  expect(atTheMainGate(await minji.get('/shuttle/vehicles', vehicles))).toBe(true);
});
