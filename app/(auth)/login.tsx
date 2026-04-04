// app/(auth)/login.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { COLORS, SHADOW } from "../../constants/theme";
import { useAuth } from "../_layout";


const STORAGE_KEYS = {
  remember: "rememberMe",
  savedId: "savedLoginId",
  savedPw: "savedLoginPw",
  isLoggedIn: "isLoggedIn",
} as const;

type ToastType = "error" | "success" | "none";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // ✅ 토스트(상단 배너)
  const [toastVisible, setToastVisible] = useState(false);
  const [toastText, setToastText] = useState("");
  const [toastType, setToastType] = useState<ToastType>("none");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);


  const toastAnim = useRef(new Animated.Value(0)).current;

  const dismissToast = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    Animated.timing(toastAnim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      setToastVisible(false);
      setToastText("");
      setToastType("none");
    });
  };

  const showToast = (type: ToastType, message: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    setToastType(type);
    setToastText(message);
    setToastVisible(true);

    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();

    toastTimerRef.current = setTimeout(() => {
      dismissToast();
    }, 3000);
  };

  useEffect(() => {
    (async () => {
      try {
        const remember = await AsyncStorage.getItem(STORAGE_KEYS.remember);
        const isRemember = remember === "true";
        setRememberMe(isRemember);

        if (isRemember) {
          const savedId = (await AsyncStorage.getItem(STORAGE_KEYS.savedId)) ?? "";
          const savedPw = (await AsyncStorage.getItem(STORAGE_KEYS.savedPw)) ?? "";
          setId(savedId);
          setPw(savedPw);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ✅ 입력 시작/포커스 시 토스트 즉시 숨김
  const onFocusInput = () => {
    if (toastVisible) dismissToast();
  };

  const normalized = useMemo(() => {
    return {
      id: id.trim(),
      pw: pw.trim(),
    };
  }, [id, pw]);

  const onSubmit = async () => {
    Keyboard.dismiss();

    // 1) 둘 다 없거나 하나만 있는 경우
    if (!normalized.id || !normalized.pw) {
      showToast("error", "아이디 및 비밀번호를 입력해주세요");
      return;
    }

    // 2) 틀린 경우 (데모: admin/admin)
    const ok = normalized.id === "admin" && normalized.pw === "admin";
    if (!ok) {
      showToast("error", "아이디 및 비밀번호가 틀렸습니다");
      return;
    }

    // ✅ rememberMe 처리
    try {
      if (rememberMe) {
        await AsyncStorage.setItem(STORAGE_KEYS.remember, "true");
        await AsyncStorage.setItem(STORAGE_KEYS.savedId, normalized.id);
        await AsyncStorage.setItem(STORAGE_KEYS.savedPw, normalized.pw);
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.remember, "false");
        await AsyncStorage.removeItem(STORAGE_KEYS.savedId);
        await AsyncStorage.removeItem(STORAGE_KEYS.savedPw);
      }
      await AsyncStorage.setItem(STORAGE_KEYS.isLoggedIn, "true");
    } catch {
      // ignore
    }

    // 로그인 처리 + 이동
    await login();
    router.replace("/(tabs)");
  };

  const goSignup = () => router.push("/(auth)/signup");
  const goFindId = () => router.push("/(auth)/find-id");
  const goFindPw = () => router.push("/(auth)/find-password");

  const toastUI = useMemo(() => {
    const isError = toastType === "error";
    const isSuccess = toastType === "success";

    const iconName = isError ? "alert-circle" : isSuccess ? "checkmark-circle" : "information-circle";
    const iconColor = isError ? COLORS.danger : isSuccess ? COLORS.success : COLORS.text;

    const bg = isError ? "rgba(255, 235, 235, 0.92)" : "rgba(235, 255, 243, 0.92)";
    const border = isError ? "rgba(239,68,68,0.35)" : "rgba(34,197,94,0.35)";
    const textColor = isError ? "#B91C1C" : "#047857";

    return { iconName, iconColor, bg, border, textColor };
  }, [toastType]);

  return (
    <LinearGradient
      colors={[COLORS.bgTop ?? COLORS.bg, COLORS.bgBottom ?? COLORS.bg]}
      style={styles.safe}
    >
      {toastVisible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toastWrap,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-6, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.toastBox, { backgroundColor: toastUI.bg, borderColor: toastUI.border }]}>
            <Ionicons name={toastUI.iconName as any} size={22} color={toastUI.iconColor} />
            <Text style={[styles.toastText, { color: toastUI.textColor }]} numberOfLines={2}>
              {toastText}
            </Text>
          </View>
        </Animated.View>
      )}

      <View style={styles.container}>
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark" size={26} color={COLORS.primary} />
          </View>
          <Text style={styles.brand}>안심톡톡</Text>
          <Text style={styles.slogan}>우리 아이의 안전한 동행</Text>
        </View>

        <View style={styles.card}>
          <TextInput
            placeholder="아이디"
            placeholderTextColor="#9CA3AF"
            value={id}
            onChangeText={(t) => {
              if (toastVisible) dismissToast();
              setId(t);
            }}
            onFocus={onFocusInput}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            returnKeyType="next"
          />

          <View style={styles.pwRow}>
            <TextInput
              placeholder="비밀번호"
              placeholderTextColor="#9CA3AF"
              value={pw}
              onChangeText={(t) => {
                if (toastVisible) dismissToast();
                setPw(t);
              }}
              onFocus={onFocusInput}
              secureTextEntry={!showPw}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, styles.pwInput]}
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />

            <Pressable style={styles.eyeBtn} onPress={() => setShowPw((v) => !v)} hitSlop={8}>
              <Ionicons name={showPw ? "eye" : "eye-off"} size={22} color="#6B7280" />
            </Pressable>
          </View>

          <View style={styles.optionsRow}>
            <Pressable style={styles.rememberRow} onPress={() => setRememberMe((v) => !v)} hitSlop={8}>
              <View style={[styles.checkbox, rememberMe && styles.checkboxOn]}>
                {rememberMe && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={styles.rememberText}>자동 로그인</Text>
            </Pressable>

            <View style={styles.findRow}>
              <Pressable onPress={goFindId} hitSlop={8}>
                <Text style={styles.findText}>아이디 찾기</Text>
              </Pressable>
              <Text style={styles.divider}> | </Text>
              <Pressable onPress={goFindPw} hitSlop={8}>
                <Text style={styles.findText}>비밀번호 찾기</Text>
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.loginBtn} onPress={onSubmit}>
            <Text style={styles.loginBtnText}>로그인</Text>
          </Pressable>

          <Pressable style={styles.signupBtn} onPress={goSignup}>
            <Text style={styles.signupText}>회원가입</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>아이의 안전을 최우선으로 생각합니다</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 86,
    paddingBottom: 26,
    justifyContent: "flex-start",
  },

  toastWrap: {
    position: "absolute",
    top: Platform.select({ ios: 56, android: 44, default: 44 }),
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
  },
  toastBox: {
    width: "75%",
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    ...SHADOW.soft,
  },
  toastText: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 18,
  },

  logoWrap: { alignItems: "center", marginBottom: 18 },
  logoCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 67,
    marginBottom: 10,
    ...SHADOW.soft,
  },
  brand: { fontSize: 26, color: COLORS.primary, fontWeight: "900" },
  slogan: { marginTop: 10, fontSize: 14, color: "rgba(17,24,39,0.55)", fontWeight: "700" },

  card: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 330,
    marginTop: -8,
    borderRadius: 18,
    padding: 16,
    ...SHADOW.card,
  },

  input: {
    height: 54,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 12,
  },

  pwRow: { position: "relative", justifyContent: "center", marginTop: -1,marginBottom:-1},
  pwInput: { paddingRight: 48 },
  eyeBtn: { position: "absolute", right: 12, height: 54, justifyContent: "center", top:0},

  optionsRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  rememberRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.18)",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 5,
    marginRight: -2,

    position: "relative",
  },

  checkboxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  rememberText: { fontSize: 14, fontWeight: "800", color: "#111827" },

  findRow: { flexDirection: "row", alignItems: "center", marginRight:3 },
  findText: { fontSize: 12, fontWeight: "800", color: "rgba(17,24,39,0.55)" },
  divider: { fontSize: 12, fontWeight: "900", color: "rgba(17,24,39,0.25)", marginHorizontal: 6 },

  loginBtn: {
    height: 53,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.floating,
    marginTop: 8
  },
  loginBtnText: { color: "#fff", fontSize: 17, fontWeight: "900" },

  signupBtn: { marginTop: 23, alignItems: "center", marginBottom: 5},
  signupText: { fontSize: 16, fontWeight: "900", color: "rgba(17,24,39,0.50)" },

  footer: { marginTop: 20, textAlign: "center", color: "rgba(17,24,39,0.35)", fontWeight: "700" },
});
