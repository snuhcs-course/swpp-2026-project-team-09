/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { act, render, screen, userEvent } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';
import { APP_VERSION_URL } from '@/update/app-version';
import { CHECK_TIMEOUT_MS, UpdateCheck } from '@/update/update-check';

// The check for a newer native build at start, from the fetch of `app-version.json` to the dialog and the link it
// opens. GitHub is replaced at the network: `fetch` answers with the file.

// The installed native build is 1.0.0, whatever `app.json` says today.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { name: 'SNU Now', slug: 'snunow', version: '1.0.0' } },
}));
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
}));

const APK =
  'https://github.com/snuhcs-course/swpp-2026-project-team-09/releases/download/snunow/app/26.10.28-1/snunow.apk';

function file(latest: string, minimum: string, android: string | null = APK): object {
  return { latest, minimum, fingerprint: { android: 'abc', ios: 'def' }, download: { android, ios: null } };
}

function answer(json: unknown, status = 200): jest.SpiedFunction<typeof fetch> {
  return jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(json), { status, headers: { 'Content-Type': 'application/json' } }));
}

// Starts the check on a phone with native build 1.0.0 and lets the fetch answer.
async function start(platform: 'android' | 'ios' = 'android'): Promise<void> {
  jest.replaceProperty(Platform, 'OS', platform);
  await render(<UpdateCheck />);
  // The fetch, the reading of its answer and the dialog are done by the next turn of the event loop.
  await act(async () => {
    await new Promise<void>((resolve) => {
      setImmediate(() => {
        resolve();
      });
    });
  });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('The update check, with a newer build out', () => {
  it('asks for the update and lets the User go on', async () => {
    const fetched = answer(file('1.1.0', '1.0.0'));
    await start();

    expect(fetched.mock.calls[0]?.[0]).toBe(APP_VERSION_URL);
    expect(await screen.findByRole('header', { name: '업데이트가 필요합니다' })).toBeVisible();
    expect(screen.getByText('새 버전의 앱이 나왔어요.')).toBeVisible();
    expect(screen.getByRole('button', { name: '업데이트 하기' })).toBeVisible();

    await userEvent.press(screen.getByRole('button', { name: '계속 사용하기' }));

    expect(screen.queryByText('업데이트가 필요합니다')).toBeNull();
  });

  it("opens the APK's download on Android", async () => {
    answer(file('1.1.0', '1.0.0'));
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await start();

    await userEvent.press(await screen.findByRole('button', { name: '업데이트 하기' }));

    expect(openURL).toHaveBeenCalledWith(APK);
  });

  it('asks an iOS User to install the new build, with no download to open', async () => {
    answer(file('1.1.0', '1.0.0'));
    await start('ios');

    expect(await screen.findByText('새 버전의 앱이 나왔어요. 새 버전을 설치해 주세요.')).toBeVisible();
    expect(screen.queryByRole('button', { name: '업데이트 하기' })).toBeNull();
    expect(screen.getByRole('button', { name: '계속 사용하기' })).toBeVisible();
  });
});

describe('The update check, below the minimum', () => {
  it('leaves only the update', async () => {
    answer(file('1.2.0', '1.1.0'));
    await start();

    expect(await screen.findByRole('header', { name: '업데이트가 필요합니다' })).toBeVisible();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '업데이트 하기' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '계속 사용하기' })).toBeNull();
  });

  it('leaves no button on iOS', async () => {
    answer(file('1.2.0', '1.1.0', null));
    await start('ios');

    expect(await screen.findByText('새 버전의 앱이 나왔어요. 새 버전을 설치해 주세요.')).toBeVisible();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe('The update check, showing nothing', () => {
  it('on the latest build', async () => {
    answer(file('1.0.0', '1.0.0'));
    await start();

    expect(screen.queryByText('업데이트가 필요합니다')).toBeNull();
  });

  it.each([
    ['a malformed file', (): jest.SpiedFunction<typeof fetch> => answer({ latest: 'soon' })],
    [
      'a file that is not JSON',
      (): jest.SpiedFunction<typeof fetch> => jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('<html>')),
    ],
    ['an answer other than 200', (): jest.SpiedFunction<typeof fetch> => answer(file('1.1.0', '1.0.0'), 404)],
    [
      'a phone that is offline',
      (): jest.SpiedFunction<typeof fetch> =>
        jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed')),
    ],
  ])('on %s', async (_, stub) => {
    stub();
    await start();

    expect(screen.queryByText('업데이트가 필요합니다')).toBeNull();
  });

  it('when GitHub does not answer in time', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    let aborted = false;
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      (_, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            aborted = true;
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }),
    );
    await start();

    await act(async () => {
      await jest.advanceTimersByTimeAsync(CHECK_TIMEOUT_MS);
    });

    expect(aborted).toBe(true);
    expect(screen.queryByText('업데이트가 필요합니다')).toBeNull();
    jest.useRealTimers();
  });
});
