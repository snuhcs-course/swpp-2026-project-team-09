// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-05 to 2026-10-08, prompted by AhnJinYoung and fyoon46, reviewed by Jaehyun0320 in #50
import { type ReactElement, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BottomNav,
  Button,
  ChatInput,
  color,
  Dialog,
  EventCard,
  space,
  TextField,
  useNotReadyToast,
  useToast,
} from '@/design-system';
import { Row, Section } from './layout';

export function EventCards(): ReactElement {
  return (
    <Section name="EventCard">
      <View style={styles.ground}>
        <EventCard
          actions={[
            <Button full key="detail" variant="secondary">
              자세히
            </Button>,
            <Button full icon="users" key="join">
              같이 갈 사람
            </Button>,
          ]}
          eligibility="전 학년 · 사전 신청 불필요"
          source="컴퓨터공학부 공지"
          tags={['#AI커리어', '#채용']}
          time="10월 2일 (목) 18:00–20:00"
          title="AI 커리어 채용설명회"
          venue="301동 118호"
        />
        <EventCard floating kind="party" time="오늘 19:00" title="보드게임 한 판" venue="학생회관 (63동)" />
        <EventCard kind="quest" time="내일 12:00" title="점심 약속" venue="자하연" />
      </View>
    </Section>
  );
}

export function TextFields(): ReactElement {
  const [department, setDepartment] = useState('');
  const [note, setNote] = useState('');
  return (
    <Section name="TextField">
      <TextField
        helper="프로필에 표시돼요"
        label="학과"
        onChangeText={setDepartment}
        placeholder="예: 컴퓨터공학부"
        value={department}
      />
      <TextField error="4자리로 입력해 주세요" label="입학년도" value="20" />
      <TextField label="메모" multiline onChangeText={setNote} placeholder="예: 노트북 충전기 챙기기" value={note} />
      <TextField disabled label="학교 계정" value="snu@snu.ac.kr" />
    </Section>
  );
}

export function ChatInputs(): ReactElement {
  const showToast = useToast();
  return (
    <Section name="ChatInput">
      <ChatInput onSend={showToast} suggestions={['이 행사 같이 갈 사람 찾아줘', '근처 빈 열람실', '오늘 학식 메뉴']} />
      <ChatInput disabled placeholder="메시지 입력" />
    </Section>
  );
}

export function BottomNavs(): ReactElement {
  const [active, setActive] = useState(0);
  const [mainActive, setMainActive] = useState(0);
  const showToast = useToast();
  return (
    <Section name="BottomNav">
      <BottomNav
        active={active}
        items={[
          { icon: 'map', label: '지도' },
          { icon: 'chat', label: 'AI 채팅' },
          { icon: 'users', label: '파티', badge: 2 },
          { icon: 'flag', label: '퀘스트' },
          { icon: 'user', label: '내 정보' },
        ]}
        onSelect={setActive}
      />
      {/* The main screen's bar, as its frame draws it: an action in the middle and no line on top. */}
      <BottomNav
        active={mainActive}
        items={[
          { icon: 'map', label: '지도' },
          { icon: 'users', label: '파티', badge: 2 },
          { icon: 'plus', label: '올리기', action: true },
          { icon: 'calendar', label: '행사' },
          { icon: 'user', label: '내 정보' },
        ]}
        line={false}
        onSelect={(index) => {
          if (index === 2) {
            showToast('올리기');
          } else {
            setMainActive(index);
          }
        }}
      />
    </Section>
  );
}

const DIALOG_BUTTONS = [
  ['question', '질문 열기'],
  ['statement', '알림 열기'],
  ['danger', '확인 열기'],
] as const;

export function Dialogs(): ReactElement {
  const [open, setOpen] = useState<(typeof DIALOG_BUTTONS)[number][0] | null>(null);
  const close = (): void => {
    setOpen(null);
  };
  return (
    <Section name="Dialog">
      <Row>
        {DIALOG_BUTTONS.map(([dialog, label]) => (
          <Button
            key={dialog}
            onPress={() => {
              setOpen(dialog);
            }}
            variant="secondary"
          >
            {label}
          </Button>
        ))}
      </Row>
      <Dialog
        body="지도에 내 아바타를 보여 주려면 위치 권한이 필요해요."
        cancelLabel="나중에"
        confirmLabel="계속"
        onCancel={close}
        onConfirm={close}
        title="내 위치를 지도에 표시할까요?"
        visible={open === 'question'}
      />
      <Dialog
        body="이 기기에서는 로그아웃됐어요. 다시 쓰려면 로그인해 주세요."
        confirmLabel="확인"
        onCancel={close}
        onConfirm={close}
        title="다른 기기에서 로그인했어요"
        visible={open === 'statement'}
      />
      <Dialog
        cancelLabel="취소"
        confirmLabel="로그아웃"
        onCancel={close}
        onConfirm={close}
        title="로그아웃할까요?"
        tone="danger"
        visible={open === 'danger'}
      />
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
            showToast('캠퍼스 밖에 있어요');
          }}
          variant="secondary"
        >
          알림 띄우기
        </Button>
        <Button onPress={showNotReady} variant="secondary">
          준비 중 알림
        </Button>
        <Button
          onPress={() => {
            showToast('서지우님은 위치가 꺼져 있어요', 2000);
          }}
          variant="secondary"
        >
          2초 알림
        </Button>
      </Row>
    </Section>
  );
}

const styles = StyleSheet.create({
  ground: {
    gap: space[3],
    padding: space[4],
    backgroundColor: color.surfaceSubtle,
  },
});
