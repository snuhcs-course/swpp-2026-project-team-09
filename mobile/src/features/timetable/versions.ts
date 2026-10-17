/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { apiClient } from '@/api/client';
import { newIdempotencyKey } from '@/api/idempotency-key';
import type { ClassSave, TimetableClass } from '@/api/types';
import { myUserId } from '@/auth/sign-in';
import { now } from '@/clock';
import { koreaCalendar, koreaYear } from '@/korea-time';
import { type KeptVersion, type KeptVersions, keepVersions, readKeptVersions } from '@/storage/timetable-versions';

// The User's timetable versions, until the main server keeps them (P13 spec, "Versions"). The main server keeps one
// timetable, the current version's; the other versions are kept on this phone, per User, so another phone, or the app
// installed again, sees only the current one.
//
// A switch keeps the current classes on the phone, resets the main server's timetable and adds the picked version's
// classes one by one. The switch in progress is kept before the reset and after each class: one that stops is
// unfinished, `retry` adds only the classes still missing, and the first use of the versions after the app starts
// finishes it before anything else. No version's classes are dropped before they are all on the main server.
//
// Classes on the main server that differ from what this phone last wrote were changed elsewhere, such as on another
// phone: before a switch they are kept as a version of their own rather than written over.

export const MOST_VERSIONS = 10;
export const NAME_LENGTH = 20;
export const DRIFTED_NAME = '다른 기기에서 바꾼 시간표';

// A change the versions refuse: an 11th version (`too-many`), or anything but `retry` while a switch is unfinished.
export class VersionsRefusal extends Error {
  constructor(readonly reason: 'too-many' | 'unfinished') {
    super(reason);
  }
}

export interface VersionsView {
  versions: { id: string; name: string }[];
  currentId: string;
  // A switch stopped before every class was on the main server.
  unfinished: boolean;
}

// The semester of the day, which names the first version: `{year}-1학기` from March to August, `{year}-2학기` from
// September to February, January and February counting as the year before.
export function semesterName(at: Date): string {
  const year = koreaYear(at);
  const { month } = koreaCalendar(at);
  if (month >= 3 && month <= 8) {
    return `${year}-1학기`;
  }
  return `${month >= 9 ? year : year - 1}-2학기`;
}

// One change at a time, so that two do not each write over what the other kept.
let last: Promise<unknown> = Promise.resolve();

function queued<Result>(work: () => Promise<Result>): Promise<Result> {
  const run = last.then(work);
  last = run.catch(() => null);
  return run;
}

// The Users whose unfinished switch this launch of the app has already tried to finish.
const resumed = new Set<string>();

// For a test: the app starts again.
export function forgetLaunch(): void {
  resumed.clear();
}

function newId(): string {
  return `version-${newIdempotencyKey()}`;
}

function cut(name: string): string {
  return name.trim().slice(0, NAME_LENGTH);
}

function saveOf({ courseName, times }: TimetableClass): ClassSave {
  return {
    courseName,
    times: times.map(({ weekday, startTime, endTime, placeId, room }) => ({
      weekday,
      startTime,
      endTime,
      placeId,
      room,
    })),
  };
}

function timeOf({ weekday, startTime, endTime, placeId, room }: ClassSave['times'][number]): string {
  return [weekday, startTime, endTime, placeId ?? '', room ?? ''].join(' ');
}

// The same for the same classes in any order, whatever their ids.
function fingerprint(classes: readonly ClassSave[]): string {
  const lessons = classes.map(({ courseName, times }) =>
    [courseName, ...times.map((time) => timeOf(time)).toSorted()].join('|'),
  );
  return JSON.stringify(lessons.toSorted());
}

async function serverClasses(): Promise<ClassSave[]> {
  return (await apiClient.listClasses()).map((lesson) => saveOf(lesson));
}

// The versions kept for the signed-in User. The first time, the classes on the main server become the first version.
async function load(): Promise<KeptVersions> {
  const owner = myUserId();
  const kept = await readKeptVersions(owner);
  if (kept !== null) {
    return kept;
  }
  const id = newId();
  const first: KeptVersions = {
    owner,
    currentId: id,
    versions: [{ id, name: semesterName(now()), classes: [] }],
    unfinished: null,
    written: null,
  };
  await keepVersions(first);
  return first;
}

// Resets the main server's timetable unless that was done, and adds the missing classes, keeping after each step what
// is left.
async function finish(start: KeptVersions): Promise<void> {
  let kept = start;
  const { unfinished } = kept;
  if (unfinished === null) {
    return;
  }
  if (!unfinished.reset) {
    await apiClient.resetTimetable();
    kept = { ...kept, unfinished: { ...unfinished, reset: true } };
    await keepVersions(kept);
  }
  let missing = unfinished.missing;
  for (const { key, save } of unfinished.missing) {
    // oxlint-disable-next-line no-await-in-loop -- one by one, so that what is left is known after each
    await apiClient.addClass(save, key);
    missing = missing.slice(1);
    kept = { ...kept, unfinished: { ...unfinished, reset: true, missing } };
    // oxlint-disable-next-line no-await-in-loop -- kept after each class, so that a stop loses none
    await keepVersions(kept);
  }
  await keepVersions({ ...kept, unfinished: null, written: unfinished.written });
}

