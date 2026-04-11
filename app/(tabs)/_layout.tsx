// app/(tabs)/_layout.tsx
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBar } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import React from "react";
import { View } from "react-native";

const TAB_H = 70;
const DIVIDER_H = 35;

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => (
        <View style={{ position: "relative" }}>
          <BottomTabBar {...props} />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: "50%",
              marginLeft: -0.5,
              top: "50%",
              marginTop: -(DIVIDER_H / 2),
              height: DIVIDER_H,
              width: 1,
              backgroundColor: "rgba(0,0,0,0.08)",
            }}
          />
        </View>
      )}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: "#9AA3AF",
        tabBarStyle: {
          height: TAB_H,
          paddingTop: 5,
          paddingBottom: 10,
          borderTopWidth: 0,
          backgroundColor: "#fff",
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "위치추적",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "알림",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}