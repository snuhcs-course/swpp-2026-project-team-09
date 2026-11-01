/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type ReactElement, useEffect, useEffectEvent, useRef } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { AppBar, color } from '@/design-system';
import type { LoginOutcome } from './client';
import { isLoginDone, LIBRARY_MAIN_URL } from './site';

// How long the User has to log in before the view closes by itself.
export const LOGIN_LIMIT_MS = 5 * 60 * 1000;

interface LibraryLoginProps {
  visible: boolean;
  onDone: (outcome: LoginOutcome) => void;
  // Whether the session works, asked once the view is back on the site's screens (`loginWorks`).
  check: () => Promise<boolean>;
}

// Ends the login once, with the first of the User's ✕, the done page and the five minutes.
function useFinish(visible: boolean, onDone: (outcome: LoginOutcome) => void): (outcome: LoginOutcome) => void {
  const finished = useRef(false);
  const finish = useEffectEvent((outcome: LoginOutcome) => {
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

// Asks `check` once at a time, and ends the login as logged in only when it says the session works.
function useCheckThenFinish(check: () => Promise<boolean>, finish: (outcome: LoginOutcome) => void): () => void {
  const checking = useRef(false);
  return (): void => {
    if (checking.current) {
      return;
    }
    checking.current = true;
    void check().then(
      (works) => {
        checking.current = false;
        if (works) {
          finish('loggedIn');
        }
      },
      () => {
        checking.current = false;
      },
    );
  };
}

// The full-screen login: the school's own login page in a visible web view. The User types the password there, into
// the library's page; no script is injected into any of its pages, so the app never sees it. Once the view is back
// on the site's main, booking or my-booking screen, the login is done and the session stays in the web view's own
// cookie jar. Reaching those screens is not enough by itself: the login is done only when `check` finds the session
// works; otherwise the view stays open and asks again on the next of those screens. ✕ is "no session"; after five
// minutes the view closes as failed.
export function LibraryLogin({ visible, onDone, check }: LibraryLoginProps): ReactElement {
  const finish = useFinish(visible, onDone);
  const checkThenFinish = useCheckThenFinish(check, finish);
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
        {visible ? (
          <WebView
            incognito={false}
            onNavigationStateChange={(navigation) => {
              if (!navigation.loading && isLoginDone(navigation.url)) {
                checkThenFinish();
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
  web: { flex: 1 },
});
