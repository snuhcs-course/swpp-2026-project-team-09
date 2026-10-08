import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { isRefusal } from '@/api/errors';
import type { ScreenData } from '@/api/screen-data';
import type { OpenedInviteLink } from '@/api/types';

// What the accept screen shows of an Invite Link: its status for the User, and who sent it. A token nobody made has
// no sender.
export type InviteLinkView = OpenedInviteLink | { status: 'not-found'; sender: null };

// Asks for the link once a screen shows it. 404 INVITE_LINK_NOT_FOUND is a status as any other.
export function useInviteLink(token: string): ScreenData<InviteLinkView> {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['invite-link', token],
    queryFn: async (): Promise<InviteLinkView> => {
      try {
        return await apiClient.getInviteLink(token);
      } catch (error) {
        if (isRefusal(error, 404, 'INVITE_LINK_NOT_FOUND')) {
          return { status: 'not-found', sender: null };
        }
        throw error;
      }
    },
  });
  return {
    data,
    isPending,
    isError,
    refetch: () => {
      void refetch();
    },
  };
}
