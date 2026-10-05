import type { RefObject } from 'react';
import { Platform, TurboModuleRegistry, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

// Whether this build can make a picture of a view: on a phone when it holds the capturing module, which Expo Go
// does, and always in a browser. A test cannot.
function canCapture(): boolean {
  return Platform.OS === 'web' || TurboModuleRegistry.get('RNViewShot') !== null;
}

// A picture of a view as it is drawn now, with a clear background, in the phone's own pixels: a file of this run of
// the app, or in a browser a data address. Null where no picture can be made.
export async function captureView(view: RefObject<View | null>): Promise<string | null> {
  if (!canCapture()) {
    return null;
  }
  try {
    // Read as unknown: a build whose capturing module is a stand-in answers with nothing.
    const uri: unknown = await captureRef(view, {
      format: 'png',
      result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile',
    });
    return typeof uri === 'string' && uri !== '' ? uri : null;
  } catch {
    return null;
  }
}
