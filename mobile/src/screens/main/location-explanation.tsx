import type { ReactElement } from 'react';
import { Dialog } from '@/design-system';

interface LocationExplanationProps {
  visible: boolean;
  // "계속": the system's prompt follows.
  onAllow: () => void;
  // "나중에": the map stays without the User's Avatar.
  onLater: () => void;
}

// The app's own explanation before the system's location prompt, in the spec's words.
export function LocationExplanation({ visible, onAllow, onLater }: LocationExplanationProps): ReactElement {
  return (
    <Dialog
      body="지도에 내 아바타를 보여 주려면 위치 권한이 필요해요."
      cancelLabel="나중에"
      confirmLabel="계속"
      onCancel={onLater}
      onConfirm={onAllow}
      title="내 위치를 지도에 표시할까요?"
      visible={visible}
    />
  );
}
