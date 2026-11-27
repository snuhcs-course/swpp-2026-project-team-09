/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { defineTool, type Tool, type ToolContext } from '../feature.js';
import { type FoundIds } from '../found-ids.js';
import { seatNameOf } from './app-names.js';
import { type Catalogue, type LibrarySpace, type SpaceStatus, statusOf } from './catalogue.js';
import {
  affiliationFor,
  catalogueSummary,
  gated,
  type LibraryServices,
  spaceAnswer,
  statusReason,
} from './library-parts.js';

// The seat space that words naming no space mean; among several seat spaces it comes first.
const FIRST_SEAT = '7F-7A-zone2';

const FOUND = `'found' with each space's status and facts (implemented: bookable here; notOnline: used on site only; unsupported: 아직 미구현; notEligible: for graduate students only); or 'unsupported' when no id was given.`;

const RESULTS = `Answers result 'several' with the candidates when two or more bookable spaces fit (ask which one, listing the names); ${FOUND}`;

const FIRST_SEAT_RESULTS = `Answers result 'found' with only the first of them in the catalogue's order, ${FIRST_SEAT} before the others, when two or more bookable seat spaces fit: use that one, without asking which; 'several' with the candidates when two or more bookable spaces fit otherwise (ask which one, listing the names); ${FOUND}`;

const input = z.object({
  spaceIds: z.array(z.string().trim().min(1).max(40)).max(10).optional().describe('The catalogue ids that fit.'),
  words: z.string().trim().min(1).max(200).describe("The User's words for the space, as written."),
});

export interface FindSpaceOptions {
  // The app draws answers on the map: of several bookable seat spaces, the first is filled instead of asking.
  picksFirstSeat: boolean;
}

interface Answered {
  id: string;
  space: LibrarySpace | undefined;
  status: SpaceStatus;
}

// The first of two or more bookable spaces that are all seat spaces, in the catalogue's order with FIRST_SEAT first;
// null otherwise.
function firstSeat({ spaces }: Catalogue, bookable: readonly Answered[]): Answered | null {
  if (bookable.length < 2 || !bookable.every(({ space }) => space?.unit === 'seat')) {
    return null;
  }
  const order = (id: string): number => (id === FIRST_SEAT ? -1 : spaces.findIndex((space) => space.id === id));
  return bookable.toSorted((one, other) => order(one.id) - order(other.id))[0] ?? null;
}

// The seat spaces a run filled as the first of several, with how many fitted, so that their card says so.
const firstOfSeveral = new WeakMap<FoundIds, Map<string, number>>();

// The card's note for a seat space filled as the first of several in this run, if it was.
export function firstOfSeveralNote(context: ToolContext, spaceId: string): string[] {
  const fitted = firstOfSeveral.get(context.found)?.get(spaceId);
  return fitted === undefined ? [] : [`맞는 곳이 ${fitted}곳이라 첫 곳으로 채웠어요`];
}

// The answer of the first of several seat spaces, which alone counts as found, and is noted for its card.
function filledFirst(context: ToolContext, first: Answered, fitted: number): object {
  context.found.add('librarySpace', [first.id]);
  firstOfSeveral.set(context.found, new Map(firstOfSeveral.get(context.found)).set(first.id, fitted));
  return { result: 'found', spaces: [spaceAnswer(first.id, first.space, first.status, context.now)] };
}

// The resolver of 관정 spaces: the model passes the catalogue ids it read the User's words as, and the server answers
// each with its status and facts, or 'several' when more than one can be booked. It records the ids it returned.
export function findLibrarySpace(services: LibraryServices, options?: FindSpaceOptions): Tool {
  const { catalogue, users } = services;
  const picksFirstSeat = options?.picksFirstSeat ?? false;
  return defineTool({
    description: `Finds the 관정도서관 spaces the User's words name, from this catalogue of 관정관 (id, floor, name, purpose, aliases):
${catalogueSummary(catalogue)}

Only for booking or using a space inside 관정관; a Place near 관정, where a 파티 meets or a search near it ("관정 근처"), is resolvePlace's. Pass every id that fits the words, or none when nothing does, and the words as written. ${picksFirstSeat ? FIRST_SEAT_RESULTS : RESULTS}`,
    input,
    run: async ({ spaceIds = [] }, context) => {
      const blocked = gated(services, context);
      if (blocked !== null) {
        return blocked;
      }
      const spaces = [...new Set(spaceIds)].map((id) => ({ id, space: catalogue.byId.get(id) }));
      if (spaces.length === 0) {
        return { result: 'unsupported', ...statusReason(undefined, 'unsupported') };
      }
      const affiliation = await affiliationFor(
        users,
        context.userId,
        spaces.map(({ space }) => space),
      );
      const answered = spaces.map(({ id, space }) => ({ id, space, status: statusOf(space, affiliation) }));
      const bookable = answered.filter(({ status }) => status === 'implemented');
      const first = picksFirstSeat ? firstSeat(catalogue, bookable) : null;
      if (first !== null) {
        return filledFirst(context, first, bookable.length);
      }
      context.found.add(
        'librarySpace',
        answered.flatMap(({ id, space }) => (space === undefined ? [] : [id])),
      );
      if (bookable.length >= 2) {
        const candidates = bookable.map(({ id, space }) => ({
          id,
          name: space === undefined ? undefined : (seatNameOf(space) ?? space.name),
          floor: space?.floor,
          purpose: space?.purpose,
        }));
        return { result: 'several', candidates };
      }
      return {
        result: 'found',
        spaces: answered.map(({ id, space, status }) => spaceAnswer(id, space, status, context.now)),
      };
    },
  });
}
