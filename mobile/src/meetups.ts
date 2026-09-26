import type { Meetup, Party } from "./api";
export type MeetupAction = "accept" | "decline" | "cancel";
export function meetupActions(
  meetup: Meetup,
  userId: string,
  now = Date.now(),
): MeetupAction[] {
  if (meetup.status !== "pending" || Date.parse(meetup.startsAt) <= now)
    return [];
  if (meetup.recipient.id === userId) return ["accept", "decline"];
  return meetup.sender.id === userId ? ["cancel"] : [];
}
export function meetupStatus(meetup: Meetup, now = Date.now()) {
  if (meetup.status === "pending" && Date.parse(meetup.startsAt) <= now)
    return "expired";
  return meetup.status;
}
export function canJoinParty(
  party: Pick<Party, "isMember" | "visibility" | "memberCount" | "maxMembers">,
) {
  return (
    !party.isMember &&
    party.visibility !== "private" &&
    party.memberCount < party.maxMembers
  );
}
