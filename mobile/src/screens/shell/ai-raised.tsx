/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { createContext, type ReactElement, type ReactNode, use, useEffect, useMemo, useState } from 'react';

// Whether the AI is raised on the map (A04 ticket 09): its input and the lines over it, the conversation to go on with
// and a made Quest's line. The bottom bar's middle raises and lowers it on the map, and raises it on the way there from
// another tab. It is kept while the app runs, in memory only, and the tabs always start with it raised.
export interface AiRaised {
  raised: boolean;
  setRaised: (raised: boolean) => void;
  // What the AI has ready (A04 ticket 12), which the map tells: the conversation to go on with, 1 while there is one,
  // and each Quest made from a Plan that still waits for someone's answer. The bar's middle counts it while those lines
  // are out of sight.
  ready: number;
  setReady: (ready: number) => void;
}

// Raised, with nothing ready, for a screen drawn without the tabs, as in a test of the map alone: nothing holds the state
// outside the tabs.
function keep(): void {
  // Nothing to keep.
}

const AiRaisedContext = createContext<AiRaised>({ raised: true, setRaised: keep, ready: 0, setReady: keep });

export function AiRaisedProvider({ children }: { children: ReactNode }): ReactElement {
  const [raised, setRaised] = useState(true);
  const [ready, setReady] = useState(0);
  const value = useMemo(() => ({ raised, setRaised, ready, setReady }), [raised, ready]);
  return <AiRaisedContext value={value}>{children}</AiRaisedContext>;
}

export function useAiRaised(): AiRaised {
  return use(AiRaisedContext);
}

// For the map: tells the bar how much the AI has ready, as it changes.
export function useTellReady(ready: number): void {
  const { setReady } = use(AiRaisedContext);
  useEffect(() => {
    setReady(ready);
  }, [ready, setReady]);
}
