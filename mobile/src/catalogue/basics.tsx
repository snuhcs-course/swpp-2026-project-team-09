import { type ReactElement, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar, Badge, Button, Chip, color, Icon, ICON_NAMES, MapPin, space, text } from '@/design-system';
import samplePhoto from '../../assets/images/icon.png';
import { Row, Section } from './layout';

// The sections show what the design system's own previews show, in the same order, so that the two can be laid side
// by side. A variant the previews lack follows theirs.

export function Icons(): ReactElement {
  return (
    <Section name="Icon">
      <Row>
        {ICON_NAMES.map((name) => (
          <View key={name} style={styles.icon}>
            <Icon name={name} size={24} />
            <Text style={styles.iconName}>{name}</Text>
          </View>
        ))}
      </Row>
    </Section>
  );
}

export function Buttons(): ReactElement {
  return (
    <Section name="Button">
      <Row gap={space[2]}>
        <Button>파티 참여</Button>
        <Button variant="secondary">자세히</Button>
        <Button variant="ghost">건너뛰기</Button>
        <Button variant="danger">파티 나가기</Button>
        <Button disabled>마감</Button>
      </Row>
      <Button full icon="users" size="lg">
        함께 갈 사람 찾기
      </Button>
    </Section>
  );
}

export function Chips(): ReactElement {
  const [selected, setSelected] = useState(true);
  const [tags, setTags] = useState(['#러닝']);
  const [chosen, setChosen] = useState(['#재즈']);
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
        {chosen.map((tag) => (
          <Chip
            key={tag}
            onRemove={() => {
              setChosen(chosen.filter((other) => other !== tag));
            }}
            selected
          >
            {tag}
          </Chip>
        ))}
        <Chip size="sm">#작은칩</Chip>
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
        <Badge tone="party">파티 3/5</Badge>
        <Badge tone="friend">친구</Badge>
        <Badge tone="quest">퀘스트</Badge>
        <Badge tone="live">위치 공유 중</Badge>
        <Badge tone="warning">샘플 데이터</Badge>
        <Badge tone="danger">마감</Badge>
        <Badge>정원 30명</Badge>
        <Badge icon={false} tone="official">
          아이콘 없음
        </Badge>
      </Row>
    </Section>
  );
}

export function Avatars(): ReactElement {
  return (
    <Section name="Avatar">
      <Row gap={space[5]}>
        <Avatar name="김민준" size="sm" />
        <Avatar name="이서연" status="free" />
        <Avatar name="박지호" status="class" />
        <Avatar name="정하은" ring="friend" status="moving" />
        <Avatar name="Alex Kim" size="lg" status="off" />
        <Avatar name="사진" source={samplePhoto} />
      </Row>
    </Section>
  );
}

export function MapPins(): ReactElement {
  return (
    <Section name="MapPin">
      <View style={styles.pins}>
        <MapPin kind="me" />
        <MapPin kind="me" small />
        <MapPin count={3} kind="official" label="채용설명회" />
        <MapPin kind="official" label="선택됨" selected />
        <MapPin kind="private" label="스터디" />
        <MapPin kind="party" label="AI 파티" />
        <MapPin kind="quest" label="점심 퀘스트" />
        <MapPin kind="friend" label="서연" name="이서연" status="free" />
        <MapPin kind="dining" label="학생회관" />
        <MapPin kind="shuttle" />
        <MapPin kind="library" label="관정관" />
        <MapPin icon="book" kind="official" label="다른 아이콘" />
        <MapPin kind="friend" label="사진" name="사진" source={samplePhoto} />
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    gap: space[1],
    width: 56,
  },
  iconName: { ...text.micro, color: color.inkMuted },
  pins: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: space[6],
    padding: space[4],
    backgroundColor: color.surfaceSubtle,
  },
});
