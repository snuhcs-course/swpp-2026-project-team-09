/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// The guard of the presenters: a card shows only what a lookup or a resolver returned in this message. Each run of a
// feature keeps its own, so that an id from an earlier message, or one the model made up, never reaches the screen.
// The lookups and resolvers record the ids they return; the presenters refuse any other.

export type CardKind = 'quest' | 'globalEvent';

export class FoundIds {
  private readonly found: Record<CardKind, Set<string>> = { quest: new Set(), globalEvent: new Set() };

  // The ids a lookup or a resolver returned to the model.
  add(kind: CardKind, ids: Iterable<string>): void {
    for (const id of ids) {
      this.found[kind].add(id);
    }
  }

  // Throws unless every id was returned in this message, naming those that were not. The SDK gives the error back to
  // the model as the presenter's.
  refuseUnfound(kind: CardKind, ids: readonly string[]): void {
    const unfound = ids.filter((id) => !this.found[kind].has(id));
    if (unfound.length > 0) {
      throw new Error(
        `No tool returned these ids in this message: ${unfound.join(', ')}. Nothing was shown. Show only ids that a search returned in this message.`,
      );
    }
  }
}
