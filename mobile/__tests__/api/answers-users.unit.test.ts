/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// Partitions, for each check of an answer about Users: the documented shape, each checked field left out, null and of
// another type, and null where it is allowed. Expected values: main-server's README, Sign-in to Location Sharing.

import { inList, inside, omit, type Variant, wrongFields } from '../support/answer-variants';
import {
  type Guard,
  isFriends,
  isInviteLink,
  isLobby,
  isNothing,
  isOpenedInviteLink,
  isPositionKept,
  isPositions,
  isProfile,
  isSentFriendRequest,
  isSignInAnswer,
  isSuggestion,
  isTokens,
  isUserSummary,
} from '@/api/server/answers';

function checks<Answer>(guard: Guard<Answer>, accepted: readonly Variant[], refused: readonly Variant[]): void {
  it.each(accepted)('%s → accepted', (_, answer) => {
    expect(guard(answer)).toBe(true);
  });
  it.each(refused)('%s → refused', (_, answer) => {
    expect(guard(answer)).toBe(false);
  });
}

const SUGGESTION = { name: '홍길동', department: '컴퓨터공학부' };
const ONBOARDING = { completed: false, suggestion: SUGGESTION };
const SIGN_IN = { accessToken: 'access-1', refreshToken: 'refresh-1', onboarding: ONBOARDING };
const TOKENS = { accessToken: 'access-2', refreshToken: 'refresh-2' };
const PROFILE = {
  name: '홍길동',
  department: '컴퓨터공학부',
  admissionYear: 2024,
  hashtags: ['AI'],
  friendId: '7KX2M9QD',
};
const LOBBY = { profile: PROFILE, masterSwitch: false };
const FRIEND = { id: 'u-min-jun', name: '김민준', department: '경영학과', sharing: true, visible: false };
const USER_SUMMARY = { name: '김민준', department: '경영학과' };
const INVITE_LINK = { url: 'https://snunow.example/invite/abc', expiresAt: '2026-10-07T08:00:00.000Z' };
const OPENED_INVITE_LINK = { sender: USER_SUMMARY, status: 'usable' };
const POSITION = { userId: 'u-min-jun', latitude: 37.4594, longitude: 126.95199, measuredAt: '2026-10-06T08:00:00Z' };

describe('isNothing', () => {
  checks(
    isNothing,
    [['the empty body of a 204', null]],
    [
      ['an empty object', {}],
      ['an empty text', ''],
    ],
  );
});

describe('isSuggestion', () => {
  checks(
    isSuggestion,
    [
      ['a name and a department', SUGGESTION],
      ['parts that could not be read, null', { name: null, department: null }],
    ],
    wrongFields(SUGGESTION, { name: [1], department: [1] }, ['name', 'department']),
  );
});

describe('isSignInAnswer', () => {
  checks(
    isSignInAnswer,
    [
      ['a first sign-in, with the suggestion', SIGN_IN],
      ['a sign-in after Onboarding, with no suggestion', { ...SIGN_IN, onboarding: { completed: true } }],
    ],
    [
      ...wrongFields(SIGN_IN, { accessToken: [1], refreshToken: [1], onboarding: ['completed'] }),
      ...inside(SIGN_IN, 'onboarding', [
        ...wrongFields(ONBOARDING, { completed: ['false'] }),
        ['suggestion null', { ...ONBOARDING, suggestion: null }],
        ['a suggestion whose name is a number', { ...ONBOARDING, suggestion: { ...SUGGESTION, name: 1 } }],
      ]),
    ],
  );
});

describe('isTokens', () => {
  checks(
    isTokens,
    [
      ['the renewed tokens', TOKENS],
      ['the renewed tokens in the sign-in form', { ...TOKENS, onboarding: { completed: true } }],
    ],
    wrongFields(TOKENS, { accessToken: [1], refreshToken: [1] }),
  );
});

describe('isProfile', () => {
  checks(
    isProfile,
    [
      ['the profile', PROFILE],
      ['an emptied admissionYear, null', { ...PROFILE, admissionYear: null }],
      ['emptied hashtags', { ...PROFILE, hashtags: [] }],
    ],
    wrongFields(
      PROFILE,
      { name: [1], department: [1], friendId: [1], admissionYear: ['2024'], hashtags: ['AI', [1]] },
      ['admissionYear'],
    ),
  );
});

describe('isLobby', () => {
  checks(
    isLobby,
    [['the lobby', LOBBY]],
    [
      ...wrongFields(LOBBY, { profile: ['홍길동'], masterSwitch: ['false'] }),
      ['a profile without a friendId', { ...LOBBY, profile: omit(PROFILE, 'friendId') }],
    ],
  );
});

describe('isPositionKept', () => {
  checks(
    isPositionKept,
    [
      ['a position kept', { offCampus: false }],
      ['a position off campus', { offCampus: true }],
    ],
    wrongFields({ offCampus: false }, { offCampus: ['false'] }),
  );
});

describe('isFriends', () => {
  checks(
    isFriends,
    [
      ['the Friends', [FRIEND]],
      ['no Friends', []],
    ],
    [
      ['one Friend outside a list', FRIEND],
      ...inList(
        FRIEND,
        wrongFields(FRIEND, { id: [1], name: [1], department: [1], sharing: ['true'], visible: ['false'] }),
      ),
    ],
  );
});

describe('isUserSummary', () => {
  checks(
    isUserSummary,
    [["a Friend ID's owner", USER_SUMMARY]],
    wrongFields(USER_SUMMARY, { name: [1], department: [1] }),
  );
});

describe('isSentFriendRequest', () => {
  checks(
    isSentFriendRequest,
    [
      ['a Friend Request waiting', { status: 'waiting' }],
      ['two Users made Friends at once', { status: 'friends' }],
    ],
    wrongFields({ status: 'waiting' }, { status: ['accepted'] }),
  );
});

describe('isInviteLink', () => {
  checks(isInviteLink, [['a new Invite Link', INVITE_LINK]], wrongFields(INVITE_LINK, { url: [1], expiresAt: [1] }));
});

describe('isOpenedInviteLink', () => {
  checks(
    isOpenedInviteLink,
    ['usable', 'used', 'expired', 'own', 'friend'].map((status): Variant => [
      `an Invite Link ${status}`,
      { ...OPENED_INVITE_LINK, status },
    ]),
    wrongFields(OPENED_INVITE_LINK, { sender: [{ name: '김민준' }], status: ['valid', 1] }),
  );
});

describe('isPositions', () => {
  checks(
    isPositions,
    [
      ['the positions the User may see', [POSITION]],
      ['no position', []],
    ],
    inList(
      POSITION,
      wrongFields(POSITION, { userId: [1], latitude: ['37.4594'], longitude: ['126.95199'], measuredAt: [1] }),
    ),
  );
});
