/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Text } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { MarkerImageStage, type MarkerLook, useMarkerImages } from '@/map';
import { AT_ONCE } from '@/map/capture-order';
import { lookName } from '@/map/marker-looks';
import { AHEAD_AFTER_MS, LOOKS_AHEAD, useLooksAhead } from '@/screens/main/use-looks-ahead';

jest.mock('@/map/native-module', (): { hasNativeMap: () => boolean } => ({
  hasNativeMap: (): boolean => true,
}));

jest.mock('react-native-view-shot', (): { captureRef: jest.Mock<Promise<string>, []> } => ({
  captureRef: jest.fn<Promise<string>, []>(),
}));

// The looks of a crowded meal answer's first board (P04 ticket 81). The pictures are kept for the whole file, as for
// the app's whole run, so each test asks for looks of its own.
function tag(number: number, minutes: number): MarkerLook {
  const label = { side: 'right', tone: 'candidate', title: `${String(minutes)}분`, line: null, number } as const;
  return { kind: 'answer', symbol: { type: 'dot', role: 'candidate', number: null }, label };
}
const PICK: MarkerLook = {
  kind: 'answer',
  symbol: { type: 'dot', role: 'pick', number: 1 },
  label: { side: 'below', tone: 'pick', title: '302동식당', line: '순살안동식찜닭 외 2', number: null },
};
const LEG: MarkerLook = {
  kind: 'answer',
  symbol: null,
  label: { side: 'right', tone: 'leg', title: '2분', line: null, number: null },
};
const START: MarkerLook = {
  kind: 'answer',
  symbol: { type: 'me' },
  label: { side: 'left', tone: 'meeting', title: '10:45 301동', line: null, number: null },
};

function candidateRound(number: number): MarkerLook {
  return { kind: 'answer', symbol: { type: 'dot', role: 'candidate', number }, label: null };
}

function Asks({ looks, later = [] }: { looks: readonly MarkerLook[]; later?: readonly MarkerLook[] }): ReactElement {
  const images = useMarkerImages(looks, later);
  return (
    <>
      {images.map(({ look, uri }) => (
        <Text key={look}>{`${look} ${uri === null ? '없음' : '있음'}`}</Text>
      ))}
      <MarkerImageStage />
    </>
  );
}

function Everyday({ asks }: { asks: readonly MarkerLook[] }): ReactElement {
  useLooksAhead(true);
  return <Asks looks={asks} />;
}

function stageViews(): ReturnType<typeof screen.queryAllByTestId> {
  return screen.queryAllByTestId(/^stage:/u, { includeHiddenElements: true });
}

function onStage(): string[] {
  return stageViews().map((view) => String(view.props.testID).slice('stage:'.length));
}

async function pass(milliseconds: number): Promise<void> {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(milliseconds);
  });
}

// The stage lays out and captures what it draws, a few at a time, until every look has its picture.
async function makeAll(turns = 20): Promise<void> {
  const views = stageViews();
  if (views.length === 0 || turns === 0) {
    return;
  }
  const layout = { nativeEvent: { layout: { x: 0, y: 0, width: 40, height: 40 } } };
  await views.reduce(async (before, view) => {
    await before;
    await fireEvent(view, 'layout', layout);
  }, Promise.resolve());
  await pass(100);
  await makeAll(turns - 1);
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(captureRef).mockReset().mockResolvedValue('file:///tmp/answer.png');
});

