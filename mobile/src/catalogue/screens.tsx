import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  DayTile,
  AppBar,
  Avatar,
  BottomSheet,
  Button,
  ChipRow,
  color,
  EmptyState,
  ErrorState,
  FullScreenPanel,
  IconButton,
  ListRow,
  LoadingState,
  questTone,
  radius,
  RoundIcon,
  SearchField,
  SectionHeader,
  SegmentedTabs,
  SidePanel,
  space,
  SwitchRow,
  text,
  useNotReadyToast,
} from '@/design-system';
import { Section } from './layout';

// The parts that the screens around the map repeat: bars, panels, sheets, lists and their states.

export function AppBars(): ReactElement {
  const showNotReady = useNotReadyToast();
  return (
    <Section name="AppBar">
      <AppBar actions={<Button icon="plus">만들기</Button>} title="파티" />
      <AppBar leave={{ kind: 'back', onPress: showNotReady }} title="프로필 편집" />
      <AppBar count={12} leave={{ kind: 'close', onPress: showNotReady }} title="퀘스트" />
    </Section>
  );
}

export function FullScreenPanels(): ReactElement {
  const showNotReady = useNotReadyToast();
  return (
    <Section name="FullScreenPanel">
      <View style={styles.frame}>
        <FullScreenPanel
          footer={
            <Button full size="lg">
              저장
            </Button>
          }
          leave={{ kind: 'back', onPress: showNotReady }}
          title="프로필 편집"
        >
          <Text style={styles.body}>기본 정보</Text>
        </FullScreenPanel>
      </View>
    </Section>
  );
}

export function Panels(): ReactElement {
  const [open, setOpen] = useState<'side' | 'sheet' | null>(null);
  const close = (): void => {
    setOpen(null);
  };
  return (
    <Section name="SidePanel · BottomSheet">
      <View style={styles.row}>
        <Button
          onPress={() => {
            setOpen('side');
          }}
          variant="secondary"
        >
          패널 열기
        </Button>
        <Button
          onPress={() => {
            setOpen('sheet');
          }}
          variant="secondary"
        >
          시트 열기
        </Button>
      </View>
      <SidePanel label="친구" onClose={close} open={open === 'side'}>
        <AppBar actions={<IconButton icon="x" label="닫기" onPress={close} />} count={12} line={false} title="친구" />
      </SidePanel>
      <BottomSheet label="AI 매칭" onClose={close} open={open === 'sheet'}>
        <Text style={styles.body}>인원</Text>
      </BottomSheet>
    </Section>
  );
}

// A weekday, Saturday and Sunday: the day, the top line and the weekday.
const DAYS: readonly (readonly [number, string, number])[] = [
  [6, '오늘', 2],
  [10, '토', 6],
  [11, '일', 0],
];

export function Filters(): ReactElement {
  const [tab, setTab] = useState<'find' | 'mine' | 'invites'>('find');
  const [chip, setChip] = useState<'all' | 'free' | 'moving'>('all');
  const [query, setQuery] = useState('');
  const [day, setDay] = useState(6);
  return (
    <Section name="SegmentedTabs · ChipRow · SearchField · DayTile">
      <SegmentedTabs
        onSelect={setTab}
        segments={[
          { key: 'find', label: '찾기' },
          { key: 'mine', label: '내 파티', count: 2 },
          { key: 'invites', label: '초대', count: 1, alert: true },
        ]}
        selected={tab}
      />
      <ChipRow
        chips={[
          { key: 'all', label: '전체', count: 12 },
          { key: 'free', label: '공강', count: 4 },
          { key: 'moving', label: '이동 중', count: 0 },
        ]}
        hideEmpty
        onSelect={setChip}
        selected={chip}
      />
      <SearchField label="친구 검색" onChangeText={setQuery} placeholder="이름, 학과 검색" value={query} />
      <View style={styles.row}>
        {DAYS.map(([date, top, weekday]) => (
          <DayTile
            date={date}
            key={date}
            label={`10월 ${date}일`}
            onPress={() => {
              setDay(date);
            }}
            selected={date === day}
            top={top}
            weekday={weekday}
          />
        ))}
      </View>
    </Section>
  );
}

export function ListRows(): ReactElement {
  const showNotReady = useNotReadyToast();
  const [sharing, setSharing] = useState(true);
  return (
    <Section name="ListRow · SectionHeader · SwitchRow">
      <View style={styles.list}>
        <SectionHeader>공강 · 4</SectionHeader>
        <ListRow
          aside="컴퓨터공학부"
          leading={<Avatar name="김민준" status="free" />}
          lines={['공강 · 중앙도서관 근처 · 15:00까지 비어 있어요']}
          title="김민준"
          trailing={<IconButton icon="calendar" label="김민준님과 파티 만들기" onPress={showNotReady} />}
        />
        <SectionHeader>오늘 · 10월 1일 (목)</SectionHeader>
        <ListRow
          kicker={{ words: '강의', color: questTone.class }}
          label="강의 · 자료구조 · 301동 118호 · 14:00"
          large
          leading={<RoundIcon fill={questTone.class} icon="clock" ink={color.onPrimary} />}
          lines={['301동 118호']}
          onPress={showNotReady}
          title="자료구조"
          trailing={<Text style={styles.time}>14:00</Text>}
        />
        <SwitchRow description="12명" label="친구와 위치 공유" onValueChange={setSharing} value={sharing} />
      </View>
    </Section>
  );
}

export function States(): ReactElement {
  const showNotReady = useNotReadyToast();
  return (
    <Section name="EmptyState · LoadingState · ErrorState">
      <View style={styles.list}>
        <EmptyState words="결과 없음" />
        <LoadingState />
        <ErrorState onRetry={showNotReady} />
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[3] },
  frame: { height: 320, overflow: 'hidden', borderRadius: radius.lg, borderWidth: 1, borderColor: color.border },
  list: { paddingHorizontal: space[4], borderRadius: radius.lg, backgroundColor: color.surface },
  body: { ...text.body, padding: space[4], color: color.ink },
  time: { ...text.label, color: color.ink },
});
