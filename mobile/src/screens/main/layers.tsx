/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useCallback, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, Icon, type IconName, radius, shadow, useSlide } from '@/design-system';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { LAYER_STACK, LAYERS_BUTTON } from './layout';

// The layers of the map that are on. They start off when the app starts and stay as they are while another tab is
// shown, since the main screen stays mounted.
export interface Layers {
  dining: boolean;
  shuttle: boolean;
}

export interface LayerStack {
  layers: Layers;
  open: boolean;
  toggleOpen: () => void;
  close: () => void;
  toggleDining: () => void;
  toggleShuttle: () => void;
}

// The stack's state. Android's back button closes the stack while the map is `inFront`, before a card under it.
export function useLayerStack(inFront: boolean): LayerStack {
  const [open, setOpen] = useState(false);
  const [layers, setLayers] = useState<Layers>({ dining: false, shuttle: false });
  const close = useCallback(() => {
    setOpen(false);
  }, []);
  useBackToClose(open && inFront, close);
  return {
    layers,
    open,
    toggleOpen: () => {
      setOpen((now) => !now);
    },
    close,
    toggleDining: () => {
      setLayers((now) => ({ ...now, dining: !now.dining }));
    },
    toggleShuttle: () => {
      setLayers((now) => ({ ...now, shuttle: !now.shuttle }));
    },
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
  onMenus: () => void;
  // How much higher than its place the button stands, with the stack over it: above the shuttle's notice.
  lift?: number;
}

function MenuTile({ onPress }: { onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel="메뉴 보기"
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.tile, styles.menus]}
    >
      <Icon color={color.svcDining} name="meal" size={22} />
      <Text style={[styles.label, { color: color.svcDining }]}>메뉴</Text>
    </Pressable>
  );
}

// The button, navy while the stack is open, with a dot in the colour of each layer that is on.
function LayersButton({
  open,
  on,
  lift,
  onPress,
}: {
  open: boolean;
  on: readonly Toggle[];
  lift: number;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityLabel="편의기능 (식당 · 셔틀버스)"
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      aria-expanded={open}
      onPress={onPress}
      style={[styles.button, { bottom: LAYERS_BUTTON.bottom + lift }, open && styles.buttonOpen]}
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
// 식당 then 셔틀버스, and the 메뉴 tile, which opens the menu panel. A transparent scrim over the map closes it.
export function LayerControls({ stack, onMenus, lift = 0 }: LayerControlsProps): ReactElement {
  const { shown, progress } = useSlide(stack.open);
  const toggles: Toggle[] = [
    { label: '식당', icon: 'meal', tint: color.svcDining, on: stack.layers.dining, onPress: stack.toggleDining },
    { label: '셔틀버스', icon: 'bus', tint: color.svcShuttle, on: stack.layers.shuttle, onPress: stack.toggleShuttle },
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
          style={[
            styles.stack,
            { bottom: LAYER_STACK.bottom + lift, opacity: progress, transform: [{ translateY: rise }] },
          ]}
        >
          {toggles.map((toggle) => (
            <LayerToggle key={toggle.label} {...toggle} />
          ))}
          <MenuTile
            onPress={() => {
              stack.close();
              onMenus();
            }}
          />
        </Animated.View>
      ) : null}
      <LayersButton lift={lift} on={toggles.filter(({ on }) => on)} onPress={stack.toggleOpen} open={stack.open} />
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
  menus: { backgroundColor: color.svcDiningSoft },
  label: { fontFamily: font.semiBold, fontSize: 11, lineHeight: 14 },
  state: { fontFamily: font.bold, fontSize: 9, lineHeight: 12, letterSpacing: 0.54, opacity: 0.9 },
  stateOff: { opacity: 0.7 },
  button: {
    position: 'absolute',
    right: LAYERS_BUTTON.right,
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
