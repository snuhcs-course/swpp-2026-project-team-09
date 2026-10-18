/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Redirect, useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { OcrCheckScreen } from '@/screens/ocr-check-screen';

// The native OCR module on a picked image, or on the one `?uri=` names, with its answer saved as JSON. For
// developers: a released app has no way here.
export default function OcrCheck(): ReactElement {
  const { uri, name } = useLocalSearchParams<{ uri?: string; name?: string }>();
  if (!__DEV__) {
    return <Redirect href="/" />;
  }
  return <OcrCheckScreen name={name} uri={uri} />;
}
