import { FRAME_NOW } from '@/api/mock/data/frame';
import { asksMainServer } from '@/api/servers';

// The time the app counts from: the phone's, in a build that asks the main server. Where every answer is a mock, it is
// the moment the wireframes show, so that "23분 후" reads as the `Main` frame does on any day.
export function now(): Date {
  return asksMainServer() ? new Date() : new Date(FRAME_NOW);
}

// Whether the app's time moves: it stands still where every answer is a mock.
export function clockMoves(): boolean {
  return asksMainServer();
}
