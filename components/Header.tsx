// components/Header.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS } from "../constants/theme";

type Props = {
  title?: string;
  onPressSettings?: () => void;
  onPressLogout?: () => void;
};

export default function Header({
  title = "안심톡톡",
  onPressSettings,
  onPressLogout,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <View style={styles.logoCircle}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={COLORS.primary}
          />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.right}>
        <Pressable onPress={onPressSettings} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="settings-outline" size={20} color={COLORS.text} />
        </Pressable>
        <Pressable onPress={onPressLogout} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 56,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  right: { flexDirection: "row", alignItems: "center", gap: 6 },
  logoCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  title: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.line,
  },
});
