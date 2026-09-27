import React from "react";
import { Text, View } from "react-native";
import { clockText } from "../account-forms";
import { ClassDay, ClassOccurrence } from "../class-quests";
import type { TimetableSource } from "../use-timetable";
import { Action, Card, u } from "./Primitives";
export function ClassQuestCard({
  item,
  onOpen,
  compact = false,
}: {
  item: ClassOccurrence;
  onOpen: () => void;
  compact?: boolean;
}) {
  return (
    <Card onPress={onOpen} style={compact ? { width: 270 } : undefined}>
      <Text style={u.badge}>내 수업 · 시간표 기준 · {item.status}</Text>
      <Text style={u.title} numberOfLines={compact ? 2 : undefined}>
        {item.title}
      </Text>
      <Text style={u.body}>
        {clockText(item.startMinute)}–{clockText(item.endMinute)} · 한국 시간
      </Text>
      <Text style={u.body} numberOfLines={compact ? 1 : undefined}>
        {item.locationName || "장소 미입력"}
      </Text>
    </Card>
  );
}
export function ClassQuestStatus({
  source,
  day,
  onOpen,
  onRefresh,
  compact = false,
}: {
  source: TimetableSource;
  day: ClassDay | null;
  onOpen: () => void;
  onRefresh: () => void;
  compact?: boolean;
}) {
  const title = source.error
    ? "시간표를 확인하지 못했어요"
    : !day
      ? "오늘 수업을 확인하고 있어요"
      : day.kind === "unconfigured"
        ? "학기 시간표를 설정해 주세요"
        : day.kind === "outside-semester"
          ? "오늘은 등록한 학기 밖이에요"
          : "오늘 등록된 수업이 없어요";
  return (
    <Card style={compact ? { width: 270 } : undefined}>
      <Text style={u.badge}>나만 보기 · 시간표 기준</Text>
      <Text style={u.title}>{title}</Text>
      {!!source.error && (
        <Text style={u.body}>
          {source.value
            ? "표시된 수업은 마지막으로 불러온 시간표 기준이에요."
            : "연결 상태를 확인한 뒤 다시 불러와 주세요."}
        </Text>
      )}
      <View style={{ gap: 8 }}>
        {source.error ? (
          <Action
            secondary
            small
            label="시간표 다시 불러오기"
            disabled={source.loading}
            onPress={onRefresh}
          />
        ) : (
          day && (
            <Action secondary small label="내 시간표 보기" onPress={onOpen} />
          )
        )}
      </View>
    </Card>
  );
}
