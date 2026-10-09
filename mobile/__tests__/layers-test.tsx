// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-08, prompted by fyoon46
import { screen as found } from '@testing-library/react-native';
import { holdBackButton } from './support/back';
import { pass, screen, shownAddress } from './support/app';
import { button, findButton, LAYERS } from './support/lists';
import { givePhone, ON_CAMPUS, openMain } from './support/main';
import { FRIEND, NOT_READY, press } from './support/markers';
import { startFresh } from './support/mocks';

// The 편의기능 stack of the `MainLayers` frame, against the mocks.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const STACK = '편의기능 레이어';
const SCRIM = '편의기능 레이어 닫기';

function toggle(name: string): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('togglebutton', { name });
}

function stack(): ReturnType<typeof screen.queryByLabelText> {
  return screen.queryByLabelText(STACK);
}

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('the 편의기능 button', () => {
  it('opens and closes the stack, and says whether it is open', async () => {
    const user = await openMain();
    expect(button(LAYERS)).toBeCollapsed();
    expect(stack()).toBeNull();

    await press(user, LAYERS);
    expect(button(LAYERS)).toBeExpanded();
    expect(stack()).toBeVisible();

    await press(user, LAYERS);
    expect(button(LAYERS)).toBeCollapsed();
    expect(stack()).toBeNull();
  });

  it('is navy while the stack is open and white otherwise', async () => {
    const user = await openMain();
    expect(button(LAYERS)).toHaveStyle({ backgroundColor: '#FFFFFF' });

    await press(user, LAYERS);

    expect(button(LAYERS)).toHaveStyle({ backgroundColor: '#001A72' });
  });

  it('shows a dot in the colour of each layer that is on', async () => {
    const user = await openMain();
    expect(found.queryAllByTestId('layer-dot', { includeHiddenElements: true })).toHaveLength(0);

    await press(user, LAYERS);
    await user.press(toggle('식당 켜기'));

    const dots = found.getAllByTestId('layer-dot', { includeHiddenElements: true });
    expect(dots).toHaveLength(1);
    expect(dots[0]).toHaveStyle({ width: 5, height: 5, backgroundColor: '#B8336A' });
  });
});

describe('the stack', () => {
  it('holds 식당 and 셔틀버스 from the bottom up, off, and the 메뉴 tile above them', async () => {
    const user = await openMain();
    await press(user, LAYERS);

    expect(toggle('식당 켜기')).toHaveTextContent('식당OFF');
    expect(toggle('셔틀버스 켜기')).toHaveTextContent('셔틀버스OFF');
    expect(toggle('식당 켜기')).toHaveProp('accessibilityState', { checked: false });
    expect(button('메뉴 보기')).toHaveTextContent('메뉴');
    expect(stack()).toHaveStyle({ flexDirection: 'column-reverse' });
    const names = screen
      .getAllByRole(/^(togglebutton|button)$/u)
      .map((element) => String(element.props.accessibilityLabel))
      .filter((name) => ['식당 켜기', '셔틀버스 켜기', '메뉴 보기'].includes(name));
    expect(names).toEqual(['식당 켜기', '셔틀버스 켜기', '메뉴 보기']);
  });

  it('turns 식당 on and off, filled with its colour while it is on', async () => {
    const user = await openMain();
    await press(user, LAYERS);
    expect(toggle('식당 켜기')).toHaveStyle({ backgroundColor: '#F5F6F9' });

    await user.press(toggle('식당 켜기'));
    expect(toggle('식당 끄기')).toHaveTextContent('식당ON');
    expect(toggle('식당 끄기')).toHaveProp('accessibilityState', { checked: true });
    expect(toggle('식당 끄기')).toHaveStyle({ backgroundColor: '#B8336A' });

    await user.press(toggle('식당 끄기'));
    expect(toggle('식당 켜기')).toHaveTextContent('식당OFF');
  });
});

describe('the 셔틀버스 toggle', () => {
  it('turns 셔틀버스 on and off, with its dot under the button while it is on', async () => {
    const user = await openMain();
    await press(user, LAYERS);

    await user.press(toggle('셔틀버스 켜기'));
    expect(toggle('셔틀버스 끄기')).toHaveTextContent('셔틀버스ON');
    expect(toggle('셔틀버스 끄기')).toHaveStyle({ backgroundColor: '#6B46C1' });
    expect(found.getByTestId('layer-dot', { includeHiddenElements: true })).toHaveStyle({ backgroundColor: '#6B46C1' });
    expect(screen.queryByText(NOT_READY)).toBeNull();

    await user.press(toggle('셔틀버스 끄기'));
    expect(toggle('셔틀버스 켜기')).toHaveTextContent('셔틀버스OFF');
    expect(found.queryByTestId('layer-dot', { includeHiddenElements: true })).toBeNull();
  });

  it('appears without rising where the phone asks for less motion', async () => {
    const user = await openMain();

    await press(user, LAYERS);

    expect(stack()).toHaveStyle({ opacity: 1, transform: [{ translateY: 0 }] });
  });
});

describe('the stack, open', () => {
  it('is closed by the scrim over the map', async () => {
    const user = await openMain();
    await press(user, LAYERS);

    await press(user, SCRIM);

    expect(stack()).toBeNull();
    expect(findButton(SCRIM)).toBeNull();
  });

  it('hides the zoom control while it is open', async () => {
    const user = await openMain();
    await press(user, LAYERS);
    expect(findButton('확대')).toBeNull();

    await press(user, SCRIM);
    expect(button('확대')).toBeVisible();
  });

  it("is closed by Android's back button, before anything under it", async () => {
    const back = holdBackButton();
    const user = await openMain();
    await press(user, LAYERS);

    expect(await back()).toBe(true);
    expect(stack()).toBeNull();
    expect(await back()).toBe(false);
  });

  it('keeps its layers on across a visit to another tab', async () => {
    const user = await openMain();
    await press(user, LAYERS);
    await user.press(toggle('식당 켜기'));
    await press(user, SCRIM);

    await user.press(screen.getByRole('tab', { name: '행사' }));
    await user.press(screen.getByRole('tab', { name: '지도' }));
    await press(user, LAYERS);

    expect(toggle('식당 끄기')).toHaveTextContent('식당ON');
  });
});

describe('the 메뉴 tile', () => {
  it("opens the menu panel at today's next meal and closes the stack", async () => {
    const user = await openMain();
    await press(user, LAYERS);

    await press(user, '메뉴 보기');
    await pass(500);

    // The mocks' clock is 13:37 on 1 October 2026.
    expect(shownAddress()).toBe('/menus?date=2026-10-01&meal=lunch');
    expect(screen.getByRole('header', { name: '메뉴' })).toBeVisible();
    await user.press(screen.getByRole('button', { name: '닫기' }));
    expect(stack()).toBeNull();
  });
});

describe('the stack while a card is open', () => {
  it('is not shown with its button while a card at the bottom is open', async () => {
    const user = await openMain();

    await press(user, FRIEND);

    expect(findButton(LAYERS)).toBeNull();
  });
});
