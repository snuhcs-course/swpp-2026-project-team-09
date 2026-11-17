/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQueryClient } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import type { SentGrid } from '@/api/timetable-reading-types';
import { placesQuery } from '@/api/queries';
import { asksMainServer } from '@/api/servers';
import type { Place } from '@/api/types';
import { useNotReadyToast, useToast } from '@/design-system';
import type { TimetableVersions } from '@/features/timetable/use-versions';
import { MOST_VERSIONS, readVersions } from '@/features/timetable/versions';
import { agreeToReading, readingAgreed } from '@/storage/reading-notice';
import { type ImportPlan, importPlan, MOST_IMPORTED } from './import-plan';
import { hasNativeOcr, type NativeOcrResult, type OcrReading, readImageText } from './native-ocr';
import { gridGeometry, type SkippedBlock } from './grid-geometry';
import { type Reading, readTimetable } from './read-timetable';
import { readingFromServer } from './server-reading';

// `이미지로 불러오기` (P13 spec, "Importing"; P15-52): a screenshot of a timetable picked from the album is read and
// becomes a new version, which is switched to; the timetable screen then opens. The main server's AI reads it when the
// User agreed to send it (asked once, before the first send); the phone reads it itself when the User did not, when the
// main server does not answer or refuses (a server without the route answers 404), and in a build without the main
// server. The copy the picker may leave in the app's cache is deleted once read.

export const READING = '시간표를 읽고 있어요';
export const NOTHING_READ = '시간표를 찾지 못했어요';
export const MADE = '시간표를 만들었어요';
const TOO_MANY = '시간표는 10개까지 저장할 수 있어요';
// Anything but the reading failed, such as the album's permission or the phone's storage, or another change of the
// versions is on its way.
export const NOT_SAVED = '저장하지 못했어요. 다시 시도해 주세요';
// The notice before the first send (P15-52).
export const SEND_TITLE = '시간표 사진을 서버에서 읽어요';
export const SEND_BODY = '더 정확하게 읽도록 사진을 서버의 AI에 보내요. 사진은 읽기만 하고 저장하지 않아요.';
export const SEND = '보내기';
export const PHONE_ONLY = '휴대폰에서 읽기';

// The reading pipeline (ticket 02): a test may pass a fake one.
export type ReadImage = (ocr: NativeOcrResult, places: readonly Place[]) => Reading;

export interface ImportFromImage {
  // The import is on its way; further presses are ignored.
  reading: boolean;
  start: () => void;
  // The notice before the first send shows: `answer(true)` sends, `answer(false)` reads on the phone.
  asking: boolean;
  answer: (send: boolean) => void;
}

async function versionNames(versions: TimetableVersions): Promise<string[]> {
  return (versions.view ?? (await readVersions())).versions.map(({ name }) => name);
}

// The picker copies the picked image into the app's cache on Android: that copy is not kept.
function forgetImage(uri: string): void {
  try {
    if (uri.startsWith(Paths.cache.uri)) {
      new File(uri).delete();
    }
  } catch {
    // Already gone, or not the app's to delete.
  }
}

// `18개 중 15개만 넣었어요` when the cut to 15 applied; what was left out for other reasons follows.
function madeWords({ cut, found }: ImportPlan, leftOut: number): string {
  const words = cut ? `${found}개 중 ${MOST_IMPORTED}개만 넣었어요` : MADE;
  return leftOut > 0 ? `${words} · ${leftOut}개는 넣지 못했어요` : words;
}

interface Steps {
  versions: TimetableVersions;
  read: ReadImage;
  places: () => Promise<Place[]>;
  show: (message: string, shownMs?: number, icon?: 'alert') => void;
  showNotReady: () => void;
  // The image was picked: the sheet `시간표를 읽고 있어요` shows until the import is done.
  picked: () => void;
  // Whether the User agrees to send the picture: asked once, and remembered on a yes.
  agreesToSend: () => Promise<boolean>;
}

// Whether to send the picture to the main server: only in a build that asks it, and once the User agreed.
async function sendsToServer(agreesToSend: () => Promise<boolean>): Promise<boolean> {
  if (!asksMainServer()) {
    return false;
  }
  if (await readingAgreed()) {
    return true;
  }
  const agreed = await agreesToSend();
  if (agreed) {
    await agreeToReading();
  }
  return agreed;
}

// The main server's reading, or null when it gave none: no answer, a refusal, or a server without the route.
async function serverReading(
  image: string,
  found: { grid: SentGrid; skipped: SkippedBlock[] } | null,
  places: () => Promise<Place[]>,
): Promise<Reading | null> {
  try {
    const answer = await apiClient.readTimetableImage(image, found?.grid ?? null);
    return readingFromServer(answer, await places(), found?.skipped ?? []);
  } catch {
    return null;
  }
}

