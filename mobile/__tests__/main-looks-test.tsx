import { captureRef } from 'react-native-view-shot';
import { screen } from './support/app';
import { givePhone, ME, ON_CAMPUS, openMain } from './support/main';
import { startFresh } from './support/mocks';

jest.mock('expo-location');
// A build that holds the native map module: the looks' pictures are made on the stage.
jest.mock('@/map/native-module', (): { hasNativeMap: () => boolean } => ({
  hasNativeMap: (): boolean => true,
}));
// The plain ground stands in for the native map, which draws pictures a test cannot read: the looks it is given are
// the plain ground's views.
jest.mock('@/map/native-map', (): { __esModule: true; default: unknown } => {
  const { PlainMap }: { PlainMap: unknown } = jest.requireActual('@/map/plain-map');
  return { __esModule: true, default: PlainMap };
});
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

    // The whole campus is in view: the map shows the small look.
    expect(screen.getByRole('button', { name: ME })).toHaveProp('testID', 'me:small');
    // The plain ground's button and the view in it are two; the other two are the views of both looks on the stage.
    expect(screen.getAllByLabelText(ME, { includeHiddenElements: true })).toHaveLength(4);
  });
});
