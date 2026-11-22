/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type ReactNode, useEffect, useState } from 'react';
import { Animated, type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, radius, shadow, space, text } from '@/design-system';
import { AI_INPUT, listsTop } from '../layout';
import { DockGrip, useDockDrag } from './dock-drag';
import { GripRow, type GripWords } from './grip-row';
import { useHeldHeight } from './held-height';
import { CloseHint, type Raising, type Steps, useRaiseDrag } from './raise-handle';

type Drag = ReturnType<typeof useRaiseDrag>;

// Above the first of the card's parts.
export const CONTENT_TOP = space[5];

interface FrameCardProps {
  // From the stage's bottom: the room the card keeps under its content.
  barRoom: number;
  // The stage's height, null until it is laid out: the card takes at most about half of it.
  stageHeight: number | null;
  onHeight: (height: number) => void;
  testID: string;
  // Keeps the content's height, while a reply is on its way.
  hold?: boolean;
  // The handle that raises the card up to the pill and lowers it again. Left out, the card has one height.
  raising?: Raising;
  // ✕ at the right end of the handle's row, which closes the answer (P04 ticket 52). Left out, none.
  onClose?: () => void;
  // The line under the grip: "올리면 N곳 목록 ⌃" docked, "내리기 ⌄" raised. Left out or null, none.
  gripWords?: GripWords | null;
  // What stays at the top of the card under the handle's row while the rest scrolls: the caption row (P04 ticket 52).
  head?: ReactNode;
  // Told the most the scrolling part may take at the card's height now, so that a list in it can end above the input
  // and scroll inside itself.
  onContentCap?: (cap: number | null) => void;
  // The time bar's height, which the raised card stops under. Left out, none.
  timeBarHeight?: number;
  // Nothing to read: one rounded row around the input, inset from the sides, with the handle (board 10).
  docked?: boolean;
  // The AI input's bottom from the stage's bottom, which the docked card's edge stands just under.
  inputBottom?: number;
  // Null leaves the card empty.
  children: ReactNode;
}

// The most the card's content takes, about half the stage, null until the stage is laid out. It never takes less
// than the headline's line and one row of follow-ups, which is all it shows while the keyboard is up and leaves little
// of the stage.
const FOLLOW_UP_ROW = 32;
const LEAST_CONTENT = CONTENT_TOP + text.title.lineHeight + space[3] + FOLLOW_UP_ROW;

export function contentMaxOf(stageHeight: number | null, barRoom: number): number | null {
  return stageHeight === null ? null : Math.max(LEAST_CONTENT, stageHeight / 2 - barRoom);
}

const LOWERED: Raising = {
  raised: false,
  setRaised: () => {
    // A card without the handle stays lowered.
  },
};

// The content's height while raised: from under the time bar, or the lists' top when there is none, to the bar's room.
// Null until the stage is laid out.
function useRaisedHeight(
  stageHeight: number | null,
  barRoom: number,
  raising: Raising | undefined,
  timeBarHeight: number,
): number | null {
  const { top } = useSafeAreaInsets();
  const pillRoom = listsTop(top) + (timeBarHeight > 0 ? timeBarHeight + space[2] : 0);
  return stageHeight === null || raising === undefined
    ? null
    : Math.max(LEAST_CONTENT, stageHeight - pillRoom - barRoom);
}

// The dock's edge under the input and its room above it, and its inset from the screen's sides.
const DOCK_BELOW = 6;
const DOCK_ABOVE = space[2];
const DOCK_SIDE = space[2] + 2;
// The card's one right line, from its right edge, which ✕, "＋ 새 질문", the stop button, and the input end on: the
// input's own inset from the screen's side (P04 ticket 52).
const OPEN_EDGE = AI_INPUT.side;
const DOCK_EDGE = AI_INPUT.side - DOCK_SIDE;

