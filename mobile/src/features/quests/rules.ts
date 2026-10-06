import type { Quest } from '@/api/types';

// Who may do what in a Quest's room, by decision 4. The main server's rules are wider; these may change, so every
// screen asks here.

// Adding, editing and cancelling Sub Quests: the Leader.
export function editsSubQuests(quest: Quest, meId: string): boolean {
  return quest.leader?.id === meId;
}

// Opening the Quest's Party (파티 활성화): any Holder.
export function opensParty(quest: Quest, meId: string): boolean {
  return quest.holders.some(({ id }) => id === meId);
}
