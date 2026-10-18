/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQueryClient } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { placesQuery } from '@/api/queries';
import type { Place } from '@/api/types';
import { useNotReadyToast, useToast } from '@/design-system';
import type { TimetableVersions } from '@/features/timetable/use-versions';
import { MOST_VERSIONS, readVersions } from '@/features/timetable/versions';
import { importPlan } from './import-plan';
import { hasNativeOcr, type NativeOcrResult, readImageText } from './native-ocr';
import { type Reading, readTimetable } from './read-timetable';

// `이미지로 불러오기` (P13 spec, "Importing"): a screenshot of a timetable picked from the album is read on the phone
// and becomes a new version, which is switched to; the timetable screen then opens. The image never leaves the phone,
// and the copy the picker may leave in the app's cache is deleted once read.

export const READING = '시간표를 읽고 있어요';
export const NOTHING_READ = '시간표를 찾지 못했어요';
export const CUT = '수업은 15개까지만 넣었어요';
export const MADE = '시간표를 만들었어요';
const TOO_MANY = '시간표는 10개까지 저장할 수 있어요';
// Anything but the reading failed, such as the album's permission or the phone's storage, or another change of the
// versions is on its way.
export const NOT_SAVED = '저장하지 못했어요. 다시 시도해 주세요';

// The reading pipeline (ticket 02): a test may pass a fake one.
export type ReadImage = (ocr: NativeOcrResult, places: readonly Place[]) => Reading;

export interface ImportFromImage {
  // The import is on its way; further presses are ignored.
  reading: boolean;
  start: () => void;
}

async function versionCount(versions: TimetableVersions): Promise<number> {
  return (versions.view ?? (await readVersions())).versions.length;
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

function madeWords(cut: boolean, leftOut: number): string {
  const words = cut ? CUT : MADE;
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
}

async function importImage({ versions, read, places, show, showNotReady, picked }: Steps): Promise<void> {
  if ((await versionCount(versions)) >= MOST_VERSIONS) {
    show(TOO_MANY, undefined, 'alert');
    return;
  }
  const album = await launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
  const uri = album.canceled ? undefined : album.assets[0]?.uri;
  if (uri === undefined) {
    return;
  }
  picked();
  const ocr = await readImageText(uri);
  forgetImage(uri);
  if (ocr.kind === 'unavailable') {
    showNotReady();
    return;
  }
  if (ocr.kind === 'failed') {
    show(NOTHING_READ, undefined, 'alert');
    return;
  }
  const plan = importPlan(read(ocr.result, await places()), await versionCount(versions));
  if (plan === null) {
    show(NOTHING_READ, undefined, 'alert');
    return;
  }
  const made = await versions.make(plan.name, plan.classes);
  // Null: the versions' own toast said why.
  if (made !== null) {
    router.push('/me/timetable');
    show(madeWords(plan.cut, plan.leftOut + made.dropped.classes + made.dropped.times + made.refused));
  }
}

export function useImportFromImage(versions: TimetableVersions, read: ReadImage = readTimetable): ImportFromImage {
  const queryClient = useQueryClient();
  const show = useToast();
  const showNotReady = useNotReadyToast();
  const running = useRef(false);
  const [reading, setReading] = useState(false);

  const start = useCallback(() => {
    if (!hasNativeOcr()) {
      showNotReady();
      return;
    }
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
    })
      .catch(() => {
        show(NOT_SAVED, undefined, 'alert');
      })
      .finally(() => {
        running.current = false;
        setReading(false);
      });
  }, [versions, read, queryClient, show, showNotReady]);

  return { reading, start };
}
