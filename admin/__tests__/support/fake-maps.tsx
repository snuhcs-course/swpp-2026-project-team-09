import { act } from '@testing-library/react';
import type { ReactElement } from 'react';

import type { Position } from '@/kakao-maps';

// Stands in for Kakao's map: it shows where its marker is, and a test points on it with pointOnMap().

let point: ((position: Position) => void) | undefined;

export function PositionMap({
  position,
  onPoint,
}: {
  position: Position | null;
  onPoint: (position: Position) => void;
}): ReactElement {
  point = onPoint;
  return <p>{position === null ? 'No marker' : `Marker at ${position.latitude}, ${position.longitude}`}</p>;
}

export function pointOnMap(position: Position): void {
  act(() => {
    point?.(position);
  });
}
