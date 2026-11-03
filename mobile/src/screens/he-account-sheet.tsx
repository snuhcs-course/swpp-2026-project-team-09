/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type ReactElement, useEffect, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { closeHeAccounts, HE_ACCOUNTS, heAccountsAsked, pickHeAccount, watchHeAccounts } from '@/auth/he-accounts';
import { Avatar, BottomSheet, color, font, ListRow, space } from '@/design-system';

// The HE branch's sheet in place of Google's (P15): the seven HE accounts, each by its role and name. It opens while
// the sign-in asks for an account.
export function HeAccountSheet(): ReactElement {
  const open = useSyncExternalStore(watchHeAccounts, heAccountsAsked);
  // A sign-in screen that goes away leaves no ask waiting.
  useEffect(() => closeHeAccounts, []);
  return (
    <BottomSheet label="계정 고르기" onClose={closeHeAccounts} open={open}>
      <View style={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>
          계정 고르기
        </Text>
        <View>
          {HE_ACCOUNTS.map(({ key, role, name }) => (
            <ListRow
              key={key}
              label={`${role} · ${name}`}
              leading={<Avatar name={name} />}
              onPress={() => {
                pickHeAccount(key);
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
