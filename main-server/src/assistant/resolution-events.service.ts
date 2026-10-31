/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { Injectable, Logger } from '@nestjs/common';
import { databaseCauseOf } from '../common/database-cause.js';
import { normaliseWords } from '../common/normalise-words.js';
import { PrismaService } from '../common/prisma.service.js';
import { type Prisma, type ResolverKind } from '../generated/prisma/client.js';
import { choseongOf } from '../places/abbreviations.js';
import { type Choice, type ChoiceKind, type ResolutionLog, type ResolverAnswer } from './feature.js';

// Words of Hangul syllables and consonants alone, whose 초성 is a key of its own: 학관 and ㅎㄱ, not 301동.
const HANGUL = /^[가-힣ㄱ-ㅎ]+$/u;

type Row = Omit<Prisma.ResolutionEventUncheckedCreateInput, 'userId' | 'kind' | 'words' | 'choseong'>;

// What a run does with a label the User gave it, a Place they changed a Proposal to: teach it as their alias for the
// words.
export type Learn = (kind: ChoiceKind, words: string, targetId: string) => Promise<void>;

// A run's log, and whether a resolver answered a Place as `one`, after which everyone's aliases of the session's words
// are counted again (P07 ticket 06).
export interface RunLog extends ResolutionLog {
  readonly reachedPlace: boolean;
}

// How the User's words were resolved, one row of resolution_events each (P07 ticket 02): every resolver's answer,
// every candidate the User chose, every Proposal whose Place they changed, and every alias they said was wrong.
// Everyone's aliases are counted from these rows (P07 ticket 03), and ticket 05 measures on them. A row that cannot be
// written is logged by its cause, and the answer goes on without it.
@Injectable()
export class ResolutionEventsService {
  private readonly logger = new Logger(ResolutionEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // What one run of the Assistant records through its tools. An edit names the words resolved to a Place last in the
  // run, those the User most likely corrected, or none, and teaches the new Place for them.
  forRun(userId: string, learn: Learn): RunLog {
    let placeWords = '';
    let reachedPlace = false;
    return {
      get reachedPlace(): boolean {
        return reachedPlace;
      },
      answered: async (answer) => {
        if (answer.kind === 'place') {
          placeWords = answer.words;
          reachedPlace ||= answer.result === 'one';
        }
        await this.answered(userId, answer);
      },
      edited: async (fromPlaceId, toPlaceId) => {
        await this.edited(userId, placeWords, fromPlaceId, toPlaceId);
        await learn('place', placeWords, toPlaceId);
      },
    };
  }

  answered(userId: string, { kind, words, result, candidateIds, tier, aliasSource }: ResolverAnswer): Promise<void> {
    return this.write(userId, kind, words, { outcome: 'answered', result, tier, aliasSource, candidateIds });
  }

  // A candidate the User tapped, once the server has checked it again.
  chosen(userId: string, { kind, id, words }: Choice): Promise<void> {
    return this.write(userId, kind, words, { outcome: 'chosen', candidateIds: [], chosenId: id });
  }

  // A Proposal's Place changed from the one sent back: the old one as the candidate, the new one as the choice.
  edited(userId: string, words: string, fromPlaceId: string, toPlaceId: string): Promise<void> {
    return this.write(userId, 'place', words, { outcome: 'edited', candidateIds: [fromPlaceId], chosenId: toPlaceId });
  }

  // The User said an alias's answer was wrong: the target as the rejected choice.
  rejected(userId: string, kind: ResolverKind, words: string, targetId: string): Promise<void> {
    return this.write(userId, kind, words, { outcome: 'rejected', candidateIds: [], chosenId: targetId });
  }

  private async write(userId: string, kind: ResolverKind, words: string, row: Row): Promise<void> {
    const key = normaliseWords(words);
    try {
      await this.prisma.resolutionEvent.create({
        data: { userId, kind, words: key, choseong: HANGUL.test(key) ? choseongOf(key) : null, ...row },
      });
    } catch (error) {
      this.logger.warn(`A resolution event was not recorded: ${databaseCauseOf(error)}`);
    }
  }
}
