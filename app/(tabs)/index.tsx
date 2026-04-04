// app/(tabs)/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Dimensions,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Header from "../../components/Header";
import { COLORS, SHADOW } from "../../constants/theme";
import { useAuth } from "../_layout";

const { width, height } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        onPressSettings={() => router.push("/settings")}
        onPressLogout={logout}
      />

      {/* 지도 영역 */}
      <View style={styles.mapContainer}>
        {/* 지오펜스 원 */}
        <View style={styles.geoFence} />

        {/* 대상자 1 */}
        <View style={styles.childGreen}>
          <Text style={styles.childNameGreen}>이서윤</Text>
        </View>

        {/* 대상자 2 (위험 상태) */}
        <View style={styles.childRed}>
          <View style={styles.alertDot}>
            <Ionicons name="alert-circle" size={16} color="#fff" />
          </View>
          <Text style={styles.childNameRed}>김민준</Text>
        </View>

        {/* 보호자 위치 */}
        <View style={styles.guardian}>
          <Ionicons name="person" size={20} color="#fff" />
        </View>

        {/* 왼쪽 확대/축소 */}
        <View style={styles.zoomBox}>
          <Ionicons name="add" size={18} color="#333" />
          <Ionicons name="remove" size={18} color="#333" />
          <Ionicons name="scan-outline" size={18} color="#333" />
        </View>

        {/* 오른쪽 버튼 그룹 */}
        <View style={styles.rightButtons}>
          <IconButton name="map-outline" />
          <IconButton name="walk-outline" />
          <IconButton name="location-outline" />
          <IconButton name="person-add-outline" active />
        </View>

        {/* SOS 버튼 */}
        <Pressable style={styles.sosBtn}>
          <Ionicons name="warning-outline" size={18} color="#fff" />
          <Text style={styles.sosText}>SOS 긴급호출</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* ---------------- 아이콘 버튼 ---------------- */

function IconButton({
  name,
  active = false,
}: {
  name: any;
  active?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.iconBtn,
        active && { backgroundColor: COLORS.primary },
      ]}
    >
      <Ionicons
        name={name}
        size={20}
        color={active ? "#fff" : "#333"}
      />
    </Pressable>
  );
}

/* ---------------- 스타일 ---------------- */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  mapContainer: {
    flex: 1,
    backgroundColor: "#CFE1F5",
  },

  /* 지오펜스 원 */
  geoFence: {
    position: "absolute",
    top: height * 0.15,
    left: width * 0.2,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,0,0,0.15)",
    borderWidth: 3,
    borderColor: "rgba(255,0,0,0.5)",
  },

  /* 대상자 초록 */
  childGreen: {
    position: "absolute",
    top: height * 0.22,
    left: width * 0.35,
    backgroundColor: "#22C55E",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    ...SHADOW.card,
  },

  childNameGreen: {
    color: "#fff",
    fontWeight: "700",
  },

  /* 대상자 위험 */
  childRed: {
    position: "absolute",
    top: height * 0.38,
    left: width * 0.45,
    backgroundColor: "#F97316",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    ...SHADOW.card,
  },

  childNameRed: {
    color: "#fff",
    fontWeight: "700",
  },

  alertDot: {
    position: "absolute",
    top: -10,
    right: -10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },

  /* 보호자 */
  guardian: {
    position: "absolute",
    bottom: 140,
    left: width * 0.4,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.floating,
  },

  /* 왼쪽 줌 */
  zoomBox: {
    position: "absolute",
    left: 16,
    bottom: 180,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 8,
    gap: 12,
    ...SHADOW.card,
  },

  /* 오른쪽 버튼 */
  rightButtons: {
    position: "absolute",
    right: 16,
    bottom: 180,
    gap: 14,
  },

  iconBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.card,
  },

  /* SOS */
  sosBtn: {
    position: "absolute",
    bottom: 80,
    alignSelf: "center",
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 28,
    ...SHADOW.floating,
  },

  sosText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});