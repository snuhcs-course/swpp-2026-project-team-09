/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { FRAMED_PARTS, MY_FRAME_TAGS, TAG_SET } from '@/api/mock/data/quest-parts';
import type { QuestEntries } from '@/api/quest-parts-types';
import type { Profile } from '@/api/types';
import type { Build } from './build';
import { pickFor } from './stable-pick';

// The mock adapter for the tags, in both builds: a Quest's, and the User's own. Replaced by the main server's tags
// once it stores a Quest's.

// The tags the User entered for a Quest they made; else the frame's for a Quest of the mock's, and one of the mock's
// set by the id for any other. A Class Quest has no post, so it has no tags.
export function tagsOf(quest: { id: string; classQuest?: boolean }, entered: QuestEntries | undefined): string[] {
  if (entered !== undefined) {
    return entered.tags;
  }
  if (quest.classQuest === true) {
    return [];
  }
  return FRAMED_PARTS[quest.id]?.tags ?? pickFor(quest.id, TAG_SET);
}

// The User's tags are the profile's hashtags. The mock's profile often has none, so the mock build then gives the
// frame's, which its posts are ordered by.
export function myTagsOf({ hashtags }: Profile, build: Build): string[] {
  return build === 'mock' && hashtags.length === 0 ? MY_FRAME_TAGS : hashtags;
}
