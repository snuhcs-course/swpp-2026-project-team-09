import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, Icon, radius, shadow, space } from '@/design-system';
import { CARD } from './layout';

export const NOT_IN_SERVICE = '지금은 셔틀버스가 운행하지 않아요';

interface ShuttleNoticeProps {
  // As the route gives them, a line for each line.
  serviceHours: string;
  onHeight: (height: number) => void;
}

// The shuttle layer's notice outside the service hours, at the place of the card at the bottom: the bus, that the
// shuttle is not in service, and the route's service hours.
export function ShuttleNotice({ serviceHours, onHeight }: ShuttleNoticeProps): ReactElement {
  return (
    <View
      onLayout={({ nativeEvent: { layout } }) => {
        onHeight(layout.height);
      }}
      style={styles.notice}
      testID="shuttle-notice"
    >
      <Icon color={color.svcShuttle} name="bus" size={22} />
      <View style={styles.words}>
        <Text style={styles.title}>{NOT_IN_SERVICE}</Text>
        <Text style={styles.hours}>{serviceHours}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    position: 'absolute',
    right: CARD.side,
    bottom: CARD.bottom,
    left: CARD.side,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    boxShadow: shadow.mapCard,
  },
  words: { flexShrink: 1, gap: space[1] },
  title: { fontFamily: font.semiBold, fontSize: 16, lineHeight: 22, color: color.ink },
  hours: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
});
