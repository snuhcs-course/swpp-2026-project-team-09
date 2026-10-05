import { createContext, type ReactElement, type ReactNode, use, useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from 'react-native';
import { color, radius, shadow, size, space, text } from './tokens';

// Long enough to read one short sentence.
const SHOWN_MS = 2400;

const NOT_READY = '준비 중이에요';

type ShowToast = (message: string) => void;

const ToastContext = createContext<ShowToast | null>(null);

// Shows one toast at a time over everything it wraps, except an open Dialog, which the phone draws above the app. A new toast replaces the one before it. The design system has
// no toast; the wireframes use one, so the app adds it in the design system's terms.
export function ToastProvider({ children }: { children: ReactNode }): ReactElement {
  // A new object for every toast, so that the same words shown twice start the time again.
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const show = useCallback<ShowToast>((message) => {
    setToast({ message });
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
            setToast(null);
          }, SHOWN_MS);
    return (): void => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [toast]);
  return (
    <ToastContext value={show}>
      {children}
      {toast === null ? null : (
        <View style={styles.layer}>
          <View accessibilityLiveRegion="polite" accessibilityRole="alert" accessible style={styles.toast}>
            <Text style={styles.words}>{toast.message}</Text>
          </View>
        </View>
      )}
    </ToastContext>
  );
}

// Gives the call that shows a toast.
export function useToast(): ShowToast {
  const show = use(ToastContext);
  if (show === null) {
    throw new Error('useToast must be used inside a ToastProvider');
  }
  return show;
}

// Gives the call for a control whose feature belongs to another task: it says that the feature is not ready.
export function useNotReadyToast(): () => void {
  const show = useToast();
  return useCallback(() => {
    show(NOT_READY);
  }, [show]);
}

const styles = StyleSheet.create({
  // Above the bottom navigation.
  layer: {
    position: 'absolute',
    right: space[4],
    bottom: size.bottomNav + space[6],
    left: space[4],
    alignItems: 'center',
    pointerEvents: 'none',
  },
  toast: {
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    backgroundColor: color.ink,
    boxShadow: shadow.float,
  },
  words: { ...text.label, color: color.onPrimary, textAlign: 'center' },
});
