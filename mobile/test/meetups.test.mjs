import test from "node:test";
import assert from "node:assert/strict";
import { localFields, meetupBody } from "../src/forms.ts";
import { meetupActions, meetupStatus, canJoinParty } from "../src/meetups.ts";
const now = Date.parse("2026-09-27T00:00:00Z");
const meetup = {
  id: "plan",
  sender: { id: "sender" },
  recipient: { id: "recipient" },
  status: "pending",
  startsAt: "2026-09-28T10:00:00Z",
};
const draft = {
  friendId: "other-user-id",
  title: " 점심 ",
  locationName: " 학생회관 정문 ",
  times: {
    startDate: "2026-09-29",
    startTime: "12:00",
    endDate: "2026-09-29",
    endTime: "13:00",
  },
};
test("manual plan submission sends exact chosen friend user, title, time and place", () => {
  const body = meetupBody(draft, now);
  assert.equal(body.friendId, "other-user-id");
  assert.equal(body.title, "점심");
  assert.equal(body.locationName, "학생회관 정문");
  assert.equal(new Date(body.startsAt).getHours(), 12);
  assert.equal(new Date(body.endsAt).getHours(), 13);
  assert.deepEqual(Object.keys(body).sort(), [
    "endsAt",
    "friendId",
    "locationName",
    "startsAt",
    "title",
  ]);
});
test("proposal requires valid future range and bounded nonempty activity/place", () => {
  for (const patch of [
    { friendId: "" },
    { title: " " },
    { locationName: "" },
    { title: "a".repeat(201) },
    { locationName: "a".repeat(301) },
    { times: { ...draft.times, endTime: "11:00" } },
    { times: { ...draft.times, startDate: "2026-02-30" } },
  ]) {
    assert.throws(() => meetupBody({ ...draft, ...patch }, now));
  }
  assert.throws(() => meetupBody(draft, Date.parse("2027-01-01T00:00:00Z")));
});
test("only recipient accepts/declines and only sender cancels a pending plan", () => {
  assert.deepEqual(meetupActions(meetup, "recipient", now), [
    "accept",
    "decline",
  ]);
  assert.deepEqual(meetupActions(meetup, "sender", now), ["cancel"]);
  assert.deepEqual(meetupActions(meetup, "stranger", now), []);
});
test("expired and closed plans cannot be acted on even before next snapshot", () => {
  assert.equal(meetupStatus(meetup, Date.parse(meetup.startsAt)), "expired");
  assert.deepEqual(
    meetupActions(meetup, "recipient", Date.parse(meetup.startsAt)),
    [],
  );
  for (const status of ["accepted", "declined", "cancelled", "expired"]) {
    assert.deepEqual(
      meetupActions({ ...meetup, status }, "recipient", now),
      [],
    );
    assert.deepEqual(meetupActions({ ...meetup, status }, "sender", now), []);
    assert.equal(
      meetupStatus({ ...meetup, status }, Date.parse("2027-01-01")),
      status,
    );
  }
});
test("private friend parties never expose public join, and full/member parties cannot join", () => {
  const party = { isMember: false, memberCount: 1, maxMembers: 2 };
  assert.equal(canJoinParty(party), true);
  assert.equal(canJoinParty({ ...party, visibility: "private" }), false);
  assert.equal(canJoinParty({ ...party, isMember: true }), false);
  assert.equal(canJoinParty({ ...party, memberCount: 2 }), false);
});

test("proposal duration allows exactly 31 days and rejects one minute longer", () => {
  const startsAt = new Date(2026, 8, 29, 12, 0).getTime();
  const endFields = localFields(new Date(startsAt + 31 * 24 * 60 * 60_000));
  const plan = {
    ...draft,
    times: { ...draft.times, endDate: endFields.date, endTime: endFields.time },
  };
  assert.doesNotThrow(() => meetupBody(plan, now));
  const tooLate = localFields(
    new Date(startsAt + 31 * 24 * 60 * 60_000 + 60_000),
  );
  assert.throws(
    () =>
      meetupBody(
        {
          ...plan,
          times: {
            ...plan.times,
            endDate: tooLate.date,
            endTime: tooLate.time,
          },
        },
        now,
      ),
    /최대 31일/,
  );
});
