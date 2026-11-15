/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { color } from './tokens';

const WIDTH = 28;
const HEIGHT = 40;

// The teardrop: a round head of radius 14 whose sides meet at the tip, rounded off, at the bottom middle.
const DROP =
  'M14 0C6.27 0 0 6.27 0 14c0 2.6.72 5.04 1.97 7.13L12.3 38.9a1.95 1.95 0 0 0 3.4 0L26.03 21.13A13.9 13.9 0 0 0 28 14C28 6.27 21.73 0 14 0Z';

// The pin 지도에서 보기 of a tutorial quest drops on its place (P13 references/tutorial-place-pin.png): a red teardrop
// with a white circle in its head, standing on its tip. Its words are the map's own text under it.
export function MapTutorialPin(): ReactElement {
  return (
    <Svg accessibilityLabel="튜토리얼 장소" accessibilityRole="image" height={HEIGHT} viewBox="0 0 28 40" width={WIDTH}>
      <Path d={DROP} fill={color.danger} />
      <Circle cx={14} cy={13.5} fill={color.surface} r={5.5} />
    </Svg>
  );
}
