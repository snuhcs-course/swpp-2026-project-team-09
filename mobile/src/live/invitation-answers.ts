/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The Leader's app hears at once that an invited User answered (`socket-server/README.md`, "Signals"), so that a
// screen can mark that User before the Quests are fetched again.

export interface InvitationAnswer {
  kind: 'accepted' | 'declined';
  questId: string;
  userId: string;
}

type Listener = (answer: InvitationAnswer) => void;

const KINDS = new Map<string, InvitationAnswer['kind']>([
  ['invitation-accepted', 'accepted'],
  ['invitation-declined', 'declined'],
]);

const listeners = new Set<Listener>();

// Gives the way to stop listening.
export function onInvitationAnswer(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function text(value: unknown, name: string): string | undefined {
  const found: unknown = typeof value === 'object' && value !== null ? Reflect.get(value, name) : undefined;
  return typeof found === 'string' ? found : undefined;
}

// A signal as it arrived. Any signal but the two answers, or a payload without both ids, tells nobody.
export function tellInvitationAnswer(name: string, payload: unknown): void {
  const kind = KINDS.get(name);
  const questId = text(payload, 'questId');
  const userId = text(payload, 'userId');
  if (kind === undefined || questId === undefined || userId === undefined) {
    return;
  }
  for (const listener of listeners) {
    listener({ kind, questId, userId });
  }
}
