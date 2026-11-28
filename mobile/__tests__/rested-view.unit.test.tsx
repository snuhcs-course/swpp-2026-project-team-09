/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { renderHook } from '@testing-library/react-native';
import type { LabelView } from '@/features/assistant/answer-labels';
import type { MapCamera } from '@/map';
import type { Frame } from '@/screens/main/framed-camera';
import { useRestedView } from '@/screens/main/use-rested-labels';

// Where an answer's labels are placed (P04 ticket 69, P10 ticket 30): at the answer's own camera from a framing event
// until the map rests after its glide, and at the camera where the map rests from then on, in the room the cards left
// then. A card's height or fold gives the answer another own camera and another room but is no framing event: the map
// stays, and so do the labels, until the map comes to rest again, as after the User's pan. The user's
// phone, 2026-11-28: folding the step's time card away and back made the map redraw and blink each time ("시간 카드를
// 내렸다가 올릴 때 지도가 다시 그려지면서 깜빡이는 것 같아"), its labels placed again at a camera the map never went to.

const SIZE = { width: 411, height: 914 };
const AREA = { top: 32, right: 0, bottom: 566, left: 0 };

function camera(latitude: number, zoom = 16): MapCamera {
  return { centre: { latitude, longitude: 126.95 }, zoom };
}

function view(own: MapCamera, area = AREA): LabelView {
  return { camera: own, size: SIZE, area };
}

// The answer's own camera with the cards as first laid out, and with the time card folded away: more room at the top.
const OWN = camera(37.459);
const FOLDED_OWN = camera(37.4595);
const FOLDED_AREA = { ...AREA, top: 12 };
// Where the map rests: the glide's end, then the User's pan.
const PANNED = camera(37.462, 16.5);

const FRAME: Frame = { key: { reply: 'reply', chosen: ['plan 1'] } };
const OTHER_PLAN: Frame = { key: { reply: 'reply', chosen: ['plan 2'] } };

interface Props {
  shown: LabelView | null;
  at: MapCamera | null;
  frame: Frame;
}

async function placed(first: Props): Promise<{
  rerender: (props: Props) => Promise<void>;
  current: () => LabelView | null;
}> {
  const { result, rerender } = await renderHook(({ shown, at, frame }: Props) => useRestedView(shown, at, frame), {
    initialProps: first,
  });
  return {
    rerender: async (props): Promise<void> => {
      await rerender(props);
    },
    current: () => result.current,
  };
}

// Partitions: the framing's glide, before the map rests; the map at rest, then the cards folded and back; the User's
// pan, then the cards folded, then another pan; another framing event (another Plan). Expected values: P10 ticket 30's
// rule, and ticket 31's.
describe("An answer's labels", () => {
  it("stand at the answer's own camera from a framing until the map rests, and follow its layout until then", async () => {
    const labels = await placed({ shown: view(OWN), at: null, frame: FRAME });
    expect(labels.current()?.camera).toEqual(OWN);

    await labels.rerender({ shown: view(FOLDED_OWN, FOLDED_AREA), at: null, frame: FRAME });

    expect(labels.current()?.camera).toEqual(FOLDED_OWN);
  });

  it('stay where they stand, at the camera where the map rests, when a card folds away and back', async () => {
    const labels = await placed({ shown: view(OWN), at: null, frame: FRAME });
    await labels.rerender({ shown: view(OWN), at: OWN, frame: FRAME });

    await labels.rerender({ shown: view(FOLDED_OWN, FOLDED_AREA), at: OWN, frame: FRAME });
    expect(labels.current()).toEqual(view(OWN));

    await labels.rerender({ shown: view(OWN), at: OWN, frame: FRAME });
    expect(labels.current()).toEqual(view(OWN));
  });

  it("stay at the User's camera when a card folds after a pan, and take the new room at the next rest", async () => {
    const labels = await placed({ shown: view(OWN), at: null, frame: FRAME });
    await labels.rerender({ shown: view(OWN), at: OWN, frame: FRAME });
    await labels.rerender({ shown: view(OWN), at: PANNED, frame: FRAME });

    await labels.rerender({ shown: view(FOLDED_OWN, FOLDED_AREA), at: PANNED, frame: FRAME });
    expect(labels.current()).toEqual(view(PANNED));

    const again = camera(37.4625, 16.5);
    await labels.rerender({ shown: view(FOLDED_OWN, FOLDED_AREA), at: again, frame: FRAME });
    expect(labels.current()).toEqual(view(again, FOLDED_AREA));
  });

  it("stand at the answer's own camera again at the next framing event, until the map rests", async () => {
    const labels = await placed({ shown: view(OWN), at: null, frame: FRAME });
    await labels.rerender({ shown: view(OWN), at: OWN, frame: FRAME });
    const next = camera(37.457);

    await labels.rerender({ shown: view(next), at: OWN, frame: OTHER_PLAN });
    expect(labels.current()?.camera).toEqual(next);

    await labels.rerender({ shown: view(next), at: next, frame: OTHER_PLAN });
    expect(labels.current()?.camera).toEqual(next);
  });
});
