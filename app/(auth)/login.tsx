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

import { API_BASE_URL } from "../../constants/api";
import { COLORS, SHADOW } from "../../constants/theme";
import { useAuth } from "../_layout";

const STORAGE_KEYS = {
  remember: "rememberMe",
  savedId: "savedLoginId",
  savedPw: "savedLoginPw",
  isLoggedIn: "isLoggedIn",
  accountId: "authAccountId",
  accountPw: "authAccountPw",
  currentUserId: "currentUserId",
  currentUserRole: "currentUserRole",
  profile: "profileData_v1",
} as const;

type ToastType = "error" | "success" | "none";

type LoginResponse = {
  id: number;
  loginId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: "PARENT" | "CHILD";
};

const toProfileRole = (role: LoginResponse["role"]) =>
  role === "PARENT" ? "guardian" : "user";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const pwInputRef = useRef<TextInput>(null);

  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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
          const savedId =
            (await AsyncStorage.getItem(STORAGE_KEYS.savedId)) ?? "";
          const savedPw =
            (await AsyncStorage.getItem(STORAGE_KEYS.savedPw)) ?? "";
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

  const onFocusInput = () => {
    if (toastVisible) dismissToast();
  };

  const normalized = useMemo(() => {
    return {
      id: id.trim(),
      pw: pw.trim(),
    };
  }, [id, pw]);

  const saveLoginState = async (loggedInUser: LoginResponse) => {
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
    await AsyncStorage.setItem(STORAGE_KEYS.currentUserId, String(loggedInUser.id));
    await AsyncStorage.setItem(STORAGE_KEYS.currentUserRole, loggedInUser.role);
    await AsyncStorage.setItem(STORAGE_KEYS.accountId, loggedInUser.loginId);
    await AsyncStorage.setItem(STORAGE_KEYS.accountPw, normalized.pw);
    await AsyncStorage.setItem(
      STORAGE_KEYS.profile,
      JSON.stringify({
        name: loggedInUser.name,
        userId: loggedInUser.loginId,
        email: loggedInUser.email ?? "",
        phone: loggedInUser.phone ?? "010-0000-0000",
        imageUri: null,
        role: toProfileRole(loggedInUser.role),
        roleLabel: loggedInUser.role === "PARENT" ? "보호자" : "사용자",
      }),
    );
  };

  const onSubmit = async () => {
    Keyboard.dismiss();

    if (!normalized.id || !normalized.pw) {
      showToast("error", "아이디 및 비밀번호를 입력해주세요");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          loginId: normalized.id,
          password: normalized.pw,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const loggedInUser = (await response.json()) as LoginResponse;
      await saveLoginState(loggedInUser);
    } catch (error) {
      console.log("백엔드 로그인 실패", error);
      showToast("error", "아이디 또는 비밀번호가 올바르지 않습니다");
      await AsyncStorage.removeItem(STORAGE_KEYS.currentUserId);
      await AsyncStorage.removeItem(STORAGE_KEYS.currentUserRole);
      return;
    }

    await login();
    router.replace("/(tabs)");
  };

  const goSignup = () => router.push("/(auth)/signup");
  const goFindId = () => router.push("/(auth)/find-id");
  const goFindPw = () => router.push("/(auth)/find-password");

  const toastUI = useMemo(() => {
    const isError = toastType === "error";
    const isSuccess = toastType === "success";

    const iconName = isError
      ? "alert-circle"
      : isSuccess
      ? "checkmark-circle"
      : "information-circle";
    const iconColor = isError
      ? COLORS.danger
      : isSuccess
      ? COLORS.success
      : COLORS.text;

    const bg = isError
      ? "rgba(255, 235, 235, 0.92)"
      : "rgba(235, 255, 243, 0.92)";
    const border = isError
      ? "rgba(239,68,68,0.35)"
      : "rgba(34,197,94,0.35)";
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
          <View
            style={[
              styles.toastBox,
              { backgroundColor: toastUI.bg, borderColor: toastUI.border },
            ]}
          >
            <View style={styles.toastContent}>
              <Ionicons
                name={toastUI.iconName as any}
                size={20}
                color={toastUI.iconColor}
              />
              <Text
                style={[styles.toastText, { color: toastUI.textColor }]}
                numberOfLines={1}
              >
                {toastText}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      <View style={styles.container}>
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Ionicons
              name="shield-checkmark"
              size={23}
              color={COLORS.primary}
            />
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
            onSubmitEditing={() => pwInputRef.current?.focus()}
          />

          <Pressable
            style={styles.pwRow}
            onPress={() => pwInputRef.current?.focus()}
          >
            <View style={[styles.input, styles.pwInputDisplay]}>
              <Text
                style={[
                  styles.pwDisplayText,
                  !pw && styles.pwPlaceholderText,
                ]}
                numberOfLines={1}
              >
                {pw ? (showPw ? pw : "●".repeat(pw.length)) : "비밀번호"}
              </Text>
            </View>

            <TextInput
              ref={pwInputRef}
              value={pw}
              onChangeText={(t) => {
                if (toastVisible) dismissToast();
                setPw(t);
              }}
              onFocus={onFocusInput}
              secureTextEntry={false}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              keyboardType="default"
              contextMenuHidden
              caretHidden
              style={styles.hiddenPwInput}
              returnKeyType="done"
              onSubmitEditing={onSubmit}
            />

            <Pressable
              style={styles.eyeBtn}
              onPress={() => setShowPw((v) => !v)}
              hitSlop={8}
            >
              <Ionicons
                name={showPw ? "eye" : "eye-off"}
                size={22}
                color="#6B7280"
              />
            </Pressable>
          </Pressable>

          <View style={styles.optionsRow}>
            <Pressable
              style={styles.rememberRow}
              onPress={() => setRememberMe((v) => !v)}
              hitSlop={8}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxOn]}>
                {rememberMe && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
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
    paddingHorizontal: 36,
    paddingTop: 20,
    paddingBottom: 42,
    justifyContent: "center",
  },

  toastWrap: {
    position: "absolute",
    top: Platform.select({ ios: 36, android: 28, default: 28 }),
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
  },

  toastBox: {
    alignSelf: "center",
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    ...SHADOW.soft,
  },

  toastContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  toastText: {
    marginLeft: 7,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 18,
  },

  logoWrap: { alignItems: "center", marginBottom: 12 },

  logoCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 7,
    ...SHADOW.soft,
  },

  brand: {
    fontSize: 21,
    color: COLORS.primary,
    fontWeight: "900",
  },

  slogan: {
    marginTop: 5,
    fontSize: 12,
    color: "rgba(17,24,39,0.55)",
    fontWeight: "700",
  },

  card: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 280,
    marginTop: 13,
    borderRadius: 0,
    padding: 0,
  },

  input: {
    height: 46,
    backgroundColor: "#fff",
    borderRadius: 13,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 10,
  },

  pwRow: {
    position: "relative",
    justifyContent: "center",
    marginTop: -1,
    marginBottom: -1,
  },

  pwInputDisplay: {
    paddingRight: 48,
    justifyContent: "center",
  },

  pwDisplayText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
  },

  pwPlaceholderText: {
    color: "#9CA3AF",
  },

  hiddenPwInput: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 1,
    height: 1,
    opacity: 0,
    color: "transparent",
    backgroundColor: "transparent",
  },

  eyeBtn: {
    position: "absolute",
    right: 12,
    height: 46,
    justifyContent: "center",
    top: 0,
  },

  optionsRow: {
    marginTop: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

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

  checkboxOn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  rememberText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },

  findRow: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 3,
  },

  findText: {
    fontSize: 11,
    fontWeight: "800",
    color: "rgba(17,24,39,0.55)",
  },

  divider: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(17,24,39,0.25)",
    marginHorizontal: 6,
  },

  loginBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.floating,
    marginTop: 6,
  },

  loginBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },

  signupBtn: {
    marginTop: 20,
    alignItems: "center",
    marginBottom: 4,
  },

  signupText: {
    fontSize: 15,
    fontWeight: "900",
    color: "rgba(17,24,39,0.50)",
  },

  footer: {
    marginTop: 26,
    textAlign: "center",
    color: "rgba(17,24,39,0.28)",
    fontWeight: "700",
    fontSize: 13,
  },
});
