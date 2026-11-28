/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { MemberFace, QuestPhoto } from '@/api/quest-parts-types';
import { Avatar, Badge, color, font, Icon, radius, space } from '@/design-system';

// The mocked parts as the screens draw them: an official recruiting's photo, a seeker's tags and a post's members'
// faces.

const THUMB = 64;
const PHOTO_HEIGHT = 220;
const ICON = { thumb: 22, full: 56 } as const;

// A photo, as the frame draws one it has no picture for: a tinted square with an icon. `full` adds the caption under
// the icon; a thumbnail has none.
export function PhotoView({
  photo,
  size,
  style,
}: {
  photo: QuestPhoto;
  size: 'thumb' | 'full';
  // Another shape, such as the banner's.
  style?: StyleProp<ViewStyle>;
}): ReactElement {
  const shape = [size === 'thumb' ? styles.thumb : styles.full, style];
  const label = photo.caption === '' ? '사진' : `사진 · ${photo.caption}`;
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="image"
      accessible
      style={[shape, styles.drawn, { backgroundColor: photo.tint }]}
    >
      <Icon color={color.onPrimary} name={photo.icon} size={ICON[size]} />
      {size === 'full' && photo.caption !== '' ? <Text style={styles.caption}>{photo.caption}</Text> : null}
    </View>
  );
}

// The tags, each with its '#'.
export function TagBadges({ tags }: { tags: readonly string[] }): ReactElement | null {
  if (tags.length === 0) {
    return null;
  }
  return (
    <View style={styles.tags}>
      {tags.map((tag) => (
        <Badge icon={false} key={tag} tone="neutral">{`#${tag}`}</Badge>
      ))}
    </View>
  );
}

// Up to three members' faces, overlapping.
export function Faces({ faces }: { faces: readonly MemberFace[] }): ReactElement {
  return (
    <View style={styles.faces}>
      {faces.slice(0, 3).map(({ name, photo }, index) => (
        <View key={`${name}-${String(index)}`} style={[styles.face, index > 0 && styles.overlap]}>
          <Avatar name={name} size="sm" source={photo === null ? undefined : { uri: photo }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.md },
  full: { alignSelf: 'stretch', height: PHOTO_HEIGHT, borderRadius: radius.md },
  drawn: { alignItems: 'center', justifyContent: 'center', gap: space[2] },
  caption: { fontFamily: font.semiBold, fontSize: 13, lineHeight: 18, color: color.onPrimary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  faces: { flexDirection: 'row' },
  face: { borderRadius: radius.full, borderWidth: 2, borderColor: color.surface },
  overlap: { marginLeft: -8 },
});
