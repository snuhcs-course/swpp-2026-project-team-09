/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen, userEvent, within } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { INVITATION_CARD } from '@/api/mock/data/invitation-card';
import { ReceivedInvitationCard } from '@/screens/main/answer/received-invitation-card';
import { UNKNOWN_WAY_CARD } from './support/invitation-cards';

type Props = ComponentProps<typeof ReceivedInvitationCard>;

const noop = (): void => undefined;

async function show(props: Partial<Props> = {}): Promise<void> {
  await render(
    <ReceivedInvitationCard
      busy={false}
      card={INVITATION_CARD}
      failed={false}
      offCampus={false}
      onAccept={noop}
      onClose={noop}
      onDecline={noop}
      onRetry={noop}
      {...props}
    />,
  );
}

const ONLY_MINE = '초대장에는 내 길만 보여요. 다른 사람의 위치는 파티를 켠 뒤에 보여요.';

// Partitions of the stored card of 민수: whose invitation, the destination step's start and title, who is in, the
// way's lines, the steps, and the buttons. Expected values: the stored copy and the P02 spec, "A received invitation".
describe('the card of a received invitation', () => {
  it('says whose invitation it is, when and where everyone is together, and who is in so far', async () => {
    await show();

    expect(screen.getByText('유상의 파티 초대')).toBeVisible();
    expect(screen.getByTestId('invitation-title')).toHaveTextContent('12:33 학생회관식당에서 식사');
    expect(screen.getByText('유상과 함께')).toBeVisible();
  });

  it("shows the way's lines as the server wrote them, and the steps in order, numbered from 1", async () => {
    await show();

    expect(screen.getByTestId('answer-lines')).toHaveTextContent(
      '12:15에 수업이 끝나면 바로 나서면 돼요. 걸어서 18분.',
    );
    const steps = within(screen.getByTestId('quest-steps'));
    expect(steps.getByText('1')).toBeVisible();
    expect(steps.getByText('12:18 유상, 민수: 301동 앞에서 만나기')).toBeVisible();
    expect(steps.getByText('2')).toBeVisible();
    expect(steps.getByText('12:33 학생회관식당에서 식사')).toBeVisible();
  });

  it('has 수락, 거절, ✕, and the line that only my own way is shown', async () => {
    await show();

    expect(screen.getByRole('button', { name: '수락' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '거절' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '초대 닫기' })).toBeEnabled();
    expect(screen.getByText(ONLY_MINE)).toBeVisible();
  });
});

// Partitions of who is in: one holder (above), two with the last name ending in a final consonant, and two ending in
// an open syllable; of the gathering: none, and one at a Place where no step is. Expected values: the P02 spec's
// "유상, 지은과 함께", Korean's 와/과, and the stored card's gathering time and Quest title.
describe('the lines of a card that differs from the stored one', () => {
  it('names two holders with 과 after a final consonant', async () => {
    // Changed for the boundary: a second holder.
    await show({ card: { ...INVITATION_CARD, holders: [...INVITATION_CARD.holders, { id: 'h2', name: '지은' }] } });

    expect(screen.getByText('유상, 지은과 함께')).toBeVisible();
  });

  it('names two holders with 와 after an open syllable', async () => {
    // Changed for the boundary: a second holder whose name ends in an open syllable.
    await show({ card: { ...INVITATION_CARD, holders: [...INVITATION_CARD.holders, { id: 'h2', name: '지우' }] } });

    expect(screen.getByText('유상, 지우와 함께')).toBeVisible();
  });

  it("says the Quest's title alone without a gathering, and no line of a way", async () => {
    // Changed for the boundary: no gathering, so no way either, as the contract has it.
    await show({ card: { ...INVITATION_CARD, gathering: null, way: null } });

    expect(screen.getByTestId('invitation-title')).toHaveTextContent('점심', { exact: true });
    expect(screen.queryByTestId('answer-lines')).toBeNull();
  });

  it("says the gathering's start with the Quest's title when no step starts there then", async () => {
    const { gathering } = INVITATION_CARD;
    if (gathering === null) {
      throw new Error('The stored card has a gathering');
    }
    // Changed for the boundary: the gathering at a Place where no step is.
    await show({ card: { ...INVITATION_CARD, gathering: { ...gathering, place: { ...gathering.place, placeId: 'p' } } } });

    expect(screen.getByTestId('invitation-title')).toHaveTextContent('12:33 점심', { exact: true });
  });
});

// Partitions of the way's words: a way the server could not tell with the phone off campus, the same with the phone
// on campus or unknown, and a way the server told with the phone off campus. Expected values: the main server's words
// for a phone off campus (main-server `plans/own-way.ts`) and the stored card's.
describe("the way's words of a received invitation", () => {
  it('says off campus that the way cannot be drawn when the server could not tell it', async () => {
    await show({ card: UNKNOWN_WAY_CARD, offCampus: true });

    expect(screen.getByTestId('answer-lines')).toHaveTextContent('캠퍼스 밖이라 길은 그리지 못해요.', { exact: true });
  });

  it('says nothing of the way on campus when the server could not tell it', async () => {
    await show({ card: UNKNOWN_WAY_CARD });

    expect(screen.queryByTestId('answer-lines')).toBeNull();
  });

  it("says the server's own lines off campus when the server told the way", async () => {
    await show({ offCampus: true });

    expect(screen.getByTestId('answer-lines')).toHaveTextContent(
      '12:15에 수업이 끝나면 바로 나서면 돼요. 걸어서 18분.',
    );
  });
});

// Partitions of the read: on its way, failed; and of the buttons: a press of each, and while one is on its way.
describe('the card while it is read, and its buttons', () => {
  it('says the invitation is being read', async () => {
    await show({ card: null });

    expect(screen.getByText('초대를 불러오는 중이에요')).toBeVisible();
    expect(screen.queryByRole('button', { name: '수락' })).toBeNull();
  });

  it('says it could not be read, and 다시 시도 reads it again', async () => {
    const onRetry = jest.fn<undefined, []>();
    await show({ card: null, failed: true, onRetry });

    expect(screen.getByText('초대를 불러오지 못했어요')).toBeVisible();
    await userEvent.press(screen.getByRole('button', { name: '다시 시도' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('accepts with 수락', async () => {
    const onAccept = jest.fn<undefined, []>();
    await show({ onAccept });

    await userEvent.press(screen.getByRole('button', { name: '수락' }));

    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('declines with 거절', async () => {
    const onDecline = jest.fn<undefined, []>();
    await show({ onDecline });

    await userEvent.press(screen.getByRole('button', { name: '거절' }));

    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('closes with ✕', async () => {
    const onClose = jest.fn<undefined, []>();
    await show({ onClose });

    await userEvent.press(screen.getByRole('button', { name: '초대 닫기' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('takes no press of 수락 or 거절 while one is on its way', async () => {
    await show({ busy: true });

    expect(screen.getByRole('button', { name: '수락' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '거절' })).toBeDisabled();
  });
});
