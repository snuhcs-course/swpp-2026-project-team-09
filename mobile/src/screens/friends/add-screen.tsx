import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '@/api/errors';
import type { UserSummary } from '@/api/types';
import {
  Avatar,
  Button,
  color,
  font,
  FullScreenPanel,
  ListRow,
  SectionHeader,
  space,
  text,
  TextField,
  useToast,
} from '@/design-system';
import { useFriendChanges } from '@/features/friends/use-friend-changes';
import { useMyFriendId } from '@/features/friends/use-my-friend-id';
import { alreadyFriends, becameFriends, NO_ANSWER } from './words';

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

function MyFriendId(): ReactElement {
  const friendId = useMyFriendId();
  const showToast = useToast();
  return (
    <View style={styles.part}>
      <SectionHeader>내 친구 ID</SectionHeader>
      <View style={styles.mine}>
        <Text selectable style={styles.friendId}>
          {friendId ?? ''}
        </Text>
        <Button
          disabled={friendId === undefined}
          onPress={() => {
            if (friendId !== undefined) {
              void Clipboard.setStringAsync(friendId).then(() => {
                showToast('친구 ID를 복사했어요');
              });
            }
          }}
          variant="secondary"
        >
          복사
        </Button>
      </View>
      <Text style={styles.hint}>친구 ID를 알려 주면 친구 요청을 받을 수 있어요</Text>
    </View>
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
        showToast(`${owner.name}님에게 친구 요청을 보냈어요`);
      },
      (error: unknown) => {
        setLookup((now) => (now.typed === typed ? { ...now, error: refusalWords(error, owner) } : now));
      },
    );
  };
  return [lookup, type, find, add];
}

function ByFriendId(): ReactElement {
  const [lookup, type, find, add] = useLookup();
  const { typed, owner, sent, error } = lookup;
  return (
    <View style={styles.part}>
      <SectionHeader>친구 ID로 추가</SectionHeader>
      <View style={styles.field}>
        <View style={styles.input}>
          <TextField error={error} label="친구 ID" onChangeText={type} placeholder="친구 ID 8자리" value={typed} />
        </View>
        <View style={styles.find}>
          <Button disabled={typed.length < FRIEND_ID_LENGTH} onPress={find}>
            찾기
          </Button>
        </View>
      </View>
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
    </View>
  );
}

function ByInviteLink(): ReactElement {
  const changes = useFriendChanges();
  const showToast = useToast();
  const send = (): void => {
    changes.createInviteLink().then(
      ({ url }) => {
        void Share.share({ message: `SNU Now에서 친구 해요! ${url}` }).catch(() => null);
      },
      () => {
        showToast('초대 링크를 만들지 못했어요');
      },
    );
  };
  return (
    <View style={styles.part}>
      <SectionHeader>초대 링크로 추가</SectionHeader>
      <Button full icon="send" onPress={send} size="lg" variant="secondary">
        초대 링크 보내기
      </Button>
      <Text style={styles.hint}>링크는 한 사람만, 만든 뒤 24시간 동안 쓸 수 있어요</Text>
    </View>
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

const styles = StyleSheet.create({
  parts: { gap: space[6], paddingHorizontal: space[4], paddingBottom: space[8] },
  part: { gap: space[2] },
  mine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  friendId: { ...text.display, fontFamily: font.bold, letterSpacing: FRIEND_ID_SPACING, color: color.ink },
  hint: { ...text.caption, color: color.inkMuted },
  field: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  input: { flex: 1 },
  // Level with the input under its label.
  find: { paddingTop: 24 },
});
