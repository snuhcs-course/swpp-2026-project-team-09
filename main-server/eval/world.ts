/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { menusMessage } from '../test/menus.js';
import { signIn } from '../test/sign-in.js';
import { sendAsWorker } from '../test/worker.js';

// The fixed world of the benchmark (spec P19, "The fixed world"), seeded with the e2e helpers into a fresh database
// beside the shared Places seed, never the demo seed, which may change for demos. Every right answer of the cases
// refers to it, so the seed and the cases change together.
//
// This is the sample world of ticket 01: the asking User, and the menus of 2026-10-21 (today, at the fixed clock) and
// 2026-10-22. Ticket 03 grows it into the full world.

// Something a case names by its seed name, such as a card it showed or a Friend it invited.
export interface Seeded {
  kind: 'quest' | 'globalEvent' | 'place' | 'friend';
  id: string;
  name: string;
}

export interface World {
  // The asking User's, with which every message is sent.
  accessToken: string;
  // By seed name.
  seeds: Record<string, Seeded>;
}

// The User every case asks as.
export const ASKER = { name: '김하늘', department: '컴퓨터공학부' };

const line = (meal: string, name: string, price: number): object => ({
  meal,
  text: `${name} : ${price.toLocaleString('en-US')}원`,
  kind: 'dish',
  name,
  price,
});

const MENUS = [
  {
    date: '2026-10-21',
    restaurants: [
      {
        name: '학생회관식당',
        lines: [line('breakfast', '김치볶음밥', 2000), line('lunch', '제육볶음', 6000), line('dinner', '돈까스', 5500)],
      },
      { name: '자하연식당', lines: [line('lunch', '비빔밥', 6500), line('dinner', '순두부찌개', 6000)] },
    ],
  },
  {
    date: '2026-10-22',
    restaurants: [
      {
        name: '학생회관식당',
        lines: [
          line('breakfast', '토스트', 2000),
          line('lunch', '닭갈비덮밥', 6000),
          line('dinner', '카레라이스', 5000),
        ],
      },
    ],
  },
];

export async function seedWorld(app: INestApplication<Server>): Promise<World> {
  const { accessToken } = await signIn(app, {}, ASKER);
  await sendAsWorker(app, '/menus/collected', menusMessage(MENUS, { collectedAt: '2026-10-21T07:00:00+09:00' }));
  return { accessToken, seeds: {} };
}
