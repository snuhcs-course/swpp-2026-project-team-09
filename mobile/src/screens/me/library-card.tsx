/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, cardStyles, color, Icon, ListRow, space } from '@/design-system';
import { useLibrarySession } from '@/library/library-session';

// The row "관정도서관 로그인": 로그아웃 while the library's "logged in" flag is set, which ends the library session at the
// library and in the web views' cookie jar, and 로그인 otherwise.
export function LibraryCard(): ReactElement {
  const { loggedIn, logIn, logOut } = useLibrarySession();
  const [busy, setBusy] = useState(false);
  return (
    <View style={[cardStyles.card, styles.card]}>
      <ListRow
        leading={<Icon color={color.inkMuted} name="book" size={20} />}
        lines={[loggedIn ? '로그인됨' : '로그인하지 않음']}
        title="관정도서관 로그인"
        trailing={
          <Button
            disabled={busy}
            onPress={() => {
              setBusy(true);
              void (loggedIn ? logOut() : logIn())
                .catch(() => null)
                .finally(() => {
                  setBusy(false);
                });
            }}
            variant="secondary"
          >
            {loggedIn ? '로그아웃' : '로그인'}
          </Button>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: space[1] },
});
