// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { Place, TimetableClass } from '@/api/types';
import {
  Badge,
  Button,
  cardStyles,
  classColors,
  color,
  ErrorState,
  font,
  FullScreenPanel,
  Icon,
  LoadingState,
  radius,
  space,
  text,
} from '@/design-system';
import { timesText, whereText } from '@/features/timetable/class-form';
import { useTimetable } from '@/features/timetable/use-timetable';

function openForm(classId?: string): void {
  router.push(classId === undefined ? '/me/timetable/class' : { pathname: '/me/timetable/class', params: { classId } });
}

interface ClassRowProps {
  lesson: TimetableClass;
  order: number;
  places: readonly Place[];
  last: boolean;
}

// The bar's colour is the class's in 내 정보's week, by its place in the timetable.
function ClassRow({ lesson, order, places, last }: ClassRowProps): ReactElement {
  return (
    <Pressable
      accessibilityLabel={`${lesson.courseName} 수정`}
      accessibilityRole="button"
      onPress={() => {
        openForm(lesson.id);
      }}
      style={({ pressed }): StyleProp<ViewStyle> => [styles.row, !last && styles.lined, pressed && styles.pressed]}
    >
      <View style={[styles.bar, { backgroundColor: classColors[order % classColors.length] }]} />
      <View style={styles.words}>
        <View style={styles.nameLine}>
          <Text numberOfLines={1} style={styles.name}>
            {lesson.courseName}
          </Text>
          {lesson.overlaps.length > 0 ? <Badge tone="warning">겹침</Badge> : null}
        </View>
        <Text style={styles.when}>{timesText(lesson.times)}</Text>
        <Text numberOfLines={1} style={styles.where}>
          {whereText(lesson, places)}
        </Text>
      </View>
      <Icon color={color.inkFaint} name="chevronRight" size={16} />
    </Pressable>
  );
}

function NoClasses(): ReactElement {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon color={color.snuBlue} name="calendar" size={26} />
      </View>
      <Text style={styles.emptyTitle}>등록된 수업이 없어요</Text>
      <Text style={styles.emptyLine}>수업을 넣으면 친구가 내 공강을 볼 수 있어요</Text>
    </View>
  );
}

// 시간표, the `Timetable` frame without its 학기 card: the User's classes, each opening the class form.
export function TimetableScreen(): ReactElement {
  const { data, isPending, refetch } = useTimetable();
  let body: ReactElement;
  if (data === undefined) {
    body = isPending ? <LoadingState /> : <ErrorState onRetry={refetch} />;
  } else if (data.classes.length === 0) {
    body = <NoClasses />;
  } else {
    body = (
      <View style={[cardStyles.card, styles.card]}>
        <Text accessibilityRole="header" style={styles.title}>
          수업 <Text style={styles.count}>{data.classes.length}</Text>
        </Text>
        {data.classes.map((lesson, order) => (
          <ClassRow
            key={lesson.id}
            last={order === data.classes.length - 1}
            lesson={lesson}
            order={order}
            places={data.places}
          />
        ))}
      </View>
    );
  }
  return (
    <FullScreenPanel
      footer={
        <Button
          full
          icon="plus"
          onPress={() => {
            openForm();
          }}
          size="lg"
        >
          수업 추가
        </Button>
      }
      leave={{ kind: 'back', onPress: router.back }}
      subtle
      title="시간표"
    >
      <View style={styles.body}>{body}</View>
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  body: { padding: space[4], paddingBottom: space[6] },
  card: { paddingBottom: space[1] },
  title: { ...text.title, marginBottom: space[1], color: color.ink },
  count: { fontFamily: font.medium, color: color.inkMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3] },
  lined: { borderBottomWidth: 1, borderBottomColor: color.border },
  pressed: { backgroundColor: color.blue50 },
  bar: { width: 4, alignSelf: 'stretch', marginVertical: 2, borderRadius: radius.full },
  words: { flex: 1, minWidth: 0, gap: 2 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontFamily: font.semiBold, fontSize: 16, lineHeight: 22, color: color.ink },
  when: { fontFamily: font.semiBold, fontSize: 13, lineHeight: 18, color: color.ink },
  where: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  empty: {
    alignItems: 'center',
    gap: space[3],
    paddingVertical: 48,
    paddingHorizontal: space[6],
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#C9CEDA',
    backgroundColor: color.surface,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: color.blue50,
  },
  emptyTitle: { fontFamily: font.semiBold, fontSize: 17, lineHeight: 24, textAlign: 'center', color: color.ink },
  emptyLine: { ...text.label, fontFamily: font.regular, textAlign: 'center', color: color.inkMuted },
});
