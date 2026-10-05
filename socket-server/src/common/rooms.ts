// Every connection of the User, whatever its session, so that a signal for the User reaches each of them.
export function userRoom(userId: string): string {
  return `user:${userId}`;
}
