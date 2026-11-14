/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen, userEvent, within } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { ConditionChips } from '@/screens/main/answer/condition-chips';

const MINSU = '35976b5c-4daf-454f-b10e-c8b09a33ca37';

type Props = ComponentProps<typeof ConditionChips>;

const noop = (): void => undefined;

// What the right of the first line holds while the basis is closed.
const BASIS = { words: '근거', icon: 'chevronRight', onPress: noop } as const;

// The chips of the stored reply to "배고파, 민수랑 같이": "301동에서", "13:00 수업까지", and 민수.
async function show(props: Partial<Props> = {}): Promise<void> {
  await render(
    <ConditionChips
      adding={false}
      chips={MEAL_ANSWER.chips}
      corner={BASIS}
      disabled={false}
      onAdd={noop}
      onOrigin={noop}
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
    expect(screen.getByText('민수')).toBeVisible();
    expect(screen.getByRole('button', { name: '민수 빼기' })).toBeVisible();
    expect(screen.getByRole('button', { name: '같이 먹을 친구 추가' })).toHaveTextContent('＋ 같이');
    expect(screen.getByRole('button', { name: '근거' })).toBeVisible();
  });

  it('has no ✕ on a person chip without a userId', async () => {
    // The stored 민수 chip without its userId, to show the chip without a ✕.
    await show({ chips: [{ kind: 'person', text: '민수', userId: null }] });

    expect(screen.getByText('민수')).toBeVisible();
    expect(screen.queryByRole('button', { name: '민수 빼기' })).toBeNull();
  });

  it('draws ＋ 같이 chosen while the list of Friends is open', async () => {
    await show({ adding: true });

    expect(screen.getByRole('button', { name: '같이 먹을 친구 추가' })).toBeSelected();
  });
});

describe("ConditionChips' corner", () => {
  // Partitions: the corner's action, the basis closed, open, none to open, and "그대로" while the list of Friends is
  // open; and a press on it.
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

  it('says 그대로 where 근거 stands while the list of Friends is open', async () => {
    await show({ adding: true, corner: { words: '그대로', icon: null, onPress: noop } });

    const holder: unknown = screen.getByRole('button', { name: '그대로' }).parent?.props.testID;
    expect(holder).toBe('condition-chips');
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
      within(lines).getByText('민수'),
      within(lines).getByRole('button', { name: '민수 빼기' }),
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

    await userEvent.press(screen.getByRole('button', { name: '민수 빼기' }));

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

    for (const name of ['301동에서', '13:00 수업까지', '민수 빼기', '같이 먹을 친구 추가']) {
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
