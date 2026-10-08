import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet, Button, Chip, color, font, Icon, space, text } from '@/design-system';

const SIZES = [2, 3, 4] as const;

const EXPLANATION =
  '같은 행사에 가려는 사람 중 관심사가 비슷한 사람과 인원에 맞춰 파티를 만들어 드려요. 같은 인원으로 모집 중인 공개 파티에 자리가 있으면 그 파티에 먼저 들어가요. 매칭되면 내 파티에 생기고, 멤버에게 내 이름과 학과가 보여요.';

interface MatchingSheetProps {
  event: { id: string; title: string } | null;
  onClose: () => void;
  onSubmit: (globalEventId: string, size: number) => void;
}

function Form({
  event,
  onSubmit,
}: {
  event: { id: string; title: string };
  onSubmit: MatchingSheetProps['onSubmit'];
}): ReactElement {
  const [size, setSize] = useState<number | null>(null);
  return (
    <View style={styles.body}>
      <Text style={styles.event}>{event.title}</Text>
      <View style={styles.head}>
        <Icon color={color.snuBlue} name="sparkle" size={20} />
        <Text accessibilityRole="header" style={styles.title}>
          AI 매칭
        </Text>
      </View>
      <Text style={styles.label}>인원</Text>
      <View style={styles.chips}>
        {SIZES.map((each) => (
          <Chip
            key={each}
            onPress={() => {
              setSize(each);
            }}
            selected={size === each}
          >
            {`${each}명`}
          </Chip>
        ))}
      </View>
      <Text style={styles.explanation}>{EXPLANATION}</Text>
      <Button
        disabled={size === null}
        full
        onPress={() => {
          if (size !== null) {
            onSubmit(event.id, size);
          }
        }}
        size="lg"
      >
        매칭 신청
      </Button>
    </View>
  );
}

// The `Events` frame's AI 매칭 sheet with the group size only, by decision 9.
export function MatchingSheet({ event, onClose, onSubmit }: MatchingSheetProps): ReactElement {
  return (
    <BottomSheet label="AI 매칭" onClose={onClose} open={event !== null}>
      {event === null ? null : <Form event={event} key={event.id} onSubmit={onSubmit} />}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[3], paddingHorizontal: space[5] },
  event: { ...text.caption, color: color.inkMuted },
  head: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  title: { ...text.title, fontFamily: font.bold, color: color.ink },
  label: { ...text.label, color: color.ink },
  chips: { flexDirection: 'row', gap: space[2] },
  explanation: { ...text.body, fontSize: 13, lineHeight: 19, color: color.inkMuted },
});
