/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';
import type * as React from 'react';
import type * as ReactNative from 'react-native';
import { StyleSheet, Text, type ViewProps, type ViewStyle } from 'react-native';

import { Glass, GLASS_LEVELS } from '@/design-system/glass';
import { glass } from '@/design-system/tokens';

// Whether the phone has the system's Liquid Glass (iOS 26 and later), which blurs what is behind a panel.
let mockLiquidGlass = false;

jest.mock('expo-glass-effect', () => {
  const { createElement } = jest.requireActual<typeof React>('react');
  const { View } = jest.requireActual<typeof ReactNative>('react-native');
  return {
    isLiquidGlassAvailable: (): boolean => mockLiquidGlass,
    isGlassEffectAPIAvailable: (): boolean => true,
    GlassView: (props: ViewProps): React.ReactElement => createElement(View, { ...props, testID: 'liquid-glass' }),
  };
});

afterEach(() => {
  mockLiquidGlass = false;
});

function styleOf(testId: string): ViewStyle {
  const style: unknown = screen.getByTestId(testId).props.style;
  return StyleSheet.flatten<ViewStyle>(Array.isArray(style) ? style : [style]);
}

describe('Glass', () => {
  it('draws a different see-through ground at each level', async () => {
    await render(
      <>
        {GLASS_LEVELS.map((level) => (
          <Glass key={level} level={level} testID={level} />
        ))}
      </>,
    );

    const grounds = GLASS_LEVELS.map((level) => String(styleOf(level).backgroundColor));
    expect(new Set(grounds).size).toBe(GLASS_LEVELS.length);
    for (const ground of grounds) {
      expect(ground).toMatch(/^rgba\(.*, 0\.\d+\)$/u);
    }
  });

  it("keeps the caller's layout and its own ground", async () => {
    await render(
      <Glass level="panel" style={{ padding: 12, borderRadius: 24, backgroundColor: 'red' }} testID="panel">
        <Text>학생회관식당</Text>
      </Glass>,
    );

    const style = styleOf('panel');
    expect(style).toMatchObject({ padding: 12, borderRadius: 24 });
    expect(style.backgroundColor).not.toBe('red');
    expect(screen.getByText('학생회관식당')).toBeVisible();
  });
});

describe('Glass at the panel level', () => {
  it('blurs behind a panel where the phone has Liquid Glass, with no white over the blur', async () => {
    mockLiquidGlass = true;
    await render(
      <Glass level="panel" style={{ borderRadius: 24 }} testID="panel">
        <Text>학생회관식당</Text>
      </Glass>,
    );

    expect(styleOf('panel').backgroundColor).toBe('transparent');
    expect(styleOf('liquid-glass')).toMatchObject({ position: 'absolute', borderRadius: 24 });
    expect(screen.getByText('학생회관식당')).toBeVisible();
  });

  it('draws a dense white and no blur where the phone has no Liquid Glass, as on Android', async () => {
    await render(<Glass level="panel" testID="panel" />);

    expect(styleOf('panel').backgroundColor).toBe(glass.panel.ground);
    expect(screen.queryByTestId('liquid-glass')).toBeNull();
  });

  it('blurs only a panel', async () => {
    mockLiquidGlass = true;
    await render(
      <>
        {GLASS_LEVELS.filter((level) => level !== 'panel').map((level) => (
          <Glass key={level} level={level} testID={level} />
        ))}
      </>,
    );

    expect(screen.queryByTestId('liquid-glass')).toBeNull();
  });

  it("rounds the blur as the panel's corners are, a bottom sheet's top corners alone included", async () => {
    mockLiquidGlass = true;
    await render(<Glass level="panel" style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }} testID="sheet" />);

    for (const layer of ['liquid-glass', 'glass-line']) {
      expect(styleOf(layer)).toMatchObject({ borderTopLeftRadius: 20, borderTopRightRadius: 20 });
    }
  });
});
