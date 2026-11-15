/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { KIM_MINSU, LEE_MINSU, pick, WHICH_MINSU, whichFriend } from './support/which-friend';
import { REFUSAL_REPLIES } from '@/api/mock/data/refusals';
import type { Refusal, RefusalOffer } from '@/api/refusal-types';
import { color } from '@/design-system';
import { useLocationOffer } from '@/screens/main/answer/location-offer';
import { RefusalReply } from '@/screens/main/answer/refusal-reply';
import { FriendProfileOver } from '@/screens/main/friend-profile';

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

const onAsk = jest.fn<undefined, [string, { kind: 'friend'; userId: string }?]>();

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

// The question of which Friend (P02 ticket 17): one cell of the choice grid per candidate, the full name with the
// department under it, and inside the answer frame a mark at its end that opens the Friend's profile. Partitions:
// two candidates (one row), three (two to a row, an odd last cell); an aside and none; inside the frame and outside;
// a press on the cell and on its mark; candidates of different names and of one full name.

type Part = ReturnType<typeof screen.getByTestId>['children'][number];

// What a part of a row is called: a cell by what a screen reader says of it, the empty partner by its id, and a cell
// with a mark by its first part that has a name.
function nameOf(part: Part): string {
  if (typeof part === 'string') {
    return part;
  }
  const name: unknown = part.props.accessibilityLabel ?? part.props.testID;
  if (typeof name === 'string') {
    return name;
  }
  return part.children.map((child) => nameOf(child)).find((named) => named !== '') ?? '';
}

function rows(): string[][] {
  return screen
    .getByTestId('choice-grid')
    .children.map((row) => (typeof row === 'string' ? [row] : row.children.map((part) => nameOf(part))));
}

const showProfile = jest.fn<undefined, [string]>();

// The refusal inside the answer frame, whose profile is a stand-in.
async function showFramed(refusal: Refusal): Promise<void> {
  const profile = { friend: null, show: showProfile, hide: jest.fn() };
  await render(
    <FriendProfileOver keyboardUp={false} profile={profile}>
      <RefusalReply onAsk={onAsk} refusal={refusal} />
    </FriendProfileOver>,
  );
}

const PARK_MINSU = pick('minsu-park', '박민수', '기계공학부');
const JUNG_MINSU = pick('minsu-jung', '정민수', null);

describe('the Friends to pick', () => {
  beforeEach(() => {
    showProfile.mockReset();
  });

  it("are the choice grid's cells, the full name with the department under it and the profile mark", async () => {
    await showFramed(WHICH_MINSU);

    expect(rows()).toEqual([['김민수, 컴퓨터공학부', '이민수, 경영학과']]);
    const kim = screen.getByRole('button', { name: '김민수, 컴퓨터공학부' });
    expect(kim).toHaveTextContent('김민수컴퓨터공학부');
    expect(screen.getByText('컴퓨터공학부')).toHaveStyle({ fontSize: 12, color: color.inkMuted });
    expect(screen.getByRole('button', { name: '김민수 프로필' })).toBeOnTheScreen();
    expect(screen.queryByTestId('refusal-offers')).toBeNull();
  });

  it('go two to a row, an odd last one keeping its width', async () => {
    await showFramed(whichFriend('민수', [KIM_MINSU, LEE_MINSU, PARK_MINSU]));

    expect(rows()).toEqual([
      ['김민수, 컴퓨터공학부', '이민수, 경영학과'],
      ['박민수, 기계공학부', 'choice-grid-empty'],
    ]);
  });

  it('show the name alone when there is no aside', async () => {
    await showFramed(whichFriend('민수', [KIM_MINSU, JUNG_MINSU]));

    expect(rows()).toEqual([['김민수, 컴퓨터공학부', '정민수']]);
    expect(screen.getByRole('button', { name: '정민수' })).toHaveTextContent('정민수');
  });

  it('have no profile mark outside the answer frame', async () => {
    await show(WHICH_MINSU);

    expect(screen.getByRole('button', { name: '김민수, 컴퓨터공학부' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: '김민수 프로필' })).toBeNull();
  });
});

describe('a Friend picked', () => {
  it("sends the cell's words with that Friend tapped", async () => {
    await showFramed(WHICH_MINSU);

    await fireEvent.press(screen.getByRole('button', { name: '이민수, 경영학과' }));

    expect(onAsk).toHaveBeenCalledTimes(1);
    expect(onAsk).toHaveBeenCalledWith('이민수', { kind: 'friend', userId: 'minsu-lee' });
    expect(showProfile).not.toHaveBeenCalled();
  });

  it('tells two Friends of one full name apart by their id', async () => {
    const other = pick('minsu-kim-2', '김민수', '경영학과');
    await showFramed(whichFriend('김민수', [KIM_MINSU, other]));

    await fireEvent.press(screen.getByRole('button', { name: '김민수, 경영학과' }));

    expect(onAsk).toHaveBeenCalledWith('김민수', { kind: 'friend', userId: 'minsu-kim-2' });
  });

  it("opens the Friend's profile from the mark, and picks no one", async () => {
    await showFramed(WHICH_MINSU);

    await fireEvent.press(screen.getByRole('button', { name: '이민수 프로필' }));

    expect(showProfile).toHaveBeenCalledWith('minsu-lee');
    expect(onAsk).not.toHaveBeenCalled();
  });
});
