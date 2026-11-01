/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { inject } from 'vitest';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { captureLogs } from './assistant.js';
import { befriend, type TestUser } from './friends.js';
import { LibraryStage } from './library.js';
import { type Step } from './scripted-model.js';
import { addClass } from './timetable.js';

// The model never sees a 학번, a registered name or a 소속: a scripted run over Users who have them calls every library
// and tutorial tool, and no prompt the model received, no reply and no log line holds them. The columns come with P06
// ticket 01; until they exist, the run still checks that nothing of the kind appears.

const stage = new LibraryStage();
let asker: TestUser;
let friend: TestUser;

const SECRETS = {
  askerNumber: '202699901',
  friendNumber: '202699902',
  askerRegistered: '학적상이름가',
  friendRegistered: '학적상이름나',
};

// Sets the profile's 학번, registered name and 소속 where the database has them, and answers whether it did.
async function giveIdentity(
  prisma: PrismaClient,
  user: TestUser,
  studentNumber: string,
  registeredName: string,
  affiliation: string,
): Promise<boolean> {
  const columns = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'users' AND column_name IN ('student_number', 'registered_name', 'affiliation')`;
  if (columns.length < 3) {
    return false;
  }
  await prisma.$executeRawUnsafe(
    `UPDATE users SET student_number = $1, registered_name = $2, affiliation = $3::affiliation WHERE id = $4::uuid`,
    studentNumber,
    registeredName,
    affiliation,
    user.id,
  );
  return true;
}

beforeAll(async () => {
  await stage.start(inject('settings'));
  asker = await stage.user('비밀관정');
  friend = await stage.user('비밀친구');
  await befriend(stage.app, asker, friend);
  await giveIdentity(stage.prisma, asker, SECRETS.askerNumber, SECRETS.askerRegistered, 'graduate');
  await giveIdentity(stage.prisma, friend, SECRETS.friendNumber, SECRETS.friendRegistered, 'undergraduate');
  await addClass(stage.app, asker.accessToken, {
    courseName: '비밀수업',
    times: [{ weekday: 'wednesday', startTime: '12:00', endTime: '13:00', placeId: null, room: '비밀 강의실' }],
  });
});

afterAll(() => stage.stop());

const SEEN_NEVER = [...Object.values(SECRETS), '2026-99901', '비밀 강의실', 'affiliation', 'BSEQNO', 'JSESSIONID'];

const room = { spaceId: '6F-studio', date: '2026-11-05', start: '10:00', minutes: 60 };
const grad = { spaceId: '8F-grad-reading-room', date: '2026-11-04', start: '17:00', minutes: 60 };

// Two messages, since a message takes at most 8 steps, over every library and tutorial tool.
function messagesOf(friendId: string): Step[][] {
  return [
    [
      { tool: 'findLibrarySpace', input: { spaceIds: ['8F-grad-reading-room', '6F-studio'], words: '대학원 열람실' } },
      { tool: 'resolveFriend', input: { name: '비밀친구' } },
      { tool: 'proposeLibraryBooking', input: { ...room, friendIds: [friendId] } },
      { tool: 'findLibraryFreeSlots', input: { spaceId: '8F-grad-reading-room', date: '2026-11-04' } },
      { tool: 'proposeLibraryBooking', input: grad },
      { tool: 'getTutorial', input: {} },
      { text: '…' },
    ],
    [
      { tool: 'findLibrarySpace', input: { spaceIds: ['6F-studio'], words: '스튜디오' } },
      { tool: 'proposeLibraryCancel', input: {} },
      { tool: 'proposeLibraryReturn', input: {} },
      { tool: 'showLibrarySeats', input: { spaceId: '6F-studio' } },
      { tool: 'showMyLibraryBookings', input: {} },
      { text: '…' },
    ],
  ];
}

describe('What the model is given', () => {
  it('never holds a 학번, a registered name, a 소속, a Class room or a booking number', async () => {
    const logs = captureLogs();
    const [first, second] = messagesOf(friend.id);
    const seen: string[] = [];
    const sendAndKeep = async (steps: Step[] | undefined): Promise<void> => {
      const response = await stage.send(asker, steps ?? []);

      expect(response.status).toBe(200);

      seen.push(JSON.stringify(stage.model.received()), JSON.stringify(response.body));
    };
    await sendAndKeep(first);
    await sendAndKeep(second);
    const all = [...seen, logs()].join('\n');

    for (const secret of SEEN_NEVER) {
      expect(all).not.toContain(secret);
    }
  });
});
