import React, { useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { Meals, request, Shuttle } from "../api";
import { Action, Card, colors, Empty, u } from "./Primitives";
export function Life({
  token,
  busy,
  run,
}: {
  token: string;
  busy: boolean;
  run: (action: () => Promise<unknown>) => void;
}) {
  const [meals, setMeals] = useState<Meals | null>(null),
    [shuttle, setShuttle] = useState<Shuttle | null>(null),
    [route, setRoute] = useState("41946");
  const date = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
  }).format(new Date());
  const source = (url: string, time: string) => (
    <View style={{ gap: 5 }}>
      <Text style={u.body}>조회 {new Date(time).toLocaleString("ko-KR")}</Text>
      <Text
        accessibilityRole="link"
        style={{ color: colors.teal, fontSize: 12 }}
        onPress={() => {
          if (/^https?:\/\//.test(url)) void Linking.openURL(url);
        }}
        numberOfLines={1}
      >
        출처 · {url}
      </Text>
    </View>
  );
  return (
    <>
      <View style={{ gap: 5 }}>
        <Text style={u.badge}>CAMPUS LIFE</Text>
        <Text style={u.heading}>오늘의 캠퍼스 생활</Text>
        <Text style={u.body}>식단부터 셔틀까지, 실제 제공처에서 확인해요.</Text>
      </View>
      <Card>
        <View style={u.row}>
          <View>
            <Text style={u.title}>오늘 뭐 먹을까요?</Text>
            <Text style={u.body}>{date}</Text>
          </View>
          <Action
            label={meals ? "다시 조회" : "식단 조회"}
            small
            secondary
            disabled={busy}
            onPress={() =>
              run(async () =>
                setMeals(
                  await request<Meals>(`/campus/meals?date=${date}`, token),
                ),
              )
            }
          />
        </View>
        {!meals ? (
          <Text style={u.body}>
            조회 버튼을 눌러 오늘 제공된 식단을 확인하세요.
          </Text>
        ) : (
          <>
            <Text style={u.badge}>
              {meals.status === "available"
                ? "제공처 응답 확인"
                : "현재 정보를 확인할 수 없어요"}
            </Text>
            {!!meals.message && <Text style={u.body}>{meals.message}</Text>}
            {meals.items.length === 0 && (
              <Text style={u.body}>표시할 식단이 없습니다.</Text>
            )}
            {meals.items.map((m, i) => (
              <View
                key={`${m.restaurant}-${i}`}
                style={{
                  gap: 8,
                  paddingVertical: 12,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <Text style={u.title}>{m.restaurant}</Text>
                {(
                  [
                    ["아침", m.breakfast],
                    ["점심", m.lunch],
                    ["저녁", m.dinner],
                  ] as const
                ).map(([label, meal]) => (
                  <View key={label} style={{ gap: 3 }}>
                    <Text style={u.badge}>{label}</Text>
                    <Text style={u.body}>{meal || "제공된 정보 없음"}</Text>
                  </View>
                ))}
              </View>
            ))}
            {source(meals.sourceUrl, meals.fetchedAt)}
          </>
        )}
      </Card>
      <Card>
        <Text style={u.title}>셔틀, 지금 어디쯤?</Text>
        <Text style={u.body}>
          제공처 노선도상의 위치입니다. GPS 좌표나 도착 예상 시간이 아닙니다.
        </Text>
        <View style={u.row}>
          {["41946", "41914"].map((r) => (
            <Action
              key={r}
              label={`노선 ${r}`}
              disabled={busy}
              secondary={route !== r}
              small
              onPress={() => {
                setRoute(r);
                setShuttle(null);
              }}
            />
          ))}
        </View>
        <Action
          label="셔틀 위치 조회"
          secondary
          disabled={busy}
          onPress={() =>
            run(async () =>
              setShuttle(
                await request<Shuttle>(
                  `/campus/shuttle?routeId=${route}`,
                  token,
                ),
              ),
            )
          }
        />
        {shuttle && (
          <>
            <Text style={u.badge}>
              {shuttle.status === "available"
                ? "노선도 위치 수신"
                : shuttle.status === "no_vehicles"
                  ? "현재 보고된 차량 없음"
                  : "현재 위치를 확인할 수 없어요"}
            </Text>
            {!!shuttle.message && <Text style={u.body}>{shuttle.message}</Text>}
            {shuttle.vehicles.length > 0 || shuttle.stops.length > 0 ? (
              <ScrollView horizontal style={{ maxHeight: 380 }}>
                <ScrollView nestedScrollEnabled style={{ height: 360 }}>
                  <View
                    style={{
                      width: Math.max(
                        320,
                        ...shuttle.stops.map((v) => v.x + 140),
                        ...shuttle.vehicles.map((v) => v.x + 140),
                      ),
                      height: Math.max(
                        280,
                        ...shuttle.stops.map((v) => v.y + 45),
                        ...shuttle.vehicles.map((v) => v.y + 45),
                      ),
                      backgroundColor: "#f0f3eb",
                      borderRadius: 12,
                    }}
                  >
                    {shuttle.stops.map((v, i) => (
                      <Text
                        key={`stop-${i}`}
                        style={{
                          position: "absolute",
                          left: v.x,
                          top: v.y,
                          fontSize: 11,
                          color: colors.muted,
                        }}
                      >
                        ○ {v.name}
                      </Text>
                    ))}
                    {shuttle.vehicles.map((v) => (
                      <Text
                        key={v.id}
                        style={{
                          position: "absolute",
                          left: v.x,
                          top: v.y,
                          fontSize: 13,
                          color: colors.teal,
                          fontWeight: "700",
                          backgroundColor: "white",
                          padding: 3,
                        }}
                      >
                        ● {v.label || v.id}
                      </Text>
                    ))}
                  </View>
                </ScrollView>
              </ScrollView>
            ) : (
              <Empty
                title="표시할 위치가 없어요"
                detail="운행 중단이나 정류장 도착을 의미하지 않습니다."
              />
            )}
            {source(shuttle.sourceUrl, shuttle.fetchedAt)}
            <Text style={u.body}>원본 차량 관측 시각은 제공되지 않습니다.</Text>
          </>
        )}
      </Card>
    </>
  );
}
