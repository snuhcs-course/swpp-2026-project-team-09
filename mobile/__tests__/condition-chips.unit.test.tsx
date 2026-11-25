/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen, userEvent, within } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { NO_LOCATION_ANSWER } from '@/api/mock/data/missing-inputs';
import { color } from '@/design-system';
import { AddChip, ConditionChips } from '@/screens/main/answer/condition-chips';
import { chipLook } from '@/screens/main/answer/card-header';

const MINSU = '35976b5c-4daf-454f-b10e-c8b09a33ca37';

type Props = ComponentProps<typeof ConditionChips>;

const noop = (): void => undefined;

// What the right of the first line holds while the basis is closed.
const BASIS = { words: '근거', icon: 'chevronRight', onPress: noop } as const;

// The chips of the stored reply to "배고파, 민수랑 같이": "301동에서", "13:00 수업까지", and 김민수, who is none of the
// User's Friends unless a test says so.
async function show(props: Partial<Props> = {}): Promise<void> {
  await render(
    <ConditionChips
      adding={false}
      chips={MEAL_ANSWER.chips}
      corner={BASIS}
      disabled={false}
      friendIds={new Set()}
      onAdd={noop}
      onOrigin={noop}
      onProfile={null}
      onRemove={noop}
      onUntil={noop}
      {...props}
    />,
  );
}

describe('ConditionChips shown', () => {
  // Partitions: each kind of chip (origin, until, person with and without a userId), and "＋ 같이" closed and open.
  it("shows the answer's chips, then ＋ 같이, with 근거", async () => {
    await show();

    expect(screen.getByRole('button', { name: '301동에서' })).toBeVisible();
    expect(screen.getByRole('button', { name: '13:00 수업까지' })).toBeVisible();
    expect(screen.getByText('김민수')).toBeVisible();
    expect(screen.getByRole('button', { name: '김민수 빼기' })).toBeVisible();
    expect(screen.getByRole('button', { name: '같이 먹을 친구 추가' })).toHaveTextContent('＋ 같이');
    expect(screen.getByRole('button', { name: '근거' })).toBeVisible();
  });

  it('has no ✕ on a person chip without a userId', async () => {
    // The stored 민수 chip without its userId, to show the chip without a ✕.
    await show({ chips: [{ kind: 'person', text: '민수', userId: null }] });

    expect(screen.getByText('민수')).toBeVisible();
    expect(screen.queryByRole('button', { name: '민수 빼기' })).toBeNull();
  });

  // Partitions: a chip marked assumed (board n13) and one without a mark. The rule: a marked chip is drawn in the Quest
  // colour (P02-13).
  it('draws a chip the server assumed in the Quest colour, and one it did not as before', async () => {
    await show({ chips: NO_LOCATION_ANSWER.chips });

    expect(screen.getByRole('button', { name: '301동에서' })).toHaveStyle({
      borderColor: color.quest,
      backgroundColor: color.questSoft,
    });
    expect(screen.getByText('301동에서')).toHaveStyle({ color: color.quest });
    expect(screen.getByRole('button', { name: '13:00 수업까지' })).toHaveStyle({ borderColor: color.borderStrong });
  });

  it('draws ＋ 같이 chosen while people are picked', async () => {
    await show({ adding: true });

    expect(screen.getByRole('button', { name: '같이 먹을 친구 추가' })).toBeSelected();
  });
});

