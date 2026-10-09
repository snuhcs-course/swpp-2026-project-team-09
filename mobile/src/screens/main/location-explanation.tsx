/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { Dialog } from '@/design-system';

interface LocationExplanationProps {
  visible: boolean;
  // The system no longer shows its prompt: only the phone's settings can allow the location.
  blocked: boolean;
  // "계속": the system's prompt follows. "설정 열기", when blocked: the phone's settings open.
  onAllow: () => void;
  // "나중에": the map stays without the User's Avatar.
  onLater: () => void;
}

// The app's own explanation before the system's location prompt, in the spec's words. Where the system no longer
// prompts, it says so and leads to the phone's settings.
export function LocationExplanation({ visible, blocked, onAllow, onLater }: LocationExplanationProps): ReactElement {
  return (
    <Dialog
      body={
        blocked
          ? '휴대폰 설정에서 이 앱의 위치 권한이 꺼져 있어요. 설정에서 켜면 지도에 내 아바타가 보여요.'
          : '지도에 내 아바타를 보여 주려면 위치 권한이 필요해요.'
      }
      cancelLabel="나중에"
      confirmLabel={blocked ? '설정 열기' : '계속'}
      onCancel={onLater}
      onConfirm={onAllow}
      title="내 위치를 지도에 표시할까요?"
      visible={visible}
    />
  );
}
