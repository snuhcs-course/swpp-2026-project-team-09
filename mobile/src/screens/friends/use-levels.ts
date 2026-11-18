/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { useState } from 'react';
import type { Friend, FriendLevel } from '@/api/types';
import { useToast } from '@/design-system';
import { useFriendChanges } from '@/features/friends/use-friend-changes';
import type { OffAnswer } from './off-question';

export const NOT_CHANGED = '위치 공유를 바꾸지 못했어요';

type Leveled = Pick<Friend, 'id' | 'name' | 'level' | 'askedOff'>;

export interface Levels {
  // The level shown for a Friend: the choice being sent, or the Friend's own.
  levelOf: (friend: Leveled) => FriendLevel;
  choose: (friend: Leveled, level: FriendLevel) => void;
  // The Friend the question before turning location off is about, kept while the sheet closes.
  asked: { friend: Leveled; open: boolean } | null;
  answer: (answer: OffAnswer) => void;
}

// What the User lets each Friend see: a choice shows at once, and turns back with a toast when the change fails. The
// first "시간표만" for a Friend above it asks first, and the question is recorded whatever the answer.
export function useLevels(): Levels {
  const changes = useFriendChanges();
  const showToast = useToast();
  const [choosing, setChoosing] = useState<ReadonlyMap<string, FriendLevel>>(new Map());
  const [asked, setAsked] = useState<Levels['asked']>(null);
  const levelOf = (friend: Leveled): FriendLevel => choosing.get(friend.id) ?? friend.level;
  const change = (friend: Leveled, level: FriendLevel, done?: string): void => {
    const settle = (): void => {
      setChoosing((now) => new Map([...now].filter(([id]) => id !== friend.id)));
    };
    setChoosing((now) => new Map(now).set(friend.id, level));
    changes.setLevel(friend.id, level).then(
      () => {
        settle();
        if (done !== undefined) {
          showToast(done);
        }
      },
      () => {
        settle();
        showToast(NOT_CHANGED);
      },
    );
  };
  const choose = (friend: Leveled, level: FriendLevel): void => {
    if (level === levelOf(friend)) {
      return;
    }
    if (level === 'timetable' && !friend.askedOff) {
      setAsked({ friend, open: true });
      return;
    }
    change(friend, level);
  };
  const answer = (given: OffAnswer): void => {
    if (asked === null) {
      return;
    }
    const { friend } = asked;
    setAsked({ friend, open: false });
    void changes.recordAsked([friend.id], 'off').catch(() => null);
    if (given === 'off') {
      change(friend, 'timetable', `껐어요 · ${friend.name}에게 알림은 가지 않아요`);
    } else if (given === 'building') {
      change(friend, 'building', `${friend.name}에게 지금 있는 건물까지만 보여요`);
    }
  };
  return { levelOf, choose, asked, answer };
}
