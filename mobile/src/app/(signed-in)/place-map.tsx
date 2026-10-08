import type { ReactElement } from 'react';
import { PlaceMapScreen } from '@/screens/place-map/place-map-screen';

// Choosing a place on the map, above the screen that asked: the `PlacePickerMap` frame.
export default function PlaceMapRoute(): ReactElement {
  return <PlaceMapScreen />;
}
