/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Text, type TextStyle } from 'react-native';

// A number in a round or a badge of a fixed size (P04 ticket 88), `inside` the round's inside, its size less its rings.
// The round keeps its size at any font size, so the number does too; its box is the round's inside, its line as high,
// centred both ways without Android's font padding. Grown with the font, as on a phone at 1.3, it overflowed the round
// and was drawn low and to the right.
export function RoundNumber({
  number,
  inside,
  style,
  testID,
}: {
  number: number;
  inside: number;
  style: TextStyle | readonly (TextStyle | false)[];
  testID?: string;
}): ReactElement {
  return (
    <Text
      allowFontScaling={false}
      style={[
        style,
        {
          width: inside,
          height: inside,
          lineHeight: inside,
          textAlign: 'center',
          textAlignVertical: 'center',
          includeFontPadding: false,
        },
      ]}
      testID={testID}
    >
      {number}
    </Text>
  );
}
