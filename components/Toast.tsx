// components/Toast.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

export type ToastType = "error" | "success" | "info";

type Props = {
  visible: boolean;
  type?: ToastType;
  message: string;
  onPress?: () => void;

  topOffset?: number;
  maxWidth?: number;
  iconGap?: number;
  textAlign?: "left" | "center" | "right";
};

export default function Toast({
  visible,
  type = "error",
  message,
  onPress,
  topOffset = 72,
  maxWidth = 330,
  iconGap = 8,
  textAlign = "center",
}: Props) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  const theme = useMemo(() => {
    switch (type) {
      case "success":
        return {
          border: "rgba(34,197,94,0.45)",
          bg: "#ECFDF5",
          text: "rgb(22,101,52)",
          icon: "checkmark-circle" as const,
          iconColor: "rgb(22,101,52)",
        };
      case "info":
        return {
          border: "rgba(59,130,246,0.35)",
          bg: "rgba(59,130,246,0.10)",
          text: "rgb(30,64,175)",
          icon: "information-circle" as const,
          iconColor: "rgb(30,64,175)",
        };
      default:
        return {
          border: "rgba(239,68,68,0.40)",
          bg: "rgba(239,68,68,0.12)",
          text: "rgb(153,27,27)",
          icon: "alert-circle" as const,
          iconColor: "rgb(239,68,68)",
        };
    }
  }, [type]);

  // visible이 false여도 fade-out 애니메이션을 위해 렌더는 유지
  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        styles.wrap,
        {
          top: topOffset,
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-6, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        style={[
          styles.toast,
          {
            maxWidth,
            borderColor: theme.border,
            backgroundColor: theme.bg,
          },
        ]}
      >
        <View style={[styles.row, { gap: iconGap }]}>
          <Ionicons name={theme.icon} size={18} color={theme.iconColor} />
          {/* ✅ 문자열은 무조건 Text 안에서만 렌더 */}
          <Text
            style={[styles.text, { color: theme.text, textAlign }]}
            numberOfLines={2}
          >
            {message}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 999,
  },
  toast: {
    width: "92%",
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
});
