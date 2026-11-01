/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS } from '../common/redis.module.js';
import { type Settings } from '../common/settings.js';
import { FriendsService } from '../friends/friends.service.js';
import { MenusService } from '../menus/menus.service.js';
import { GlobalEventsService } from '../global-events/global-events.service.js';
import { PlaceLookup } from '../places/place-lookup.js';
import { PlacesService } from '../places/places.service.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { RecruitingService } from '../quests/recruiting.service.js';
import { ShuttleService } from '../shuttle/shuttle.service.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../travel/travel.js';
import {
  causeOf,
  type Model,
  MODEL_PORT,
  RUN_OBSERVER,
  runFeature,
  type RunLimits,
  type RunObserver,
} from './adapter.js';
import { chatAssistant } from './chat/chat-assistant.js';
import { type AssistantReplyDto } from './dto/assistant-messages.dto.js';
import { type ChatMessage, type Feature } from './feature.js';
import { UserDayService } from './free-time/user-day.service.js';
import { koreaDate } from './korea-time.js';

// The latest messages the model is given. Earlier ones are dropped, so that a long conversation does not make every
// message cost more.
export const HISTORY_MAX = 20;

// A day's count outlives its day in Korea, whatever the server's clock, and is then dropped.
const COUNT_LIFETIME_SECONDS = 2 * 24 * 60 * 60;

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  private readonly chat: Feature;
  private readonly keyConfigured: boolean;
  private readonly dailyMessages: number;
  private readonly limits: RunLimits;

  constructor(
    @Inject(MODEL_PORT) private readonly model: Model,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(CLOCK) private readonly clock: Clock,
    settings: ConfigService<Settings, true>,
    menus: MenusService,
    shuttle: ShuttleService,
    globalEvents: GlobalEventsService,
    recruiting: RecruitingService,
    friends: FriendsService,
    places: PlacesService,
    placeLookup: PlaceLookup,
    days: UserDayService,
    @Inject(TRAVEL_PROVIDER) travel: TravelProvider,
    // Only the benchmark binds one (main-server/eval).
    @Optional() @Inject(RUN_OBSERVER) private readonly observer?: RunObserver,
  ) {
    this.chat = chatAssistant({
      menus,
      shuttle,
      globalEvents,
      recruiting,
      friends,
      places,
      freeTime: { days, recruiting, globalEvents, places: placeLookup, travel },
    });
    this.keyConfigured = settings.get('OPENROUTER_API_KEY', { infer: true }) !== '';
    this.dailyMessages = settings.get('ASSISTANT_DAILY_MESSAGES', { infer: true });
    this.limits = {
      maxSteps: settings.get('ASSISTANT_MAX_STEPS', { infer: true }),
      timeoutMs: settings.get('ASSISTANT_TIMEOUT_MS', { infer: true }),
      maxOutputTokens: settings.get('ASSISTANT_MAX_OUTPUT_TOKENS', { infer: true }),
    };
  }

  // The reply, or one error reply whatever failed: 503 when the Assistant cannot answer, 429 once the User's messages
  // of the day are used up. The log says why, never what anyone wrote.
  async reply(userId: string, messages: readonly ChatMessage[]): Promise<AssistantReplyDto> {
    if (!this.keyConfigured) {
      this.logger.warn('The Assistant did not answer: no OpenRouter key is configured');
      throw unavailable();
    }
    const now = this.clock.now();
    const sent = await this.countMessage(userId, now);
    if (sent > this.dailyMessages) {
      this.logger.log(`A User reached the daily limit of ${this.dailyMessages} messages`);
      throw new HttpException("Today's messages are used up", HttpStatus.TOO_MANY_REQUESTS);
    }
    const latest = messages.slice(-HISTORY_MAX);
    try {
      const reply = await runFeature(this.model, this.chat, { userId, now }, latest, this.limits, this.observer);
      return { text: reply.text, mapButtons: reply.mapButtons, cards: reply.cards, proposal: reply.proposal };
    } catch (error) {
      this.logger.warn(`The Assistant did not answer: ${causeOf(error)}`);
      throw unavailable();
    }
  }

  // Counts the User's message in their day in Korea, and answers how many they have sent that day.
  private async countMessage(userId: string, now: Date): Promise<number> {
    const key = `assistant:messages:${userId}:${koreaDate(now)}`;
    const sent = await this.redis.incr(key);
    await this.redis.expire(key, COUNT_LIFETIME_SECONDS);
    return sent;
  }
}

function unavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException('The Assistant cannot answer now');
}
