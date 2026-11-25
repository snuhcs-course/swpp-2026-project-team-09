/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { Glass, GLASS_LEVELS } from '@/design-system/glass';

describe('Glass', () => {
  it('draws a different see-through ground at each level', async () => {
    await render(
      <>
        {GLASS_LEVELS.map((level) => (
          <Glass key={level} level={level} testID={level} />
        ))}
      </>,
    );

    const grounds = GLASS_LEVELS.map(
      (level) => StyleSheet.flatten(screen.getByTestId(level).props.style).backgroundColor as string,
    );
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

    const style = StyleSheet.flatten(screen.getByTestId('panel').props.style);
    expect(style).toMatchObject({ padding: 12, borderRadius: 24 });
    expect(style.backgroundColor).not.toBe('red');
    expect(screen.getByText('학생회관식당')).toBeVisible();
  });
});
