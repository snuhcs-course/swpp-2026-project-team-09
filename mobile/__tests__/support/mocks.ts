import AsyncStorage from '@react-native-async-storage/async-storage';
import { forgetMockSwitch } from '@/api/mock/client';
import { resetMockFriendships } from '@/api/mock/friendships';
import { resetMockMeetups } from '@/api/mock/meetups';
import { resetMockTimetable } from '@/api/mock/timetable';
import { forgetMockMatching } from '@/api/mock/events';

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

// A phone that keeps nothing, an app started without development settings and the mock's friendships, classes and
// Meetups as they start.
export async function startFresh(): Promise<void> {
  resetMockFriendships();
  resetMockTimetable();
  resetMockMeetups();
  for (const setting of SETTINGS) {
    Reflect.deleteProperty(process.env, setting);
  }
  await AsyncStorage.clear();
  forgetMockSwitch();
  forgetMockMatching();
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