// The docked card: the handle, its content, when there is any, in one row over the input, and the input's room under
// it. It tells its height from the stage's bottom, so that the camera keeps the answer clear of it. The whole card takes
// a drag: down closes the answer, up raises the card (`useDockDrag`).
function DockedCard(props: FrameCardProps): ReactElement {
  const { barRoom, inputBottom = 0, onHeight, raising, testID, children } = props;
  const [inner, setInner] = useState(0);
  const [height, setHeight] = useState(0);
  const drag = useDockDrag(raising ?? LOWERED);
  const inputTop = barRoom - space[3];
  const bottom = Math.max(0, inputBottom - DOCK_BELOW);
  return (
    <>
      <GestureDetector gesture={drag.pan}>
        <Animated.View
          onLayout={({ nativeEvent }: LayoutChangeEvent) => {
            drag.onCardHeight(nativeEvent.layout.height);
            setHeight(nativeEvent.layout.height + bottom);
            onHeight(nativeEvent.layout.height + bottom);
          }}
          style={[
            styles.dock,
            { bottom, paddingBottom: inputTop - bottom + DOCK_ABOVE, transform: [{ translateY: drag.drop }] },
          ]}
          testID={testID}
        >
          <GripRow
            edge={DOCK_EDGE}
            handle={<DockGrip raising={raising ?? LOWERED} />}
            onClose={props.onClose ?? null}
            words={props.gripWords ?? null}
          />
          {props.head === undefined ? null : <View style={styles.dockHead}>{props.head}</View>}
          <View
            onLayout={({ nativeEvent }: LayoutChangeEvent) => {
              setInner(nativeEvent.layout.height);
            }}
            style={[styles.dockContent, inner > 0 && { paddingTop: DOCK_ABOVE }]}
            testID={`${testID}-content`}
          >
            {children}
          </View>
        </Animated.View>
      </GestureDetector>
      {drag.past ? <CloseHint barRoom={barRoom} cardHeight={height} drop={drag.drop} /> : null}
    </>
  );
}

// The frame's card, attached to the bottom of the screen. Its content scrolls inside it. Raised, it is as tall as its
// content, up to the pill; full, its top is just under the status bar. Only the lowered card tells its height, so that
// the camera fits the answer to the lowered card alone, and keeps it while the card is raised or full.
export function FrameCard(props: FrameCardProps): ReactElement {
  return props.docked === true ? <DockedCard {...props} /> : <OpenCard {...props} />;
}

// The content's height at full height (P04 ticket 52): the card's top just under the status bar, over the time bar and
// "←", down to the bar's room. Null until the stage is laid out, or for a card without that step.
function fullHeightOf(stageHeight: number | null, barRoom: number, raising: Raising | undefined): number | null {
  return stageHeight === null || raising?.setFull === undefined ? null : Math.max(LEAST_CONTENT, stageHeight - barRoom);
}

// The handle's drag, with the raised and the full heights it stops at and the content's height it learns: heights of
// the scrolling part, under the top (`above`: the handle's row and the caption row).
function useCardDrag({ stageHeight, barRoom, raising, timeBarHeight = 0 }: FrameCardProps): {
  drag: ReturnType<typeof useRaiseDrag>;
  // The lowered content's most height, under the top.
  contentMax: number | null;
  setAbove: (height: number) => void;
  raisedHeight: number | null;
  steps: Steps;
  setNatural: (height: number) => void;
  card: { height: number; setHeight: (height: number) => void };
} {
  const [height, setHeight] = useState(0);
  const [above, setAbove] = useState(0);
  const cardMax = contentMaxOf(stageHeight, barRoom);
  const contentMax = cardMax === null ? null : Math.max(LEAST_CONTENT, cardMax - above);
  const raisedCard = useRaisedHeight(stageHeight, barRoom, raising, timeBarHeight);
  const raisedHeight = raisedCard === null ? null : raisedCard - above;
  // Raised, the card is as tall as its content, up to under the pill, and a drag goes no higher but to full height.
  const [natural, setNatural] = useState<number | null>(null);
  const raisedTo = raisedHeight === null || natural === null ? raisedHeight : Math.min(raisedHeight, natural);
  const fullCard = fullHeightOf(stageHeight, barRoom, raising);
  const steps = { raised: raisedTo, full: fullCard === null ? null : fullCard - above };
  return {
    drag: useRaiseDrag(raising ?? LOWERED, steps),
    contentMax,
    setAbove,
    raisedHeight,
    steps,
    setNatural,
    card: { height, setHeight },
  };
}

// The content's height at rest: full, the whole height, scrolling inside it; raised, up to the raised height; lowered,
// up to about half the stage.
function shownHeight(at: {
  raised: boolean;
  full: boolean;
  raisedHeight: number | null;
  fullHeight: number | null;
  contentMax: number | null;
}): { height: number } | { maxHeight: number | null } {
  const { raised, full, raisedHeight, fullHeight, contentMax } = at;
  if (raised && full && fullHeight !== null) {
    return { height: fullHeight };
  }
  return { maxHeight: raised && raisedHeight !== null ? raisedHeight : contentMax };
}

