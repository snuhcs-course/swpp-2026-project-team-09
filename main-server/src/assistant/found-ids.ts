/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { WHICH_FRIEND } from './tools/which-friend.js';

// The guard of the presenters and of proposeQuest: a card shows, and a Proposal takes, only what a lookup or a
// resolver returned in this message. Each run of a feature keeps its own, so that an id from an earlier message, or
// one the model made up, never reaches the screen. The lookups and resolvers record the ids they return; the
// presenters refuse any other. It also keeps the Places resolvePlace answered alone, so that a search not given one
// can say so (P12). The Friends of a resolver's several are refused until a later answer names one alone (P01-16).

// What an id names: a card's Quest, Global Event or Restaurant (by its key), or a Friend or a Place a resolver returned,
// which are never cards, or a 관정도서관 space of the catalogue findLibrarySpace returned.
export type FoundKind = 'quest' | 'globalEvent' | 'restaurant' | 'friend' | 'place' | 'librarySpace';

// A Place resolvePlace answered alone, which a search of the same message is meant to be near.
export interface ResolvedPlace {
  id: string;
  name: string;
  number: string | null;
}

const NO_IDS = (): Record<FoundKind, Set<string>> => ({
  quest: new Set(),
  globalEvent: new Set(),
  restaurant: new Set(),
  friend: new Set(),
  place: new Set(),
  librarySpace: new Set(),
});

// Why ids of a resolver's several are refused: the User has not said which Friend they meant.
export function contestedReason(ids: readonly string[]): string {
  return `The User's words fit several Friends, and these ids are among them: ${ids.join(', ')}. Nothing was done. Ask the User which one ${WHICH_FRIEND}, and call nothing else.`;
}

export class FoundIds {
  private readonly found = NO_IDS();

  // The ids a resolver answered among several, which the User has not chosen between.
  private readonly contestedIds = NO_IDS();

  private readonly places: ResolvedPlace[] = [];

  // The ids a lookup or a resolver returned to the model.
  add(kind: FoundKind, ids: Iterable<string>): void {
    for (const id of ids) {
      this.found[kind].add(id);
    }
  }

  // The ids a resolver answered among several. Another tool returning them again takes none of them.
  contest(kind: FoundKind, ids: Iterable<string>): void {
    for (const id of ids) {
      this.contestedIds[kind].add(id);
    }
  }

  // The id a resolver answered alone, which ends a several before it.
  settle(kind: FoundKind, id: string): void {
    this.found[kind].add(id);
    this.contestedIds[kind].delete(id);
  }

  // Those of the ids that a resolver answered among several and no later answer named alone.
  contested(kind: FoundKind, ids: readonly string[]): string[] {
    return ids.filter((id) => this.contestedIds[kind].has(id));
  }

  has(kind: FoundKind, id: string): boolean {
    return this.found[kind].has(id) && !this.contestedIds[kind].has(id);
  }

  // A Place resolvePlace answered 'one' with, so that a search not given it can say so.
  addResolvedPlace(place: ResolvedPlace): void {
    if (!this.places.some(({ id }) => id === place.id)) {
      this.places.push(place);
    }
  }

  // The Places resolvePlace answered alone in this message, in order.
  resolvedPlaces(): readonly ResolvedPlace[] {
    return this.places;
  }

  // Throws unless every id was returned in this message and none is contested, naming those that were not. The SDK
  // gives the error back to the model as the presenter's.
  refuseUnfound(kind: FoundKind, ids: readonly string[]): void {
    const contested = this.contested(kind, ids);
    if (contested.length > 0) {
      throw new Error(contestedReason(contested));
    }
    const unfound = ids.filter((id) => !this.found[kind].has(id));
    if (unfound.length > 0) {
      throw new Error(
        `No tool returned these ids in this message: ${unfound.join(', ')}. Nothing was shown. Show only ids that a search returned in this message.`,
      );
    }
  }
}
