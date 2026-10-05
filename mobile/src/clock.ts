import { FRAME_NOW } from '@/api/mock/data/frame';

// The time the app counts from. While every answer is a mock, it is the moment the wireframes show, so that "23분 후"
// reads as the `Main` frame does on any day. The last ticket of P06 makes it the phone's time; from then on a screen
// that words a time against it has to ask again as time passes.
export function now(): Date {
  return new Date(FRAME_NOW);
}
