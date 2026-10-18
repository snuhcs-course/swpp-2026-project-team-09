/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { PARTY_MEMBER } from './friends';
import { frameTime } from './frame';

// The app's own: what the `PartyDetail` frame draws in a room and no answer of the main server holds, a request's
// note and the 파티 채팅. `../../quest-parts/` adds them to the client's answers in the mock build.

// The frame's notes under a request to join, and more of the same kind. A request gets one by its id.
export const NOTE_SET: readonly string[] = [
  '처음인데 같이 가도 될까요?',
  '혼자 가기 어색했는데 같이 가고 싶어요!',
  '시간 맞춰서 갈게요.',
  '근처에서 수업 끝나고 바로 갈 수 있어요.',
];

// One message of the frame's 파티 채팅. `from` is null for the User's own.
export interface FramedMessage {
  id: string;
  from: { id: string; name: string } | null;
  words: string;
  sentAt: string;
}

// The frame's conversation, by Quest id: the room of `AI 커리어 설명회 같이 가요`.
export const FRAMED_CHAT: Readonly<Record<string, readonly FramedMessage[]>> = {
  'q-ai': [
    {
      id: 'q-ai-chat-1',
      from: { id: PARTY_MEMBER.id, name: PARTY_MEMBER.name },
      words: '저 조금 늦을 것 같아요. 301동 로비에서 봬요',
      sentAt: frameTime('17:02'),
    },
    { id: 'q-ai-chat-2', from: null, words: '네 먼저 자리 맡아둘게요', sentAt: frameTime('17:05') },
  ],
};
