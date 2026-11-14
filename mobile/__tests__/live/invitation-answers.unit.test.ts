/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type InvitationAnswer, onInvitationAnswer, tellInvitationAnswer } from '@/live/invitation-answers';

let unsubscribe: (() => void) | undefined;

afterEach(() => {
  unsubscribe?.();
  unsubscribe = undefined;
});

function listen(): jest.Mock<undefined, [InvitationAnswer]> {
  const listener = jest.fn<undefined, [InvitationAnswer]>();
  unsubscribe = onInvitationAnswer(listener);
  return listener;
}

describe('an answer to an invitation', () => {
  it.each([
    ['invitation-accepted', 'accepted'],
    ['invitation-declined', 'declined'],
  ])('reaches a listener on the signal %s', (signal, kind) => {
    const listener = listen();

    tellInvitationAnswer(signal, { questId: 'q1', userId: 'u1' });

    expect(listener).toHaveBeenCalledWith({ kind, questId: 'q1', userId: 'u1' });
  });

  it.each([
    ['no payload', undefined],
    ['no userId', { questId: 'q1' }],
    ['a number for an id', { questId: 'q1', userId: 1 }],
    ['a text', 'q1'],
  ])('reaches no listener with %s', (_, payload) => {
    const listener = listen();

    tellInvitationAnswer('invitation-accepted', payload);

    expect(listener).not.toHaveBeenCalled();
  });

  it('reaches no listener on another signal', () => {
    const listener = listen();

    tellInvitationAnswer('quests-changed', { questId: 'q1', userId: 'u1' });

    expect(listener).not.toHaveBeenCalled();
  });

  it('reaches no listener that has unsubscribed', () => {
    const listener = listen();
    unsubscribe?.();

    tellInvitationAnswer('invitation-declined', { questId: 'q1', userId: 'u1' });

    expect(listener).not.toHaveBeenCalled();
  });
});
