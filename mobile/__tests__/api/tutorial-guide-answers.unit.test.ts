/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { TUTORIAL_CONTENT } from '@/api/mock/data/tutorial';
import { isTutorial, withReadableGuides } from '@/api/server/tutorial-client';
import { isTutorialGuide } from '@/api/server/tutorial-guide-answers';

// The check of a Tutorial Quest's guide in the main server's answer (P15 ticket 53, review of #359): a guide this app
// cannot read, such as a newer server's with a button of a new kind, leaves only that quest without its guide.

// The answer of GET /tutorial with the content's first two quests, the second one's guide as given.
function answerWith(secondGuide: unknown): unknown {
  const [first, second] = TUTORIAL_CONTENT;
  return {
    state: 'active',
    rowHidden: false,
    eligibleByDefault: true,
    categories: [{ key: 'life', label: '생활' }],
    quests: [
      { ...first, status: 'started' },
      { ...second, guide: secondGuide, status: 'notStarted' },
    ],
  };
}

const NEW_KIND = {
  steps: [{ tab: '전화', title: '전화하기', actions: [{ kind: 'call', words: '전화', phone: '02' }] }],
};

// Partitions: every guide of the content; a guide with a button of a kind the app does not know; one without steps.
describe("a quest's guide", () => {
  it("reads every guide of the content's copy", () => {
    expect(TUTORIAL_CONTENT.filter(({ guide }) => !isTutorialGuide(guide))).toEqual([]);
  });

  it.each([
    ['a button of a new kind', NEW_KIND],
    ['neither steps nor kinds', { together: true }],
  ])('with %s leaves that quest without its guide, and the tutorial as it is', (_, guide) => {
    const answer = answerWith(guide);
    expect(isTutorial(answer)).toBe(true);
    if (!isTutorial(answer)) {
      return;
    }

    const read = withReadableGuides(answer);

    expect(read.quests.map(({ key }) => key)).toEqual(['s-card', 'thousand-won-meals']);
    expect(read.quests[0]?.guide).toEqual(TUTORIAL_CONTENT[0]?.guide);
    expect(read.quests[1]).not.toHaveProperty('guide');
  });
});
