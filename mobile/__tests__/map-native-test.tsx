import { render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Text } from 'react-native';

import { Map } from '@/map';
import { EMPTY } from './support/map';

let mockHasNativeMap = false;
let mockNativeMapLoads = 0;

function MockNativeMap(): ReactElement {
  return <Text>네이티브 지도</Text>;
}

jest.mock('@/map/native-module', (): { hasNativeMap: () => boolean } => ({
  hasNativeMap: (): boolean => mockHasNativeMap,
}));

// The factory runs when the file is first loaded, so it counts the loads.
jest.mock('@/map/native-map', (): { __esModule: true; default: () => ReactElement } => {
  mockNativeMapLoads += 1;
  return { __esModule: true, default: MockNativeMap };
});

describe('choosing the map while the app runs', () => {
  it('does not load the native map in a build without the module', async () => {
    mockHasNativeMap = false;
    await render(<Map {...EMPTY} />);

    expect(screen.getByText('지도는 Android 빌드에서 보입니다')).toBeVisible();
    expect(mockNativeMapLoads).toBe(0);
  });

  it('shows the native map, with the credit, in a build that holds the module', async () => {
    mockHasNativeMap = true;
    await render(<Map {...EMPTY} />);

    expect(screen.getByText('네이티브 지도')).toBeVisible();
    expect(screen.queryByText('지도는 Android 빌드에서 보입니다')).toBeNull();
    expect(screen.getByText('© OpenStreetMap · 국토지리정보원')).toBeVisible();
    expect(mockNativeMapLoads).toBe(1);
  });
});
