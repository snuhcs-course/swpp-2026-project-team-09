/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Source } from '../generated/prisma/client.js';

// What differs between the Sources whose posts become Global Events. The steps that read a post take these and do not
// ask which Source it came from, so that a later Source needs only its collector and its settings here.
export interface PostSourceSettings {
  // Whether a building number alone, "301동 117호", is taken as Gwanak.
  buildingNumberIsGwanak: boolean;
  // How a link in a post's body names one of this Source's posts, with the Source's address, since another site's link
  // may use the same parameter. Its first group is the post's key.
  postKeyInLink: RegExp;
}

export const POST_SOURCES = {
  [Source.snu_events]: {
    buildingNumberIsGwanak: true,
    postKeyInLink: /snu\.ac\.kr\/snunow\/events\S*?[?&]bbsidx=(\d+)/u,
  },
  [Source.extra_snu]: { buildingNumberIsGwanak: true, postKeyInLink: /extra\.snu\.ac\.kr\/\S*?[?&]dataSeq=(\w+)/u },
} as const satisfies Partial<Record<Source, PostSourceSettings>>;

export type PostSource = keyof typeof POST_SOURCES;

export const POST_SOURCE_NAMES = [Source.snu_events, Source.extra_snu] as const satisfies readonly PostSource[];
