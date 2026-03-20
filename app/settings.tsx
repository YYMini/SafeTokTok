// app/settings.tsx
import { useRouter } from "expo-router";
import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import Header from "../components/Header";
import { colors, radius, shadow, spacing } from "../constants/theme";
import { useAuth } from "./_layout";

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="설정" onPressSettings={() => router.back()} onPressLogout={logout} />
      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.title}>설정</Text>
          <Text style={styles.desc}>피그마 설정 화면 구성(계정/알림/권한/로그아웃)을 그대로 옮길 자리.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, padding: spacing.page },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.card,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
  },
  title: { fontSize: 16, fontWeight: "900", color: colors.text },
  desc: { marginTop: 6, color: colors.subText, fontWeight: "700", lineHeight: 18 },
});
