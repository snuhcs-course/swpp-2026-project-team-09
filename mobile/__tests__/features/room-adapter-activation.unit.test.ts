/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions: 활성화's four states; in the Party with both switches on, the Master Switch off or the Party switch off;
// a listed Party with its members named, unnamed, or without a Leader; another Party the User is in. Expected values:
// P13-01's and P06-19's criteria.

import { LISTED, member, ME, MIN_JUN, myParty, people, room, SEO_YEON } from '../support/room-sources';

describe('toRoom 활성화 of the User', () => {
  it('no Party runs for the Quest → none, and no member state', () => {
    const view = room();
    expect(view.activation).toEqual({ state: 'none' });
    expect(view.members.map(({ state }) => state)).toEqual([null, null, null]);
  });

  it("the User is in the Quest's Party → in and joined, with those in by the order they entered", () => {
    const party = myParty('q1', [member(MIN_JUN, false, true), member(ME, true, true), member(SEO_YEON, false, false)]);
    expect(room({ myParty: party }).activation).toEqual({
      state: 'in',
      leadsParty: true,
      switchOn: true,
      joined: true,
      people: people(MIN_JUN, ME, SEO_YEON),
    });
  });

  it.each([
    ['the Master Switch off', true, false],
    ['the Party switch off', false, true],
  ])('in the Party with %s → not joined, and left out of those in', (_, sharing, masterOn) => {
    const party = myParty('q1', [member(MIN_JUN, true, true), member(ME, false, true)], sharing);
    expect(room({ myParty: party, masterOn }).activation).toMatchObject({
      state: 'in',
      joined: false,
      people: people(MIN_JUN),
    });
  });
});

describe('toRoom 활성화 without the User, and the other Party', () => {
  it('a Party runs without the User, who has not answered → waiting, with its members', () => {
    const view = room({ parties: [{ ...LISTED, members: people(MIN_JUN, SEO_YEON) }] });
    expect(view.activation).toEqual({
      state: 'waiting',
      partyId: 'party-2',
      title: '저녁 파티',
      people: people(MIN_JUN, SEO_YEON),
    });
  });

  it('a Party whose members the main server does not name → its Leader alone among those in', () => {
    expect(room({ parties: [LISTED] }).activation).toMatchObject({ people: people(MIN_JUN) });
  });

  it('a Party whose entry names neither its members nor its Leader → waiting, with nobody named', () => {
    const { leader: _, ...unnamed } = LISTED;
    expect(room({ parties: [unnamed] }).activation).toMatchObject({ state: 'waiting', people: [] });
  });

  it('a Party the User declined on this phone → declined', () => {
    const view = room({ parties: [LISTED], declined: ['party-2'] });
    expect(view.activation).toEqual({
      state: 'declined',
      partyId: 'party-2',
      title: '저녁 파티',
      people: people(MIN_JUN),
    });
  });

  it("the User in another Quest's Party → that Party as the other one, which the User leads", () => {
    const view = room({ myParty: myParty('q9', [member(ME, true, true)]) });
    expect(view.otherParty).toEqual({ title: '저녁 파티', leads: true });
  });

  it("the User in the Quest's own Party → no other one", () => {
    expect(room({ myParty: myParty('q1', [member(ME, true, true)]) }).otherParty).toBeNull();
  });
});
