import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  ActionConfirm,
  BottomNav,
  BottomSheet,
  Button,
  ChatBubble,
  ChatInput,
  color,
  EventCard,
  space,
  Switch,
  text,
  TextField,
  useNotReadyToast,
  useToast,
} from '@/design-system';
import { Row, Section } from './layout';

export function EventCards(): ReactElement {
  return (
    <Section name="EventCard">
      <EventCard
        actions={
          <>
            <Button variant="secondary">길찾기</Button>
            <Button>같이 갈 사람 찾기</Button>
          </>
        }
        eligibility="학부생 누구나"
        source="컴퓨터공학부 공지"
        tags={['#AI커리어', '#채용']}
        time="10월 2일 (목) 18:00–20:00"
        title="AI 커리어 채용설명회"
        venue="301동 118호"
      />
      <EventCard floating kind="private" time="오늘 15:00–17:00" title="스터디룸 예약" venue="관정관 62-1동" />
    </Section>
  );
}

export function ChatBubbles(): ReactElement {
  return (
    <Section name="ChatBubble">
      <ChatBubble role="user" time="오후 2:09">
        목요일에 같이 갈 사람 있을까?
      </ChatBubble>
      <ChatBubble role="assistant" time="오후 2:10">
        #AI커리어 관심사가 겹치고, 목요일 17시 이후가 둘 다 비어 있어요.
      </ChatBubble>
    </Section>
  );
}

export function ActionConfirms(): ReactElement {
  return (
    <Section name="ActionConfirm">
      <ActionConfirm
        confirmLabel="참여하기"
        note="참여하면 파티 멤버와 위치를 공유해요"
        rows={[
          { label: '파티', value: '보드게임 한 판' },
          { label: '시간', value: '오늘 19:00' },
        ]}
        title="파티에 참여할까요?"
      />
      <ActionConfirm
        note="자료구조 수업과 시간이 겹쳐요"
        noteTone="warning"
        rows={[{ label: '시간', value: '수 14:30–15:45' }]}
        title="수업을 추가할까요?"
      />
    </Section>
  );
}

export function TextFields(): ReactElement {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  return (
    <Section name="TextField">
      <TextField
        helper="친구에게 보이는 이름이에요"
        label="이름"
        onChangeText={setName}
        placeholder="예: 홍길동"
        value={name}
      />
      <TextField label="메모" multiline onChangeText={setNote} placeholder="예: 노트북 충전기 챙기기" value={note} />
      <TextField error="30자까지 쓸 수 있어요" label="제목" value="아주 긴 제목" />
      <TextField disabled label="학교 계정" value="snu@snu.ac.kr" />
    </Section>
  );
}

export function ChatInputs(): ReactElement {
  const showToast = useToast();
  return (
    <Section name="ChatInput">
      <ChatInput onSend={showToast} suggestions={['오늘 점심 뭐 먹지?', '셔틀 언제 와?', '빈 자리 있어?']} />
      <ChatInput disabled />
    </Section>
  );
}

export function Switches(): ReactElement {
  const [sharing, setSharing] = useState(false);
  return (
    <Section name="Switch">
      <Switch
        checked={sharing}
        description="친구 12명이 내 위치를 볼 수 있어요"
        label="친구와 위치 공유"
        onChange={setSharing}
      />
      <Switch checked disabled label="꺼 둘 수 없는 설정" />
    </Section>
  );
}

export function BottomNavs(): ReactElement {
  const [active, setActive] = useState(0);
  return (
    <Section name="BottomNav">
      <BottomNav
        active={active}
        items={[
          { icon: 'map', label: '지도' },
          { icon: 'users', label: '파티', badge: 2 },
          { icon: 'plus', label: '올리기' },
          { icon: 'calendar', label: '행사' },
          { icon: 'user', label: '내 정보' },
        ]}
        onSelect={setActive}
      />
    </Section>
  );
}

export function BottomSheets(): ReactElement {
  return (
    <Section name="BottomSheet">
      <View style={styles.sheetGround}>
        <BottomSheet title="근처 행사" trailing={<Button variant="ghost">전체 보기</Button>}>
          <Text style={styles.sample}>시트 안에 들어가는 내용</Text>
        </BottomSheet>
      </View>
    </Section>
  );
}

export function Toasts(): ReactElement {
  const showToast = useToast();
  const showNotReady = useNotReadyToast();
  return (
    <Section name="Toast">
      <Row>
        <Button
          onPress={() => {
            showToast('수업을 추가했어요');
          }}
          variant="secondary"
        >
          알림 띄우기
        </Button>
        <Button onPress={showNotReady} variant="secondary">
          준비 중 알림
        </Button>
      </Row>
    </Section>
  );
}

const styles = StyleSheet.create({
  sheetGround: { paddingTop: space[6], backgroundColor: color.surfaceSubtle },
  sample: { ...text.body, color: color.inkMuted },
});
