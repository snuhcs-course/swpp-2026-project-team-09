import { type ReactElement, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { captureView } from './capture';
import { hasPhoto, LookView, lookName, type MarkerLook, standsOnTip } from './marker-looks';
import type { MarkerImage } from './types';

// The pictures a native map draws. A native map draws images, not React views, so each look of the design system's
// marker views is drawn once on a stage outside the screen, captured as a picture and kept under the look's name
// for as long as the app runs.

interface Kept {
  // The looks whose picture is made or cannot be made.
  images: Readonly<Record<string, MarkerImage>>;
  // The looks that wait on the stage.
  waiting: readonly MarkerLook[];
}

let kept: Kept = { images: {}, waiting: [] };
const listeners = new Set<() => void>();

function keep(next: Kept): void {
  kept = next;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return (): void => {
    listeners.delete(listener);
  };
}

function read(): Kept {
  return kept;
}

function anchorOf(look: MarkerLook, height: number): MarkerImage['anchor'] {
  return { x: 0.5, y: standsOnTip(look) && height > 0 ? 1 - MARGIN / height : 0.5 };
}

function ask(looks: readonly MarkerLook[]): void {
  const known = new Set([...Object.keys(kept.images), ...kept.waiting.map(lookName)]);
  const fresh = looks.filter((look, index) => {
    const name = lookName(look);
    return !known.has(name) && looks.findIndex((other) => lookName(other) === name) === index;
  });
  if (fresh.length > 0) {
    keep({ images: kept.images, waiting: [...kept.waiting, ...fresh] });
  }
}

function made(look: MarkerLook, uri: string | null, { width, height }: Size): void {
  const name = lookName(look);
  keep({
    images: { ...kept.images, [name]: { look: name, uri, width, height, anchor: anchorOf(look, height) } },
    waiting: kept.waiting.filter((other) => lookName(other) !== name),
  });
}

// The image of each look, in the order asked. An image names its look at once and gains its picture when the stage
// has made it, so a screen hands it to the map without waiting.
export function useMarkerImages(looks: readonly MarkerLook[]): MarkerImage[] {
  const { images } = useSyncExternalStore(subscribe, read, read);
  useEffect(() => {
    ask(looks);
  });
  return looks.map((look) => {
    const name = lookName(look);
    return images[name] ?? { look: name, uri: null, width: 0, height: 0, anchor: anchorOf(look, 0) };
  });
}

interface Size {
  width: number;
  height: number;
}

// How long a photo may take before the picture is made without it.
const PHOTO_WAIT_MS = 3000;

// One look on the stage, captured once it is laid out and its photo, if it has one, is shown.
function Shot({ look }: { look: MarkerLook }): ReactElement {
  const view = useRef<View>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [settled, setSettled] = useState(!hasPhoto(look));
  useEffect(() => {
    const timer = settled ? undefined : setTimeout(setSettled, PHOTO_WAIT_MS, true);
    return (): void => {
      clearTimeout(timer);
    };
  }, [settled]);
  useEffect(() => {
    // One frame later, so that what was just laid out is also drawn.
    const frame =
      size === null || !settled
        ? null
        : requestAnimationFrame(() => {
            void captureView(view).then((uri) => {
              made(look, uri, size);
            });
          });
    return (): void => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
      }
    };
  }, [look, size, settled]);
  return (
    <View
      collapsable={false}
      onLayout={({ nativeEvent: { layout } }: LayoutChangeEvent) => {
        setSize({ width: layout.width, height: layout.height });
      }}
      ref={view}
      style={styles.shot}
    >
      <LookView
        look={look}
        onPhotoSettled={() => {
          setSettled(true);
        }}
      />
    </View>
  );
}

// Where the looks are drawn to be captured: outside the screen, unseen and unread. The app shows it once, around
// every screen.
export function MarkerImageStage(): ReactElement {
  const { waiting } = useSyncExternalStore(subscribe, read, read);
  return (
    <View accessibilityElementsHidden aria-hidden importantForAccessibility="no-hide-descendants" style={styles.stage}>
      {waiting.map((look) => (
        <Shot key={lookName(look)} look={look} />
      ))}
    </View>
  );
}

// Clear room around a look, so that its ring and its shadow are in the picture.
const MARGIN = 8;
const OFF_SCREEN = -10_000;

const styles = StyleSheet.create({
  stage: { position: 'absolute', top: 0, left: OFF_SCREEN, alignItems: 'flex-start', pointerEvents: 'none' },
  shot: { padding: MARGIN },
});
