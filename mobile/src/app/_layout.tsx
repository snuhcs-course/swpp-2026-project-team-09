/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by fyoon46
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-28  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import '@/polyfills';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { type ReactElement, useEffect } from 'react';
import pretendardBold from '../../assets/fonts/Pretendard-Bold.otf';
import pretendardMedium from '../../assets/fonts/Pretendard-Medium.otf';
import pretendardRegular from '../../assets/fonts/Pretendard-Regular.otf';
import pretendardSemiBold from '../../assets/fonts/Pretendard-SemiBold.otf';
import { AppProviders } from '@/app-providers';
import { font } from '@/design-system';
import { RouteBreadcrumb, startTelemetry, TelemetryBoundary } from '@/telemetry';
import { UpdateCheck } from '@/update/update-check';

// The native splash image stays until the fonts are ready, so that no screen appears in the system font first.
void SplashScreen.preventAutoHideAsync();

// Crash reports start as soon as the phone's choice in 내 정보 is read, without holding back the first screen; without a
// DSN in the build, or with the choice off, they start nothing.
void startTelemetry();

export default function RootLayout(): ReactElement | null {
  const [fontsLoaded, fontsError] = useFonts({
    [font.regular]: pretendardRegular,
    [font.medium]: pretendardMedium,
    [font.semiBold]: pretendardSemiBold,
    [font.bold]: pretendardBold,
  });
  // A font that fails to load leaves the app usable in the system font.
  const ready = fontsLoaded || fontsError !== null;
  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);
  if (!ready) {
    return null;
  }
  return (
    <AppProviders>
      {/* A screen that throws while drawing shows a message and "다시 시도" in place of a white screen. */}
      <TelemetryBoundary>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
      </TelemetryBoundary>
      <RouteBreadcrumb />
      {/* The check for a newer native build starts with the first screen and shows its dialog over it. */}
      <UpdateCheck />
    </AppProviders>
  );
}
