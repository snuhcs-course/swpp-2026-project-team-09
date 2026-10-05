import {
  createContext,
  type ReactElement,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Icon } from './icon';
import { color, font, radius, space, text } from './tokens';

// Long enough to read one short sentence: the time the `Main` frame gives its toasts.
const SHOWN_MS = 2400;

const NOT_READY = '준비 중이에요';

// `shownMs` is how long the words stay. Left out, 2400 ms.
type ShowToast = (message: string, shownMs?: number) => void;

interface Toasts {
  show: ShowToast;
  // Says how much of the screen's bottom is taken, by a bottom navigation for example. The toast sits above it.
  setTaken: (height: number) => void;
}

const ToastContext = createContext<Toasts | null>(null);

// Shows one toast at a time over everything it wraps, except an open Dialog, which the phone draws above the app. A
// new toast replaces the one before it. The design system has no toast; the `Main` frame draws one, a dark bar from
// side to side with a check mark before its words and no shadow, and the app adds it in the design system's terms.
export function ToastProvider({ children }: { children: ReactNode }): ReactElement {
  // A new object for every toast, so that the same words shown twice start the time again.
  const [toast, setToast] = useState<{ message: string; shownMs: number } | null>(null);
  const [taken, setTaken] = useState(0);
  // The phone's own bar at the bottom. Without a provider of it, as in a test, there is none.
  const inset = use(SafeAreaInsetsContext)?.bottom ?? 0;
  const show = useCallback<ShowToast>((message, shownMs = SHOWN_MS) => {
    setToast({ message, shownMs });
    // iOS has no live regions: the words are announced by hand. Android reads the live region below.
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, []);
  useEffect(() => {
    const timer =
      toast === null
        ? null
        : setTimeout(() => {
            // A toast shown at the very moment this one ends stays.
            setToast((now) => (now === toast ? null : now));
          }, toast.shownMs);
    return (): void => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [toast]);
  const toasts = useMemo(() => ({ show, setTaken }), [show]);
  return (
    <ToastContext value={toasts}>
      {children}
      {toast === null ? null : (
        <View style={[styles.layer, { bottom: inset + taken + space[6] }]} testID="toast-layer">
          <View accessibilityLiveRegion="polite" accessibilityRole="alert" accessible style={styles.toast}>
            <Icon color={color.onPrimary} name="check" size={ICON} />
            <Text style={styles.words}>{toast.message}</Text>
          </View>
        </View>
      )}
    </ToastContext>
  );
}

// Gives the call that shows a toast.
function useToasts(): Toasts {
  const toasts = use(ToastContext);
  if (toasts === null) {
    throw new Error('A toast must be used inside a ToastProvider');
  }
  return toasts;
}

export function useToast(): ShowToast {
  return useToasts().show;
}

// For a screen with something fixed to its bottom, such as the bottom navigation: while the screen is shown, a toast
// sits above that height. A screen without it calls nothing, and a toast sits just above the phone's own bar.
export function useToastAbove(height: number): void {
  const { setTaken } = useToasts();
  useEffect(() => {
    setTaken(height);
    return (): void => {
      setTaken(0);
    };
  }, [height, setTaken]);
}

// Gives the call for a control whose feature belongs to another task: it says that the feature is not ready.
export function useNotReadyToast(): () => void {
  const show = useToast();
  return useCallback(() => {
    show(NOT_READY);
  }, [show]);
}

const ICON = 18;
const GAP = 10;

const styles = StyleSheet.create({
  // Its distance from the bottom is set where it is drawn. The bar runs from side to side.
  layer: {
    position: 'absolute',
    right: space[4],
    left: space[4],
    pointerEvents: 'none',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    backgroundColor: color.ink,
  },
  // The frame's words are the label's size in the medium weight.
  words: { ...text.label, flexShrink: 1, fontFamily: font.medium, color: color.onPrimary },
});
