/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import Constants from 'expo-constants';
import { type ReactElement, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { Dialog } from '@/design-system';
import { APP_VERSION_URL, type AppVersion, parseAppVersion, type UpdateNeed, updateNeed } from './app-version';

// How long the check waits for GitHub before it gives up and shows nothing.
export const CHECK_TIMEOUT_MS = 5000;

// The words of the dialog about a newer native build.
export const UPDATE = {
  title: '업데이트가 필요합니다',
  body: '새 버전의 앱이 나왔어요.',
  // Where there is nothing to download, as on iOS today, the User installs the new build themselves.
  install: '새 버전의 앱이 나왔어요. 새 버전을 설치해 주세요.',
  update: '업데이트 하기',
  later: '계속 사용하기',
} as const;

// Fetches `app-version.json`. null on any failure: offline, a timeout, an answer other than 200, a malformed file.
export async function fetchAppVersion(timeoutMs = CHECK_TIMEOUT_MS): Promise<AppVersion | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
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
  }
}

interface Shown {
  need: Exclude<UpdateNeed, 'none'>;
  // This platform's download. null where there is none.
  download: string | null;
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
    let cancelled = false;
    void fetchAppVersion().then((file) => {
      if (cancelled || file === null) {
        return;
      }
      const need = updateNeed(Constants.expoConfig?.version ?? '', file.latest, file.minimum);
      if (need !== 'none') {
        setShown({ need, download: file.download[platform] });
      }
    });
    return (): void => {
      cancelled = true;
    };
  }, [platform]);
  if (shown === null) {
    return null;
  }
  const { need, download } = shown;
  const close =
    need === 'recommended'
      ? (): void => {
          setShown(null);
        }
      : undefined;
  return (
    <Dialog
      body={download === null ? UPDATE.install : UPDATE.body}
      cancelLabel={need === 'recommended' ? UPDATE.later : undefined}
      confirmLabel={download === null ? undefined : UPDATE.update}
      onCancel={close}
      onConfirm={(): void => {
        if (download !== null) {
          // A phone that cannot open the link leaves the dialog as it is.
          Linking.openURL(download).catch(() => null);
        }
      }}
      title={UPDATE.title}
      visible
    />
  );
}
