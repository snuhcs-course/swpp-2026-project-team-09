/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 ******************************************************************************/

import { type ReactElement, useEffect, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  closeUatAccounts,
  UAT_ACCOUNTS,
  uatAccountsAsked,
  pickUatAccount,
  watchUatAccounts,
} from '@/auth/uat-accounts';
import { Avatar, BottomSheet, color, font, ListRow, space } from '@/design-system';

// The UAT branch's sheet in place of Google's: the UAT accounts, each by its letter and name. It opens while the
// sign-in asks for an account.
export function UatAccountSheet(): ReactElement {
  const open = useSyncExternalStore(watchUatAccounts, uatAccountsAsked);
  // A sign-in screen that goes away leaves no ask waiting.
  useEffect(() => closeUatAccounts, []);
  return (
    <BottomSheet label="계정 고르기" onClose={closeUatAccounts} open={open}>
      <View style={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>
          계정 고르기
        </Text>
        <View>
          {UAT_ACCOUNTS.map(({ key, role, name }) => (
            <ListRow
              key={key}
              label={`${role} · ${name}`}
              leading={<Avatar name={name} />}
              onPress={() => {
                pickUatAccount(key);
              }}
              title={`${role} · ${name}`}
            />
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[2], paddingHorizontal: space[4] },
  title: { fontFamily: font.bold, fontSize: 18, lineHeight: 26, color: color.ink },
});
