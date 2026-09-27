import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { ApiError, request, API } from "../api";
import {
  ExtractionKind,
  ExtractionResult,
  MAX_IMAGE_BYTES,
  extractionError,
  imageByteLength,
  isLocalExtractionApi,
  readExtraction,
  resizedImage,
} from "../image-extraction";
import { Action, Card, colors, u } from "./Primitives";
export function ImageImport({
  token,
  kind,
  disabled,
  resetGeneration,
  onBusyChange,
  onExtracted,
}: {
  token: string;
  kind: ExtractionKind;
  disabled: boolean;
  resetGeneration: number;
  onBusyChange: (busy: boolean) => void;
  onExtracted: (result: ExtractionResult) => void;
}) {
  const [stage, setStage] = useState(""),
    [error, setError] = useState("");
  const [preview, setPreview] = useState<{ uri: string; ratio: number } | null>(
      null,
    ),
    [previewOpen, setPreviewOpen] = useState(false),
    [zoomed, setZoomed] = useState(false);
  useEffect(() => {
    setPreview(null);
    setPreviewOpen(false);
    setZoomed(false);
  }, [resetGeneration]);
  const window = useWindowDimensions();
  const active = useRef(false),
    epoch = useRef(0),
    lock = useRef(false),
    controller = useRef<AbortController | null>(null);
  const owner = useRef(token);
  owner.current = token;
  useEffect(() => {
    active.current = true;
    epoch.current++;
    lock.current = false;
    controller.current = null;
    setStage("");
    setError("");
    setPreview(null);
    setPreviewOpen(false);
    setZoomed(false);
    onBusyChange(false);
    return () => {
      active.current = false;
      epoch.current++;
      controller.current?.abort();
      controller.current = null;
      lock.current = false;
    };
  }, [token]);
  function cancel() {
    setPreview(null);
    setPreviewOpen(false);
    setZoomed(false);
    epoch.current++;
    controller.current?.abort();
    lock.current = false;
    setStage("");
    onBusyChange(false);
    setError("사진 읽기를 취소했어요. 기존 입력은 유지돼요.");
  }
  async function pick() {
    if (lock.current || disabled || !active.current) return;
    if (!isLocalExtractionApi(API)) {
      setError(
        "사진 읽기는 이 기기와 연결한 로컬 서버에서만 사용할 수 있어요. 지금은 직접 입력해 주세요.",
      );
      return;
    }
    const operation = ++epoch.current,
      stillCurrent = () =>
        active.current &&
        owner.current === token &&
        epoch.current === operation;
    lock.current = true;
    setPreview(null);
    setPreviewOpen(false);
    setZoomed(false);
    setError("");
    setStage("사진 선택 중");
    onBusyChange(true);
    try {
      const selected = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        allowsEditing: false,
        quality: 1,
        exif: false,
      });
      if (!stillCurrent() || selected.canceled) return;
      const asset = selected.assets[0];
      setStage("사진 준비 중");
      const context = ImageManipulator.manipulate(asset.uri);
      let rendered: Awaited<ReturnType<typeof context.renderAsync>> | undefined;
      let imageBase64: string | undefined;
      try {
        context.resize(resizedImage(asset.width, asset.height));
        rendered = await context.renderAsync();
        for (const compress of [0.85, 0.65, 0.45, 0.25]) {
          if (!stillCurrent()) return;
          const image = await rendered.saveAsync({
            format: SaveFormat.JPEG,
            compress,
            base64: true,
          });
          if (
            image.base64 &&
            imageByteLength(image.base64) <= MAX_IMAGE_BYTES
          ) {
            imageBase64 = image.base64;
            break;
          }
        }
      } finally {
        rendered?.release();
        context.release();
      }
      if (!stillCurrent()) return;
      if (!imageBase64)
        throw new Error(
          "사진 용량을 줄이지 못했어요. 필요한 부분만 잘라 다시 선택해 주세요.",
        );
      setStage("사진에서 초안 읽는 중 · 최대 약 3분");
      const abort = new AbortController();
      controller.current = abort;
      // Loopback-only destination and no redirects: never send selected image bytes to an external host.
      const result = await request<unknown>(
        "/me/image-extractions",
        token,
        "POST",
        { kind, mimeType: "image/jpeg", imageBase64 },
        API,
        { timeoutMs: 195000, signal: abort.signal, redirect: "error" },
      );
      if (stillCurrent()) {
        const extracted = readExtraction(result, kind);
        onExtracted(extracted);
        setPreview({ uri: asset.uri, ratio: asset.height / asset.width });
      }
    } catch (e) {
      if (stillCurrent())
        setError(
          e instanceof ApiError
            ? extractionError(e.status, e.code)
            : e instanceof Error && e.name === "AbortError"
              ? extractionError(504)
              : e instanceof Error
                ? e.message
                : extractionError(),
        );
    } finally {
      if (stillCurrent()) {
        lock.current = false;
        controller.current = null;
        setStage("");
        onBusyChange(false);
      }
    }
  }
  return (
    <Card>
      <Text style={u.label}>사진에서 초안 가져오기</Text>
      <Text style={u.body}>
        선택한 사진만 연결된 로컬 서버로 보내 읽어요. 결과는 틀릴 수 있으니 직접
        확인한 뒤 저장해 주세요.
      </Text>
      {stage ? (
        <>
          <ActivityIndicator color={colors.teal} />
          <Text style={u.body} accessibilityLiveRegion="polite">
            {stage}
          </Text>
          <Action secondary small label="사진 읽기 취소" onPress={cancel} />
        </>
      ) : (
        <Action
          secondary
          label="사진 선택해서 초안 만들기"
          disabled={disabled}
          onPress={() =>
            Alert.alert(
              "현재 입력을 사진 초안으로 바꿀까요?",
              kind === "timetable"
                ? "선택한 사진을 연결된 로컬 서버로 보내 현재 입력한 시간표를 초안으로 바꿔요. 저장 전까지 서버의 시간표는 그대로이며, 저장하면 기존 수업 목록을 대체해요."
                : "선택한 사진을 연결된 로컬 서버로 보내 현재 입력을 초안으로 바꿔요. 저장 전에는 일정이 변경되지 않으며, 기존 지도 좌표는 가져오지 않아요.",
              [
                { text: "취소", style: "cancel" },
                { text: "사진 선택", onPress: () => void pick() },
              ],
            )
          }
        />
      )}
      {preview && (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="원본 사진 크게 보기"
            onPress={() => setPreviewOpen(true)}
          >
            <Image
              source={{ uri: preview.uri }}
              resizeMode="contain"
              style={{ width: "100%", height: 280 }}
              accessibilityLabel="선택한 원본 사진"
            />
            <Text style={u.body}>
              원본 사진 크게 보기 · 요일과 시간을 비교해 주세요
            </Text>
          </Pressable>
          <Modal
            visible={previewOpen}
            onRequestClose={() => setPreviewOpen(false)}
            animationType="slide"
          >
            <SafeAreaView
              style={{
                flex: 1,
                backgroundColor: colors.cream,
                padding: 12,
                gap: 12,
              }}
            >
              <Action
                secondary
                label="사진 닫기"
                onPress={() => setPreviewOpen(false)}
              />
              <Action
                secondary
                small
                label={
                  zoomed ? "사진 전체 폭 보기" : "사진 확대 · 스크롤로 이동"
                }
                onPress={() => setZoomed((value) => !value)}
              />
              <ScrollView>
                <ScrollView horizontal>
                  <Image
                    source={{ uri: preview.uri }}
                    resizeMode="contain"
                    style={{
                      width: (window.width - 24) * (zoomed ? 2.5 : 1),
                      height:
                        (window.width - 24) *
                        (zoomed ? 2.5 : 1) *
                        preview.ratio,
                    }}
                  />
                </ScrollView>
              </ScrollView>
            </SafeAreaView>
          </Modal>
        </>
      )}
      {!!error && (
        <Text style={u.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </Card>
  );
}
export function ExtractionReview({
  warnings,
  timetable = false,
}: {
  warnings: string[];
  timetable?: boolean;
}) {
  return (
    <Card>
      <Text style={u.title}>사진에서 읽은 초안 · 저장 전 확인</Text>
      <Text style={u.body}>
        원본 사진과 이름·날짜·요일·시작 및 종료 시간·장소를 비교하고 누락된
        날짜는 직접 입력해 주세요.
        {timetable
          ? " 시간표 저장을 누르면 기존 수업 목록을 이 초안으로 대체해요."
          : " 개인 일정 저장을 눌러야 반영돼요."}
      </Text>
      {warnings.map((warning, index) => (
        <Text key={index} style={u.error}>
          {warning}
        </Text>
      ))}
    </Card>
  );
}
