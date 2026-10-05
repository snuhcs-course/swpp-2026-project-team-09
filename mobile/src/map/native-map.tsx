import type { ReactElement } from 'react';
import { PlainMap } from './plain-map';
import type { MapProps } from './types';

// THE SEAM FOR THE NATIVE MAP. Ticket 07 replaces the body of this component with the view of the native module
// `SnuNowMap`, and ticket 11 adds the iOS side behind the same view. `map.tsx` loads this file only in a build that
// holds the module, so nothing here runs in Expo Go, on the web or in a test, and it is the only file that may name
// the native view. Until the module exists, no build reaches this file; it answers with the plain ground.
export default function NativeMap(props: MapProps): ReactElement {
  return <PlainMap {...props} />;
}
