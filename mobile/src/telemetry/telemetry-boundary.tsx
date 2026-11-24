/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Component, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { color, EmptyState } from '@/design-system';
import { reportError } from './sentry';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

// Around the app's screens in the root layout. A screen that throws while drawing shows "문제가 생겼어요" in place of
// a white screen, with "다시 시도", which draws the screens again. The Stack is drawn anew, so they start from the start
// screen, as a start of the app does. The error is reported once, when it is caught.
export class TelemetryBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    reportError(error, 'screen');
  }

  render(): ReactNode {
    if (!this.state.failed) {
      return this.props.children;
    }
    return (
      <View style={styles.screen}>
        <EmptyState
          action={{
            label: '다시 시도',
            onPress: () => {
              this.setState({ failed: false });
            },
          }}
          icon="alert"
          words="문제가 생겼어요"
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', backgroundColor: color.surface },
});
