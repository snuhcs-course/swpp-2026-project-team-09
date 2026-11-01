/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { z } from 'zod';
import { defineTool, type Tool } from '../feature.js';
import { statusOf } from './catalogue.js';
import {
  affiliationFor,
  catalogueSummary,
  gated,
  type LibraryServices,
  spaceAnswer,
  statusReason,
} from './library-parts.js';

const RESULTS = `Answers result 'several' with the candidates when two or more bookable spaces fit (ask which one, listing the names); 'found' with each space's status and facts (implemented: bookable here; notOnline: used on site only; unsupported: 아직 미구현; notEligible: for graduate students only); or 'unsupported' when no id was given.`;

const input = z.object({
  spaceIds: z.array(z.string().trim().min(1).max(40)).max(10).optional().describe('The catalogue ids that fit.'),
  words: z.string().trim().min(1).max(200).describe("The User's words for the space, as written."),
});

// The resolver of 관정 spaces: the model passes the catalogue ids it read the User's words as, and the server answers
// each with its status and facts, or 'several' when more than one can be booked. It records the ids it returned.
export function findLibrarySpace(services: LibraryServices): Tool {
  const { catalogue, users } = services;
  return defineTool({
    description: `Finds the 관정도서관 spaces the User's words name, from this catalogue of 관정관 (id, floor, name, purpose, aliases):
${catalogueSummary(catalogue)}

Pass every id that fits the words, or none when nothing does, and the words as written. ${RESULTS}`,
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
      context.found.add(
        'librarySpace',
        answered.flatMap(({ id, space }) => (space === undefined ? [] : [id])),
      );
      const bookable = answered.filter(({ status }) => status === 'implemented');
      if (bookable.length >= 2) {
        const candidates = bookable.map(({ id, space }) => ({
          id,
          name: space?.name,
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
