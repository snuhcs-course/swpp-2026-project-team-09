/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Share } from 'react-native';
import { useToast } from '@/design-system';
import { useFriendChanges } from './use-friend-changes';

// Makes an Invite Link and opens the phone's share sheet with it, as 친구 추가 and the first run's Friend card do. A
// link that cannot be made is told in a toast. Gives whether the share sheet was opened.
export function useSendInviteLink(): () => Promise<boolean> {
  const changes = useFriendChanges();
  const showToast = useToast();
  return () =>
    changes.createInviteLink().then(
      ({ url }) => {
        void Share.share({ message: `SNU Now에서 친구 해요! ${url}` }).catch(() => null);
        return true;
      },
      () => {
        showToast('초대 링크를 만들지 못했어요');
        return false;
      },
    );
}
