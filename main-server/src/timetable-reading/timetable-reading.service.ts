/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { HttpException, HttpStatus, Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { causeOf, type Model } from '../assistant/adapter.js';
import { koreaDate } from '../assistant/korea-time.js';
import { ModelPort } from '../assistant/model-port.js';
import { REDIS } from '../common/redis.module.js';
import { type Settings } from '../common/settings.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { LETTERS, type Weekday } from './labels.js';
import { checkedReading, type TimetableReading } from './reading-checks.js';
import { blocksAnswer, listedBlocks, nearMissGroups, withSecondLook } from './second-look.js';
import { UnreadableImageException } from './unreadable-image.exception.js';
import { type GridFound, gridListed, placedAnswer, placedBlocks } from './grid-mapping.js';
import {
  askForBlockText,
  askForGridText,
  askForTimetable,
  type ListedBlock,
  type ModelAnswer,
  type ReadingLimits,
  type TimetableImage,
} from './reading-model.js';

// A class block the phone found on the picture: its day, its 24-hour times and its fill colour; when it fades, its
// `end` is where its colour ends, and the model reads the true end.
export interface FoundBlock {
  weekday: Weekday;
  start: string;
  end: string;
  colour: [number, number, number] | null;
  fades?: boolean;
}

// P15-52: reads a timetable screenshot with the model of the key `llm.key` names, and checks what it read. The picture
// lives only in this request: it is sent to the model and neither stored nor logged, nor is what the model read.

// A day's count outlives its day in Korea, whatever the server's clock, and is then dropped.
const COUNT_LIFETIME_SECONDS = 2 * 24 * 60 * 60;

// The largest picture the model takes, 5 MB (the Anthropic API's limit for one image).
export const MOST_IMAGE_BYTES = 5 * 1024 * 1024;

// The picture's kind by its first bytes: what Claude reads (PNG, JPEG, WebP, GIF). Null for anything else, such as
// HEIC, which the phone then reads itself.
export function imageTypeOf(bytes: Uint8Array): string | null {
  const starts = (...values: number[]): boolean => values.every((value, index) => bytes[index] === value);
  if (starts(0x89, 0x50, 0x4e, 0x47)) {
    return 'image/png';
  }
  if (starts(0xff, 0xd8, 0xff)) {
    return 'image/jpeg';
  }
  if (starts(0x47, 0x49, 0x46, 0x38)) {
    return 'image/gif';
  }
  const webp = String.fromCodePoint(...bytes.subarray(8, 12));
  return starts(0x52, 0x49, 0x46, 0x46) && webp === 'WEBP' ? 'image/webp' : null;
}

@Injectable()
export class TimetableReadingService {
  private readonly logger = new Logger(TimetableReadingService.name);
  private readonly daily: number;
  private readonly limits: ReadingLimits;

  constructor(
    private readonly models: ModelPort,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(CLOCK) private readonly clock: Clock,
    settings: ConfigService<Settings, true>,
  ) {
    this.daily = settings.get('TIMETABLE_READING_DAILY', { infer: true });
    this.limits = {
      timeoutMs: settings.get('TIMETABLE_READING_TIMEOUT_MS', { infer: true }),
      maxOutputTokens: settings.get('TIMETABLE_READING_MAX_OUTPUT_TOKENS', { infer: true }),
    };
  }

  // The classes on the picture, or why not: 422 for a picture the model cannot take, 429 once the User's readings of
  // the day are used up, 503 when the model cannot read now. On each, the app reads the picture on the phone.
  async read(userId: string, base64: string, grid: GridFound | null): Promise<TimetableReading> {
    const bytes = Buffer.from(base64, 'base64');
    const mediaType = imageTypeOf(bytes);
    if (mediaType === null || bytes.length > MOST_IMAGE_BYTES) {
      throw new UnreadableImageException();
    }
    const chosen = this.models.chosen();
    if (chosen === null) {
      this.logger.warn('A timetable was not read: the server has no key by the name llm.key gives');
      throw unavailable();
    }
    const key = `timetable-readings:${userId}:${koreaDate(this.clock.now())}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, COUNT_LIFETIME_SECONDS);
    if (count > this.daily) {
      this.logger.log(`A User reached the daily limit of ${this.daily} timetable readings`);
      throw new HttpException("Today's timetable readings are used up", HttpStatus.TOO_MANY_REQUESTS);
    }
    try {
      const { answer, mapped } = await readAnswer(chosen.model, { data: bytes, mediaType }, { grid }, this.limits);
      const reading = checkedReading(answer);
      const counts =
        reading.kind === 'read'
          ? `${reading.classes.length} classes, ${reading.leftOut.length} blocks left out`
          : 'no timetable';
      const how = grid === null ? 'the whole picture' : mapped === true ? 'the grid' : 'the grid, its mapping refused';
      this.logger.log(`A timetable was read from ${how}: ${counts}`);
      return reading;
    } catch (error) {
      this.logger.warn(`A timetable was not read: ${causeOf(error)}`);
      throw unavailable();
    }
  }
}

function unavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException('The timetable cannot be read now');
}

// What the phone found on the picture, if anything: the label-free grid (the design), or blocks with days and times
// placed from ML Kit's labels (the earlier design, kept for the experiment's comparison).
export interface Found {
  grid?: GridFound | null;
  blocks?: readonly FoundBlock[] | null;
}

// The model's first reading, as an answer of the whole picture's shape, and the blocks as listed for a second look.
async function firstReading(
  model: Model,
  image: TimetableImage,
  { grid, blocks }: Found,
  limits: ReadingLimits,
): Promise<{ answer: ModelAnswer; listed: (ListedBlock | null)[]; mapped: boolean | null; raw: unknown }> {
  if (grid !== undefined && grid !== null && grid.blocks.length > 0) {
    const layout = (await askForGridText(model, image, grid.blocks, limits)).answer;
    const placed = placedBlocks(grid, layout);
    if (placed !== null) {
      const listed = gridListed(grid, placed);
      const text = (await askForBlockText(model, image, listed, limits)).answer;
      return { answer: placedAnswer(grid, placed, text), listed, mapped: true, raw: { layout, text } };
    }
    const whole = (await askForTimetable(model, image, limits)).answer;
    return { answer: whole, listed: listedBlocks(whole), mapped: false, raw: { layout, whole } };
  }
  if (blocks !== undefined && blocks !== null && blocks.length > 0) {
    const sent = blocks.map(({ weekday, start, end, fades }) => ({ day: LETTERS[weekday], start, end, fades }));
    const text = (await askForBlockText(model, image, sent, limits)).answer;
    return { answer: blocksAnswer(sent, text), listed: sent, mapped: null, raw: text };
  }
  const answer = (await askForTimetable(model, image, limits)).answer;
  return { answer, listed: listedBlocks(answer), mapped: null, raw: answer };
}

// What the model reads: the found blocks' text, days and rough times when the phone sent its grid (the code then
// places them from the pixels), else the whole picture; then a second look at the blocks whose names are near misses
// of each other (one or two characters apart, of one colour), so that one class read slightly differently on two days
// is read again, on its own, rather than merged or split by a guess. `mapped` says whether the grid's mapping held;
// `raw` is the model's first answer as it came, for the experiment's records.
export async function readAnswer(
  model: Model,
  image: TimetableImage,
  found: Found,
  limits: ReadingLimits,
): Promise<{ answer: ModelAnswer; mapped: boolean | null; raw: unknown }> {
  const { answer, listed, mapped, raw } = await firstReading(model, image, found, limits);
  const colours = found.grid?.blocks ?? found.blocks ?? [];
  const groups = nearMissGroups(
    answer.blocks.map((block, index) => ({ name: block.name, colour: colours[index]?.colour ?? null })),
  );
  const indexes = groups.flat().filter((index) => (listed[index] ?? null) !== null);
  if (indexes.length === 0) {
    return { answer, mapped, raw };
  }
  const again = indexes.flatMap((index) => {
    const one = listed[index] ?? null;
    return one === null ? [] : [one];
  });
  const second = await askForBlockText(model, image, again, limits);
  return { answer: withSecondLook(answer, indexes, second.answer), mapped, raw };
}
