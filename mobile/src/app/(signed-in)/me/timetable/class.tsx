import { useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { ClassFormScreen } from '@/screens/timetable/class-form-screen';

// 수업 추가, or 수업 수정 for `?classId=`, above the timetable.
export default function ClassFormRoute(): ReactElement {
  const { classId } = useLocalSearchParams<{ classId?: string }>();
  return <ClassFormScreen classId={typeof classId === 'string' ? classId : null} />;
}
