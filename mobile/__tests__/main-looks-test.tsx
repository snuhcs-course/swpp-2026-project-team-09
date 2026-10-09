// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-06, prompted by AhnJinYoung and fyoon46
import { captureRef } from 'react-native-view-shot';
import { screen } from './support/app';
import { givePhone, ME, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';

jest.mock('expo-location');
// A build that holds the native map module: the looks' pictures are made on the stage.
jest.mock('@/map/native-module', (): { hasNativeMap: () => boolean } => ({
  hasNativeMap: (): boolean => true,
}));
jest.mock('react-native-view-shot', (): { captureRef: jest.Mock<Promise<string>, []> } => ({
  captureRef: jest.fn<Promise<string>, []>(),
}));

beforeEach(async () => {
  jest.useFakeTimers();
  jest.mocked(captureRef).mockResolvedValue('file:///tmp/me.png');
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("the User's own looks on the main screen", () => {
  it('are both asked for when the screen opens: the small one in view and the full one for later', async () => {
    givePhone({ permission: 'granted', position: ON_CAMPUS });
    await openMain();

    // The native map draws the pictures, not the views: what is labelled is the views of both looks on the stage.
    expect(screen.getAllByLabelText(ME, { includeHiddenElements: true })).toHaveLength(2);
  });
});
