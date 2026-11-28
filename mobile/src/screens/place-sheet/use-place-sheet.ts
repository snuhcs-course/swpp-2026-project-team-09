/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard } from 'react-native';
import { type PickedPlace, waitForPlace } from '@/features/places/picked-place';

// What the place sheet holds while it is open: its search and the row chosen, which 이 장소로 정하기 sets as the place.

// A building of the list or a place of the map, with the words it shows, or words kept as typed.
export type PlaceChoice =
  { kind: 'picked'; place: PickedPlace; from: 'list' | 'map' } | { kind: 'typed'; words: string };

// The words and the place a choice sets.
export function placeOfChoice(choice: PlaceChoice): { words: string; picked: PickedPlace | null } {
  return choice.kind === 'picked'
    ? { words: choice.place.words, picked: choice.place }
    : { words: choice.words, picked: null };
}

export interface PlaceSheetState {
  open: boolean;
  search: string;
  choice: PlaceChoice | null;
  onSearch: (search: string) => void;
  onChoose: (choice: PlaceChoice) => void;
  // Closes the sheet for the map view, and opens it again with the place picked there chosen.
  onMap: () => void;
  // Sets the place chosen, drops the keyboard and closes the sheet.
  onConfirm: () => void;
  onClose: () => void;
}

interface Held {
  open: boolean;
  search: string;
  choice: PlaceChoice | null;
}

// The sheet, which opens on the place's words so far with nothing chosen. Back from the map view without a place, it
// stays closed.
export function usePlaceSheet(
  words: string,
  onSet: (words: string, picked: PickedPlace | null) => void,
): { open: () => void; sheet: PlaceSheetState } {
  const [held, setHeld] = useState<Held>({ open: false, search: words, choice: null });
  const close = (): void => {
    setHeld((was) => ({ ...was, open: false }));
  };
  return {
    open: () => {
      setHeld({ open: true, search: words, choice: null });
    },
    sheet: {
      ...held,
      onSearch: (search) => {
        setHeld((was) => ({ ...was, search }));
      },
      onChoose: (choice) => {
        setHeld((was) => ({ ...was, choice }));
      },
      onMap: () => {
        close();
        waitForPlace((place) => {
          setHeld((was) => ({ ...was, open: true, choice: { kind: 'picked', place, from: 'map' } }));
        });
        router.push('/place-map');
      },
      onConfirm: () => {
        if (held.choice === null) {
          return;
        }
        const set = placeOfChoice(held.choice);
        onSet(set.words, set.picked);
        Keyboard.dismiss();
        close();
      },
      onClose: close,
    },
  };
}
