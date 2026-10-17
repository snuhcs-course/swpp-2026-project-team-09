/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { apiClient } from '@/api/client';
import { newIdempotencyKey } from '@/api/idempotency-key';
import type { ClassSave, TimetableClass } from '@/api/types';
import { myUserId } from '@/auth/sign-in';
import { type KeptVersion, type KeptVersions, keepVersions, readKeptVersions } from '@/storage/timetable-versions';

// The User's timetable versions, until the main server keeps them (P13 spec, "Versions"). The main server keeps one
// timetable, the current version's; the other versions are kept on this phone, so another phone, or the app installed
// again, sees only the current one.
//
// A switch keeps the current classes on the phone, resets the main server's timetable and adds the picked version's
// classes one by one. A switch that stops midway is kept as unfinished: `retry` adds only the classes still missing,
// and no version's classes are dropped before they are all on the main server.

export const MOST_VERSIONS = 10;
export const NAME_LENGTH = 20;
// The classes already on the main server become this version the first time.
export const FIRST_VERSION_NAME = '2026-2학기';

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

// One change at a time, so that two do not each write over what the other kept.
let last: Promise<unknown> = Promise.resolve();

function queued<Result>(work: () => Promise<Result>): Promise<Result> {
  const run = last.then(work);
  last = run.catch(() => null);
  return run;
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

async function currentClasses(): Promise<ClassSave[]> {
  return (await apiClient.listClasses()).map((lesson) => saveOf(lesson));
}

// The versions kept for the signed-in User. The first time, the classes on the main server become the first version.
async function load(): Promise<KeptVersions> {
  const owner = myUserId();
  const kept = await readKeptVersions();
  if (kept !== null && kept.owner === owner) {
    return kept;
  }
  const id = newId();
  const first: KeptVersions = {
    owner,
    currentId: id,
    versions: [{ id, name: FIRST_VERSION_NAME, classes: [] }],
    unfinished: null,
  };
  await keepVersions(first);
  return first;
}

async function settled(): Promise<KeptVersions> {
  const kept = await load();
  if (kept.unfinished !== null) {
    throw new VersionsRefusal('unfinished');
  }
  return kept;
}

function view({ versions, currentId, unfinished }: KeptVersions): VersionsView {
  return { versions: versions.map(({ id, name }) => ({ id, name })), currentId, unfinished: unfinished !== null };
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
    kept = { ...kept, unfinished: { reset: true, missing } };
    // oxlint-disable-next-line no-await-in-loop -- kept after each class, so that a stop loses none
    await keepVersions(kept);
  }
  await keepVersions({ ...kept, unfinished: null });
}

// `kept.versions` holds the version switched to. `current` is the current version's classes to keep under it, or null
// when the current version is gone.
async function switchTo(kept: KeptVersions, id: string, current: ClassSave[] | null): Promise<void> {
  const versions = current === null ? kept.versions : withCurrent(kept, { classes: current });
  const picked = versions.find((version) => version.id === id);
  if (picked === undefined) {
    return;
  }
  const switching: KeptVersions = {
    ...kept,
    versions,
    currentId: id,
    unfinished: { reset: false, missing: picked.classes.map((save) => ({ key: newIdempotencyKey(), save })) },
  };
  await keepVersions(switching);
  await finish(switching);
}

function withCurrent(kept: KeptVersions, change: Partial<KeptVersion>): KeptVersion[] {
  const index = kept.versions.findIndex((version) => version.id === kept.currentId);
  const version = kept.versions[index];
  return version === undefined ? kept.versions : kept.versions.with(index, Object.assign({}, version, change));
}

async function make(name: (kept: KeptVersions) => string, classes: ClassSave[] | null): Promise<void> {
  const kept = await settled();
  if (kept.versions.length >= MOST_VERSIONS) {
    throw new VersionsRefusal('too-many');
  }
  const current = await currentClasses();
  const id = newId();
  const made = { id, name: cut(name(kept)), classes: classes ?? current };
  await switchTo({ ...kept, versions: [...kept.versions, made] }, id, current);
}

export function readVersions(): Promise<VersionsView> {
  return queued(async () => view(await load()));
}

// Makes a version of the classes and switches to it. Throws VersionsRefusal `too-many` with 10 already, and what the main server
// refused when the switch stops; the switch is then unfinished.
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
    if (id === kept.currentId) {
      return;
    }
    await switchTo(kept, id, await currentClasses());
  });
}

// At most 20 characters; an empty name keeps the old one.
export function renameCurrentVersion(name: string): Promise<void> {
  return queued(async () => {
    const kept = await load();
    const named = cut(name);
    if (named === '') {
      return;
    }
    await keepVersions({ ...kept, versions: withCurrent(kept, { name: named }) });
  });
}

// Switches to the first version that remains. The last version is never deleted.
export function deleteCurrentVersion(): Promise<void> {
  return queued(async () => {
    const kept = await settled();
    const rest = kept.versions.filter((version) => version.id !== kept.currentId);
    const [first] = rest;
    if (first === undefined) {
      return;
    }
    await switchTo({ ...kept, versions: rest }, first.id, null);
  });
}

// Goes on with an unfinished switch: adds only the classes still missing.
export function retrySwitch(): Promise<void> {
  return queued(async () => {
    await finish(await load());
  });
}
