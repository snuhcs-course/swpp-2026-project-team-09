import { type ReactElement, type RefObject, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { captureView } from './capture';
import { hasPhoto, LookView, lookName, type MarkerLook, standsOnTip } from './marker-looks';
import { hasNativeMap } from './native-module';
import type { Size } from './projection';
import type { MarkerImage } from './types';

// The pictures a native map draws. A native map draws images, not React views, so each look of the design system's
// marker views is drawn once on a stage outside the screen, captured as a picture and kept under the look's name
// for as long as the app runs. Only a build that holds the native map module makes pictures: the plain ground draws
// the views themselves.
//
// Checked with the Android module on an emulator (ticket 07): the picture is drawn pixel for pixel, at the view's
// size, with the view's shadow in it. No picture is released while the app runs: there is one small file per look,
// and the looks grow only with the Friends a User has.

type Images = Readonly<Record<string, MarkerImage>>;

// The pictures made, the looks that wait on the stage, and the looks whose tries were used up.
let images: Images = {};
let waiting: readonly MarkerLook[] = [];
let failed: readonly string[] = [];
const listeners = new Set<() => void>();

function tell(): void {
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

function anchorOf(look: MarkerLook, height: number): MarkerImage['anchor'] {
  return { x: 0.5, y: standsOnTip(look) && height > 0 ? 1 - IMAGE_MARGIN / height : 0.5 };
}

// An image before its picture is made: it names its look, which is all a test and the plain ground need.
export function unmadeImage(look: MarkerLook): MarkerImage {
  return { look: lookName(look), view: look, uri: null, width: 0, height: 0, anchor: anchorOf(look, 0) };
}

// Puts the looks that have no picture on the stage. A screen that is newly shown asks `again` for a look whose
// tries were used up.
function ask(looks: readonly MarkerLook[], again: boolean): void {
  if (!hasNativeMap()) {
    return;
  }
  const names = new Set(looks.map((look) => lookName(look)));
  if (again) {
    failed = failed.filter((name) => !names.has(name));
  }
  const known = new Set([...Object.keys(images), ...waiting.map((look) => lookName(look)), ...failed]);
  const fresh = looks.filter((look, index) => {
    const name = lookName(look);
    return !known.has(name) && looks.findIndex((other) => lookName(other) === name) === index;
  });
  if (fresh.length > 0) {
    waiting = [...waiting, ...fresh];
    tell();
  }
}

function leave(look: MarkerLook): void {
  waiting = waiting.filter((other) => lookName(other) !== lookName(look));
}

// A picture is kept under its look's name, as a new image: a map that holds the old one sees that it changed. The
// look stays on the stage while its photo is still to come.
function made(look: MarkerLook, uri: string, { width, height }: Size, complete: boolean): void {
  const image = { look: lookName(look), view: look, uri, width, height, anchor: anchorOf(look, height) };
  images = { ...images, [image.look]: image };
  if (complete) {
    leave(look);
  }
  tell();
}

function gaveUp(look: MarkerLook): void {
  failed = [...failed, lookName(look)];
  leave(look);
  tell();
}

// The image of each look, in the order asked. An image names its look at once and gains its picture when the stage
// has made it, so a screen hands it to the map without waiting.
export function useMarkerImages(looks: readonly MarkerLook[]): MarkerImage[] {
  const kept = useSyncExternalStore(
    subscribe,
    () => images,
    () => images,
  );
  const first = useRef(true);
  useEffect(() => {
    ask(looks, first.current);
    first.current = false;
  });
  return looks.map((look) => kept[lookName(look)] ?? unmadeImage(look));
}

// How long a photo may take before a picture is made without it; the picture is made again when the photo comes.
const PHOTO_WAIT_MS = 3000;
// A capture that gives no picture is tried again, each time after twice the pause.
const TRIES = 4;
const RETRY_MS = 500;
// One frame, so that what was just laid out is also drawn.
const DRAWN_MS = 16;

// Captures a look on the stage: once it is laid out and its photo, if it has one, is shown or has taken too long.
function useCapture(look: MarkerLook, view: RefObject<View | null>, size: Size | null, photoShown: boolean): void {
  const [waitedOut, setWaitedOut] = useState(false);
  const [tries, setTries] = useState(0);
  useEffect(() => {
    const timer = setTimeout(setWaitedOut, PHOTO_WAIT_MS, true);
    return (): void => {
      clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    const ready = size !== null && (photoShown || waitedOut) && tries < TRIES;
    const capture = async (): Promise<void> => {
      const uri = await captureView(view);
      if (uri !== null && size !== null) {
        made(look, uri, size, photoShown);
      } else if (tries + 1 >= TRIES) {
        gaveUp(look);
      } else {
        setTries(tries + 1);
      }
    };
    const pause = tries === 0 ? DRAWN_MS : RETRY_MS * 2 ** (tries - 1);
    const timer = ready
      ? setTimeout(() => {
          void capture();
        }, pause)
      : 0;
    return (): void => {
      clearTimeout(timer);
    };
  }, [look, view, size, photoShown, waitedOut, tries]);
}

// One look on the stage, with clear room around it.
function Shot({ look }: { look: MarkerLook }): ReactElement {
  const view = useRef<View>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [photoShown, setPhotoShown] = useState(!hasPhoto(look));
  useCapture(look, view, size, photoShown);
  return (
    <View
      collapsable={false}
      onLayout={({ nativeEvent: { layout } }) => {
        setSize({ width: layout.width, height: layout.height });
      }}
      ref={view}
      style={styles.shot}
    >
      <LookView
        look={look}
        onPhotoSettled={() => {
          setPhotoShown(true);
        }}
      />
    </View>
  );
}

// Where the looks are drawn to be captured: outside the screen, unseen and unread. The app shows it once, around
// every screen. It is empty in a build without the native map module.
export function MarkerImageStage(): ReactElement {
  const looks = useSyncExternalStore(
    subscribe,
    () => waiting,
    () => waiting,
  );
  return (
    <View accessibilityElementsHidden aria-hidden importantForAccessibility="no-hide-descendants" style={styles.stage}>
      {looks.map((look) => (
        <Shot key={lookName(look)} look={look} />
      ))}
    </View>
  );
}

// Clear room around a look, so that what reaches out of its box is in the picture: a shadow, a pin's count, and the
// rings of a selected look, of which a selected pin's reaches furthest, a little over 8. A look that stands on its
// tip has its `anchor` that much above the picture's foot, and a native side is told the room (`imageMargin`) and
// draws a marker's text that much higher, so that it sits under the look and not under the room.
export const IMAGE_MARGIN = 12;
const OFF_SCREEN = -10_000;

const styles = StyleSheet.create({
  stage: { position: 'absolute', top: 0, left: OFF_SCREEN, alignItems: 'flex-start', pointerEvents: 'none' },
  shot: { padding: IMAGE_MARGIN },
});
