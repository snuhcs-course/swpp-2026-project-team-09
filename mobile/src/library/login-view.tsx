/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useEffect, useEffectEvent, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, type TextStyle, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { AppBar, color, font, radius, space, text } from '@/design-system';
import { seeThrough } from '@/design-system/see-through';
import type { LoginOutcome } from './client';
import { alertWords, LOGIN_PAGE_SCRIPT } from './login-alert';
import { isLoginDone, LIBRARY_MAIN_URL } from './site';

// How long the User has to log in before the view closes by itself.
export const LOGIN_LIMIT_MS = 5 * 60 * 1000;

interface LibraryLoginProps {
  visible: boolean;
  // The view closed without a session: ✕, or the five minutes.
  onDone: (outcome: Exclude<LoginOutcome, 'loggedIn'>) => void;
  // The view is back on the site's main, booking or my-booking screen, where the provider checks the session
  // (`login-checks.ts`) and closes the view once it works.
  onLanded: () => void;
  // The view went off the site's screens, as to the school's login.
  onLeft: () => void;
  // A check of the session runs (`login-checks.ts`).
  checking: boolean;
}

// Closes the login once, with the first of the User's ✕ and the five minutes.
type Closed = Exclude<LoginOutcome, 'loggedIn'>;

function useFinish(visible: boolean, onDone: (outcome: Closed) => void): (outcome: Closed) => void {
  const finished = useRef(false);
  const finish = useEffectEvent((outcome: Closed) => {
    if (!finished.current) {
      finished.current = true;
      onDone(outcome);
    }
  });
  useEffect((): (() => void) | void => {
    if (!visible) {
      return;
    }
    finished.current = false;
    const timer = setTimeout(() => {
      finish('failed');
    }, LOGIN_LIMIT_MS);
    return (): void => {
      clearTimeout(timer);
    };
  }, [visible]);
  return finish;
}

const COVER_WORDS = '로그인하는 중이에요';

// The longest the cover stays over one way back. Past it, a way back that stalled shows the site's page, under the bar
// with ✕, so that the User is never left behind the cover.
export const COVER_LIMIT_MS = 15_000;

// Lifts the cover `COVER_LIMIT_MS` after a way back began.
function useCoverLimit(returning: boolean, lift: (lifted: true) => void): void {
  useEffect((): (() => void) | void => {
    if (!returning) {
      return;
    }
    const timer = setTimeout(() => {
      lift(true);
    }, COVER_LIMIT_MS);
    return (): void => {
      clearTimeout(timer);
    };
  }, [returning, lift]);
}

// Whether the view is on its way back from the school's login (P01 ticket 13): from the moment it starts loading the
// site's main, booking or my-booking screen after a page off them, until it leaves them again. Its page is then covered
// while it loads and while a check runs, so that the site's own page never shows between the login and the close. Each
// login view opened starts afresh. `lifted`: the cover is off for this way back, since it has lasted `COVER_LIMIT_MS`
// or the page raised an alert (`lift`).
function useReturning(visible: boolean): {
  returning: boolean;
  landedOn: boolean;
  lifted: boolean;
  lift: () => void;
  went: (url: string, loading: boolean) => void;
} {
  const away = useRef(false);
  const [returning, setReturning] = useState(false);
  const [landedOn, setLandedOn] = useState(false);
  const [lifted, setLifted] = useState(false);
  useEffect(() => {
    if (visible) {
      away.current = false;
      setReturning(false);
      setLandedOn(false);
      setLifted(false);
    }
  }, [visible]);
  useCoverLimit(returning, setLifted);
  return {
    returning,
    landedOn,
    lifted,
    lift: () => {
      setLifted(true);
    },
    went: (url, loading) => {
      if (!isLoginDone(url)) {
        away.current = true;
        setReturning(false);
        setLifted(false);
        return;
      }
      if (away.current) {
        setReturning(true);
      }
      setLandedOn(!loading);
    },
  };
}

// The line a page's alert leaves under the notice (P01 ticket 14). It goes when the User touches the page, as to edit
// the fields or send the form again, when a way back from the school's login begins, and with each login view opened.
function useSaid(visible: boolean, returning: boolean): { said: string | null; say: (words: string | null) => void } {
  const [said, say] = useState<string | null>(null);
  useEffect(() => {
    if (visible) {
      say(null);
    }
  }, [visible]);
  useEffect(() => {
    if (returning) {
      say(null);
    }
  }, [returning]);
  return { said, say };
}

