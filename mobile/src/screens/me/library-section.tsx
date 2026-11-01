/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Affiliation } from '@/api/types';
import { cardStyles, color, Icon, space, text } from '@/design-system';
import { AffiliationField } from '../onboarding/choice-fields';
import { FieldLabel } from '../onboarding/field-label';
import { LONGEST_NAME } from '../onboarding/form';
import { Input } from '../onboarding/input';

// "2026-12345", with the hyphen or not.
const LONGEST_STUDENT_NUMBER = 10;
const STUDENT_NUMBER_HINT = '예: 2026-12345 (하이픈은 없어도 돼요)';
export const STUDENT_NUMBER_REFUSED = '학번은 2026-12345처럼 숫자 9자리로 적어 주세요';

export interface LibraryEdit {
  // As the User typed it.
  studentNumber: string;
  registeredName: string;
  affiliation: Affiliation | null;
}

// The words under a field: the hint, or what is wrong in the danger colour.
function Help({ words, wrong = false }: { words: string; wrong?: boolean }): ReactElement {
  return (
    <View style={styles.help}>
      {wrong ? <Icon color={color.danger} name="alert" size={14} /> : null}
      <Text style={[styles.helpWords, wrong && styles.wrong]}>{words}</Text>
    </View>
  );
}

interface LibrarySectionProps {
  edit: LibraryEdit;
  // The main server refused the 학번 as it was saved.
  studentNumberRefused: boolean;
  change: (changed: Partial<LibraryEdit>) => void;
}

// 도서관 예약 정보: the 학번, the 학적상 이름 and the 소속, which a group study room's booking needs. Nobody else sees them.
export function LibrarySection({ edit, studentNumberRefused, change }: LibrarySectionProps): ReactElement {
  return (
    <View style={[cardStyles.card, styles.section]}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          도서관 예약 정보
        </Text>
        <Text style={styles.lead}>관정도서관 그룹 스터디룸을 예약할 때만 써요. 다른 사람에게는 보이지 않아요.</Text>
      </View>
      <View style={styles.field}>
        <FieldLabel>학번</FieldLabel>
        <Input
          hint={studentNumberRefused ? STUDENT_NUMBER_REFUSED : STUDENT_NUMBER_HINT}
          keyboardType="number-pad"
          label="도서관 예약 학번"
          most={LONGEST_STUDENT_NUMBER}
          onChangeText={(studentNumber) => {
            change({ studentNumber });
          }}
          placeholder="2026-12345"
          style={studentNumberRefused && styles.refused}
          value={edit.studentNumber}
        />
        <Help
          words={studentNumberRefused ? STUDENT_NUMBER_REFUSED : STUDENT_NUMBER_HINT}
          wrong={studentNumberRefused}
        />
      </View>
      <View style={styles.field}>
        <FieldLabel>학적상 이름</FieldLabel>
        <Input
          label="학적상 이름"
          most={LONGEST_NAME}
          onChangeText={(registeredName) => {
            change({ registeredName });
          }}
          placeholder="도서관에 등록된 이름"
          value={edit.registeredName}
        />
        <Help words="비워 두면 이름을 써요" />
      </View>
      <AffiliationField
        onChange={(affiliation) => {
          change({ affiliation });
        }}
        value={edit.affiliation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[4] },
  heading: { gap: space[1] },
  title: { ...text.title, color: color.ink },
  lead: { ...text.caption, color: color.inkMuted },
  field: { gap: space[2] },
  refused: { borderColor: color.danger },
  help: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  helpWords: { ...text.caption, flexShrink: 1, color: color.inkMuted },
  wrong: { color: color.danger },
});