describe("ConditionChips' corner", () => {
  // Partitions: the corner's action, the basis closed, open, and none to open; and a press on it.
  it('draws no 근거 without a basis to open', async () => {
    await show({ corner: null });

    expect(screen.queryByRole('button', { name: '근거' })).toBeNull();
    expect(screen.queryByRole('button', { name: '근거 접기' })).toBeNull();
    expect(screen.getByRole('button', { name: '같이 먹을 친구 추가' })).toBeVisible();
  });

  it('says 근거 접기 while the basis is open', async () => {
    await show({ corner: { words: '근거 접기', icon: 'chevronUp', onPress: noop } });

    expect(screen.getByRole('button', { name: '근거 접기' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '근거' })).toBeNull();
  });

  it("does the corner's action from 근거", async () => {
    const onBasis = jest.fn<void, []>();
    await show({ corner: { ...BASIS, onPress: onBasis } });

    await userEvent.press(screen.getByRole('button', { name: '근거' }));

    expect(onBasis).toHaveBeenCalledTimes(1);
  });
});

type Host = ReturnType<typeof screen.getByTestId>;

function inScroll(element: Host): boolean {
  for (let node: Host | null = element; node !== null; node = node.parent) {
    if (node.type === 'RCTScrollView') {
      return true;
    }
  }
  return false;
}

describe('ConditionChips laid out', () => {
  // Partitions: each kind of chip and "＋ 같이" in lines that wrap, and "근거" beside them. The rule: the decision of
  // 2026-11-15, the chips wrap onto a second line in place of a sideways scroll, and "근거" stays at the right of the
  // first line.
  it('puts every chip whole into lines that wrap, none in a sideways scroll', async () => {
    await show();

    const lines = screen.getByTestId('condition-chips-lines');
    expect(lines).toHaveStyle({ flexDirection: 'row', flexWrap: 'wrap' });
    for (const chip of [
      within(lines).getByRole('button', { name: '301동에서' }),
      within(lines).getByRole('button', { name: '13:00 수업까지' }),
      within(lines).getByText('김민수'),
      within(lines).getByRole('button', { name: '김민수 빼기' }),
      within(lines).getByRole('button', { name: '같이 먹을 친구 추가' }),
    ]) {
      expect(inScroll(chip)).toBe(false);
    }
  });

  it('keeps 근거 out of the lines, at the top of the row beside them, so that it stays at the first line', async () => {
    await show();

    const holder: unknown = screen.getByRole('button', { name: '근거' }).parent?.props.testID;
    expect(within(screen.getByTestId('condition-chips-lines')).queryByRole('button', { name: '근거' })).toBeNull();
    expect(holder).toBe('condition-chips');
    expect(screen.getByTestId('condition-chips')).toHaveStyle({ flexDirection: 'row', alignItems: 'flex-start' });
  });
});

describe('ConditionChips pressed', () => {
  // Partitions: a press on each control while enabled.
  it.each([
    ['301동에서', 'onOrigin'],
    ['13:00 수업까지', 'onUntil'],
    ['같이 먹을 친구 추가', 'onAdd'],
  ] as const)('calls back from %s', async (name, callback) => {
    const called = jest.fn<void, []>();
    await show({ [callback]: called });

    await userEvent.press(screen.getByRole('button', { name }));

    expect(called).toHaveBeenCalledTimes(1);
  });

  it("takes the person out with the person chip's ✕", async () => {
    const onRemove = jest.fn<void, [string]>();
    await show({ onRemove });

    await userEvent.press(screen.getByRole('button', { name: '김민수 빼기' }));

    expect(onRemove).toHaveBeenCalledWith(MINSU);
  });
});

describe('ConditionChips while a recalculation is on its way', () => {
  // Partitions: a press on each chip, and on the corner, which still works.
  it('takes no press on the chips while a recalculation is on its way, but opens the basis', async () => {
    const pressed = jest.fn<void, []>();
    const onRemove = jest.fn<void, [string]>();
    const onBasis = jest.fn<void, []>();
    await show({
      corner: { ...BASIS, onPress: onBasis },
      disabled: true,
      onAdd: pressed,
      onOrigin: pressed,
      onRemove,
      onUntil: pressed,
    });

    for (const name of ['301동에서', '13:00 수업까지', '김민수 빼기', '같이 먹을 친구 추가']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
      // oxlint-disable-next-line no-await-in-loop -- one press after the other, as a User would
      await userEvent.press(screen.getByRole('button', { name }));
    }
    await userEvent.press(screen.getByRole('button', { name: '근거' }));

    expect(pressed).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
    expect(onBasis).toHaveBeenCalledTimes(1);
  });
});

