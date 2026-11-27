/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { newIdempotencyKey } from '@/api/idempotency-key';
import { friendsQuery } from '@/api/queries';
import { type RoomRequest, roomRequests } from '@/api/room-requests';
import { askableFriends, askRefusalWords } from '@/library/cards/room-companions';
import { FriendPicker } from '@/screens/party/form/friend-picker';
import { Pill, Pills, Said } from './library-parts';

// The booker's "친구 한 명 더 부르기" on a gathering room request made for booking: the party form's Friend picker for
// one Friend, asked through the request's companions route. A refusal stays in the card with the picker open.

export const ASK_ONE_MORE = '친구 한 명 더 부르기';
export const SEND_ONE_MORE = '요청 보내기';

interface AskOneMoreProps {
  request: RoomRequest;
  // The request as the route answered it, with the Friend asked.
  onAsked: (request: RoomRequest) => void;
}

// The picker alone, which the study answer together opens from its main button (P10 ticket 12).
export function OneMorePicker({ request, onAsked, onClose }: AskOneMoreProps & { onClose: () => void }): ReactElement {
  const friends = askableFriends(useQuery(friendsQuery).data ?? [], request);
  const [chosen, setChosen] = useState<string[]>([]);
  // One key for each Friend chosen, so that a retry after no answer is the same ask.
  const [key, setKey] = useState(newIdempotencyKey);
  const [sending, setSending] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const friendId = chosen[0] ?? null;
  const send = async (id: string): Promise<void> => {
    setSending(true);
    setRefusal(null);
    try {
      onAsked(await roomRequests.askOneMore(request.id, id, key));
      onClose();
    } catch (error) {
      setRefusal(askRefusalWords(error));
      setSending(false);
    }
  };
  return (
    <>
      <FriendPicker
        chosen={chosen}
        friends={friends}
        hint="한 명씩 부를 수 있어요"
        most={1}
        onChosen={(ids) => {
          setChosen(ids);
          setKey(newIdempotencyKey());
        }}
      />
      {refusal === null ? null : <Said tone="danger">{refusal}</Said>}
      <Pills>
        <Pill
          disabled={friendId === null || sending}
          label={SEND_ONE_MORE}
          onPress={() => {
            if (friendId !== null) {
              void send(friendId);
            }
          }}
          primary
        />
        <Pill label="취소" onPress={onClose} />
      </Pills>
    </>
  );
}

export function AskOneMore({ request, onAsked }: AskOneMoreProps): ReactElement {
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <OneMorePicker
        onAsked={onAsked}
        onClose={() => {
          setOpen(false);
        }}
        request={request}
      />
    );
  }
  return (
    <Pills>
      <Pill
        label={ASK_ONE_MORE}
        onPress={() => {
          setOpen(true);
        }}
      />
    </Pills>
  );
}
