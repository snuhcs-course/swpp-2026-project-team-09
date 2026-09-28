import type { ReactElement } from 'react';
import { Text, View, StyleSheet } from 'react-native';

export default function PlaceholderScreen(): ReactElement {
  return (
    <View style={styles.container}>
      <Text>SNU Now</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
