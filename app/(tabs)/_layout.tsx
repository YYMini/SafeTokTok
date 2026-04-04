import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Tabs, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { COLORS } from "../../constants/theme";

export default function TabsLayout() {
  const router = useRouter();

  // 탭 진입 시 로그인 체크(간단 가드)
  useEffect(() => {
    (async () => {
      const v = await AsyncStorage.getItem("isLoggedIn");
      if (v !== "true") router.replace("/(auth)/login");
    })();
  }, [router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { height: 64, paddingTop: 6, paddingBottom: 10 },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: "#9CA3AF",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "위치추적",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "알림",
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
