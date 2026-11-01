/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import Constants from 'expo-constants';
import { type ComponentProps, type ReactElement, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { Dialog } from '@/design-system';
import { APP_VERSION_URL, type AppVersion, parseAppVersion, type UpdateNeed, updateNeed } from './app-version';

// How long the check waits for GitHub before it gives up and shows nothing.
export const CHECK_TIMEOUT_MS = 5000;

// The words of the dialog about a newer native build.
const BODY = '새 버전의 앱이 나왔어요.';
const UPDATE = {
  title: '업데이트가 필요합니다',
  body: BODY,
  // Where there is nothing to download, as on iOS today, the User installs the new build themselves.
  install: `${BODY} 새 버전을 설치해 주세요.`,
  update: '업데이트 하기',
  later: '계속 사용하기',
} as const;

// Fetches `app-version.json`. null on any failure: offline, a timeout, an answer other than 200, a malformed file,
// and an abort through `signal`.
async function fetchAppVersion(signal: AbortSignal): Promise<AppVersion | null> {
  const controller = new AbortController();
  const abort = (): void => {
    controller.abort();
  };
  signal.addEventListener('abort', abort);
  const timer = setTimeout(abort, CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(APP_VERSION_URL, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) {
      return null;
    }
    return parseAppVersion(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

interface Shown {
  need: Exclude<UpdateNeed, 'none'>;
  // This platform's download. null where there is none.
  download: string | null;
}

type Answers = Pick<ComponentProps<typeof Dialog>, 'body' | 'confirmLabel' | 'cancelLabel' | 'onConfirm' | 'onCancel'>;

// What the dialog says and which answers it has. 업데이트 하기 is there only with a download; 계속 사용하기, and with
// it Android's back button, only while the build is still allowed.
function answers({ need, download }: Shown, close: () => void): Answers {
  const later: Answers = need === 'recommended' ? { cancelLabel: UPDATE.later, onCancel: close } : {};
  if (download === null) {
    return { body: UPDATE.install, ...later };
  }
  return {
    body: UPDATE.body,
    confirmLabel: UPDATE.update,
    onConfirm: (): void => {
      // A phone that cannot open the link leaves the dialog as it is.
      Linking.openURL(download).catch(() => null);
    },
    ...later,
  };
}

// Checks once, when the app starts, whether a newer native build is out, and says so in a dialog over whatever
// screen is open. It does not hold the first screen back, and any failure of the check shows nothing. The dialog is
// shown again at every start: nothing about it is kept. The web has no build to install, so it is not checked.
export function UpdateCheck(): ReactElement | null {
  const platform = Platform.OS;
  return platform === 'android' || platform === 'ios' ? <PhoneUpdateCheck platform={platform} /> : null;
}

function PhoneUpdateCheck({ platform }: { platform: 'android' | 'ios' }): ReactElement | null {
  const [shown, setShown] = useState<Shown | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void fetchAppVersion(controller.signal).then((file) => {
      if (controller.signal.aborted || file === null) {
        return;
      }
      // The installed native build's `version`, read from the running JavaScript's configuration. The two agree:
      // `version` is part of the fingerprint, so an update made with another `version` never reaches this build.
      const need = updateNeed(Constants.expoConfig?.version ?? '', file.latest, file.minimum);
      if (need !== 'none') {
        setShown({ need, download: file.download[platform] });
      }
    });
    return (): void => {
      controller.abort();
    };
  }, [platform]);
  if (shown === null) {
    return null;
  }
  return (
    <Dialog
      {...answers(shown, () => {
        setShown(null);
      })}
      title={UPDATE.title}
      visible
    />
  );
}
