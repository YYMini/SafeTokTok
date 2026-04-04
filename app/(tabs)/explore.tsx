// app/(tabs)/explore.tsx
import { useRouter } from "expo-router";
import React from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import Header from "../../components/Header";
import { colors, radius, shadow, spacing } from "../../constants/theme";
import { useAuth } from "../_layout";

export default function NotificationScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <Header onPressSettings={() => router.push("/settings")} onPressLogout={logout} />
      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.title}>알림</Text>
          <Text style={styles.desc}>여기에 알림 리스트/필터/상태 뱃지 들어가면 피그마랑 똑같이 맞출 수 있어.</Text>
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
