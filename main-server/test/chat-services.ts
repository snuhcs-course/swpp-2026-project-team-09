/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type ChatAssistantServices } from '../src/assistant/chat/chat-assistant.js';
import { CATALOGUE_FILE, readCatalogue } from '../src/assistant/library/catalogue.js';
import { readTutorialContent, servedContent, TUTORIAL_FILE } from '../src/tutorial/tutorial-content.js';

// Services for the chat Assistant that hold no data, so that the chat can be built, and its prompt and tools sent,
// without a database. What the chat reads as it is built, the library's catalogue and the tutorial's quests at a
// place, is read from the server's own files, so that the tools' descriptions are those the server sends. Any other
// property is another such service, and calling one fails.

// `then` is null, so that awaiting a service does not take it for a promise.
function noData(path: string, given: ReadonlyMap<string, unknown>): unknown {
  return new Proxy(() => null, {
    get: (_target, key) => {
      const next = `${path}.${String(key)}`;
      if (key === 'then') {
        return null;
      }
      return given.has(next) ? given.get(next) : noData(next, given);
    },
    apply: () => {
      throw new Error(`${path}: no data here`);
    },
  });
}

export async function chatServicesWithoutData(): Promise<ChatAssistantServices> {
  const tutorial = servedContent(await readTutorialContent(TUTORIAL_FILE), {
    libraryBooking: true,
    kwanjeongCheck: true,
  });
  const placedQuests = tutorial.quests.flatMap(({ key, title, places }) =>
    places.length === 0 ? [] : [{ key, title }],
  );
  const given = new Map<string, unknown>([
    ['services.library.catalogue', await readCatalogue(CATALOGUE_FILE)],
    ['services.lookups.tutorial.placedQuests', (): typeof placedQuests => placedQuests],
  ]);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- services that hold nothing stand in for each
  return noData('services', given) as ChatAssistantServices;
}
