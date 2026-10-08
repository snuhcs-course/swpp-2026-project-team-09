import { useQueryClient } from '@tanstack/react-query';
import { placesQuery } from '@/api/queries';
import type { SubQuestPlace } from '@/api/room-types';
import type { Place } from '@/api/types';
import type { PickedPlace } from './picked-place';

function bare(words: string): string {
  return words.replaceAll(/\s/gu, '');
}

// What the app calls a Place: its name, its number, its number with `동`, and the words it shows for it, such as
// "제1공학관 301동" and "제1공학관 (301동)".
function namesOf({ name, number }: Place): string[] {
  const names =
    number === null ? [name] : [name, number, `${number}동`, `${name} ${number}동`, `${name} (${number}동)`];
  return names.map((one) => bare(one));
}

// The one Place the typed words name, ignoring spaces, or null when they name none or more than one.
export function placeNamed(words: string, places: readonly Place[]): Place | null {
  const typed = bare(words);
  const named = places.filter((place) => namesOf(place).includes(typed));
  return named.length === 1 ? (named[0] ?? null) : null;
}

// A point picked on the map keeps its place while the words change, and is then sent as a point with those words. A
// Place of the list is sent as itself while its words stay. Typed words are the Place they name, or else the words
// alone.
export function placeOf(
  words: string,
  picked: PickedPlace | null,
  places: readonly Place[],
): SubQuestPlace | undefined {
  const label = words.trim();
  if (label === '') {
    return undefined;
  }
  if (picked === null) {
    const named = placeNamed(label, places);
    return named === null ? { label } : { placeId: named.id };
  }
  if (picked.placeId !== null && label === picked.words) {
    return { placeId: picked.placeId };
  }
  return { ...picked.position, label };
}

// `placeOf`, with the Places of the list asked when typed words are to be named. Without the list, the words go alone.
export function usePlaceOf(): (words: string, picked: PickedPlace | null) => Promise<SubQuestPlace | undefined> {
  const queryClient = useQueryClient();
  return async (words, picked) => {
    const places =
      picked === null && words.trim() !== '' ? await queryClient.query(placesQuery).catch((): Place[] => []) : [];
    return placeOf(words, picked, places);
  };
}
