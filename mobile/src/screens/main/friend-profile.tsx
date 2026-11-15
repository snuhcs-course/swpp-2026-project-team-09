/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { createContext, type ReactElement, type ReactNode, use, useCallback, useState } from 'react';
import type { FriendView } from '@/features/friends/adapter';
import { friendProfileCard } from '@/features/friends/profile';
import { useFriendProfile } from '@/features/friends/use-friend-profile';
import { useFriends } from '@/features/friends/use-friends';
import { Card, type CardProps } from './card';
import { CardOrSeen, type SeenSelection } from './seen-card';
import type { OffMapFriends } from './use-selection';

const OpenProfile = createContext<((userId: string) => void) | null>(null);

// Opens a Friend's profile card over the answer frame's card, for anything the frame draws, such as a person chip or a
// cell's mark in a list of Friends. Null outside the frame.
export function useOpenFriendProfile(): ((userId: string) => void) | null {
  return use(OpenProfile);
}

// The Friend whose profile the answer frame shows, null for none, and how it is shown and hidden.
export interface ProfileOver {
  friend: FriendView | null;
  show: (userId: string) => void;
  hide: () => void;
}

// The answer frame's Friend profile, which belongs to the reply it was opened over (`replyId`, the id of its bubble): a
// new reply hides it. A user id that is none of the User's Friends shows nothing.
export function useProfileOver(replyId: number | null): ProfileOver {
  const [opened, setOpened] = useState<{ userId: string; replyId: number | null } | null>(null);
  const friend = useFriendProfile(opened?.replyId === replyId ? opened.userId : null)?.friend ?? null;
  const show = useCallback(
    (userId: string): void => {
      setOpened({ userId, replyId });
    },
    [replyId],
  );
  const hide = useCallback((): void => {
    setOpened(null);
  }, []);
  return { friend, show, hide };
}

function ignore(): void {
  // The frame's camera is the answer's: the card has no "가까이 보기".
}

// The everyday map's card of a Friend, which is their profile, also for a Friend whom the map does not show.
function profileCardProps(friend: FriendView, onHeight?: (height: number) => void): Omit<CardProps, 'onClose'> {
  return {
    canLookCloser: false,
    card: friendProfileCard(friend),
    onHeight,
    onLookCloser: ignore,
    onPrimary: () => {
      router.push({ pathname: '/party-form', params: { friendId: friend.id } });
    },
  };
}

function ProfileCard({ friend, onClose }: { friend: FriendView; onClose: () => void }): ReactElement {
  return <Card {...profileCardProps(friend)} onClose={onClose} />;
}

// The Friends whose card a row of a list may open without their mark on the map: the User's Friends while `onMap`,
// the switch of the answer on the map, is on, and none while they cannot be read.
export function useOffMapFriends(onMap: boolean): OffMapFriends {
  const friends = useFriends().data;
  return onMap ? (friends ?? []).map(({ id }) => id) : null;
}

// The card of a Friend whom the map does not show, which a row of the friend list opens over the everyday map while
// the switch of the answer on the map is on: their profile, with what the app holds of them.
export function OffMapFriendCard({
  userId,
  selection,
  onHeight,
}: {
  userId: string;
  selection: SeenSelection;
  onHeight: (height: number) => void;
}): ReactElement | null {
  const friend = useFriendProfile(userId)?.friend ?? null;
  return friend === null ? null : <CardOrSeen {...profileCardProps(friend, onHeight)} selection={selection} />;
}

// What is inside the answer frame may open a Friend's profile (`useOpenFriendProfile`), which stands over the frame's
// card, as the everyday map's card stands over the map, while the keyboard is down. Its ✕ hides it, and the frame
// under it is as it was; the frame's own back button hides it too.
export function FriendProfileOver({
  profile,
  keyboardUp,
  children,
}: {
  profile: ProfileOver;
  keyboardUp: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <OpenProfile value={profile.show}>
      {children}
      {profile.friend === null || keyboardUp ? null : <ProfileCard friend={profile.friend} onClose={profile.hide} />}
    </OpenProfile>
  );
}
