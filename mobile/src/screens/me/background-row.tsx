import { type ReactElement, useState } from 'react';
import { Dialog, SwitchRow, useToast } from '@/design-system';
import { openLocationSettings, useBackgroundSharing } from '@/position';

const NEEDS_ALWAYS = "위치 권한을 '항상 허용'해야 백그라운드에서 공유할 수 있어요";

interface ExplanationProps {
  visible: boolean;
  // The system no longer prompts: only the phone's settings can allow it.
  blocked: boolean;
  onAllow: () => void;
  onLater: () => void;
}

function BackgroundExplanation({ visible, blocked, onAllow, onLater }: ExplanationProps): ReactElement {
  return (
    <Dialog
      body={
        blocked
          ? "휴대폰 설정에서 위치 권한을 '항상 허용'으로 바꾸면 백그라운드에서도 공유돼요."
          : "휴대폰을 주머니에 넣어 두어도 친구가 내 위치를 볼 수 있어요. 다음 화면에서 위치 권한을 '항상 허용'으로 바꿔 주세요. 공유하는 동안에는 알림이 계속 보여요."
      }
      cancelLabel="나중에"
      confirmLabel={blocked ? '설정 열기' : '계속'}
      onCancel={onLater}
      onConfirm={onAllow}
      title="백그라운드에서도 위치를 공유할까요?"
      visible={visible}
    />
  );
}

// The row "백그라운드에서도 공유" under the Master Switch, on Android in a development build. The background permission
// is asked only here, after an explanation; where the system no longer prompts, the explanation leads to the phone's
// settings, and the User turns the row on again on return.
export function BackgroundRow({ masterOn }: { masterOn: boolean }): ReactElement | null {
  const { available, on, permission, choose, ask } = useBackgroundSharing();
  const showToast = useToast();
  const [explaining, setExplaining] = useState(false);
  if (!available) {
    return null;
  }
  const blocked = permission === 'blocked';
  return (
    <>
      <SwitchRow
        description="화면이 꺼져도 30초마다 위치를 보내요"
        disabled={!masterOn}
        label="백그라운드에서도 공유"
        onValueChange={(next) => {
          if (next && permission !== 'granted') {
            setExplaining(true);
          } else {
            choose(next);
          }
        }}
        value={on}
      />
      <BackgroundExplanation
        blocked={blocked}
        onAllow={() => {
          setExplaining(false);
          if (blocked) {
            void openLocationSettings();
            return;
          }
          void ask().then((answer) => {
            if (answer === 'granted') {
              choose(true);
            } else {
              showToast(NEEDS_ALWAYS);
            }
          });
        }}
        onLater={() => {
          setExplaining(false);
          showToast(NEEDS_ALWAYS);
        }}
        visible={explaining}
      />
    </>
  );
}
