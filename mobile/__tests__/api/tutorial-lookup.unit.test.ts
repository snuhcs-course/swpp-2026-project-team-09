/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { TUTORIAL_LOOKUP } from '@/api/mock/data/tutorial-lookup';
import { isLookup } from '@/api/server/lookup-answers';

// The app's check of the Tutorial Quests in order, on the stored copy of the main server's Lookup for "새내기 퀘스트
// 뭐부터?" (board q10), written by its `tutorialAnswer` over content/tutorial.yaml and the seed's Places and walking
// table. Expected values: the copy passes as the server wrote it, with its three quests numbered as steps.
describe('the check of a Lookup of the Tutorial Quests in order', () => {
  it('passes the stored copy of a real one, its quests numbered on the map and listed as steps', () => {
    expect(isLookup(TUTORIAL_LOOKUP)).toBe(true);
    expect(TUTORIAL_LOOKUP.scene.places.map(({ order }) => order)).toEqual([1, 2, 3, undefined]);
    expect(TUTORIAL_LOOKUP.steps).toHaveLength(3);
  });
});
