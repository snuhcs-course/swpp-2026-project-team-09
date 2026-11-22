/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type PlaceDto } from '../../places/dto/place.dto.js';
import { type MeetInput } from '../dto/answer.dto.js';
import { onDay } from '../free-time/free-time.js';
import { earliest, type Interval, latest } from '../free-time/meal-fit.js';
import {
  gather,
  type Gathering,
  type GatheringPerson,
  type GatheringPlace,
  type GatheringSide,
  type GatheringTravel,
} from './gathering.js';
import { placeLabelOf } from './place-naming.js';

// When and where people meet: the hours of the day a meet lies in, and the Places it may be at.

const MEET_HOURS = { from: '09:00', until: '22:00' };

// A meet has some twenty places to choose from, where a meal has its few Restaurants; past the first few, more Plans
// only crowd the map and lengthen the reply.
const MEET_PLANS_MAX = 5;

export function meetHours(date: string): Interval {
  return { start: onDay(date, MEET_HOURS.from), end: onDay(date, MEET_HOURS.until) };
}

// The day's hours narrowed on each side the User fixed. It may come out empty.
export function meetWindow({ date, window }: Pick<MeetInput, 'date' | 'window'>): Interval {
  const { start, end } = meetHours(date);
  return {
    start: window.from === null ? start : latest([start, onDay(date, window.from)]),
    end: window.until === null ? end : earliest([end, onDay(date, window.until)]),
  };
}

export interface MeetingPlaces {
  // 학생회관, the libraries, and the Restaurants open that day.
  shared: readonly GatheringPlace[];
  // How the building a person sets out from is called.
  own: (placeId: string) => GatheringPlace;
}

// A person's building is called by its number, as the app calls it ("302동 앞"), and 학생회관 and a library by their
// names, as people do ("신양학술정보관 앞"). In front of a building is where one waits; 학생회관 and a Restaurant are
// places to stay in.
export function meetingPlaces(
  {
    studentCenter,
    libraries,
    restaurants,
  }: {
    studentCenter: PlaceDto | null;
    libraries: readonly PlaceDto[];
    restaurants: readonly GatheringPlace[];
  },
  placeOf: (placeId: string) => PlaceDto,
): MeetingPlaces {
  return {
    shared: [
      ...(studentCenter === null ? [] : [{ key: studentCenter.name, placeId: studentCenter.id }]),
      ...libraries.map(({ id, name }) => ({ key: `${name} 앞`, placeId: id })),
      ...restaurants,
    ],
    own: (placeId) => ({ key: `${placeLabelOf(placeOf(placeId))} 앞`, placeId }),
  };
}

// Each Place once, under the first name it is given.
function oncePerPlace(places: readonly GatheringPlace[]): GatheringPlace[] {
  return places.filter((place, index) => places.findIndex(({ placeId }) => placeId === place.placeId) === index);
}

// The people's buildings of the stretch first, so that a Place someone sets out from is called theirs.
function candidatesOf(sides: readonly GatheringSide[], { shared, own }: MeetingPlaces): GatheringPlace[] {
  const buildings = sides.flatMap(({ origin }) => (origin === null ? [] : [own(origin.placeId)]));
  return oncePerPlace([...buildings, ...shared]);
}

// The earliest stretch the people share where they are together long enough, at the Places they may meet at and the
// buildings they set out from for it; or at the one Place the User fixed. The longest first, at most MEET_PLANS_MAX.
export function gatherToMeet(
  people: readonly [GatheringPerson, ...GatheringPerson[]],
  places: MeetingPlaces,
  fixedPlaceId: string | null,
  when: { window: Interval; now: Date },
  travel: GatheringTravel,
): Gathering {
  const gathering = gather(
    people,
    (sides) => {
      const all = candidatesOf(sides, places);
      if (fixedPlaceId === null) {
        return all;
      }
      return [all.find(({ placeId }) => placeId === fixedPlaceId) ?? places.own(fixedPlaceId)];
    },
    when,
    travel,
    { merging: false },
  );
  return { ...gathering, fits: gathering.fits.slice(0, MEET_PLANS_MAX) };
}
