/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by TaeHyun79
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, Icon, type IconName, radius, shadow, useSlide } from '@/design-system';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { keepMapLayers, readMapLayers } from '@/storage/map-layers';
import { LAYER_STACK, LAYERS_BUTTON } from './layout';

// The layers of the map that are on. The phone keeps them for each User, so that they start as the User left them
// (P06 ticket 03), and they stay as they are while another tab is shown, since the main screen stays mounted.
export interface Layers {
  dining: boolean;
  shuttle: boolean;
  study: boolean;
}

export interface LayerStack {
  layers: Layers;
  open: boolean;
  toggleOpen: () => void;
  close: () => void;
  toggleDining: () => void;
  toggleShuttle: () => void;
  toggleStudy: () => void;
  // Turns the layer on, and leaves it on if it is: a map button of the chat.
  turnOn: (layer: keyof Layers) => void;
}

const ALL_OFF: Layers = { dining: false, shuttle: false, study: false };

function keep(layers: Layers): void {
  // A change the phone failed to keep lasts until the app closes.
  void keepMapLayers(layers).catch(() => null);
}

// The layers as the phone keeps them, and a change of one layer, which the phone keeps. They are off until what was
// kept is read, and nothing is kept before, so that the start's "off" never writes over it; a layer changed meanwhile
// keeps its change, and the others come as kept.
function useKeptLayers(): { layers: Layers; change: (layer: keyof Layers, on: (was: boolean) => boolean) => void } {
  const [layers, setLayers] = useState(ALL_OFF);
  // The layers as last set, for changes made one after another before a render.
  const latest = useRef(ALL_OFF);
  // The layers changed before the read ended, or null once it has.
  const changedEarly = useRef<Set<keyof Layers> | null>(new Set());
  const show = useCallback((next: Layers) => {
    latest.current = next;
    setLayers(next);
  }, []);
  useEffect(() => {
    let mounted = true;
    void readMapLayers().then((kept) => {
      const early = changedEarly.current;
      if (!mounted || early === null) {
        return;
      }
      changedEarly.current = null;
      const next = { ...kept };
      for (const layer of early) {
        next[layer] = latest.current[layer];
      }
      show(next);
      if (early.size > 0) {
        keep(next);
      }
    });
    return (): void => {
      mounted = false;
    };
  }, [show]);
  const change = useCallback(
    (layer: keyof Layers, on: (was: boolean) => boolean) => {
      const was = latest.current[layer];
      const now = on(was);
      if (now === was) {
        return;
      }
      const next = { ...latest.current, [layer]: now };
      show(next);
      if (changedEarly.current === null) {
        keep(next);
      } else {
        changedEarly.current.add(layer);
      }
    },
    [show],
  );
  return { layers, change };
}

// The stack's state. Android's back button closes the stack while the map is `inFront`, before a card under it.
export function useLayerStack(inFront: boolean): LayerStack {
  const [open, setOpen] = useState(false);
  const { layers, change } = useKeptLayers();
  const close = useCallback(() => {
    setOpen(false);
  }, []);
  const turnOn = useCallback(
    (layer: keyof Layers) => {
      change(layer, () => true);
    },
    [change],
  );
  useBackToClose(open && inFront, close, { edge: false });
  return {
    layers,
    open,
    toggleOpen: () => {
      setOpen((now) => !now);
    },
    close,
    toggleDining: () => {
      change('dining', (on) => !on);
    },
    toggleShuttle: () => {
      change('shuttle', (on) => !on);
    },
    toggleStudy: () => {
      change('study', (on) => !on);
    },
    turnOn,
  };
}

interface Toggle {
  label: string;
  icon: IconName;
  tint: string;
  on: boolean;
  onPress: () => void;
}

function LayerToggle({ label, icon, tint, on, onPress }: Toggle): ReactElement {
  const ink = on ? color.onPrimary : color.inkMuted;
  return (
    <Pressable
      accessibilityLabel={`${label} ${on ? '끄기' : '켜기'}`}
      accessibilityRole="togglebutton"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={[styles.tile, { backgroundColor: on ? tint : color.surfaceSubtle }]}
    >
      <Icon color={ink} name={icon} size={22} />
      <Text style={[styles.label, { color: ink }]}>{label}</Text>
      <Text style={[styles.state, { color: ink }, !on && styles.stateOff]}>{on ? 'ON' : 'OFF'}</Text>
    </Pressable>
  );
}

