/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { type PlaceDto } from '../../src/places/dto/place.dto.js';
import {
  COLLECTION_DIRECTORY,
  LABEL_FILES,
  labelsASchema,
  labelsBSchema,
  postsSchema,
  readCollectionFile,
  setASchema,
  setBSchema,
} from './sets.ts';

// What a run of evaluations A and B reads of the fixed sets: the part it was told to, with the agreed answers.

export type Part = 'development' | 'held-out';

export interface GoldSession {
  n: number;
  // As the label writes it: a time, a day, or `none`.
  start: string;
  end: string;
  // A Place's id, or null when the post names none.
  placeId: string | null;
  overPeriod: boolean;
  mayPublish: boolean;
}

export interface GoldPost {
  id: string;
  post: string;
  announcesEvent: boolean;
  sessions: GoldSession[];
}

export interface PairSide {
  post: string;
  session: number | null;
}

export interface GoldPair {
  id: string;
  a: PairSide;
  b: PairSide;
  chosenAs: string;
  sameEvent: boolean;
}

export interface SavedPost {
  post: string;
  source: 'snu_events' | 'extra_snu';
  key: string;
  fetchedAt: Date;
}

const NONE = 'none';

interface LabelledPlace extends PlaceDto {
  label: string;
}

// The Places labels name. A run compares ids and asks nothing of a position, so these stand for the list the server has.
export function labelledPlaces(): LabelledPlace[] {
  const lines = readFileSync(new URL('labels/places.tsv', COLLECTION_DIRECTORY), 'utf8').trim().split('\n');
  return lines.slice(1).map((line) => {
    const [label = '', number = '', name = '', id = ''] = line.split('\t');
    return { label, number: number === '' ? null : number, name, id, latitude: 0, longitude: 0 };
  });
}

function filled<Value>(value: Value | null, where: string): Value {
  if (value === null) {
    throw new Error(`The gold file has a blank at ${where}`);
  }
  return value;
}

export function goldPosts(part: Part): GoldPost[] {
  const places = new Map(labelledPlaces().map(({ label, id }) => [label, id]));
  const labels = new Map(readCollectionFile(LABEL_FILES.aGold, labelsASchema).items.map((item) => [item.id, item]));
  return readCollectionFile('set-a.yaml', setASchema)
    .filter((item) => item.part === part)
    .map(({ id, post }) => {
      const label = labels.get(id);
      if (label === undefined) {
        throw new Error(`The gold file has no ${id}`);
      }
      return {
        id,
        post,
        announcesEvent: filled(label.announcesEvent, id),
        sessions: label.sessions.map((session) => {
          const place = filled(session.place, id);
          return {
            n: session.n,
            start: filled(session.start, id),
            end: filled(session.end, id),
            placeId: place === NONE ? null : (places.get(place) ?? filled<string>(null, `${id}'s place`)),
            overPeriod: filled(session.overPeriod, id),
            mayPublish: filled(session.mayPublish, id),
          };
        }),
      };
    });
}

export function goldPairs(part: Part): GoldPair[] {
  const labels = new Map(readCollectionFile(LABEL_FILES.bGold, labelsBSchema).items.map((item) => [item.id, item]));
  return readCollectionFile('set-b.yaml', setBSchema)
    .filter((item) => item.part === part)
    .map(({ id, a, b, chosenAs }) => ({
      id,
      a,
      b,
      chosenAs,
      sameEvent: filled(labels.get(id)?.sameEvent ?? null, id),
    }));
}

export function savedPosts(): Map<string, SavedPost> {
  return new Map(
    readCollectionFile('posts.yaml', postsSchema).map(({ post, source, key, fetchedAt }) => [
      post,
      { post, source, key, fetchedAt: new Date(fetchedAt) },
    ]),
  );
}

export function savedPage(post: string): string {
  return readFileSync(new URL(`posts/${post}.html`, COLLECTION_DIRECTORY), 'utf8');
}
