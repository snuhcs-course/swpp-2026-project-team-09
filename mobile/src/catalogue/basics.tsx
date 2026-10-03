import { type ReactElement, useState } from 'react';
import { Avatar, Badge, Button, Chip, Icon, ICON_NAMES, MapPin } from '@/design-system';
import { Row, Section } from './layout';

export function Icons(): ReactElement {
  return (
    <Section name="Icon">
      <Row>
        {ICON_NAMES.map((name) => (
          <Icon key={name} label={name} name={name} size={24} />
        ))}
      </Row>
    </Section>
  );
}

export function Buttons(): ReactElement {
  return (
    <Section name="Button">
      <Row>
        <Button>참여하기</Button>
        <Button variant="secondary">초대 보내기</Button>
        <Button variant="ghost">더 보기</Button>
        <Button variant="danger">공유 중지</Button>
      </Row>
      <Row>
        <Button icon="plus">수업 추가</Button>
        <Button disabled>저장</Button>
      </Row>
      <Button full size="lg">
        저장하고 시작하기
      </Button>
    </Section>
  );
}

export function Chips(): ReactElement {
  const [selected, setSelected] = useState(true);
  const [tags, setTags] = useState(['#러닝', '#재즈']);
  return (
    <Section name="Chip">
      <Row>
        <Chip>#AI커리어</Chip>
        <Chip
          onPress={() => {
            setSelected(!selected);
          }}
          selected={selected}
        >
          #보드게임
        </Chip>
        {tags.map((tag) => (
          <Chip
            key={tag}
            onRemove={() => {
              setTags(tags.filter((other) => other !== tag));
            }}
          >
            {tag}
          </Chip>
        ))}
      </Row>
    </Section>
  );
}

export function Badges(): ReactElement {
  return (
    <Section name="Badge">
      <Row>
        <Badge tone="official">공식 행사</Badge>
        <Badge tone="private">내 일정</Badge>
        <Badge tone="party">파티</Badge>
        <Badge tone="friend">친구</Badge>
        <Badge tone="quest">퀘스트</Badge>
        <Badge tone="live">위치 공유 중</Badge>
        <Badge tone="warning">샘플 데이터</Badge>
        <Badge tone="danger">오류</Badge>
        <Badge>기본</Badge>
      </Row>
    </Section>
  );
}

export function Avatars(): ReactElement {
  return (
    <Section name="Avatar">
      <Row>
        <Avatar name="홍길동" size="sm" />
        <Avatar name="홍길동" />
        <Avatar name="홍길동" size="lg" />
        <Avatar name="Jane Doe" />
        <Avatar name="김서연" ring="friend" status="free" />
        <Avatar name="이준호" status="class" />
        <Avatar name="박지민" status="moving" />
        <Avatar name="최유나" status="off" />
      </Row>
    </Section>
  );
}

export function MapPins(): ReactElement {
  return (
    <Section name="MapPin">
      <Row>
        <MapPin kind="me" />
        <MapPin kind="official" label="채용설명회" />
        <MapPin kind="private" label="스터디룸" />
        <MapPin count={3} kind="party" label="보드게임" />
        <MapPin kind="quest" label="점심 약속" />
        <MapPin kind="official" label="선택됨" selected />
      </Row>
      <Row>
        <MapPin kind="friend" name="김서연" status="free" />
        <MapPin kind="dining" label="학생회관" />
        <MapPin kind="shuttle" label="정문" />
        <MapPin kind="library" label="관정관" />
      </Row>
    </Section>
  );
}
