/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useEffect, useEffectEvent, useRef } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
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

// The full-screen login: the school's own login page in a visible web view. The User types the password there, into
// the library's page. The only script the view gives a page is the style sheet that fits the login form to the phone
// (`login-fit.ts`), and the view takes no messages, so the app never sees the password. Once the view is back
// on the site's main, booking or my-booking screen, the login is done and the session stays in the web view's own
// cookie jar. Reaching those screens is not enough by itself: the login is done only when a check finds the session
// works; otherwise the view stays open and asks again on the next of those screens. ✕ is "no session"; after five
// minutes the view closes as failed.
export function LibraryLogin({ visible, onDone, onLanded, onLeft }: LibraryLoginProps): ReactElement {
  const finish = useFinish(visible, onDone);
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
          <WebView
            incognito={false}
            injectedJavaScript={LOGIN_FIT_SCRIPT}
            injectedJavaScriptBeforeContentLoaded={LOGIN_FIT_SCRIPT}
            onNavigationStateChange={(navigation) => {
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
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  note: { ...text.caption, color: color.inkMuted, paddingHorizontal: space[5], paddingVertical: space[2] },
  web: { flex: 1 },
});
