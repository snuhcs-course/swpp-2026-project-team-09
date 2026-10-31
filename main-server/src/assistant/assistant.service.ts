/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-26  Fable 5.1  prompted by fyoon46
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 * 2026-10-28  Fable 5.1  prompted by fyoon46
 * 2026-11-01  Fable 5.1  prompted by fyoon46
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
import { PlaceMatcher } from '../places/place-matcher.js';
import { PlacesService } from '../places/places.service.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { RecruitingService } from '../quests/recruiting.service.js';
import { ShuttleService } from '../shuttle/shuttle.service.js';
import {
  causeOf,
  type Model,
  MODEL_PORT,
  RUN_OBSERVER,
  runFeature,
  type RunLimits,
  type RunObserver,
} from './adapter.js';
import { AliasesService } from './aliases/aliases.service.js';
import { chatAssistant } from './chat/chat-assistant.js';
import { checkedChoice, type ChoiceServices } from './chosen.js';
import { type AssistantReplyDto, type SentMessage } from './dto/assistant-messages.dto.js';
import { type Asker, type ChatMessage, type Feature } from './feature.js';
import { koreaDate } from './korea-time.js';
import { ResolutionEventsService } from './resolution-events.service.js';
import { SuggestionsService } from './suggestions/suggestions.service.js';

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
  private readonly choiceServices: ChoiceServices;

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
    placeMatcher: PlaceMatcher,
    private readonly resolutionEvents: ResolutionEventsService,
    private readonly aliases: AliasesService,
    private readonly suggestions: SuggestionsService,
    // Only the benchmark binds one (main-server/eval).
    @Optional() @Inject(RUN_OBSERVER) private readonly observer?: RunObserver,
  ) {
    this.chat = chatAssistant({ menus, shuttle, globalEvents, recruiting, friends, places, placeMatcher, aliases });
    this.choiceServices = { places, friends, globalEvents };
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
  async reply(userId: string, messages: readonly SentMessage[]): Promise<AssistantReplyDto> {
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
    const asker = { userId, now };
    try {
      const conversation = await this.conversationOf(asker, messages.slice(-HISTORY_MAX));
      let taught = false;
      const resolutions = this.resolutionEvents.forRun(userId, async (kind, words, targetId) => {
        taught = true;
        await this.aliases.learn(userId, kind, words, targetId);
      });
      const reply = await runFeature(
        this.model,
        this.chat,
        asker,
        conversation,
        this.limits,
        resolutions,
        this.observer,
      );
      const { text, mapButtons, cards, proposal, choices, resolvedBy } = reply;
      if (proposal !== null) {
        // A Proposal asked for in the chat may be one a grey suggestion would have made (suggestions.service.ts).
        await this.suggestions.typedInstead(userId, proposal, now);
      }
      const last = conversation.at(-1);
      if (taught || resolutions.reachedPlace || (last?.role === 'user' && last.chosen !== null)) {
        // The session may have led the User's words to a Place, which everyone's aliases learn from (ticket 06).
        await this.aliases.recountSession(userId);
      }
      return { text, mapButtons, cards, proposal, choices, resolvedBy };
    } catch (error) {
      this.logger.warn(`The Assistant did not answer: ${causeOf(error)}`);
      throw unavailable();
    }
  }

  // The conversation as the feature runs it. The candidate the User's new message answers with is checked again,
  // recorded and taught as the User's alias for its words, or dropped when it fails the check. An earlier message's,
  // which the app sends back with the rest of the conversation, was recorded when it was new: it is only read, with
  // the message's text as its name.
  private async conversationOf(asker: Asker, messages: readonly SentMessage[]): Promise<ChatMessage[]> {
    const last = messages.at(-1);
    const sent = last?.role === 'user' ? last.chosen : undefined;
    const chosen = sent === undefined ? null : await checkedChoice(sent, asker, this.choiceServices);
    if (chosen !== null) {
      await this.resolutionEvents.chosen(asker.userId, chosen);
      await this.aliases.learn(asker.userId, chosen.kind, chosen.words, chosen.id);
    }
    return messages.map((message): ChatMessage => {
      if (message.role === 'assistant') {
        return message;
      }
      if (message === last) {
        return { role: 'user', text: message.text, chosen };
      }
      const earlier = message.chosen === undefined ? null : { ...message.chosen, label: message.text };
      return { role: 'user', text: message.text, chosen: earlier };
    });
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
