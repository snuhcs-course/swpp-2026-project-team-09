/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen, userEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { ConditionChips } from '@/screens/main/answer/condition-chips';

const MINSU = '35976b5c-4daf-454f-b10e-c8b09a33ca37';

type Props = ComponentProps<typeof ConditionChips>;

const noop = (): void => undefined;

// The chips of the stored reply to "배고파, 민수랑 같이": "301동에서", "13:00 수업까지", and 민수.
async function show(props: Partial<Props> = {}): Promise<void> {
  await render(
    <ConditionChips
      adding={false}
      basisOpen={false}
      chips={MEAL_ANSWER.chips}
      disabled={false}
      onAdd={noop}
      onBasis={noop}
      onOrigin={noop}
      onRemove={noop}
      onUntil={noop}
      {...props}
    />,
  );
}

describe('ConditionChips shown', () => {
  // Partitions: each kind of chip (origin, until, person with and without a userId), "＋ 같이" closed and open, and
  // the basis closed, open, and none to open.
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

  it('draws no 근거 without a basis to open', async () => {
    await show({ onBasis: null });

    expect(screen.queryByRole('button', { name: '근거' })).toBeNull();
    expect(screen.queryByRole('button', { name: '근거 접기' })).toBeNull();
    expect(screen.getByRole('button', { name: '같이 먹을 친구 추가' })).toBeVisible();
  });

  it('says 근거 접기 while the basis is open', async () => {
    await show({ basisOpen: true });

    expect(screen.getByRole('button', { name: '근거 접기' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '근거' })).toBeNull();
  });
});

describe('ConditionChips pressed', () => {
  // Partitions: a press on each control while enabled, and on each while disabled (근거 still works).
  it.each([
    ['301동에서', 'onOrigin'],
    ['13:00 수업까지', 'onUntil'],
    ['같이 먹을 친구 추가', 'onAdd'],
    ['근거', 'onBasis'],
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

  it('takes no press on the chips while a recalculation is on its way, but opens the basis', async () => {
    const pressed = jest.fn<void, []>();
    const onRemove = jest.fn<void, [string]>();
    const onBasis = jest.fn<void, []>();
    await show({ disabled: true, onAdd: pressed, onBasis, onOrigin: pressed, onRemove, onUntil: pressed });

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
