/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import {
  createContext,
  type Dispatch,
  type SetStateAction,
  type ReactElement,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { Icon, type IconName } from './icon';
import { color, font, radius, space, text } from './tokens';

// Long enough to read one short sentence: the time the `Main` frame gives its toasts.
const SHOWN_MS = 2400;

// A toast with a link stays longer: the User reads the words, then reaches for the link.
const SHOWN_WITH_LINK_MS = 4000;

const NOT_READY = '준비 중이에요';

// A link at the toast's end to where the result of an action shows, such as "보낸 신청 보기" (HE H11).
export interface ToastLink {
  label: string;
  onPress: () => void;
}

// `shownMs` is how long the words stay. Left out, 2400 ms, or 4000 ms with a link. `icon` is the check mark unless
// given, such as `alert`. `link` is a press at the toast's end, which follows it and closes the toast.
type ShowToast = (message: string, shownMs?: number, icon?: IconName, link?: ToastLink) => void;

interface Shown {
  message: string;
  shownMs: number;
  icon: IconName;
  link: ToastLink | null;
}

interface Toasts {
  show: ShowToast;
  // Says how much of the screen's bottom is taken, by a bottom navigation for example, until the call it gives is
  // made. The toast sits above the latest claim that still holds.
  claim: (height: number) => () => void;
}

const ToastContext = createContext<Toasts | null>(null);

// What a toast stands on, from the screen's bottom: the phone's own bar, none without a provider of it, as in a test.
// While the phone's keyboard is up, the keyboard instead, and the toast is still clear of what was claimed: a form's
// footer rises above the keyboard, and a navigation the keyboard covers only puts the toast that much higher.
function useToastFloor(): number {
  const inset = use(SafeAreaInsetsContext)?.bottom ?? 0;
  const keyboard = useKeyboardHeight(inset);
  return keyboard > 0 ? keyboard : inset;
}

// Takes the toast away once its time is over. A toast shown at the very moment this one ends stays.
function useEndAfterShown(toast: Shown | null, setToast: Dispatch<SetStateAction<Shown | null>>): void {
  useEffect(() => {
    const timer =
      toast === null
        ? null
        : setTimeout(() => {
            setToast((now) => (now === toast ? null : now));
          }, toast.shownMs);
    return (): void => {
      if (timer !== null) {
        clearTimeout(timer);
      }
    };
  }, [toast, setToast]);
}

// Shows one toast at a time over everything it wraps, except an open Dialog, which the phone draws above the app. A
// new toast replaces the one before it. The design system has no toast; the `Main` frame draws one, a dark bar from
// side to side with a check mark before its words and no shadow, and the app adds it in the design system's terms.
export function ToastProvider({ children }: { children: ReactNode }): ReactElement {
  // A new object for every toast, so that the same words shown twice start the time again.
  const [toast, setToast] = useState<Shown | null>(null);
  const [claims, setClaims] = useState<readonly { height: number }[]>([]);
  const taken = claims.at(-1)?.height ?? 0;
  const floor = useToastFloor();
  const show = useCallback<ShowToast>((message, shownMs, icon = 'check', link) => {
    setToast({
      message,
      shownMs: shownMs ?? (link === undefined ? SHOWN_MS : SHOWN_WITH_LINK_MS),
      icon,
      link: link ?? null,
    });
    // iOS has no live regions: the words are announced by hand. Android reads the live region below.
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }, []);
  useEndAfterShown(toast, setToast);
  const claim = useCallback((height: number) => {
    const mine = { height };
    setClaims((now) => [...now, mine]);
    return (): void => {
      setClaims((now) => now.filter((other) => other !== mine));
    };
  }, []);
  const toasts = useMemo(() => ({ show, claim }), [show, claim]);
  return (
    <ToastContext value={toasts}>
      {children}
      {toast === null ? null : (
        <ToastBar
          bottom={floor + taken + space[6]}
          onFollow={() => {
            setToast(null);
          }}
          toast={toast}
        />
      )}
    </ToastContext>
  );
}

// The bar itself, `bottom` from the screen's bottom: the words, and the link when the toast has one.
function ToastBar({ toast, bottom, onFollow }: { toast: Shown; bottom: number; onFollow: () => void }): ReactElement {
  return (
    <View
      style={[styles.layer, toast.link === null ? styles.untouched : styles.linked, { bottom }]}
      testID="toast-layer"
    >
      <View style={styles.toast}>
        <View accessibilityLiveRegion="polite" accessibilityRole="alert" accessible style={styles.message}>
          <Icon color={color.onPrimary} name={toast.icon} size={ICON} />
          <Text style={styles.words}>{toast.message}</Text>
        </View>
        {toast.link === null ? null : <Link link={toast.link} onFollow={onFollow} />}
      </View>
    </View>
  );
}

// The link at the toast's end: the words in the key colour's light tint, 44 high to be pressed.
function Link({ link, onFollow }: { link: ToastLink; onFollow: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={LINK_SLOP}
      onPress={() => {
        onFollow();
        link.onPress();
      }}
      style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
    >
      <Text style={styles.linkWords}>{link.label}</Text>
    </Pressable>
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

// For a screen with something fixed to its bottom, such as the bottom navigation: while the screen is shown and
// `active`, a toast sits above that height. A screen that stays mounted behind another, such as a tab, passes whether
// it is the one in front. A screen without it calls nothing, and a toast sits just above the phone's own bar.
export function useToastAbove(height: number, active = true): void {
  const { claim } = useToasts();
  useEffect(() => (active ? claim(height) : undefined), [height, active, claim]);
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
// The link's words are 20 high; the slop makes its press 44 high, like the design system's smallest control.
const LINK_SLOP = { top: 12, bottom: 12 };

const styles = StyleSheet.create({
  // Its distance from the bottom is set where it is drawn. The bar runs from side to side.
  layer: {
    position: 'absolute',
    right: space[4],
    left: space[4],
  },
  // Without a link, a press goes through the toast to what is under it; with one, only the link takes it.
  untouched: { pointerEvents: 'none' },
  linked: { pointerEvents: 'box-none' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    backgroundColor: color.ink,
  },
  message: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: GAP },
  // The frame's words are the label's size in the medium weight.
  words: { ...text.label, flexShrink: 1, fontFamily: font.medium, color: color.onPrimary },
  link: { paddingHorizontal: space[1], borderRadius: radius.sm },
  linkPressed: { opacity: 0.6 },
  linkWords: { ...text.label, fontFamily: font.semiBold, color: color.blue100 },
});
