import { createContext, type RefObject, use, useEffect, useRef, useState } from 'react';
import { Keyboard, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView, type View } from 'react-native';
import { space } from '@/design-system';

interface Edges {
  top: number;
  bottom: number;
}

// Kept clear under a list that was scrolled into view.
const MARGIN = space[3];

// How far the form scrolls up so that a field and the list open under it end above the form's lower edge. The field
// itself stays in view: where both do not fit, as on a small screen with the keyboard up, the list's end waits below.
export function scrollToShow(block: Edges, view: Edges): number {
  const under = block.bottom + MARGIN - view.bottom;
  const room = block.top - view.top;
  return Math.max(0, Math.min(under, room));
}

interface Reveal {
  show: (block: View | null) => void;
  hide: (block: View | null) => void;
}

export const RevealContext = createContext<Reveal | null>(null);

interface Revealer extends Reveal {
  // Around the scrolling form: what is seen of it, which the keyboard makes lower.
  frame: RefObject<View | null>;
  scroll: RefObject<ScrollView | null>;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  // The frame's height changed, as when the keyboard came: the open list is shown again.
  settle: () => void;
}

// For the screen: scrolls its form so that a field with an open list is seen whole, above the foot and the keyboard.
export function useRevealer(): Revealer {
  const frame = useRef<View>(null);
  const scroll = useRef<ScrollView>(null);
  const offset = useRef(0);
  const shown = useRef<View | null>(null);
  const settle = (): void => {
    const block = shown.current;
    frame.current?.measureInWindow((_x, top, _width, height) => {
      block?.measureInWindow((_blockX, blockTop, _blockWidth, blockHeight) => {
        const by = scrollToShow({ top: blockTop, bottom: blockTop + blockHeight }, { top, bottom: top + height });
        if (by > 0) {
          scroll.current?.scrollTo({ y: offset.current + by, animated: true });
        }
      });
    });
  };
  return {
    frame,
    scroll,
    settle,
    onScroll: (event) => {
      offset.current = event.nativeEvent.contentOffset.y;
    },
    show: (block) => {
      shown.current = block;
      settle();
    },
    hide: (block) => {
      if (shown.current === block) {
        shown.current = null;
      }
    },
  };
}

// For a field whose list opens under it: the field's place, which the form shows whole while the list is open, and
// again whenever the list's height changes.
export function useRevealed(open: boolean): { block: RefObject<View | null>; onLayout: () => void } {
  const reveal = use(RevealContext);
  const block = useRef<View>(null);
  useEffect(() => {
    const held = block.current;
    if (open) {
      reveal?.show(held);
    }
    return (): void => {
      reveal?.hide(held);
    };
  }, [open, reveal]);
  return {
    block,
    onLayout: () => {
      if (open) {
        reveal?.show(block.current);
      }
    },
  };
}

// Whether the phone's keyboard is up. The web tells nothing of it and stays false.
export function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const came = Keyboard.addListener('keyboardDidShow', () => {
      setShown(true);
    });
    const left = Keyboard.addListener('keyboardDidHide', () => {
      setShown(false);
    });
    return (): void => {
      came.remove();
      left.remove();
    };
  }, []);
  return shown;
}
