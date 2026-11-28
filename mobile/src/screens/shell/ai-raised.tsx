/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { createContext, type ReactElement, type ReactNode, use, useMemo, useState } from 'react';

// Whether the AI is raised on the map (A04 ticket 09): its input and the lines over it, the conversation to go on with
// and a made Quest's line. The bottom bar's middle raises and lowers it on the map, and raises it on the way there from
// another tab. It is kept while the app runs, in memory only, and the tabs always start with it raised.
export interface AiRaised {
  raised: boolean;
  setRaised: (raised: boolean) => void;
}

// Raised, for a screen drawn without the tabs, as in a test of the map alone.
const AiRaisedContext = createContext<AiRaised>({
  raised: true,
  setRaised: () => undefined,
});

export function AiRaisedProvider({ children }: { children: ReactNode }): ReactElement {
  const [raised, setRaised] = useState(true);
  const value = useMemo(() => ({ raised, setRaised }), [raised]);
  return <AiRaisedContext value={value}>{children}</AiRaisedContext>;
}

export function useAiRaised(): AiRaised {
  return use(AiRaisedContext);
}