// The versions as the first use after the app starts finds them: a switch left unfinished is finished first. One that
// fails again stays unfinished, for `retry`.
async function ready(): Promise<KeptVersions> {
  const kept = await load();
  if (resumed.has(kept.owner)) {
    return kept;
  }
  resumed.add(kept.owner);
  try {
    await finish(kept);
  } catch {
    // Left for 다시 시도.
  }
  return load();
}

async function settled(): Promise<KeptVersions> {
  const kept = await ready();
  if (kept.unfinished !== null) {
    throw new VersionsRefusal('unfinished');
  }
  return kept;
}

function view({ versions, currentId, unfinished }: KeptVersions): VersionsView {
  return { versions: versions.map(({ id, name }) => ({ id, name })), currentId, unfinished: unfinished !== null };
}

function withCurrent(kept: KeptVersions, change: Partial<KeptVersion>): KeptVersion[] {
  const index = kept.versions.findIndex((version) => version.id === kept.currentId);
  const version = kept.versions[index];
  return version === undefined ? kept.versions : kept.versions.with(index, Object.assign({}, version, change));
}

// The versions with the main server's classes kept: under the current version, or as a version of their own when they
// were changed elsewhere. Null `server` is for a version being deleted: nothing is kept, so a delete is never refused.
function stashed(kept: KeptVersions, server: ClassSave[] | null): KeptVersion[] {
  if (server === null) {
    return kept.versions;
  }
  if (kept.written !== null && fingerprint(server) !== kept.written) {
    if (kept.versions.length >= MOST_VERSIONS) {
      throw new VersionsRefusal('too-many');
    }
    return [...kept.versions, { id: newId(), name: DRIFTED_NAME, classes: server }];
  }
  return withCurrent(kept, { classes: server });
}

// `kept.versions` holds the version switched to; `server` is the main server's classes as read just before, or null
// when the current version is being deleted.
async function switchTo(kept: KeptVersions, id: string, server: ClassSave[] | null): Promise<void> {
  const versions = stashed(kept, server);
  const picked = versions.find((version) => version.id === id);
  if (picked === undefined) {
    return;
  }
  const switching: KeptVersions = {
    ...kept,
    versions,
    currentId: id,
    unfinished: {
      reset: false,
      missing: picked.classes.map((save) => ({ key: newIdempotencyKey(), save })),
      written: fingerprint(picked.classes),
    },
  };
  await keepVersions(switching);
  await finish(switching);
}

async function make(name: (kept: KeptVersions) => string, classes: ClassSave[] | null): Promise<void> {
  const kept = await settled();
  if (kept.versions.length >= MOST_VERSIONS) {
    throw new VersionsRefusal('too-many');
  }
  const server = await serverClasses();
  const id = newId();
  const made = { id, name: cut(name(kept)), classes: classes ?? server };
  await switchTo({ ...kept, versions: [...kept.versions, made] }, id, server);
}

export function readVersions(): Promise<VersionsView> {
  return queued(async () => view(await ready()));
}

// Makes a version of the classes and switches to it. Throws VersionsRefusal `too-many` with 10 already, and what the
// main server refused when the switch stops; the switch is then unfinished.
export function makeVersion(name: string, classes: ClassSave[]): Promise<void> {
  return queued(() => make(() => name, classes));
}

// `새 시간표 N`, N one more than the versions.
export function addEmptyVersion(): Promise<void> {
  return queued(() => make((kept) => `새 시간표 ${kept.versions.length + 1}`, []));
}

// `{name} 복사본` with the current classes.
export function duplicateCurrentVersion(): Promise<void> {
  return queued(() =>
    make((kept) => `${kept.versions.find((version) => version.id === kept.currentId)?.name ?? ''} 복사본`, null),
  );
}

export function switchVersion(id: string): Promise<void> {
  return queued(async () => {
    const kept = await settled();
    if (id !== kept.currentId) {
      await switchTo(kept, id, await serverClasses());
    }
  });
}

// At most 20 characters; an empty name keeps the old one.
export function renameCurrentVersion(name: string): Promise<void> {
  return queued(async () => {
    const kept = await settled();
    const named = cut(name);
    if (named !== '') {
      await keepVersions({ ...kept, versions: withCurrent(kept, { name: named }) });
    }
  });
}

// Switches to the first version that remains, without asking whether the classes were changed elsewhere, so that a
// delete is always possible. The last version is never deleted.
export function deleteCurrentVersion(): Promise<void> {
  return queued(async () => {
    const kept = await settled();
    const rest = kept.versions.filter((version) => version.id !== kept.currentId);
    const [first] = rest;
    if (first !== undefined) {
      await switchTo({ ...kept, versions: rest }, first.id, null);
    }
  });
}

// Goes on with an unfinished switch: adds only the classes still missing.
export function retrySwitch(): Promise<void> {
  return queued(async () => {
    await finish(await ready());
  });
}

// This phone changed a class itself, from the timetable: what it last wrote is the main server's classes now.
export function noteClassesWritten(): Promise<void> {
  return queued(async () => {
    const kept = await readKeptVersions(myUserId());
    if (kept !== null && kept.unfinished === null) {
      await keepVersions({ ...kept, written: fingerprint(await serverClasses()) });
    }
  });
}
