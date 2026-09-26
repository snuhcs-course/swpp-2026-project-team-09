import React, { useEffect, useReducer, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import {
  NaverMapMarkerOverlay,
  NaverMapView,
  type NaverMapViewRef,
} from "@mj-studio/react-native-naver-map";
import type { Event, Position } from "../api";
import { LOCATION_TTL_MS, freshLocations } from "../location-snapshot";
import {
  CAMPUS_CAMERA,
  mapEvents,
  validCoordinate,
  type Coordinate,
} from "./map-data";

export type CampusMapProps = {
  events: Event[];
  positions: Position[];
  self: Coordinate | null;
  onSelectEvent: (eventId: string) => void;
  onSelectPerson?: (userId: string) => void;
};

function PersonMarker({ position, onSelect }: {
  position: Position;
  onSelect?: (userId: string) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [position.user.avatarUrl]);
  return (
    <NaverMapMarkerOverlay
      latitude={position.latitude}
      longitude={position.longitude}
      width={46}
      height={46}
      anchor={{ x: 0.5, y: 0.5 }}
      caption={{ text: position.user.displayName, textSize: 11, haloColor: "#ffffff" }}
      onTap={() => onSelect?.(position.user.id)}
      zIndex={20}
    >
      <View collapsable={false} style={styles.avatarPin}>
        {position.user.avatarUrl && !imageFailed ? (
          <Image
            source={{ uri: position.user.avatarUrl }}
            style={styles.avatar}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Text style={styles.avatarInitial}>{position.user.displayName.slice(0, 1) || "?"}</Text>
        )}
      </View>
    </NaverMapMarkerOverlay>
  );
}

export default function CampusMap({ events, positions, self, onSelectEvent, onSelectPerson }: CampusMapProps) {
  const map = useRef<NaverMapViewRef>(null);
  const [attempt, setAttempt] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [initializationDelayed, setInitializationDelayed] = useState(false);
  const [help, setHelp] = useState(false);
  const [, refreshExpiry] = useReducer((value: number) => value + 1, 0);
  const configured = Constants.expoConfig?.extra?.mapsConfigured === true;
  const now = Date.now();
  const visiblePositions = freshLocations(positions, now).filter(validCoordinate);
  const visibleEvents = mapEvents(events);
  const ownCoordinate = validCoordinate(self) ? self : null;

  // Remove expired positions even when props/network responses stop changing.
  useEffect(() => {
    const expiry = Math.min(...visiblePositions.map((position) => Date.parse(position.observedAt) + LOCATION_TTL_MS));
    if (!Number.isFinite(expiry)) return;
    const timer = setTimeout(refreshExpiry, Math.max(1, expiry - Date.now() + 1));
    return () => clearTimeout(timer);
  }, [positions, now]);

  useEffect(() => {
    if (!configured || initialized) return;
    const timer = setTimeout(() => setInitializationDelayed(true), 12000);
    return () => clearTimeout(timer);
  }, [configured, initialized, attempt]);

  function retry() {
    setInitialized(false);
    setInitializationDelayed(false);
    setHelp(false);
    setAttempt((value) => value + 1);
  }

  if (!configured) {
    return (
      <View style={[styles.container, styles.setup]}>
        <View style={styles.setupSymbol}><Text style={styles.setupSymbolText}>⌖</Text></View>
        <Text style={styles.setupTitle}>캠퍼스 지도를 준비하고 있어요</Text>
        <Text style={styles.setupBody}>지도 연결 설정이 필요해요.{"\n"}행사와 약속, 생활 정보는 아래 메뉴에서 이용할 수 있어요.</Text>
        <Pressable onPress={() => setHelp(!help)} accessibilityRole="button" style={styles.setupLink}>
          <Text style={styles.linkText}>{help ? "설정 안내 접기" : "지도 설정 안내"}</Text>
        </Pressable>
        {help && <Text style={styles.setupDetail}>Naver Cloud Maps의 Client ID를 NAVER_MAP_CLIENT_ID에 설정한 뒤 앱을 다시 빌드해 주세요. Client Secret은 앱에 넣지 않습니다.</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NaverMapView
        key={attempt}
        ref={map}
        style={StyleSheet.absoluteFillObject}
        initialCamera={CAMPUS_CAMERA}
        locale="ko"
        mapType="Basic"
        isShowLocationButton={false}
        isShowZoomControls={false}
        isShowScaleBar={false}
        isShowCompass={true}
        logoAlign="TopRight"
        logoMargin={{ right: 16, top: 75 }}
        onInitialized={() => {
          // SDK view initialization does not verify authentication or tile loading.
          setInitialized(true);
          setInitializationDelayed(false);
        }}
      >
        {visibleEvents.map((event) => (
          <NaverMapMarkerOverlay
            key={`event:${event.id}`}
            latitude={event.latitude}
            longitude={event.longitude}
            image={{ symbol: "red" }}
            caption={{ text: event.title, textSize: 11, requestedWidth: 112, haloColor: "#ffffff" }}
            onTap={() => onSelectEvent(event.id)}
            zIndex={10}
          />
        ))}
        {visiblePositions.map((position) => (
          <PersonMarker key={`person:${position.user.id}`} position={position} onSelect={onSelectPerson} />
        ))}
        {ownCoordinate && (
          <NaverMapMarkerOverlay {...ownCoordinate} width={24} height={24} anchor={{ x: 0.5, y: 0.5 }} zIndex={30} caption={{ text: "나", textSize: 11 }}>
            <View collapsable={false} style={styles.selfPin}><View style={styles.selfDot} /></View>
          </NaverMapMarkerOverlay>
        )}
      </NaverMapView>
      <Pressable
        onPress={() => setHelp(!help)}
        style={styles.helpButton}
        accessibilityRole="button"
        accessibilityLabel="지도 연결 도움말"
      ><Text style={styles.helpText}>지도 도움말</Text></Pressable>
      <Pressable
        onPress={() => map.current?.animateCameraTo({ ...(ownCoordinate ? { ...ownCoordinate, zoom: 16 } : CAMPUS_CAMERA), duration: 450 })}
        style={styles.recenter}
        accessibilityRole="button"
        accessibilityLabel={ownCoordinate ? "내 위치로 이동" : "캠퍼스 중심으로 이동"}
      ><Text style={styles.recenterIcon}>⌖</Text></Pressable>
      {(help || initializationDelayed) && (
        <View style={styles.helpCard} accessibilityLiveRegion="polite">
          <Text style={styles.helpTitle}>{initializationDelayed ? "지도를 시작하는 데 시간이 걸려요" : "지도가 보이지 않나요?"}</Text>
          <Text style={styles.helpBody}>네트워크 연결을 확인해 주세요. 인증 오류가 표시되면 Naver Cloud의 앱 패키지와 Dynamic Map 설정, 사용 한도를 확인해야 해요. 행사와 약속 메뉴는 계속 이용할 수 있어요.</Text>
          <View style={styles.actions}>
            <Pressable onPress={retry} accessibilityRole="button" style={styles.action}><Text style={styles.linkText}>다시 시도</Text></Pressable>
            <Pressable onPress={() => { setHelp(false); setInitializationDelayed(false); }} accessibilityRole="button" style={styles.action}><Text style={styles.linkText}>닫기</Text></Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 240, backgroundColor: "#edf1ef", overflow: "hidden" },
  setup: { alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingVertical: 40 },
  setupSymbol: { width: 76, height: 76, borderRadius: 24, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  setupSymbolText: { fontSize: 42, color: "#00866a" },
  setupTitle: { fontSize: 20, fontWeight: "700", color: "#20362f", textAlign: "center", marginBottom: 12 },
  setupBody: { fontSize: 14, lineHeight: 23, color: "#687b73", textAlign: "center" },
  setupLink: { padding: 14, marginTop: 8 },
  setupDetail: { fontSize: 12, lineHeight: 19, color: "#687b73", textAlign: "center", maxWidth: 340 },
  linkText: { fontSize: 13, fontWeight: "700", color: "#007a60" },
  avatarPin: { width: 46, height: 46, borderRadius: 23, borderWidth: 3, borderColor: "#ffffff", backgroundColor: "#d6eee4", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarInitial: { fontSize: 18, fontWeight: "700", color: "#126b53" },
  selfPin: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#d6e8ff", alignItems: "center", justifyContent: "center" },
  selfDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#327ee8", borderWidth: 2, borderColor: "#ffffff" },
  helpButton: { position: "absolute", left: 14, top: 75, backgroundColor: "#ffffffed", borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9 },
  helpText: { fontSize: 11, color: "#576e62", fontWeight: "600" },
  recenter: { position: "absolute", right: 16, bottom: 240, width: 48, height: 48, backgroundColor: "#ffffff", borderRadius: 24, alignItems: "center", justifyContent: "center", elevation: 3, shadowColor: "#20362f", shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  recenterIcon: { fontSize: 32, color: "#174e3e" },
  helpCard: { position: "absolute", left: 18, right: 18, top: 120, padding: 18, backgroundColor: "#ffffff", borderRadius: 18, elevation: 5 },
  helpTitle: { fontSize: 16, fontWeight: "700", color: "#20362f", marginBottom: 8 },
  helpBody: { fontSize: 13, lineHeight: 21, color: "#687b73" },
  actions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
  action: { padding: 12 },
});
