import { fireEvent } from '@testing-library/react-native';
import { pass, screen } from './support/app';
import { startFresh } from './support/mocks';
import { arriveAtOnboarding, button, SAVE, type User } from './support/onboarding';
import { readKept } from '@/storage/kept';

jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const SUGGESTION = { name: '홍길동', department: '컴퓨터공학부' };
const INTEREST = '관심사 추가';

async function savedInterests(user: User): Promise<readonly string[] | undefined> {
  await user.press(button(SAVE));
  await pass(400);
  const { answers } = await readKept();
  return answers?.hashtags;
}

async function addInterest(user: User, typed: string): Promise<void> {
  await fireEvent.changeText(screen.getByLabelText(INTEREST), typed);
  await user.press(button('추가'));
}

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the interests', () => {
  it('are shown with a "#" and stored without', async () => {
    const user = await arriveAtOnboarding(SUGGESTION);
    expect(button('추가')).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText(INTEREST), ' # ');
    expect(button('추가')).toBeDisabled();

    await addInterest(user, '#AI커리어');
    expect(screen.getByText('#AI커리어')).toBeVisible();
    expect(screen.getByText('1/20')).toBeVisible();
    expect(screen.getByLabelText(INTEREST)).toHaveDisplayValue('');
    expect(await savedInterests(user)).toEqual(['AI커리어']);
  });

  it.each(['#러닝 #재즈', '러닝,재즈', '러닝#재즈', ' 러닝 ,\n#재즈 '])(
    'are taken one by one from "%s", none with a "#"',
    async (typed) => {
      const user = await arriveAtOnboarding(SUGGESTION);
      await addInterest(user, typed);

      expect(button('#러닝 삭제')).toBeVisible();
      expect(button('#재즈 삭제')).toBeVisible();
      expect(await savedInterests(user)).toEqual(['러닝', '재즈']);
    },
  );

  it('are added from the suggested ones with a press, and removed with the ×', async () => {
    const user = await arriveAtOnboarding(SUGGESTION);
    expect(screen.queryByRole('button', { name: '#클라이밍 추가' })).toBeNull();

    await user.press(button('#러닝 추가'));
    await user.press(button('#재즈 추가'));
    expect(screen.queryByRole('button', { name: '#러닝 추가' })).toBeNull();
    expect(button('#클라이밍 추가')).toBeVisible();

    await user.press(button('#러닝 삭제'));
    expect(button('#러닝 추가')).toBeVisible();
    expect(await savedInterests(user)).toEqual(['재즈']);
  });
});

describe('an interest that is not added', () => {
  it('stays in the field when it is there already, whatever its case, with the reason under it', async () => {
    const user = await arriveAtOnboarding(SUGGESTION);
    await addInterest(user, 'AI커리어');
    await addInterest(user, '#ai커리어');

    expect(screen.getByLabelText(INTEREST)).toHaveDisplayValue('#ai커리어');
    expect(screen.getByRole('alert', { name: '이미 추가한 관심사예요' })).toBeVisible();

    await fireEvent.changeText(screen.getByLabelText(INTEREST), '러닝');
    expect(screen.queryByText('이미 추가한 관심사예요')).toBeNull();
    expect(await savedInterests(user)).toEqual(['AI커리어']);
  });

  it('stays when it is longer than thirty characters, an emoji counting as one', async () => {
    const user = await arriveAtOnboarding(SUGGESTION);
    await addInterest(user, `#${'가'.repeat(31)}`);
    expect(screen.getByLabelText(INTEREST)).toHaveDisplayValue(`#${'가'.repeat(31)}`);
    expect(screen.getByRole('alert', { name: '30자까지 쓸 수 있어요' })).toBeVisible();

    await addInterest(user, `${'😀'.repeat(30)} ${'나'.repeat(31)}`);
    expect(screen.getByLabelText(INTEREST)).toHaveDisplayValue('나'.repeat(31));
    expect(await savedInterests(user)).toEqual(['😀'.repeat(30)]);
  });

  it('stays when twenty are there', async () => {
    const user = await arriveAtOnboarding(SUGGESTION);
    await addInterest(user, Array.from({ length: 20 }, (_, index) => `관심${index + 1}`).join(' '));
    expect(screen.getByText('20/20')).toBeVisible();
    expect(screen.getByText('추천')).toBeVisible();
    expect(screen.queryByRole('button', { name: '#러닝 추가' })).toBeNull();

    await addInterest(user, '하나더');
    expect(screen.getByLabelText(INTEREST)).toHaveDisplayValue('하나더');
    expect(screen.getByRole('alert', { name: '관심사는 20개까지 추가할 수 있어요' })).toBeVisible();

    const interests = await savedInterests(user);
    expect(interests).toHaveLength(20);
    expect(interests?.at(-1)).toBe('관심20');
  });
});
