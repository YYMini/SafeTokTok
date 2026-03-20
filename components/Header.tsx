// components/Header.tsx
import { COLORS, RADIUS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  title?: string;
  roleLabel?: string;
  showLogout?: boolean;
  onPressSettings?: () => void;
  onPressLogout?: () => void;
  onPressRole?: () => void;
  profileImageUri?: string | null;
};

export default function Header({
  title = "안심톡톡",
  roleLabel,
  showLogout = true,
  onPressSettings,
  onPressLogout,
  onPressRole,
  profileImageUri,
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
        {!!roleLabel && (
          <Pressable onPress={onPressRole} style={styles.rolePill} hitSlop={10}>
            {profileImageUri ? (
              <Image source={{ uri: profileImageUri }} style={styles.roleAvatar} />
            ) : (
              <Ionicons name="person-outline" size={16} color="#fff" />
            )}
            <Text style={styles.roleText}>{roleLabel}</Text>
          </Pressable>
        )}

        <Pressable onPress={onPressSettings} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="settings-outline" size={20} color="#fff" />
        </Pressable>

        {showLogout && (
          <Pressable
            onPress={onPressLogout}
            style={[styles.iconBtn, styles.logoutBtn]}
            hitSlop={10}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
          </Pressable>
        )}
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
    backgroundColor: COLORS.primary,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },

  logoCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "900", color: "#fff" },

  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  roleText: { color: "#fff", fontWeight: "900" },

  roleAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.35)",
  },

  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  logoutBtn: { backgroundColor: "rgba(239,68,68,0.95)" },
});