/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Source } from '../generated/prisma/client.js';
import { type CampusDefault } from './named-place.js';

// What differs between the Sources whose posts become Global Events. The steps that read a post take these and do not
// ask which Source it came from, so that a later Source needs only its collector and its settings here.
export interface PostSourceSettings {
  // The campus a place in a Judgement is read on when it names no other, "301동 117호" or "문화관 로비".
  campusDefault: CampusDefault;
  // How a link in a post's body names one of this Source's posts, with the Source's address, since another site's link
  // may use the same parameter. Its first group is the post's key.
  postKeyInLink: RegExp;
}

export const POST_SOURCES = {
  [Source.snu_events]: {
    campusDefault: 'gwanak',
    postKeyInLink: /snu\.ac\.kr\/snunow\/events\S*?[?&]bbsidx=(\d+)/u,
  },
  [Source.extra_snu]: { campusDefault: 'gwanak', postKeyInLink: /extra\.snu\.ac\.kr\/\S*?[?&]dataSeq=(\w+)/u },
} as const satisfies Partial<Record<Source, PostSourceSettings>>;

export type PostSource = keyof typeof POST_SOURCES;

export const POST_SOURCE_NAMES = [Source.snu_events, Source.extra_snu] as const satisfies readonly PostSource[];