describe("ConditionChips of a Friend's chip", () => {
  // Partitions: the chip of a Friend and of someone who is none, while enabled and while a recalculation is on its
  // way; the name's touch area. The rule: ticket 18, a press on a person chip opens the person's profile, the chip's ✕
  // still takes them out, someone who is not a Friend has no profile to open, and a touch area is at least 48.
  it("opens the Friend's profile with a press on the chip, and the ✕ still takes the person out", async () => {
    const onProfile = jest.fn<void, [string]>();
    const onRemove = jest.fn<void, [string]>();
    await show({ friendIds: new Set([MINSU]), onProfile, onRemove });

    await userEvent.press(screen.getByRole('button', { name: '김민수 프로필' }));
    expect(onProfile).toHaveBeenCalledWith(MINSU);
    expect(onRemove).not.toHaveBeenCalled();

    await userEvent.press(screen.getByRole('button', { name: '김민수 빼기' }));
    expect(onRemove).toHaveBeenCalledWith(MINSU);
    expect(onProfile).toHaveBeenCalledTimes(1);
  });

  it("gives the name a touch 48 high, the chip's whole height with its slop, as a sibling chip has", async () => {
    await show({ friendIds: new Set([MINSU]), onProfile: noop });

    // A chip is 34 high within a border of 1. The name stretches to the 32 inside the border, and 8 above and below
    // make 48; a sibling chip's 34 with 7 above and below make 48 too.
    const named = screen.getByRole('button', { name: '김민수 프로필' });
    expect(named.parent).toHaveStyle({ height: 34, borderWidth: 1 });
    expect(named).toHaveStyle({ alignSelf: 'stretch' });
    expect(named).toHaveProp('hitSlop', { top: 8, bottom: 8, left: 7 });
    expect(screen.getByRole('button', { name: '301동에서' })).toHaveStyle({ height: 34 });
    expect(screen.getByRole('button', { name: '301동에서' })).toHaveProp('hitSlop', 7);
  });

  it('opens no profile from the chip of someone who is not a Friend', async () => {
    await show({ onProfile: noop });

    expect(screen.getByText('김민수')).toBeVisible();
    expect(screen.queryByRole('button', { name: '김민수 프로필' })).toBeNull();
  });

  it('still opens the profile while a recalculation is on its way', async () => {
    const onProfile = jest.fn<void, [string]>();
    await show({ disabled: true, friendIds: new Set([MINSU]), onProfile });

    await userEvent.press(screen.getByRole('button', { name: '김민수 프로필' }));

    expect(onProfile).toHaveBeenCalledWith(MINSU);
  });
});

// Partitions: no Friend in the Plan; two. Expected values: the answer sheet's header chips' look (the user's choice of
// 2026-11-25): filled, no outline, the words muted with the plus before "같이", and "같이 2 ›" in ink.
describe('the time bar’s "＋ 같이"', () => {
  it.each([
    [0, '같이', color.inkMuted],
    [2, '같이 2 ›', color.ink],
  ])('with %i Friends in the Plan reads %s, in its colour', async (inPlan, words, ink) => {
    await render(<AddChip disabled={false} inBar inPlan={inPlan} name="같이 먹을 친구 추가" onAdd={noop} />);
    const chip = screen.getByRole('button', { name: '같이 먹을 친구 추가' });

    expect(chip).toHaveStyle({ backgroundColor: chipLook.chip.backgroundColor });
    expect(chip).not.toHaveStyle({ borderWidth: 1 });
    expect(chip).toHaveTextContent(words);
    expect(screen.getByText(words)).toHaveStyle({ color: ink });
  });
});
