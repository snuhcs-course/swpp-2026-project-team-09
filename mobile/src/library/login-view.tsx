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
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { AppBar, color, space, text } from '@/design-system';
import type { LoginOutcome } from './client';
import { LOGIN_FIT_SCRIPT } from './login-fit';
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

// Whether the view is on its way back from the school's login (P01 ticket 13): from the moment it starts loading the
// site's main, booking or my-booking screen after a page off them, until it leaves them again. Its page is then covered
// while it loads and while a check runs, so that the site's own page never shows between the login and the close. Each
// login view opened starts afresh.
function useReturning(visible: boolean): {
  returning: boolean;
  landedOn: boolean;
  went: (url: string, loading: boolean) => void;
} {
  const away = useRef(false);
  const [returning, setReturning] = useState(false);
  const [landedOn, setLandedOn] = useState(false);
  useEffect(() => {
    if (visible) {
      away.current = false;
      setReturning(false);
      setLandedOn(false);
    }
  }, [visible]);
  return {
    returning,
    landedOn,
    went: (url, loading) => {
      if (!isLoginDone(url)) {
        away.current = true;
        setReturning(false);
        return;
      }
      if (away.current) {
        setReturning(true);
      }
      setLandedOn(!loading);
    },
  };
}

// The library's page in the web view, and the cover over it while the view comes back from the school's login.
function LoginPage({
  covered,
  went,
  onLanded,
  onLeft,
}: Pick<LibraryLoginProps, 'onLanded' | 'onLeft'> & {
  covered: boolean;
  went: (url: string, loading: boolean) => void;
}): ReactElement {
  return (
    <View style={styles.web}>
      <WebView
        incognito={false}
        injectedJavaScript={LOGIN_FIT_SCRIPT}
        injectedJavaScriptBeforeContentLoaded={LOGIN_FIT_SCRIPT}
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
          <ActivityIndicator color={color.snuBlue} />
          <Text style={styles.coverWords}>{COVER_WORDS}</Text>
        </View>
      ) : null}
    </View>
  );
}

// The full-screen login: the school's own login page in a visible web view. The User types the password there, into
// the library's page. The only script the view gives a page is the style sheet that fits the login form to the phone
// (`login-fit.ts`), and the view takes no messages, so the app never sees the password. Once the view is back
// on the site's main, booking or my-booking screen, the login is done and the session stays in the web view's own
// cookie jar. Reaching those screens is not enough by itself: the login is done only when a check finds the session
// works; otherwise the view stays open and asks again on the next of those screens. ✕ is "no session"; after five
// minutes the view closes as failed. Back from the school's login, a cover hides the site's page until the check ends.
export function LibraryLogin({ visible, onDone, onLanded, onLeft, checking }: LibraryLoginProps): ReactElement {
  const finish = useFinish(visible, onDone);
  const back = useReturning(visible);
  const covered = back.returning && (!back.landedOn || checking);
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
        {visible ? <LoginPage covered={covered} onLanded={onLanded} onLeft={onLeft} went={back.went} /> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  note: { ...text.caption, color: color.inkMuted, paddingHorizontal: space[5], paddingVertical: space[2] },
  web: { flex: 1 },
  // Over the web view, under the bar and its note.
  cover: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    backgroundColor: color.surface,
  },
  coverWords: { ...text.body, color: color.ink },
});
