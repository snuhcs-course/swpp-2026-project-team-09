import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { type ReactElement, useEffect } from 'react';
import pretendardBold from '../../assets/fonts/Pretendard-Bold.otf';
import pretendardMedium from '../../assets/fonts/Pretendard-Medium.otf';
import pretendardRegular from '../../assets/fonts/Pretendard-Regular.otf';
import pretendardSemiBold from '../../assets/fonts/Pretendard-SemiBold.otf';
import { font, ToastProvider } from '@/design-system';

// The native splash image stays until the fonts are ready, so that no screen appears in the system font first.
void SplashScreen.preventAutoHideAsync();

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
    <ToastProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ToastProvider>
  );
}
