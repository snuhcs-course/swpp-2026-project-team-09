/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen, userEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { FriendChoices } from '@/screens/main/answer/friend-choices';

const JIEUN = 'a4c0f6de-2b7e-4c57-9d3a-5e8f1b2c7d90';
// The Friends who are not in the Plan, each with the line the Friend list shows: one in class, and one whose position
// is not known.
const FRIENDS = [
  { id: JIEUN, name: '지은', line: '수업 중 · 12:15까지' },
  { id: 'u3', name: '박서준', line: '위치 꺼짐' },
];

type Props = ComponentProps<typeof FriendChoices>;

const noop = (): void => undefined;

async function show(props: Partial<Props> = {}): Promise<void> {
  await render(<FriendChoices disabled={false} friends={FRIENDS} onChoose={noop} onClose={noop} {...props} />);
}

describe('FriendChoices shown', () => {
  // Partitions: Friends to add (each with a line, one with an empty line), and none to add.
  it('asks who to eat with and lists each Friend with the line the Friend list shows', async () => {
    await show();

    expect(screen.getByText('누구와 같이 먹을까요?')).toBeVisible();
    expect(screen.getByRole('button', { name: '지은 추가' })).toHaveTextContent('지은 · 수업 중 · 12:15까지');
    expect(screen.getByRole('button', { name: '박서준 추가' })).toHaveTextContent('박서준 · 위치 꺼짐');
  });

  it('shows the name alone when the line is empty', async () => {
    // The first Friend with an empty line, to show the chip without its separator.
    await show({ friends: [{ id: JIEUN, name: '지은', line: '' }] });

    expect(screen.getByRole('button', { name: '지은 추가' })).toHaveTextContent('지은', { exact: true });
  });

  it('says there is nobody more to add above 닫기', async () => {
    await show({ friends: [] });

    expect(screen.getByText('더 넣을 친구가 없어요')).toBeVisible();
    expect(screen.getByRole('button', { name: '닫기' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /추가$/u })).toBeNull();
  });
});

describe('FriendChoices pressed', () => {
  // Partitions: a press on a Friend, on 닫기, and on a Friend while disabled.
  it('chooses the Friend pressed', async () => {
    const onChoose = jest.fn<void, [string]>();
    await show({ onChoose });

    await userEvent.press(screen.getByRole('button', { name: '지은 추가' }));

    expect(onChoose).toHaveBeenCalledWith(JIEUN);
  });

  it('closes with 닫기', async () => {
    const onClose = jest.fn<void, []>();
    await show({ onClose });

    await userEvent.press(screen.getByRole('button', { name: '닫기' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('takes no choice while a recalculation is on its way', async () => {
    const onChoose = jest.fn<void, [string]>();
    await show({ disabled: true, onChoose });

    await userEvent.press(screen.getByRole('button', { name: '지은 추가' }));

    expect(onChoose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '지은 추가' })).toBeDisabled();
  });
});
