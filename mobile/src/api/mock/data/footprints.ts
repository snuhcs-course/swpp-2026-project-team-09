import type { Footprints } from '@/api/types';

// The app's own. The `Main` frame's "오늘의 발자국": five Friends left a story today, and the first three by time are
// 김민준, 이서연 and 박지호. The frame shows a photo for two of them; the app has no pictures of people yet, so each
// shows the name's letters.
export const FOOTPRINTS: Footprints = {
  friendCount: 5,
  faces: [
    { userId: 'f1', name: '김민준', photo: null },
    { userId: 'f2', name: '이서연', photo: null },
    { userId: 'f3', name: '박지호', photo: null },
  ],
};
