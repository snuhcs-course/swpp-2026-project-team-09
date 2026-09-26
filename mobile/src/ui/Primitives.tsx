import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { User } from "../api";
export const colors = {
  teal: "#126f62",
  dark: "#193a33",
  muted: "#718078",
  cream: "#f6f5ef",
  border: "#e2e7df",
  white: "#fff",
  orange: "#a35936",
};
export function Action({
  label,
  onPress,
  disabled = false,
  secondary = false,
  small = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        u.action,
        secondary && u.secondary,
        small && u.small,
        (disabled || pressed) && { opacity: 0.5 },
      ]}
    >
      <Text style={[u.actionText, secondary && { color: colors.teal }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Card({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: object;
}) {
  if (!onPress) return <View style={[u.card, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[u.card, style]}
    >
      {children}
    </Pressable>
  );
}
export function Avatar({
  user,
  size = 38,
}: {
  user: Pick<User, "avatarUrl" | "displayName">;
  size?: number;
}) {
  return user.avatarUrl ? (
    <Image
      source={{ uri: user.avatarUrl }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  ) : (
    <View
      style={[u.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={{ color: colors.teal, fontWeight: "700" }}>
        {user.displayName.slice(0, 1)}
      </Text>
    </View>
  );
}
export function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  numeric = false,
  editable = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numeric?: boolean;
  editable?: boolean;
}) {
  return (
    <View style={{ gap: 7, flex: 1 }}>
      <Text style={u.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        editable={editable}
        style={[
          u.input,
          multiline && { minHeight: 86, textAlignVertical: "top" },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        autoCapitalize="none"
        multiline={multiline}
        keyboardType={numeric ? "number-pad" : "default"}
      />
    </View>
  );
}
export function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={u.empty}>
      <Text style={u.title}>{title}</Text>
      <Text style={u.body}>{detail}</Text>
    </View>
  );
}
export function Sheet({
  title,
  onClose,
  children,
  busy,
  message,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  busy: boolean;
  message: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[u.scrim, { paddingTop: insets.top }]}>
        <Pressable
          style={{ flex: 1 }}
          onPress={onClose}
          accessibilityLabel="닫기"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={u.sheet}
        >
          <View style={u.handle} />
          <View style={u.row}>
            <Text style={u.heading}>{title}</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="닫기"
              hitSlop={14}
            >
              <Text style={u.close}>×</Text>
            </Pressable>
          </View>
          {busy && <ActivityIndicator color={colors.teal} />}{" "}
          {!!message && (
            <Text accessibilityLiveRegion="polite" style={u.error}>
              {message}
            </Text>
          )}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              gap: 18,
              paddingBottom: Math.max(35, insets.bottom + 20),
            }}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
export const u = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { fontSize: 17, fontWeight: "700", color: colors.dark },
  heading: { fontSize: 23, fontWeight: "700", color: colors.dark },
  body: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: "600", color: colors.dark },
  card: {
    padding: 18,
    borderRadius: 21,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  action: {
    backgroundColor: colors.teal,
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: { backgroundColor: "#eaf2ec" },
  small: { paddingVertical: 10, paddingHorizontal: 13 },
  actionText: { color: "white", fontWeight: "700", fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "white",
    padding: 13,
    borderRadius: 12,
    fontSize: 15,
    color: colors.dark,
  },
  avatar: {
    backgroundColor: "#dfece2",
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { padding: 28, alignItems: "center", gap: 10 },
  scrim: { flex: 1, backgroundColor: "#0c251950" },
  sheet: {
    maxHeight: "90%",
    minHeight: "35%",
    padding: 22,
    paddingBottom: 0,
    backgroundColor: colors.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 16,
  },
  handle: {
    width: 35,
    height: 4,
    backgroundColor: "#c9d3ca",
    borderRadius: 2,
    alignSelf: "center",
  },
  close: { fontSize: 30, color: colors.muted },
  error: {
    color: colors.orange,
    fontSize: 13,
    lineHeight: 20,
    paddingVertical: 7,
  },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.teal,
    letterSpacing: 0.5,
  },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 5 },
});
