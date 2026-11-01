/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type ReactElement, type Ref, useEffect, useImperativeHandle, useState } from 'react';
import { View } from 'react-native';
import type { WebViewProps } from 'react-native-webview';

// A stand-in for `react-native-webview`, which needs the native view. Each mounted web view is listed with its props
// and the scripts injected into it, so that a test can play the page's events (a load, a navigation, a message).
// Every test gets it from the shared Jest setup (`jest-setup.ts`).

export interface ShownWebView {
  props: WebViewProps;
  injected: string[];
  mounted: boolean;
}

export const shownWebViews: ShownWebView[] = [];

export function forgetWebViews(): void {
  shownWebViews.length = 0;
}

// The web view whose page is this address, most recent first.
export function webViewAt(uri: string): ShownWebView | undefined {
  return shownWebViews.findLast(
    (shown) =>
      shown.mounted &&
      typeof shown.props.source === 'object' &&
      'uri' in shown.props.source &&
      shown.props.source.uri === uri,
  );
}

interface Handle {
  injectJavaScript: (script: string) => void;
  stopLoading: () => void;
}

function StubWebView({ ref, ...props }: WebViewProps & { ref?: Ref<Handle> }): ReactElement {
  const [shown] = useState<ShownWebView>(() => ({ props, injected: [], mounted: true }));
  shown.props = props;
  useImperativeHandle(
    ref,
    () => ({
      injectJavaScript: (script: string): void => {
        shown.injected.push(script);
      },
      stopLoading: (): void => undefined,
    }),
    [shown],
  );
  useEffect(() => {
    shownWebViews.push(shown);
    return (): void => {
      shown.mounted = false;
    };
  }, [shown]);
  return <View testID={props.testID} />;
}

export const webViewModule = { WebView: StubWebView, default: StubWebView };