// The handle's row with ✕, for a card with the handle or ✕, then the caption row: they stay at the card's top while the
// rest scrolls under them, so nothing is drawn over the card's edge (P04 ticket 52). Tells its height.
function rowShownOf({ raising, onClose }: FrameCardProps): boolean {
  return raising !== undefined || onClose !== undefined;
}

function Top(p: { props: FrameCardProps; handle: ReactElement; onHeight: (h: number) => void }): ReactElement | null {
  const { raising, onClose = null, gripWords = null, head } = p.props;
  if (!rowShownOf(p.props) && head === undefined) {
    return null;
  }
  return (
    <View
      onLayout={({ nativeEvent }: LayoutChangeEvent) => {
        p.onHeight(nativeEvent.layout.height);
      }}
    >
      {rowShownOf(p.props) ? (
        <GripRow
          edge={OPEN_EDGE}
          handle={raising === undefined ? null : p.handle}
          onClose={onClose}
          words={gripWords}
        />
      ) : null}
      {head === undefined ? null : <View style={styles.head}>{head}</View>}
    </View>
  );
}

// Tells the scrolling part's cap at the card's height now.
function useToldCap(cap: number | null, onContentCap: ((cap: number | null) => void) | undefined): void {
  useEffect(() => {
    onContentCap?.(cap);
  }, [cap, onContentCap]);
}

// "놓으면 지도 화면으로 돌아가요" while letting go would close the answer.
function DropHint({
  drag,
  cardHeight,
  barRoom,
}: {
  drag: Drag;
  cardHeight: number;
  barRoom: number;
}): ReactElement | null {
  return drag.past && drag.drop !== null ? (
    <CloseHint barRoom={barRoom} cardHeight={cardHeight} drop={drag.drop} />
  ) : null;
}

function OpenCard(props: FrameCardProps): ReactElement {
  const { barRoom, onHeight, testID, hold = false, raising, children } = props;
  const { raised, full = false } = raising ?? LOWERED;
  const { drag, contentMax, setAbove, raisedHeight, steps, setNatural, card } = useCardDrag(props);
  const { minHeight, onContentSizeChange, scroll } = useHeldHeight(hold);
  const shown = shownHeight({ raised, full, raisedHeight, fullHeight: steps.full, contentMax });
  useToldCap('height' in shown ? shown.height : shown.maxHeight, props.onContentCap);
  const topped = rowShownOf(props) || props.head !== undefined;
  return (
    <>
      <Animated.View
        onLayout={(event: LayoutChangeEvent) => {
          drag.onCardLayout(event);
          card.setHeight(event.nativeEvent.layout.height);
          if (!raised && drag.content === null) {
            onHeight(event.nativeEvent.layout.height);
          }
        }}
        style={[
          styles.card,
          { paddingBottom: barRoom },
          drag.drop === null ? null : { transform: [{ translateY: drag.drop }] },
        ]}
        testID={testID}
      >
        <Top handle={drag.handle} onHeight={setAbove} props={props} />
        {children === null ? null : (
          <Animated.ScrollView
            contentContainerStyle={[styles.content, { minHeight }, topped && styles.underTop]}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={(width, height) => {
              setNatural(height);
              onContentSizeChange(width, height);
            }}
            onLayout={({ nativeEvent }: LayoutChangeEvent) => {
              drag.onContentLayout(nativeEvent.layout.height);
            }}
            ref={scroll}
            testID={`${testID}-content`}
            style={drag.content === null ? (contentMax === null ? undefined : shown) : { height: drag.content }}
          >
            {children}
          </Animated.ScrollView>
        )}
      </Animated.View>
      <DropHint barRoom={barRoom} cardHeight={card.height} drag={drag} />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: color.surface,
    boxShadow: shadow.sheet,
  },
  content: { gap: space[3], paddingTop: CONTENT_TOP, paddingHorizontal: space[4] },
  // Under the card's top, which stays while the content scrolls.
  underTop: { paddingTop: space[3] },
  head: { paddingHorizontal: OPEN_EDGE },
  dockHead: { paddingTop: DOCK_ABOVE, paddingHorizontal: DOCK_EDGE },
  dock: {
    position: 'absolute',
    right: DOCK_SIDE,
    left: DOCK_SIDE,
    borderRadius: radius.xl,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  dockContent: { paddingHorizontal: DOCK_EDGE },
});