// The store tells of pictures once a frame: its timer runs out before the clock is real again, so that the next test
// hears of its own.
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// Partitions: an answer's chosen place, its numbered places with tags, and its other marks, asked in another order.
// Expected values: the ticket's order, the chosen place first and the numbered places by their numbers.
describe('the order an answer’s pictures are made in', () => {
  it('draws on the stage the chosen place first, then the numbered places by number, a few at a time', async () => {
    await render(<Asks looks={[LEG, tag(3, 26), START, PICK, tag(2, 2)]} />);

    expect(onStage()).toEqual([PICK, tag(2, 2), tag(3, 26)].slice(0, AT_ONCE).map((look) => lookName(look)));
    await makeAll();

    expect(onStage()).toEqual([]);
    expect(screen.getAllByText(/있음$/u)).toHaveLength(5);
  });

  // The emulator's first answer (2026-11-26): the other Plans' chosen places, asked for a choice to come, came before
  // the numbered places on screen, and held them back three seconds.
  it("draws the board on screen before the looks asked for another Plan's board", async () => {
    const otherPick: MarkerLook = {
      kind: 'answer',
      symbol: { type: 'dot', role: 'pick', number: 2 },
      label: { side: 'below', tone: 'pick', title: '301동식당', line: '들기름막국수 외 1', number: null },
    };
    await render(<Asks later={[otherPick, tag(1, 9)]} looks={[tag(4, 30)]} />);

    expect(onStage()).toEqual([tag(4, 30), otherPick, tag(1, 9)].map((look) => lookName(look)));
    await makeAll();
  });
});

// Partitions: a board's numbered rounds, its candidates' minutes, and its other marks, asked in another order (P04
// ticket 83). Expected values: the rounds first, by number, then the minutes, then the rest.
describe("the order a board's rounds and minutes are made in", () => {
  it("makes the candidates' minutes after every numbered round and before the rest of the answer", async () => {
    const minutes: MarkerLook = {
      kind: 'answer',
      symbol: null,
      label: { side: 'right', tone: 'minutes', title: '7분', line: null, number: null },
    };
    const end: MarkerLook = {
      ...START,
      label: { side: 'left', tone: 'meeting', title: '15:30 302동', line: null, number: null },
    };
    await render(<Asks looks={[end, minutes, candidateRound(9), candidateRound(8)]} />);

    expect(onStage()).toEqual([candidateRound(8), candidateRound(9), minutes].map((look) => lookName(look)));
    await makeAll();
  });
});

// Partitions: before the everyday map has rested, and after. Expected values: the numbered dots of 1 to 12 and a stop's.
describe('the numbered dots made ahead on the everyday map', () => {
  it('makes none before the map has rested, then every dot, so a first answer finds its dots made', async () => {
    const asked = LOOKS_AHEAD[2];
    if (asked === undefined) {
      throw new Error('No dot 3');
    }
    await render(<Everyday asks={[]} />);
    await pass(AHEAD_AFTER_MS - 1);
    expect(onStage()).toEqual([]);

    await pass(1);
    await makeAll();
    await screen.rerender(<Everyday asks={[asked]} />);

    expect(screen.getByText(`${lookName(asked)} 있음`)).toBeVisible();
    expect(lookName(asked)).toBe(
      lookName({ kind: 'answer', symbol: { type: 'dot', role: 'candidate', number: 3, meal: true }, label: null }),
    );
  });
});

// Partitions: two pictures made 5 ms apart, within one frame. Expected values: none shown after the first is made,
// both once the frame ends.
describe('pictures made within one frame', () => {
  it('reach the screen as one change, so that an answer draws again once for them', async () => {
    jest
      .mocked(captureRef)
      .mockReset()
      .mockResolvedValueOnce('file:///tmp/first.png')
      .mockImplementationOnce(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 5);
        });
        return 'file:///tmp/second.png';
      });
    await render(<Asks looks={[tag(11, 52), tag(12, 55)]} />);
    const layout = { nativeEvent: { layout: { x: 0, y: 0, width: 40, height: 40 } } };
    await stageViews().reduce(async (before, view) => {
      await before;
      await fireEvent(view, 'layout', layout);
    }, Promise.resolve());

    await pass(20);
    expect(screen.queryAllByText(/있음$/u)).toHaveLength(0);
    await pass(20);

    expect(screen.getAllByText(/있음$/u)).toHaveLength(2);
  });
});
