/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { REFUSAL_REPLIES } from '@/api/mock/data/refusals';
import type { Refusal, RefusalOffer } from '@/api/refusal-types';
import { color } from '@/design-system';
import { useLocationOffer } from '@/screens/main/answer/location-offer';
import { RefusalReply } from '@/screens/main/answer/refusal-reply';

// A refusal in the answer frame's card (P02 ticket 10): its lines in place of the model's sentence, and its offers as
// buttons in the board's order, of one width in one row. Partitions: one offer, a choice of equal asks, offers of
// different weight; each kind of offer.

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

function copy(words: string): Refusal {
  const reply = REFUSAL_REPLIES.get(words);
  if (reply === undefined) {
    throw new Error(`No stored refusal for ${words}`);
  }
  return reply.refusal;
}

const onAsk = jest.fn<undefined, [string]>();

async function show(refusal: Refusal): Promise<void> {
  await render(<RefusalReply onAsk={onAsk} refusal={refusal} />);
}

const offers = (): ReturnType<typeof screen.getAllByTestId> => screen.getAllByTestId('refusal-offer');

beforeEach(() => {
  onAsk.mockReset();
  jest.mocked(router.push).mockReset();
});

describe('the lines', () => {
  it("are the refusal's, the first larger than the second (board n2)", async () => {
    await show(copy('자료구조 과제 풀어 줘'));

    const [first, second] = screen.getAllByTestId('refusal-line');
    expect(first).toHaveTextContent('과제는 도와 드릴 수 없어요.');
    expect(second).toHaveTextContent('캠퍼스에서 먹을 곳, 공부할 자리, 행사, 파티, 길을 찾아 드려요.');
    expect(first).toHaveStyle({ fontSize: 18 });
    expect(second).toHaveStyle({ fontSize: 15 });
  });
});

describe('the buttons', () => {
  it("are a choice of equal asks in one row, in the board's order, none the main one (board n2)", async () => {
    await show(copy('자료구조 과제 풀어 줘'));

    const labels = ['배고파', '공부할 자리', '오늘 볼 만한 거 있어?'];
    expect(offers()).toHaveLength(labels.length);
    offers().forEach((offer, index) => {
      expect(offer).toHaveTextContent(labels[index] ?? '');
    });
    for (const offer of offers()) {
      expect(offer).toHaveStyle({ flex: 1, backgroundColor: color.surface });
    }
    expect(screen.getByTestId('refusal-offers')).toHaveStyle({ flexDirection: 'row' });
  });

  it('make the first the main one when the offers differ in weight (board n22)', async () => {
    await show(copy('민수랑 마주칠 때 알려 줘'));

    const [meet, interest] = offers();
    expect(meet).toHaveStyle({ flex: 1, backgroundColor: color.snuBlue });
    expect(interest).toHaveStyle({ flex: 1, backgroundColor: color.surface });
  });

  it('make a single offer the main one (board n5)', async () => {
    await show(copy('우리 과 조교님 어디 계셔?'));

    expect(offers()).toHaveLength(1);
    expect(offers()[0]).toHaveStyle({ backgroundColor: color.snuBlue });
  });
});

function Sample({ refusal, say }: { refusal: Refusal; say: () => void }): ReactElement {
  useLocationOffer(say);
  return <RefusalReply onAsk={onAsk} refusal={refusal} />;
}

describe('an offer pressed', () => {
  it("sends an ask's words as if typed", async () => {
    await show(copy('민수 어제 어디 있었어?'));

    await fireEvent.press(screen.getByRole('button', { name: '만나고 싶다' }));

    expect(onAsk).toHaveBeenCalledWith('민수랑 만나고 싶어');
    expect(router.push).not.toHaveBeenCalled();
  });

  it.each([
    ['friend-add', '/me/friends/add'],
    ['location-sharing', '/me/location-sharing'],
    ['timetable', '/me/timetable'],
    ['interests', '/me/interests'],
  ] as const)('opens %s at %s', async (screenName, route) => {
    const offer: RefusalOffer = { kind: 'open', label: '열기', screen: screenName };
    await show({ ...copy('누가 내 위치 찾아봤어?'), offers: [offer] });

    await fireEvent.press(screen.getByRole('button', { name: '열기' }));

    expect(router.push).toHaveBeenCalledWith(route);
    expect(onAsk).not.toHaveBeenCalled();
  });

  it("opens the map's explanation of the location for location", async () => {
    const say = jest.fn<undefined, []>();
    const refusal: Refusal = {
      ...copy('누가 내 위치 찾아봤어?'),
      offers: [{ kind: 'open', label: '위치 켜기', screen: 'location' }],
    };
    await render(<Sample refusal={refusal} say={say} />);

    await fireEvent.press(screen.getByRole('button', { name: '위치 켜기' }));

    expect(say).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });
});
