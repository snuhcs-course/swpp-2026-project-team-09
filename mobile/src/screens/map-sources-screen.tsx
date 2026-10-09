// AI-generated with Claude Opus 5.5, 2026-10-08, prompted by fyoon46
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { cardStyles, color, FullScreenPanel, space, text } from '@/design-system';

interface Source {
  name: string;
  credit: string;
  use: string;
  link: { words: string; url: string };
}

// The attributions that the map's data asks for: OpenStreetMap's (external-sources.md §6), and the one 공공누리 type 1
// asks for, with the year that VWorld gives for the files of the seed (public-building-outlines.md §8).
const SOURCES: readonly Source[] = [
  {
    name: 'OpenStreetMap',
    credit: '© OpenStreetMap contributors',
    use: '캠퍼스 경계, 셔틀버스 노선과 건물 윤곽에 쓰여요. ODbL 라이선스로 제공돼요.',
    link: { words: '저작권과 라이선스 보기', url: 'https://www.openstreetmap.org/copyright' },
  },
  {
    name: '국토지리정보원',
    credit: '국토지리정보원, 연속수치지형도 건물 (2026), 공공누리 제1유형',
    use: '건물 윤곽에 쓰여요. 출처를 밝히면 자유롭게 이용할 수 있는 공공저작물이에요.',
    link: { words: '브이월드에서 내려받기', url: 'https://www.vworld.kr/dtmk/dtmk_ntads_s002.do?dsId=30162' },
  },
];

// Where the map's data comes from, opened from the map's credit: no frame draws it.
export function MapSourcesScreen(): ReactElement {
  return (
    <FullScreenPanel leave={{ kind: 'back', onPress: router.back }} title="지도 데이터 출처">
      <View style={styles.list}>
        {SOURCES.map(({ name, credit, use, link }) => (
          <View key={name} style={[cardStyles.card, styles.card]}>
            <Text accessibilityRole="header" style={styles.name}>
              {name}
            </Text>
            <Text style={styles.credit}>{credit}</Text>
            <Text style={styles.use}>{use}</Text>
            <Pressable
              accessibilityRole="link"
              hitSlop={space[2]}
              onPress={() => {
                void Linking.openURL(link.url);
              }}
            >
              <Text style={styles.link}>{link.words}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  list: { gap: space[3], padding: space[4] },
  card: { gap: space[2] },
  name: { ...text.title, color: color.ink },
  credit: { ...text.label, color: color.ink },
  use: { ...text.body, color: color.inkMuted },
  link: { ...text.label, paddingVertical: space[1], color: color.blue600 },
});
