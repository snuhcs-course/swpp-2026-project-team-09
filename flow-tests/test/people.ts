// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { randomInt } from 'node:crypto';
import { io, type Socket } from 'socket.io-client';
import { inject } from 'vitest';
import { z } from 'zod';
import { type Position, removedPosition, userPosition } from './answers.js';
import { type Answer, Caller, googleIdToken } from './caller.js';
import { Inbox } from './inbox.js';

// The client IDs and the Administrator of compose.test.yaml.
export const APP_CLIENT_ID = 'flow-tests-app.apps.googleusercontent.com';
const ADMIN_CLIENT_ID = 'flow-tests-admin.apps.googleusercontent.com';
const ADMINISTRATOR = { email: 'admin@flow-tests.example', sub: '100000000000000000001' };

const tokens = z.object({ accessToken: z.string() });

const sockets = new Set<Socket>();

export function closeSockets(): void {
  for (const socket of sockets) {
    socket.close();
  }
  sockets.clear();
}

// A User with the app open: signed in, onboarded and connected to the socket server.
export class Student extends Caller {
  constructor(
    name: string,
    accessToken: string,
    readonly id: string,
    readonly inbox: Inbox,
  ) {
    super(name, accessToken);
  }

  // The phone's position now, as the app uploads it. Answers whether it was off campus.
  async uploadsPosition({ latitude, longitude }: Position): Promise<boolean> {
    const body = { latitude, longitude, accuracy: 10, measuredAt: new Date().toISOString() };
    return (await this.post('/positions', body, z.object({ offCampus: z.boolean() }))).offCampus;
  }

  // Waits for the position of `other` at `at`, pushed over the socket.
  async receivesPositionOf(other: Student, at: Position): Promise<void> {
    await this.inbox.receives(
      'position',
      userPosition,
      ({ userId, latitude, longitude }) =>
        userId === other.id && latitude === at.latitude && longitude === at.longitude,
    );
  }

  receivesNoPositionOf(other: Student): Promise<void> {
    return this.inbox.receivesNo('position', userPosition, ({ userId }) => userId === other.id);
  }

  async receivesRemovalOf(other: Student): Promise<void> {
    await this.inbox.receives('position-removed', removedPosition, ({ userId }) => userId === other.id);
  }
}

// A sign-in to the app with a Google account, before onboarding.
export function signInWithGoogle(claims: Record<string, unknown>): Promise<Answer> {
  return new Caller('Google sign-in').call('POST', '/auth/google', { idToken: googleIdToken(claims) });
}

function connect(name: string, accessToken: string): Promise<Inbox> {
  const socket = io(inject('socketServer'), { auth: { token: accessToken }, transports: ['websocket'] });
  sockets.add(socket);
  const inbox = new Inbox(name, socket);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${name} could not connect to the socket server within 5 s`));
    }, 5000);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve(inbox);
    });
    socket.once('connect_error', (error) => {
      if (!socket.active) {
        clearTimeout(timer);
        reject(new Error(`${name} was refused by the socket server: ${error.message}`));
      }
    });
  });
}

// Signs in with a new SNU account, finishes onboarding under `name` and opens the app's socket connection.
export async function signIn(name: string): Promise<Student> {
  const sub = String(randomInt(2 ** 47));
  const answer = await signInWithGoogle({
    aud: APP_CLIENT_ID,
    sub,
    email: `student-${sub}@snu.ac.kr`,
    hd: 'snu.ac.kr',
    name: `${name} / 학생 / 컴퓨터공학부`,
  });
  if (answer.status !== 200) {
    throw new Error(`${name} could not sign in: ${answer.status} ${JSON.stringify(answer.body)}`);
  }
  const { accessToken } = tokens.parse(answer.body);
  const caller = new Caller(name, accessToken);
  await caller.post('/users/me/onboarding', { name, department: '컴퓨터공학부', admissionYear: 2024, hashtags: [] });
  const { id } = await caller.get('/users/me', z.object({ id: z.string() }));
  return new Student(name, accessToken, id, await connect(name, accessToken));
}

// The Administrator of the test stack, signed in to the admin site.
export async function signInAsAdministrator(): Promise<Caller> {
  const idToken = googleIdToken({ aud: ADMIN_CLIENT_ID, ...ADMINISTRATOR });
  const { accessToken } = await new Caller('Administrator').post('/admin/auth/google', { idToken }, tokens);
  return new Caller('Administrator', accessToken);
}
