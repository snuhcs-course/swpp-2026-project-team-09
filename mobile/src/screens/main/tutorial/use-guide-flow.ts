/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import type { Tutorial } from '@/api/tutorial-types';
import type { GuidePosition } from '@/features/tutorial/guide';
import type { TutorialActions } from '@/features/tutorial/use-tutorial';

// The quest whose guide is on the map, and where the User is in it.
export interface GuideView extends GuidePosition {
  key: string;
}

export interface TutorialGuideFlow {
  guide: GuideView | null;
  // A row of the list: the guide from its start, before a kind is chosen.
  openGuide: (key: string) => void;
  // ✕.
  closeGuide: () => void;
  // ←of the bar: back to the list, on the quest's category.
  backToList: () => void;
  // A kind of the choice; null chooses again (the kind's chip in the bar, or ← on its first step).
  chooseKind: (kind: string | null) => void;
  // A tab, 다음 and ←.
  goToStep: (step: number) => void;
  // A spot's chip or its pin.
  pickSpot: (spot: number) => void;
  // ✓ 완료: completes the quest by its button and opens the list on the next quest; for the 관정 quest served as
  // checked, the guide gives way to its sheet's check.
  completeGuide: () => void;
}

interface GuideDeps {
  tutorial: Tutorial | undefined;
  complete: TutorialActions['complete'];
  onList: (category: string) => void;
  onCompleted: (after: Tutorial, key: string) => void;
  onCheck: (key: string) => void;
}

export function useGuideFlow({ tutorial, complete, onList, onCompleted, onCheck }: GuideDeps): TutorialGuideFlow {
  const [guide, setGuide] = useState<GuideView | null>(null);
  const openGuide = useCallback((key: string) => {
    setGuide({ key, kind: null, step: 0, spot: 0 });
  }, []);
  const closeGuide = useCallback(() => {
    setGuide(null);
  }, []);
  const quest = guide === null ? undefined : tutorial?.quests.find(({ key }) => key === guide.key);
  return {
    guide,
    openGuide,
    closeGuide,
    backToList: () => {
      setGuide(null);
      onList(quest?.category ?? '');
    },
    chooseKind: (kind) => {
      setGuide((shown) => (shown === null ? shown : { ...shown, kind, step: 0, spot: 0 }));
    },
    goToStep: (step) => {
      setGuide((shown) => (shown === null ? shown : { ...shown, step, spot: 0 }));
    },
    pickSpot: (spot) => {
      setGuide((shown) => (shown === null ? shown : { ...shown, spot }));
    },
    completeGuide: () => {
      if (guide === null || quest === undefined) {
        return;
      }
      const { key } = guide;
      if (quest.completion.kind === 'kwanjeongCheck') {
        setGuide(null);
        onCheck(key);
        return;
      }
      void complete(key, 'button').then((after) => {
        if (after !== null) {
          setGuide(null);
          onCompleted(after, key);
        }
      });
    },
  };
}

// A guide gives way to what opens over the map while it is open: a selected card (a tapped 파티 or invitation push),
// an invitation's or a made Quest's card, or the answer frame. The guide closes, so that its bar and panel never stay
// over a map that draws something else.
export function useGuideGivesWay(open: boolean, otherOpen: boolean, closeGuide: () => void): void {
  const close = useEffectEvent(closeGuide);
  useEffect(() => {
    if (open && otherOpen) {
      close();
    }
  }, [open, otherOpen]);
}
