/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type ReactElement, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { HiddenViewTransport } from './hidden-transport';
import { LIBRARY_MAIN_URL } from './site';

interface HiddenLibraryViewProps {
  transport: HiddenViewTransport;
}

// The hidden web view every library call runs in, mounted at the app's root while the "logged in" flag is set. It has
// no size and opens the site's main page, so that the injected script runs on the library's origin and the browser
// sends the session cookie itself. It uses the default, persistent store (not `incognito`), the one the login's web
// view shares. Its only script is the fixed one the transport injects per call.
export function HiddenLibraryView({ transport }: HiddenLibraryViewProps): ReactElement {
  const view = useRef<WebView>(null);
  // A new round mounts the web view again, so that the same address loads again too.
  const [page, setPage] = useState({ uri: LIBRARY_MAIN_URL, round: 0 });
  useEffect(() => {
    transport.attach({
      inject: (script): void => {
        view.current?.injectJavaScript(script);
      },
      load: (url): void => {
        setPage(({ round }) => ({ uri: url, round: round + 1 }));
      },
    });
    return (): void => {
      transport.detach();
    };
  }, [transport]);
  return (
    <View pointerEvents="none" style={styles.hidden} testID="library-hidden-view">
      <WebView
        incognito={false}
        javaScriptEnabled
        onError={() => {
          transport.loadFailed();
        }}
        onLoadEnd={(event) => {
          if (!event.nativeEvent.loading) {
            transport.loaded(event.nativeEvent.url);
          }
        }}
        onMessage={(event) => {
          transport.received(event.nativeEvent.data, event.nativeEvent.url);
        }}
        key={page.round}
        ref={view}
        source={{ uri: page.uri }}
        style={styles.hidden}
        testID="library-hidden-web-view"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 0, height: 0, opacity: 0 },
});
