/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Quest } from '@/api/types';
import { toRecruitRows } from '@/features/events/adapter';
import { toCards } from '@/features/map/adapter';
import { toMineCards } from '@/features/party/mine';
import { toQuestRows } from '@/features/quests/adapter';
import { toRoom } from '@/features/quests/room-adapter';
import { ME, MIN_JUN, NOW, quest, sources } from '../support/map-sources';

// The room the library booked for a booking party (P05 ticket 68, P10 ticket 25) stands on every line that says the
// Quest's place, the room first, so that a narrow row that cuts the line keeps it: "G412 · 관정관 …".

const KWANJEONG = {
  placeId: null,
  label: '관정관 (62-1동) 4층 그룹스터디룸 6인실',
  latitude: 37.45945,
  longitude: 126.9519,
};
const PLACE = `G412 · ${KWANJEONG.label}`;

function booked(more: Partial<Quest> = {}): Quest {
  const base = quest('b1', {
    title: '관정 그룹스터디룸 6인실 예약',
    holders: [ME, MIN_JUN],
    bookedRoom: 'G412',
    ...more,
  });
  const [step] = base.subQuests;
  if (step === undefined) {
    throw new Error('The Quest has no step');
  }
  return { ...base, subQuests: [{ ...step, place: KWANJEONG }] };
}

const rows = (party: Quest): ReturnType<typeof toQuestRows> =>
  toQuestRows({ quests: [party], myParty: null, parties: [], meId: ME.id, now: NOW });

// Partitions: each place a Quest's place is drawn, booked and not. Expected values: the orchestrator's placement.
describe("A booked party's place", () => {
  it('leads with the room on the 파티 tab card', () => {
    const [card] = toMineCards({
      quests: [booked()],
      myParty: null,
      parties: [],
      declined: [],
      past: [],
      meId: ME.id,
      now: NOW,
    });

    expect(card?.place).toBe(PLACE);
  });

  it('leads with the room on the Quest list screen and in the map Quest list, before any cut', () => {
    const [row] = rows(booked());

    expect(row?.place).toBe(PLACE);
    expect(row?.meta).toBe(`17:40 · ${PLACE}`);
  });
});

describe("A booked party's place on its screens", () => {
  it("leads with the room on the map's Quest card", () => {
    const card = toCards(sources({ quests: [booked()] })).find(({ id }) => id === 'party:b1');

    expect(card?.lines.map(({ text }) => text)).toContain(PLACE);
  });

  it("leads with the room on its room's screen", () => {
    const view = toRoom({
      quest: { ...booked(), photo: null, tags: [], faces: [] },
      myParty: null,
      parties: [],
      declined: [],
      seenFriends: [],
      meId: ME.id,
    });

    expect(view.plan.map(({ place }) => place)).toEqual([PLACE]);
  });

  it("leads with the room in its event's list of 파티", () => {
    const party = booked({ globalEvent: { id: 'e1', title: 'AI 커리어 설명회' } });

    const [row] = toRecruitRows('e1', [party], [], ME.id, NOW);

    expect(row?.meta).toContain(PLACE);
  });

  it('is the place alone while nothing is booked', () => {
    const [row] = rows(booked({ bookedRoom: null }));

    expect(row?.place).toBe(KWANJEONG.label);
  });
});
