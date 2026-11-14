/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { setStringAsync } from 'expo-clipboard';
import { type ReactElement, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, color, space, text } from '@/design-system';
import { askPushPermission, expoPushToken, type PushPermission, pushPermission } from '@/push/device';

interface Check {
  permission: PushPermission | 'checking';
  token: string | null;
}

async function read(): Promise<Check> {
  const permission = await pushPermission();
  return { permission, token: permission === 'granted' ? await expoPushToken() : null };
}

// The development screen of push: the permission, a button that asks for it, and the phone's Expo push token, to
// send a test push to from Expo's push tool. The token is never pasted into issues, pull requests or chats.
export function PushCheckScreen(): ReactElement {
  const [state, setState] = useState<Check>({ permission: 'checking', token: null });

  useEffect(() => {
    void read().then(setState);
  }, []);

  const ask = async (): Promise<void> => {
    setState({ permission: 'checking', token: null });
    await askPushPermission();
    setState(await read());
  };

  const { permission, token } = state;
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>푸시 확인</Text>
        <Text style={styles.line}>{`권한: ${permission}`}</Text>
        <Button onPress={() => void ask()} variant="primary" disabled={permission === 'checking'}>
          권한 요청
        </Button>
        {permission === 'granted' && (
          <Text selectable style={styles.token}>
            {token ?? '토큰을 받지 못했어요 (오프라인이거나 Google Play 서비스가 없어요)'}
          </Text>
        )}
        {token !== null && (
          <Button onPress={() => void setStringAsync(token)} variant="secondary">
            토큰 복사
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  content: { padding: space[4], gap: space[3] },
  title: { ...text.title, color: color.ink },
  line: { ...text.body, color: color.ink },
  token: { ...text.caption, color: color.inkMuted },
});
