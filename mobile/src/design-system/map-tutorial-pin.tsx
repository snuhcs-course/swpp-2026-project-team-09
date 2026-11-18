/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { color, font, radius, shadow, space, tutorialTone } from './tokens';

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

// How a place of a Tutorial Quest's guide stands on the map (the canvas's `MainTut*` boards): the step shown (`now`),
// large, with a ring inside a rounded square; another step (`step`), faint while still to come (`later`); a step passed
// (`past`), green with ✓; one of a step's several places (`spot`), or a place of a kind not chosen yet (`dot`), small;
// the spot shown (`spotNow`), with a ring.
export type TutorialStepShape = 'now' | 'step' | 'past' | 'dot' | 'spot' | 'spotNow';

const STEP_SIZE = { now: 36, step: 28, past: 28, dot: 18, spot: 18, spotNow: 30 } as const;
const BOX = 68;

interface MapTutorialStepProps {
  shape: TutorialStepShape;
  // The category's colour.
  ink: string;
  // The step's number or its sign, such as 🍚; none on a dot.
  words?: string;
  later?: boolean;
}

export function MapTutorialStep({ shape, ink, words, later = false }: MapTutorialStepProps): ReactElement {
  const width = STEP_SIZE[shape];
  const ringed = shape === 'now' || shape === 'spotNow';
  const ring = width + (shape === 'now' ? 18 : 16);
  const face = (
    <View
      style={[
        stepStyles.face,
        {
          width,
          height: width,
          backgroundColor: shape === 'past' ? tutorialTone.done : ink,
          opacity: later ? 0.6 : 1,
        },
      ]}
    >
      {words === undefined ? null : (
        <Text style={[stepStyles.words, { fontSize: shape === 'now' ? 16 : 13 }]}>
          {shape === 'past' ? '✓' : words}
        </Text>
      )}
    </View>
  );
  const ringedFace = ringed ? (
    <View style={[stepStyles.centre, { width: ring, height: ring }]}>
      <View style={[stepStyles.ring, { width: ring, height: ring, backgroundColor: `${ink}33` }]} />
      {face}
    </View>
  ) : (
    face
  );
  return shape === 'now' ? (
    <View style={[stepStyles.box, { borderColor: ink, backgroundColor: `${ink}1F`, boxShadow: `0 0 0 4px ${ink}26` }]}>
      {ringedFace}
    </View>
  ) : (
    ringedFace
  );
}

const stepStyles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BOX,
    height: BOX,
    margin: space[1],
    borderWidth: 3,
    borderRadius: 18,
  },
  centre: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderRadius: radius.full },
  face: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: color.surface,
    borderRadius: radius.full,
    boxShadow: shadow.dot,
  },
  words: { fontFamily: font.bold, lineHeight: 18, color: color.onPrimary },
});
