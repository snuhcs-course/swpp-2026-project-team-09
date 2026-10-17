/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import * as ImagePicker from 'expo-image-picker';
import type { ReactElement } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { QuestPhoto } from '@/api/quest-parts-types';
import { color, font, Icon, type IconName, radius, space, useToast } from '@/design-system';
import { FieldHead } from './field-head';

// The caption of a photo the User attached, as the frame writes it.
const PICKED_CAPTION = '내가 첨부한 사진';

type Source = 'camera' | 'album';

const SOURCES: Record<Source, { label: string; icon: IconName; refused: string }> = {
  camera: { label: '카메라', icon: 'camera', refused: '카메라를 쓸 수 있게 해 주세요' },
  album: { label: '앨범', icon: 'image', refused: '사진 보관함을 볼 수 있게 해 주세요' },
};

// Asks for the permission when the User first uses the camera or the album, then opens it: what the User picked, or
// no address when they refused or picked nothing.
async function pick(source: Source): Promise<{ refused: boolean; uri: string | null }> {
  const asked =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!asked.granted) {
    return { refused: true, uri: null };
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, quality: 0.7 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  return { refused: false, uri: result.canceled ? null : (result.assets[0]?.uri ?? null) };
}

function SourceButton({ source, onPress }: { source: Source; onPress: () => void }): ReactElement {
  const { label, icon } = SOURCES[source];
  const primary = source === 'camera';
  return (
    <View style={styles.source}>
      <Text style={styles.sourceWords}>{label}</Text>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.sourceButton, primary ? styles.primary : styles.secondary]}
      >
        <Icon color={primary ? color.onPrimary : color.snuBlue} name={icon} size={26} />
      </Pressable>
    </View>
  );
}

// A photo as the post shows it: the picture picked, or the mock's drawn one.
function Preview({ photo }: { photo: QuestPhoto }): ReactElement {
  if (photo.kind === 'picked') {
    return (
      <Image
        accessibilityLabel={photo.caption}
        accessibilityRole="image"
        source={{ uri: photo.uri }}
        style={styles.preview}
        testID="photo-preview"
      />
    );
  }
  return (
    <View
      accessibilityLabel={photo.caption}
      accessibilityRole="image"
      style={[styles.preview, styles.drawn, { backgroundColor: photo.tint }]}
      testID="photo-preview"
    >
      <Icon color={color.onPrimary} name={photo.icon} size={48} />
      <Text style={styles.caption}>{photo.caption}</Text>
    </View>
  );
}

interface PhotoFieldProps {
  photo: QuestPhoto | null;
  onChange: (photo: QuestPhoto | null) => void;
}

// `사진`: 카메라 and 앨범, then the photo with ✕ `사진 빼기`. The phone keeps it; the main server does not store one yet.
export function PhotoField({ photo, onChange }: PhotoFieldProps): ReactElement {
  const showToast = useToast();
  const take = (source: Source): void => {
    void pick(source).then(({ refused, uri }) => {
      if (refused) {
        showToast(SOURCES[source].refused);
      } else if (uri !== null) {
        onChange({ kind: 'picked', uri, caption: PICKED_CAPTION });
      }
    });
  };
  return (
    <View style={styles.field}>
      <FieldHead label="사진" />
      {photo === null ? (
        <View style={styles.sources}>
          <SourceButton
            onPress={() => {
              take('camera');
            }}
            source="camera"
          />
          <SourceButton
            onPress={() => {
              take('album');
            }}
            source="album"
          />
        </View>
      ) : (
        <View style={styles.chosen}>
          <Preview photo={photo} />
          <Pressable
            accessibilityLabel="사진 빼기"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              onChange(null);
            }}
            style={styles.remove}
          >
            <Icon color={color.onPrimary} name="x" size={16} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const SOURCE = 56;
const PREVIEW = 160;
const REMOVE = 28;

const styles = StyleSheet.create({
  field: { gap: space[2] },
  sources: { flexDirection: 'row', gap: space[4] },
  source: { alignItems: 'center', gap: 6 },
  sourceWords: { fontFamily: font.semiBold, fontSize: 12, lineHeight: 16, color: color.inkMuted },
  sourceButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: SOURCE,
    height: SOURCE,
    borderRadius: radius.lg,
  },
  primary: { backgroundColor: color.snuBlue },
  secondary: { borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  chosen: { alignSelf: 'flex-start' },
  preview: { width: PREVIEW, height: PREVIEW, borderRadius: radius.lg, backgroundColor: color.surfaceSubtle },
  drawn: { alignItems: 'center', justifyContent: 'center', gap: space[2] },
  caption: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.onPrimary },
  remove: {
    position: 'absolute',
    top: space[2],
    right: space[2],
    alignItems: 'center',
    justifyContent: 'center',
    width: REMOVE,
    height: REMOVE,
    borderRadius: radius.full,
    backgroundColor: color.scrim,
  },
});
