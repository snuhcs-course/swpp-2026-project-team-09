import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { type VisibilityService } from '../src/location-sharing/visibility.service.js';
import { befriend, signInUser } from './friends.js';
import { expectStatus, OFF_CAMPUS, setFriendSharing, setMasterSwitch, uploadPosition } from './location-sharing.js';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;
let visibility: VisibilityService;

beforeAll(async () => {
  app = await startApp(settings);
  // Imported after startApp, so that it is the class the server registered.
  const { VisibilityService } = await import('../src/location-sharing/visibility.service.js');
  visibility = app.get(VisibilityService);
});

afterAll(async () => {
  await app.close();
});

type Switch = 'on' | 'off';
// No friendship, or one with the viewer's switch and the subject's switch.
type Friendship = 'none' | `${Switch}/${Switch}`;
type Row = [
  viewerMaster: Switch,
  subjectMaster: Switch,
  friendship: Friendship,
  subject: 'inside' | 'outside',
  sees: boolean,
];

// Every combination, and whether the viewer may see the subject.
const TABLE: Row[] = [
  ['on', 'on', 'on/on', 'inside', true],
  ['on', 'on', 'on/on', 'outside', false],
  ['on', 'on', 'on/off', 'inside', false],
  ['on', 'on', 'on/off', 'outside', false],
  ['on', 'on', 'off/on', 'inside', false],
  ['on', 'on', 'off/on', 'outside', false],
  ['on', 'on', 'off/off', 'inside', false],
  ['on', 'on', 'off/off', 'outside', false],
  ['on', 'on', 'none', 'inside', false],
  ['on', 'on', 'none', 'outside', false],
  ['on', 'off', 'on/on', 'inside', false],
  ['on', 'off', 'on/on', 'outside', false],
  ['on', 'off', 'on/off', 'inside', false],
  ['on', 'off', 'on/off', 'outside', false],
  ['on', 'off', 'off/on', 'inside', false],
  ['on', 'off', 'off/on', 'outside', false],
  ['on', 'off', 'off/off', 'inside', false],
  ['on', 'off', 'off/off', 'outside', false],
  ['on', 'off', 'none', 'inside', false],
  ['on', 'off', 'none', 'outside', false],
  ['off', 'on', 'on/on', 'inside', false],
  ['off', 'on', 'on/on', 'outside', false],
  ['off', 'on', 'on/off', 'inside', false],
  ['off', 'on', 'on/off', 'outside', false],
  ['off', 'on', 'off/on', 'inside', false],
  ['off', 'on', 'off/on', 'outside', false],
  ['off', 'on', 'off/off', 'inside', false],
  ['off', 'on', 'off/off', 'outside', false],
  ['off', 'on', 'none', 'inside', false],
  ['off', 'on', 'none', 'outside', false],
  ['off', 'off', 'on/on', 'inside', false],
  ['off', 'off', 'on/on', 'outside', false],
  ['off', 'off', 'on/off', 'inside', false],
  ['off', 'off', 'on/off', 'outside', false],
  ['off', 'off', 'off/on', 'inside', false],
  ['off', 'off', 'off/on', 'outside', false],
  ['off', 'off', 'off/off', 'inside', false],
  ['off', 'off', 'off/off', 'outside', false],
  ['off', 'off', 'none', 'inside', false],
  ['off', 'off', 'none', 'outside', false],
];

describe('Whether a viewer may see a subject now', () => {
  it.each(TABLE)(
    'Master Switches %s and %s, friendship %s, subject %s the Campus Boundary: %s',
    async (viewerMaster, subjectMaster, friendship, subjectPlace, sees) => {
      const [viewer, subject] = await Promise.all([signInUser(app), signInUser(app)]);
      await Promise.all([
        expectStatus(setMasterSwitch(app, viewer, true), 204),
        expectStatus(setMasterSwitch(app, subject, true), 204),
      ]);
      await expectStatus(uploadPosition(app, subject), 200);
      if (subjectPlace === 'outside') {
        await expectStatus(uploadPosition(app, subject, OFF_CAMPUS), 200);
      }
      if (friendship !== 'none') {
        const [viewerSwitch, subjectSwitch] = friendship.split('/');
        await befriend(app, viewer, subject);
        await expectStatus(setFriendSharing(app, viewer, subject.id, viewerSwitch === 'on'), 204);
        await expectStatus(setFriendSharing(app, subject, viewer.id, subjectSwitch === 'on'), 204);
      }
      await expectStatus(setMasterSwitch(app, viewer, viewerMaster === 'on'), 204);
      await expectStatus(setMasterSwitch(app, subject, subjectMaster === 'on'), 204);

      expect((await visibility.viewersOf(subject.id)).includes(viewer.id)).toBe(sees);
      expect((await visibility.visibleTo(viewer.id)).includes(subject.id)).toBe(sees);
    },
  );
});
