/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { inject } from 'vitest';
import { type TestUser } from './friends.js';
import { libraryCards, LibraryStage } from './library.js';
import { getTutorial, postTutorial, tutorialAfter, tutorialSchema } from './tutorial.js';

// LIBRARY_BOOKING_ENABLED=false turns 관정 booking off without a release: the library tools answer with the official
// site and show no card, and the tutorial's 관정 quest is served, and completed, as a button quest. The tutorial tools
// stay.

const OFFICIAL = 'https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/main';

const stage = new LibraryStage();
let user: TestUser;

beforeAll(async () => {
  await stage.start({ ...inject('settings'), LIBRARY_BOOKING_ENABLED: 'false' });
  user = await stage.user('예약꺼짐');
});

afterAll(() => stage.stop());

describe('With 관정 booking turned off', () => {
  it('every library tool answers with the official site, and no card is shown', async () => {
    const response = await stage.send(user, [
      { tool: 'findLibrarySpace', input: { spaceIds: ['7F-7A-zone2'], words: '7층 열람실' } },
      {
        tool: 'proposeLibraryBooking',
        input: { spaceId: '7F-7A-zone2', date: '2026-11-04', start: '17:00', minutes: 60 },
      },
      { tool: 'findLibraryFreeSlots', input: { spaceId: '7F-7A-zone2', date: '2026-11-04' } },
      { tool: 'proposeLibraryCancel', input: {} },
      { tool: 'proposeLibraryReturn', input: {} },
      { tool: 'showLibrarySeats', input: { spaceId: '7F-7A-zone2' } },
      { tool: 'showMyLibraryBookings', input: {} },
      { text: '…' },
    ]);
    const off = { result: 'none', reason: '관정도서관 예약은 공식 사이트나 앱에서 해 주세요.', link: OFFICIAL };

    expect(response.status).toBe(200);
    expect(stage.model.toolResults()).toEqual(Array.from({ length: 7 }, () => off));
    expect(libraryCards(response.body)).toEqual([]);
  });

  it('getTutorial still answers', async () => {
    expect(await stage.result(user, { tool: 'getTutorial', input: { questKey: 'kwanjeong' } })).toMatchObject({
      result: 'found',
      quests: [{ key: 'kwanjeong', links: [{ url: OFFICIAL }] }],
    });
  });

  it('GET /tutorial serves the 관정 quest as a button quest with the official site and no ask, and completes it by the button', async () => {
    const tutorial = tutorialSchema.parse((await getTutorial(stage.app, user)).body);
    const kwanjeong = tutorial.quests.find(({ key }) => key === 'kwanjeong');

    expect(kwanjeong).toMatchObject({
      completion: { kind: 'button' },
      links: [{ label: '관정도서관 예약 사이트', url: OFFICIAL }],
    });
    expect(tutorial.quests.filter(({ ask }) => ask !== undefined)).toEqual([]);

    const completed = await tutorialAfter(postTutorial(stage.app, user, 'quests/kwanjeong/complete', { by: 'button' }));

    expect(completed.quests.find(({ key }) => key === 'kwanjeong')).toMatchObject({ status: 'completed' });
    expect((await postTutorial(stage.app, user, 'quests/s-card/complete', { by: 'checked' })).status).toBe(400);
  });
});
