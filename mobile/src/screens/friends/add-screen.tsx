/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-28  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { type ReactElement, type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '@/api/errors';
import type { UserSummary } from '@/api/types';
import {
  Avatar,
  Button,
  color,
  font,
  FullScreenPanel,
  Icon,
  ListRow,
  radius,
  SectionHeader,
  size,
  space,
  text,
  TextEntry,
  type ToastAction,
  useToast,
} from '@/design-system';
import { useFriendChanges } from '@/features/friends/use-friend-changes';
import { useMyFriendId } from '@/features/friends/use-my-friend-id';
import { useSendInviteLink } from '@/features/friends/use-send-invite-link';
import { alreadyFriends, becameFriends, NO_ANSWER } from './words';

// The toast after a Friend Request links to the list where the Friend shows once they accept (HE H11): 친구 관리.
// When this screen was opened from there, it closes back to it; opened from the map, 친구 관리 takes its place.
const TO_FRIENDS: ToastAction = {
  label: '친구 목록 보기',
  onPress: () => {
    router.dismissTo('/me/friends');
  },
};

const FRIEND_ID_LENGTH = 8;
const OWN_ID = '내 친구 ID예요';

// Letters and digits only, in capitals, at most 8.
function asFriendId(typed: string): string {
  return typed
    .toUpperCase()
    .replaceAll(/[^A-Z0-9]/gu, '')
    .slice(0, FRIEND_ID_LENGTH);
}

// The words for a refusal of the lookup or of the request, by its code. `name` is the owner's, where the lookup
// found one.
const REFUSALS: Record<string, (name: string) => string> = {
  FRIEND_ID_NOT_FOUND: () => '이 친구 ID를 가진 사람이 없어요',
  OWN_FRIEND_ID: () => OWN_ID,
  ALREADY_FRIENDS: alreadyFriends,
  FRIEND_REQUEST_ALREADY_SENT: () => '이미 친구 요청을 보냈어요',
};

function refusalWords(error: unknown, owner: UserSummary | null): string {
  const words = error instanceof ApiError && error.code !== null ? REFUSALS[error.code] : undefined;
  return words === undefined ? NO_ANSWER : words(owner?.name ?? '');
}

// A section: its grey head, and what it holds in a soft box, as the 파티 form's plan box.
function Part({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <View style={styles.part}>
      <SectionHeader>{title}</SectionHeader>
      <View style={styles.box}>{children}</View>
    </View>
  );
}

function MyFriendId(): ReactElement {
  const friendId = useMyFriendId();
  const showToast = useToast();
  return (
    <Part title="내 친구 ID">
      <View style={styles.mine}>
        <Text selectable style={styles.friendId}>
          {friendId ?? ''}
        </Text>
        <Pressable
          accessibilityLabel="친구 ID 복사"
          accessibilityRole="button"
          accessibilityState={{ disabled: friendId === undefined }}
          disabled={friendId === undefined}
          hitSlop={COPY_HIT_SLOP}
          onPress={() => {
            if (friendId !== undefined) {
              void Clipboard.setStringAsync(friendId).then(() => {
                showToast('친구 ID를 복사했어요');
              });
            }
          }}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Icon color={color.snuBlue} name="copy" size={COPY_ICON} />
        </Pressable>
      </View>
    </Part>
  );
}

interface Lookup {
  typed: string;
  owner: UserSummary | null;
  sent: boolean;
  error: string | undefined;
}

const NOTHING_YET: Lookup = { typed: '', owner: null, sent: false, error: undefined };

// The field, the owner it found and what was refused. Changing the field clears the rest.
function useLookup(): [Lookup, (typed: string) => void, () => void, () => void] {
  const myFriendId = useMyFriendId();
  const changes = useFriendChanges();
  const showToast = useToast();
  const [lookup, setLookup] = useState<Lookup>(NOTHING_YET);
  const type = (typed: string): void => {
    setLookup({ ...NOTHING_YET, typed: asFriendId(typed) });
  };
  const find = (): void => {
    const { typed } = lookup;
    if (typed === myFriendId) {
      setLookup({ ...lookup, error: OWN_ID });
      return;
    }
    changes.findFriendId(typed).then(
      (owner) => {
        setLookup((now) => (now.typed === typed ? { ...now, owner } : now));
      },
      (error: unknown) => {
        setLookup((now) => (now.typed === typed ? { ...now, error: refusalWords(error, null) } : now));
      },
    );
  };
  const add = (): void => {
    const { typed, owner } = lookup;
    if (owner === null) {
      return;
    }
    changes.sendFriendRequest(typed).then(
      ({ status }) => {
        if (status === 'friends') {
          setLookup(NOTHING_YET);
          showToast(becameFriends(owner.name));
          return;
        }
        setLookup((now) => (now.typed === typed ? { ...now, sent: true } : now));
        showToast(`${owner.name}님에게 친구 요청을 보냈어요`, undefined, undefined, TO_FRIENDS);
      },
      (error: unknown) => {
        setLookup((now) => (now.typed === typed ? { ...now, error: refusalWords(error, owner) } : now));
      },
    );
  };
  return [lookup, type, find, add];
}

// The field without a label of its own, since the section's head says what it takes, drawn as `TextField`'s input at
// the height of an `lg` button, so that 찾기 stands level beside it.
function FriendIdField({
  typed,
  error,
  type,
}: {
  typed: string;
  error: string | undefined;
  type: (typed: string) => void;
}): ReactElement {
  const [focused, setFocused] = useState(false);
  return (
    <TextEntry
      accessibilityHint={error}
      accessibilityLabel="친구 ID"
      onBlur={() => {
        setFocused(false);
      }}
      onChangeText={type}
      onFocus={() => {
        setFocused(true);
      }}
      placeholder="친구 ID 8자리"
      placeholderTextColor={color.inkMuted}
      // What would leave the Friend ID as it is, a ninth letter or a dash, is refused, so the field keeps showing it.
      takes={(words) => asFriendId(words) !== typed}
      style={[styles.input, error !== undefined && styles.invalid, focused && styles.focused]}
      value={typed}
    />
  );
}

function ByFriendId(): ReactElement {
  const [lookup, type, find, add] = useLookup();
  const { typed, owner, sent, error } = lookup;
  return (
    <Part title="친구 ID로 추가">
      <View style={styles.field}>
        <View style={styles.grow}>
          <FriendIdField error={error} type={type} typed={typed} />
        </View>
        <Button disabled={typed.length < FRIEND_ID_LENGTH} onPress={find} size="lg">
          찾기
        </Button>
      </View>
      {error === undefined ? null : (
        <View style={styles.error}>
          <Icon color={color.danger} name="alert" size={ERROR_ICON} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {owner === null || error !== undefined ? null : (
        <ListRow
          leading={<Avatar name={owner.name} />}
          lines={[owner.department]}
          title={owner.name}
          trailing={
            <Button disabled={sent} onPress={add} variant={sent ? 'secondary' : 'primary'}>
              {sent ? '요청됨' : '추가'}
            </Button>
          }
        />
      )}
    </Part>
  );
}

function ByInviteLink(): ReactElement {
  const sendInviteLink = useSendInviteLink();
  const send = (): void => {
    void sendInviteLink();
  };
  return (
    <Part title="초대 링크로 추가">
      <Button full icon="send" onPress={send} size="lg" variant="secondary">
        초대 링크 보내기
      </Button>
      <Text style={styles.hint}>링크는 한 사람만, 만든 뒤 24시간 동안 쓸 수 있어요</Text>
    </Part>
  );
}

// 친구 추가, in place of the `FriendsAdd` frame's search by name: the User's own Friend ID to give, another's to look
// up and ask, and an Invite Link to send through the phone's share sheet.
export function AddScreen(): ReactElement {
  return (
    <FullScreenPanel leave={{ kind: 'back', onPress: router.back }} title="친구 추가">
      <View style={styles.parts}>
        <MyFriendId />
        <ByFriendId />
        <ByInviteLink />
      </View>
    </FullScreenPanel>
  );
}

const FRIEND_ID_SPACING = 4;
const COPY_ICON = 20;
// The copy icon's touch area reaches 44 without moving the Friend ID.
const COPY_HIT_SLOP = (44 - COPY_ICON) / 2;
const ERROR_ICON = 14;
const FOCUS_RING = `0 0 0 1px ${color.focusRing}`;

const styles = StyleSheet.create({
  parts: { gap: space[6], paddingHorizontal: space[4], paddingBottom: space[8] },
  part: { gap: space[2] },
  box: { gap: space[3], padding: space[4], borderRadius: radius.md, backgroundColor: color.surfaceSubtle },
  mine: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  friendId: { ...text.display, fontFamily: font.bold, letterSpacing: FRIEND_ID_SPACING, color: color.ink },
  pressed: { opacity: 0.5 },
  hint: { ...text.caption, color: color.inkMuted },
  field: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  grow: { flex: 1 },
  input: {
    ...text.bodyLg,
    height: size.button,
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    color: color.ink,
    backgroundColor: color.surface,
  },
  focused: { borderColor: color.focusRing, boxShadow: FOCUS_RING },
  invalid: { borderColor: color.danger },
  error: { flexDirection: 'row', alignItems: 'center', gap: space[1], marginTop: -space[2] },
  errorText: { ...text.caption, flexShrink: 1, color: color.danger },
});