function SaidLine({ said }: { said: string | null }): ReactElement | null {
  return said === null ? null : (
    <Text numberOfLines={1} style={styles.said} testID="library-login-said">
      {said}
    </Text>
  );
}

// The library's page in the web view, the cover over it while the view comes back from the school's login, and the
// line of a page's alert.
function LoginPage({
  covered,
  said,
  went,
  onAlert,
  onTouched,
  onLanded,
  onLeft,
}: Pick<LibraryLoginProps, 'onLanded' | 'onLeft'> & {
  covered: boolean;
  said: string | null;
  went: (url: string, loading: boolean) => void;
  onAlert: (words: string) => void;
  onTouched: () => void;
}): ReactElement {
  return (
    <View onTouchStart={onTouched} style={styles.web} testID="library-login-page">
      <WebView
        incognito={false}
        injectedJavaScript={LOGIN_PAGE_SCRIPT}
        injectedJavaScriptBeforeContentLoaded={LOGIN_PAGE_SCRIPT}
        onMessage={({ nativeEvent }) => {
          const words = alertWords(nativeEvent.data, nativeEvent.url);
          if (words !== null) {
            onAlert(words);
          }
        }}
        onNavigationStateChange={(navigation) => {
          went(navigation.url, navigation.loading);
          if (!isLoginDone(navigation.url)) {
            onLeft();
          } else if (!navigation.loading) {
            onLanded();
          }
        }}
        source={{ uri: LIBRARY_MAIN_URL }}
        style={styles.web}
        testID="library-login-view"
      />
      {covered ? (
        <View style={styles.cover} testID="library-login-cover">
          <Text numberOfLines={1} style={styles.coverWords}>
            {COVER_WORDS}
          </Text>
        </View>
      ) : null}
      <SaidLine said={said} />
    </View>
  );
}

// The full-screen login: the school's own login page in a visible web view. The User types the password there, into
// the library's page. The view gives a page two scripts: the style sheet that fits the login form to the phone
// (`login-fit.ts`), and the one that turns the school's pages' alerts into a line of the app (`login-alert.ts`).
// Neither reads the page, and the view takes no message but an alert's words, so the app never sees the password. Once
// the view is back on the site's main, booking or my-booking screen, the login is done and the session stays in the web
// view's own cookie jar. Reaching those screens is not enough by itself: the login is done only when a check finds the
// session works; otherwise the view stays open and asks again on the next of those screens. ✕ is "no session"; after
// five minutes the view closes as failed. Back from the school's login, a cover hides the site's page until the check
// ends, for 15 seconds at most.
export function LibraryLogin({ visible, onDone, onLanded, onLeft, checking }: LibraryLoginProps): ReactElement {
  const finish = useFinish(visible, onDone);
  const back = useReturning(visible);
  const covered = back.returning && !back.lifted && (!back.landedOn || checking);
  const { said, say } = useSaid(visible, back.returning);
  return (
    <Modal
      animationType="slide"
      onRequestClose={() => {
        finish('noSession');
      }}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <View style={styles.screen}>
        <AppBar
          leave={{
            kind: 'close',
            onPress: () => {
              finish('noSession');
            },
          }}
          title="관정도서관 로그인"
        />
        <Text style={styles.note}>아이디와 비밀번호는 도서관 로그인 페이지로만 전달돼요</Text>
        {visible ? (
          <LoginPage
            covered={covered}
            onAlert={(words) => {
              say(words);
              back.lift();
            }}
            onLanded={onLanded}
            onLeft={onLeft}
            onTouched={() => {
              say(null);
            }}
            said={said}
            went={back.went}
          />
        ) : null}
      </View>
    </Modal>
  );
}

// The look of the app's hints: one line in a see-through pill.
const PILL: TextStyle = {
  ...text.label,
  overflow: 'hidden',
  paddingVertical: space[2],
  paddingHorizontal: space[4],
  borderRadius: radius.full,
  fontFamily: font.semiBold,
  color: color.surface,
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  note: { ...text.caption, color: color.inkMuted, paddingHorizontal: space[5], paddingVertical: space[2] },
  web: { flex: 1 },
  // Over the web view, under the bar and its note.
  cover: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
  },
  coverWords: { ...PILL, backgroundColor: seeThrough(color.ink, 0.62) },
  // Just under the notice, over the page's top, letting touches through to the page. The danger colour is less
  // see-through than a hint's ink, so that the white words stay readable on it.
  said: {
    ...PILL,
    position: 'absolute',
    top: space[2],
    alignSelf: 'center',
    maxWidth: '92%',
    pointerEvents: 'none',
    backgroundColor: seeThrough(color.danger, 0.88),
  },
});
