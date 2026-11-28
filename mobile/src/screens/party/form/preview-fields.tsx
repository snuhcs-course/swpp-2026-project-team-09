/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement, Ref } from 'react';
import { StyleSheet, Text, TextInput, type TextStyle, View } from 'react-native';
import { Avatar, color, font, Icon, NOT_AUTOFILLED, space } from '@/design-system';
import { MarkLine, markStyles, Required } from './mark';

// The top of the 파티 form, as its 모집글 will show: the title and the text, typed where they will stand, and the poster
// between them.

const TITLE_MOST = 30;
const TEXT_MOST = 200;

interface InPlaceProps {
  value: string;
  onChange: (value: string) => void;
  // Marked in red, with its line under it.
  marked: boolean;
  frameRef: Ref<View>;
}

// The placeholder, grey with a red asterisk where it is required, drawn under the empty field: a field's own
// placeholder takes one colour only. The field keeps its own, unseen, for a screen reader.
function Placeholder({ words, required, style }: { words: string; required: boolean; style: TextStyle }): ReactElement {
  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[style, styles.placeholder]}
    >
      {words}
      {required ? <Required /> : null}
    </Text>
  );
}

// The title in the room's title style, typed in place: a press puts the caret there, and a press elsewhere drops the
// keyboard with the words left as they are.
export function TitleInPlace({ value, onChange, marked, frameRef }: InPlaceProps): ReactElement {
  return (
    <View style={styles.field}>
      <View ref={frameRef} style={[markStyles.frame, marked && markStyles.marked]} testID="title-box">
        <View style={styles.line}>
          <View style={styles.grow}>
            {value === '' ? <Placeholder required style={styles.title} words="제목을 입력하세요" /> : null}
            <TextInput
              {...NOT_AUTOFILLED}
              accessibilityLabel="제목"
              maxLength={TITLE_MOST}
              onChangeText={onChange}
              placeholder="제목을 입력하세요"
              placeholderTextColor="transparent"
              style={[styles.title, styles.input]}
              value={value}
            />
          </View>
          <Icon color={color.inkSubtle} name="pencil" size={PENCIL} />
        </View>
      </View>
      {marked ? <MarkLine missing="title" /> : null}
    </View>
  );
}

// The text, typed in place as the title is, on as many lines as it takes. Required under 공개 only.
export function TextInPlace({
  value,
  onChange,
  marked,
  frameRef,
  required,
}: InPlaceProps & { required: boolean }): ReactElement {
  return (
    <View style={styles.field}>
      <View ref={frameRef} style={[markStyles.frame, marked && markStyles.marked]} testID="text-box">
        <View style={styles.line}>
          <View style={styles.grow}>
            {value === '' ? (
              <Placeholder required={required} style={styles.text} words="어떤 파티인지 소개해 주세요" />
            ) : null}
            <TextInput
              {...NOT_AUTOFILLED}
              accessibilityLabel="본문"
              maxLength={TEXT_MOST}
              multiline
              onChangeText={onChange}
              placeholder="어떤 파티인지 소개해 주세요"
              placeholderTextColor="transparent"
              style={[styles.text, styles.input]}
              value={value}
            />
          </View>
          <Icon color={color.inkSubtle} name="pencil" size={PENCIL} />
        </View>
      </View>
      {marked ? <MarkLine missing="description" /> : null}
    </View>
  );
}

// The poster as the 모집글 names them: the Avatar, the name and the department, with no time words.
export function PosterRow({ name, department }: { name: string; department: string }): ReactElement {
  return (
    <View style={styles.poster} testID="poster">
      <Avatar name={name} />
      <View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.department}>{department}</Text>
      </View>
    </View>
  );
}

const PENCIL = 16;

const styles = StyleSheet.create({
  field: { gap: space[1] },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2], paddingVertical: space[1] },
  grow: { flex: 1, minWidth: 0 },
  // The field's own padding goes, so that the words stand where the placeholder's do.
  input: { padding: 0, margin: 0, color: color.ink },
  placeholder: { position: 'absolute', top: 0, right: 0, left: 0, color: color.inkSubtle },
  title: { fontFamily: font.bold, fontSize: 22, lineHeight: 30, letterSpacing: -0.33 },
  text: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, textAlignVertical: 'top' },
  poster: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  name: { fontFamily: font.semiBold, fontSize: 15, lineHeight: 22, color: color.ink },
  department: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: color.inkMuted },
});
