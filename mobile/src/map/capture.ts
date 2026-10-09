/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

// A picture of a view as it is drawn now, with a clear background, in the phone's own pixels: a file of this run of
// the app. Null when no picture came of it, which the caller tries again. It is called only in a build that holds
// the native map module.
export async function captureView(view: RefObject<View | null>): Promise<string | null> {
  try {
    // Read as unknown: a capturing module that is a stand-in, as in a test, answers with nothing.
    const uri: unknown = await captureRef(view, { format: 'png', result: 'tmpfile' });
    return typeof uri === 'string' && uri !== '' ? uri : null;
  } catch {
    return null;
  }
}