interface LayerControlsProps {
  stack: LayerStack;
}

// The button, navy while the stack is open, with a dot in the colour of each layer that is on.
function LayersButton({
  open,
  on,
  onPress,
}: {
  open: boolean;
  on: readonly Toggle[];
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityLabel="편의기능 (식당 · 셔틀버스 · 공부공간)"
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      aria-expanded={open}
      onPress={onPress}
      style={[styles.button, open && styles.buttonOpen]}
    >
      <Icon color={open ? color.onPrimary : color.snuBlue} name="layers" size={22} />
      <View aria-hidden style={styles.dots}>
        {on.map(({ label, tint }) => (
          <View key={label} style={[styles.dot, { backgroundColor: tint }]} testID="layer-dot" />
        ))}
      </View>
    </Pressable>
  );
}

// The 편의기능 button and the stack of the `MainLayers` frame, which rises above it: the toggles from the bottom up,
// 식당, 셔틀버스 and 공부공간. The menus open from a 식당 pin's 메뉴 보기. A transparent scrim over the map closes it.
export function LayerControls({ stack }: LayerControlsProps): ReactElement {
  const { shown, progress } = useSlide(stack.open);
  const toggles: Toggle[] = [
    { label: '식당', icon: 'meal', tint: color.svcDining, on: stack.layers.dining, onPress: stack.toggleDining },
    { label: '셔틀버스', icon: 'bus', tint: color.svcShuttle, on: stack.layers.shuttle, onPress: stack.toggleShuttle },
    { label: '공부공간', icon: 'bookOpen', tint: color.svcStudy, on: stack.layers.study, onPress: stack.toggleStudy },
  ];
  const rise = progress.interpolate({ inputRange: [0, 1], outputRange: [RISE, 0] });
  return (
    <>
      {stack.open ? (
        <Pressable
          accessibilityLabel="편의기능 레이어 닫기"
          accessibilityRole="button"
          onPress={stack.close}
          style={styles.scrim}
        />
      ) : null}
      {shown ? (
        <Animated.View
          accessibilityLabel="편의기능 레이어"
          role="group"
          style={[styles.stack, { opacity: progress, transform: [{ translateY: rise }] }]}
        >
          {toggles.map((toggle) => (
            <LayerToggle key={toggle.label} {...toggle} />
          ))}
        </Animated.View>
      ) : null}
      <LayersButton on={toggles.filter(({ on }) => on)} onPress={stack.toggleOpen} open={stack.open} />
    </>
  );
}

const RISE = 16;
const TILE = { width: 60, height: 64 } as const;
const DOT = 5;

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill },
  stack: {
    position: 'absolute',
    right: LAYER_STACK.right,
    bottom: LAYER_STACK.bottom,
    flexDirection: 'column-reverse',
    gap: 6,
    padding: 6,
    borderRadius: 20,
    backgroundColor: color.surface,
    boxShadow: shadow.mapCard,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    width: TILE.width,
    height: TILE.height,
    borderRadius: 14,
  },
  label: { fontFamily: font.semiBold, fontSize: 11, lineHeight: 14 },
  state: { fontFamily: font.bold, fontSize: 9, lineHeight: 12, letterSpacing: 0.54, opacity: 0.9 },
  stateOff: { opacity: 0.7 },
  button: {
    position: 'absolute',
    right: LAYERS_BUTTON.right,
    bottom: LAYERS_BUTTON.bottom,
    alignItems: 'center',
    justifyContent: 'center',
    width: LAYERS_BUTTON.size,
    height: LAYERS_BUTTON.size,
    borderRadius: radius.full,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  buttonOpen: { backgroundColor: color.snuBlue },
  dots: {
    position: 'absolute',
    right: 0,
    bottom: 6,
    left: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
    pointerEvents: 'none',
  },
  dot: { width: DOT, height: DOT, borderRadius: radius.full, boxShadow: `0 0 0 1px ${color.surface}` },
});
