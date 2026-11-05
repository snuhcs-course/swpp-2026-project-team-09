/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable, Logger } from '@nestjs/common';
import { normaliseWords } from '../common/normalise-words.js';
import { PrismaService } from '../common/prisma.service.js';
import { Prisma, type ResolverKind } from '../generated/prisma/client.js';
import { choseongOf } from '../places/abbreviations.js';
import { type Choice, type ResolutionLog, type ResolverAnswer } from './feature.js';

// Words of Hangul syllables and consonants alone, whose 초성 is a key of its own: 학관 and ㅎㄱ, not 301동.
const HANGUL = /^[가-힣ㄱ-ㅎ]+$/u;

type Row = Omit<Prisma.ResolutionEventUncheckedCreateInput, 'userId' | 'kind' | 'words' | 'choseong'>;

// Why a row was not written, for the log: the error's name and Prisma's code, never its message, which can hold the
// words.
function causeOf(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return `${error.name} ${error.code}`;
  }
  return error instanceof Error ? error.name : typeof error;
}

// How the User's words were resolved, one row of resolution_events each (P07 ticket 02): every resolver's answer,
// every candidate the User chose, and every Proposal whose Place they changed. Later pieces learn aliases from these
// rows and are measured on them. A row that cannot be written is logged by its cause, and the answer goes on without
// it.
@Injectable()
export class ResolutionEventsService {
  private readonly logger = new Logger(ResolutionEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // What one run of the Assistant records through its tools. An edit names the words resolved to a Place last in the
  // run, those the User most likely corrected, or none.
  forRun(userId: string): ResolutionLog {
    let placeWords = '';
    return {
      answered: async (answer) => {
        if (answer.kind === 'place') {
          placeWords = answer.words;
        }
        await this.answered(userId, answer);
      },
      edited: (fromPlaceId, toPlaceId) => this.edited(userId, placeWords, fromPlaceId, toPlaceId),
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

  private async write(userId: string, kind: ResolverKind, words: string, row: Row): Promise<void> {
    const key = normaliseWords(words);
    try {
      await this.prisma.resolutionEvent.create({
        data: { userId, kind, words: key, choseong: HANGUL.test(key) ? choseongOf(key) : null, ...row },
      });
    } catch (error) {
      this.logger.warn(`A resolution event was not recorded: ${causeOf(error)}`);
    }
  }
}
