/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { renderHook } from '@testing-library/react-native';
import type { AnswerReply } from '@/api/assistant-types';
import { NO_LOCATION_ANSWER, NO_TIMETABLE_ANSWER } from '@/api/mock/data/missing-inputs';
import type { LatLng } from '@/api/types';
import { useAskedAgain } from '@/features/assistant/use-asked-again';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import { NO_ANSWER } from '../support/no-answer';

// The answer asked again once a position on campus comes (P04 ticket 86). Partitions: the position (none, as off
// campus or before the permission; one), the answer on screen (offering the location, not offering it, none), and the
// reply (the same one rendered again or after its recalculation, a new one). Expected values: the hook's rule.

const HERE: LatLng = { latitude: 37.45016, longitude: 126.95259 };
const ELSEWHERE: LatLng = { latitude: 37.4594, longitude: 126.9516 };

interface Seen {
  source: AnswerReply | null;
  answer: AnswerReply | null;
  position: LatLng | null;
}

async function watch(first: Seen): Promise<{ again: jest.Mock<void, []>; see: (next: Seen) => Promise<void> }> {
  const again = jest.fn<void, []>();
  const shownOf = ({ source, answer }: Seen): ShownAnswer => ({ ...NO_ANSWER, source, answer, again });
  const { rerender } = await renderHook(
    (seen: Seen) => {
      useAskedAgain(shownOf(seen), seen.position);
    },
    { initialProps: first },
  );
  return {
    again,
    see: async (next) => {
      await rerender(next);
    },
  };
}

const lacking = { source: NO_LOCATION_ANSWER, answer: NO_LOCATION_ANSWER };

describe('the answer asked without the location', () => {
  it('is asked nothing while no position on campus is known', async () => {
    const { again, see } = await watch({ ...lacking, position: null });
    await see({ ...lacking, position: null });

    expect(again).not.toHaveBeenCalled();
  });

  it('is asked again when a position comes, and only once for its reply', async () => {
    const { again, see } = await watch({ ...lacking, position: null });

    await see({ ...lacking, position: HERE });
    await see({ ...lacking, position: ELSEWHERE });
    // The recalculation's answer still lacks it: the reply was asked again already.
    await see({ source: NO_LOCATION_ANSWER, answer: { ...NO_LOCATION_ANSWER }, position: ELSEWHERE });

    expect(again).toHaveBeenCalledTimes(1);
  });

  it('is asked nothing once the answer on screen no longer offers the location', async () => {
    const { again, see } = await watch({ ...lacking, position: null });

    await see({ source: NO_LOCATION_ANSWER, answer: NO_TIMETABLE_ANSWER, position: HERE });

    expect(again).not.toHaveBeenCalled();
  });

  it('of a new reply is asked again once in its turn', async () => {
    const { again, see } = await watch({ ...lacking, position: HERE });
    const next = { ...NO_LOCATION_ANSWER };

    await see({ source: next, answer: next, position: HERE });
    await see({ source: next, answer: next, position: ELSEWHERE });

    expect(again).toHaveBeenCalledTimes(2);
  });
});

describe('an answer that does not offer the location, or none', () => {
  it('is asked nothing when a position comes', async () => {
    const { again, see } = await watch({ source: NO_TIMETABLE_ANSWER, answer: NO_TIMETABLE_ANSWER, position: null });

    await see({ source: NO_TIMETABLE_ANSWER, answer: NO_TIMETABLE_ANSWER, position: HERE });
    await see({ source: null, answer: null, position: HERE });

    expect(again).not.toHaveBeenCalled();
  });
});
