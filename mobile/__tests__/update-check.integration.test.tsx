/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Platform } from 'react-native';
import RootLayout from '@/app/_layout';
import { APP_VERSION_URL } from '@/update/app-version';
import { pass, screen, startApp } from './support/app';
import { startFakeServer } from './support/fake-server';
import { startFresh } from './support/mocks';

// The check for a newer native build at start, which the HE build leaves out: what was submitted is what is evaluated.
// The app starts with its own root layout, and GitHub is replaced at the network.

// The installed native build is 1.0.0, whatever `app.json` says today.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { name: 'SNU Now', slug: 'snunow', version: '1.0.0' } },
}));
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

const APK =
  'https://github.com/snuhcs-course/swpp-2026-project-team-09/releases/download/snunow/app/26.10.28-1/snunow.apk';

const VERSION_FILE = `GET ${new URL(APP_VERSION_URL).pathname}`;

// A file that would leave the installed build only the update.
const REQUIRED = {
  latest: '1.2.0',
  minimum: '1.1.0',
  fingerprint: { android: 'a', ios: 'b' },
  download: { android: APK },
};

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Starting the HE build', () => {
  it.each(['android', 'ios'] as const)(
    'on %s, requests no version file and shows no update dialog',
    async (platform) => {
      jest.replaceProperty(Platform, 'OS', platform);
      const github = startFakeServer();
      github.on(VERSION_FILE, { status: 200, body: REQUIRED });

      await startApp('/', { _layout: RootLayout });
      await pass(6000);

      expect(github.received(VERSION_FILE)).toHaveLength(0);
      expect(screen.queryByRole('header', { name: '업데이트가 필요합니다' })).toBeNull();
      expect(screen.getByRole('header', { name: '서울대 계정으로 로그인' })).toBeVisible();
    },
  );
});
