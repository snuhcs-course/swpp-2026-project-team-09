/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';
import { createContext, type ReactElement, type ReactNode, use, useCallback, useState } from 'react';
import { friendProfileCard } from '@/features/friends/profile';
import { useFriendProfile } from '@/features/friends/use-friend-profile';
import { useBackToClose } from '@/hooks/use-back-to-close';
import { Card } from './card';

const OpenProfile = createContext<((userId: string) => void) | null>(null);

// Opens a Friend's profile card over the answer frame's card, for anything the frame draws, such as a person chip or a
// cell's mark in a list of Friends. Null outside the frame.
export function useOpenFriendProfile(): ((userId: string) => void) | null {
  return use(OpenProfile);
}

function ignore(): void {
  // The frame's camera is the answer's: the card has no "가까이 보기".
}

// The everyday map's card of a Friend, which is their profile, also for a Friend whom the map does not show.
function ProfileCard({ userId, onClose }: { userId: string; onClose: () => void }): ReactElement | null {
  const friend = useFriendProfile(userId)?.friend ?? null;
  useBackToClose(friend !== null, onClose, { edge: false });
  if (friend === null) {
    return null;
  }
  return (
    <Card
      canLookCloser={false}
      card={friendProfileCard(friend)}
      onClose={onClose}
      onLookCloser={ignore}
      onPrimary={() => {
        router.push({ pathname: '/party-form', params: { friendId: friend.id } });
      }}
    />
  );
}

// The answer frame's Friend profile: what is inside it may open one (`useOpenFriendProfile`), which stands over the
// frame's card, as the everyday map's card stands over the map, while the keyboard is down. Its ✕ and Android's back
// button close it, and the frame under it is as it was.
export function FriendProfileOver({
  keyboardUp,
  children,
}: {
  keyboardUp: boolean;
  children: ReactNode;
}): ReactElement {
  const [userId, setUserId] = useState<string | null>(null);
  const close = useCallback(() => {
    setUserId(null);
  }, []);
  return (
    <OpenProfile value={setUserId}>
      {children}
      {userId === null || keyboardUp ? null : <ProfileCard onClose={close} userId={userId} />}
    </OpenProfile>
  );
}