type Outcome = { kind: 'read'; reading: Reading } | { kind: 'unavailable' } | { kind: 'failed' };

// The grid the phone's pixels give, to send with the picture, and the blocks it found and does not send; null without
// the native module (it gives the pixels with ML Kit's answer) or when no grid is found, and the AI then reads the
// whole picture. No OCR'd label is used.
function phoneGrid(ocr: OcrReading): { grid: SentGrid; skipped: SkippedBlock[] } | null {
  const found = ocr.kind === 'read' ? gridGeometry(ocr.result.pixels) : null;
  return found === null ? null : { grid: { columns: found.columns, blocks: found.blocks }, skipped: found.skipped };
}

// The picked picture read: by the main server when it is sent and answers, else by the phone. The phone reads it first
// either way: its grid goes with the picture, and its own reading is there if the server gives none.
async function readPicked(
  asset: { uri: string; base64?: string | null },
  send: boolean,
  read: ReadImage,
  places: () => Promise<Place[]>,
): Promise<Outcome> {
  const ocr = await readImageText(asset.uri);
  forgetImage(asset.uri);
  const image = send ? (asset.base64 ?? null) : null;
  const fromServer = image === null ? null : await serverReading(image, phoneGrid(ocr), places);
  if (fromServer !== null) {
    return { kind: 'read', reading: fromServer };
  }
  return ocr.kind === 'read' ? { kind: 'read', reading: read(ocr.result, await places()) } : { kind: ocr.kind };
}

async function importImage({ versions, read, places, show, showNotReady, picked, agreesToSend }: Steps): Promise<void> {
  if ((await versionNames(versions)).length >= MOST_VERSIONS) {
    show(TOO_MANY, undefined, 'alert');
    return;
  }
  const send = await sendsToServer(agreesToSend);
  if (!send && !hasNativeOcr()) {
    showNotReady();
    return;
  }
  const album = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
    base64: send,
  });
  const asset = album.canceled ? undefined : album.assets[0];
  if (asset === undefined) {
    return;
  }
  picked();
  const outcome = await readPicked(asset, send, read, places);
  if (outcome.kind === 'unavailable') {
    showNotReady();
    return;
  }
  if (outcome.kind === 'failed') {
    show(NOTHING_READ, undefined, 'alert');
    return;
  }
  const plan = importPlan(outcome.reading, await versionNames(versions));
  if (plan === null) {
    show(NOTHING_READ, undefined, 'alert');
    return;
  }
  const made = await versions.make(plan.name, plan.classes);
  // Null: the versions' own toast said why.
  if (made !== null) {
    router.push('/me/timetable');
    show(madeWords(plan, plan.leftOut + made.dropped.classes + made.dropped.times + made.refused));
  }
}

// The notice before the first send: `agreesToSend` shows it and settles with the User's answer.
function useSendNotice(): { asking: boolean; answer: (send: boolean) => void; agreesToSend: () => Promise<boolean> } {
  const [asking, setAsking] = useState(false);
  const answered = useRef<((send: boolean) => void) | null>(null);
  const agreesToSend = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        answered.current = resolve;
        setAsking(true);
      }),
    [],
  );
  const answer = useCallback((send: boolean) => {
    setAsking(false);
    answered.current?.(send);
    answered.current = null;
  }, []);
  return { asking, answer, agreesToSend };
}

export function useImportFromImage(versions: TimetableVersions, read: ReadImage = readTimetable): ImportFromImage {
  const queryClient = useQueryClient();
  const show = useToast();
  const showNotReady = useNotReadyToast();
  const running = useRef(false);
  const [reading, setReading] = useState(false);
  const { asking, answer, agreesToSend } = useSendNotice();

  const start = useCallback(() => {
    if (running.current) {
      return;
    }
    if (versions.busy) {
      show(NOT_SAVED, undefined, 'alert');
      return;
    }
    running.current = true;
    // The Places from `GET /places`, once per import; without them no room is linked to a building.
    const places = (): Promise<Place[]> => queryClient.query(placesQuery).catch((): Place[] => []);
    void importImage({
      versions,
      read,
      places,
      show,
      showNotReady,
      picked: () => {
        setReading(true);
      },
      agreesToSend,
    })
      .catch(() => {
        show(NOT_SAVED, undefined, 'alert');
      })
      .finally(() => {
        running.current = false;
        setReading(false);
      });
  }, [versions, read, queryClient, show, showNotReady, agreesToSend]);

  return { reading, start, asking, answer };
}
