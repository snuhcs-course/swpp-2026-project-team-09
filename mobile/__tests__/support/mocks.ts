/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import { forgetMockSwitch } from '@/api/mock/client';
import { resetMockFriendships } from '@/api/mock/friendships';
import { resetMockTimetable } from '@/api/mock/timetable';
import { forgetMockMatching } from '@/api/mock/events';
import { resetMockTutorial } from '@/api/mock/tutorial';
import { forgetAnswerSwitch } from '@/features/assistant/answer-switch';

const SETTINGS = [
  'EXPO_PUBLIC_SIGN_IN_ENDING',
  'EXPO_PUBLIC_MOCK_SLOW',
  'EXPO_PUBLIC_MOCK_FAIL',
  'EXPO_PUBLIC_MOCK_EMPTY',
  'EXPO_PUBLIC_FIRST_STATE',
  'EXPO_PUBLIC_CAMPUS_WALK',
  'EXPO_PUBLIC_MAIN_SERVER_URL',
  'EXPO_PUBLIC_SOCKET_SERVER_URL',
] as const;

// A phone that keeps nothing, an app started without development settings, the mock's friendships and classes as
// they start, and the switch of the answer on the map not yet read.
export async function startFresh(): Promise<void> {
  resetMockFriendships();
  resetMockTimetable();
  for (const setting of SETTINGS) {
    Reflect.deleteProperty(process.env, setting);
  }
  await AsyncStorage.clear();
  forgetMockSwitch();
  forgetMockMatching();
  resetMockTutorial();
  forgetAnswerSwitch();
}

// Lets a mock's wait pass and gives its answer. Use with Jest's fake timers.
export async function answered<Answer>(asked: Promise<Answer>): Promise<Answer> {
  // A refusal is caught at once, so that it is not reported as unhandled while the timers run.
  const settled = asked.then(
    (value) => ({ value }),
    (refusal: unknown) => ({ refusal }),
  );
  await jest.runAllTimersAsync();
  const result = await settled;
  if ('refusal' in result) {
    throw result.refusal;
  }
  return result.value;
}
