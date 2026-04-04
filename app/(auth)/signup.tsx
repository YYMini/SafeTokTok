import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SHADOW } from "../../constants/theme";

type Errors = Partial<Record<"userId" | "pw" | "pw2" | "name" | "phone" | "email" | "agree", string>>;

export default function SignupScreen() {
  const router = useRouter();

  // ✅ 입력값 상태
  const [userId, setUserId] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // ✅ 전화번호 (3-4-4 분리 저장, UI는 한 박스)
  const [phoneA, setPhoneA] = useState(""); // 3
  const [phoneB, setPhoneB] = useState(""); // 4
  const [phoneC, setPhoneC] = useState(""); // 4

  const phoneRefA = useRef<TextInput>(null);
  const phoneRefB = useRef<TextInput>(null);
  const phoneRefC = useRef<TextInput>(null);

  const phoneDigits = useMemo(() => `${phoneA}${phoneB}${phoneC}`, [phoneA, phoneB, phoneC]);

  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);
  const [pwShow, setPwShow] = useState(false);
  const [pw2Show, setPw2Show] = useState(false);

  // ✅ 에러 상태
  const [errors, setErrors] = useState<Errors>({});

  const canSubmit = agree1 && agree2;

  // ====== 규칙 ======
  const ID_REGEX = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]+$/;
  const PW_REGEX = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]+$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const scrollRef = useRef<ScrollView>(null);

  const clearFieldError = (key: keyof Errors) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateAll = () => {
    const next: Errors = {};

    const trimmedId = userId.trim();
    const trimmedPw = pw;
    const trimmedPw2 = pw2;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedId) next.userId = "아이디를 입력해주세요";
    else if (trimmedId.length < 4 || trimmedId.length > 20) next.userId = "아이디는 4~20자 이내로 입력해주세요";
    else if (!ID_REGEX.test(trimmedId)) next.userId = "아이디는 영문/숫자/기호로만 가능합니다";

    if (!trimmedPw) next.pw = "비밀번호를 입력해주세요";
    else if (trimmedPw.length < 5 || trimmedPw.length > 20) next.pw = "비밀번호는 5~20자 이내로 입력해주세요";
    else if (!PW_REGEX.test(trimmedPw)) next.pw = "비밀번호는 영문/숫자/기호로만 가능합니다";

    if (!trimmedPw2) next.pw2 = "비밀번호 확인을 입력해주세요";
    else if (trimmedPw2 !== trimmedPw) next.pw2 = "비밀번호가 일치하지 않습니다";

    if (!trimmedName) next.name = "이름을 입력해주세요";

    // ✅ 전화번호: 무조건 11자리(3-4-4)
    if (!phoneDigits) next.phone = "전화번호를 입력해주세요";
    else if (phoneDigits.length !== 11) next.phone = "전화번호는 11자리(010-0000-0000)만 가능합니다";

    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) next.email = "이메일 형식이 올바르지 않습니다";

    if (!(agree1 && agree2)) next.agree = "필수 약관에 동의해주세요";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = () => {
    const ok = validateAll();
    if (!ok) return;
    router.replace("/(auth)/login");
  };

  // ✅ 숫자만 + 길이 제한
  const onlyDigits = (t: string, max: number) => t.replace(/[^0-9]/g, "").slice(0, max);

  // ✅ Backspace로 이전 칸 이동
  const onKeyPressPhone =
    (which: "A" | "B" | "C") => (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
      if (e.nativeEvent.key !== "Backspace") return;

      if (which === "B" && phoneB.length === 0) {
        phoneRefA.current?.focus();
      }
      if (which === "C" && phoneC.length === 0) {
        phoneRefB.current?.focus();
      }
    };

  return (
    <View style={{ flex: 1 }}>
      {/* ✅ 상단 잘림 방지: SafeArea */}
      <SafeAreaView edges={["top"]} style={{ backgroundColor: "#fff" }}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.topTitle}>회원가입</Text>
          <View style={{ width: 44 }} />
        </View>
      </SafeAreaView>

      {/* ✅ 키보드가 입력란 가리는 문제 해결 */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <LinearGradient colors={[COLORS.bgTop, COLORS.bgBottom]} style={{ flex: 1 }}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View style={styles.logoCircle}>
              <Ionicons name="shield-checkmark" size={28} color={COLORS.primary} />
            </View>

            {/* 아이디 */}
            <Text style={styles.label}>
              아이디 <Text style={{ color: "#EF4444" }}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="아이디 입력"
              placeholderTextColor="#9CA3AF"
              value={userId}
              onChangeText={(t) => {
                setUserId(t);
                clearFieldError("userId");
              }}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
            />
            {!!errors.userId && <Text style={styles.errorText}>{errors.userId}</Text>}

            {/* 비밀번호 */}
            <Text style={styles.label}>
              비밀번호 <Text style={{ color: "#EF4444" }}>*</Text>
            </Text>
            <View style={styles.pwRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="비밀번호 입력"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!pwShow}
                value={pw}
                onChangeText={(t) => {
                  setPw(t);
                  clearFieldError("pw");
                }}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                textContentType="none"
                autoComplete="off"
                importantForAutofill="no"
              />
              <Pressable style={styles.eyeBtn} onPress={() => setPwShow((v) => !v)}>
                <Ionicons name={pwShow ? "eye" : "eye-off"} size={18} color="#9CA3AF" />
              </Pressable>
            </View>
            {!!errors.pw && <Text style={styles.errorText}>{errors.pw}</Text>}

            {/* 비밀번호 확인 */}
            <Text style={styles.label}>
              비밀번호 확인 <Text style={{ color: "#EF4444" }}>*</Text>
            </Text>
            <View style={styles.pwRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="비밀번호 재입력"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!pw2Show}
                value={pw2}
                onChangeText={(t) => {
                  setPw2(t);
                  clearFieldError("pw2");
                }}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                textContentType="none"
                autoComplete="off"
                importantForAutofill="no"
              />
              <Pressable style={styles.eyeBtn} onPress={() => setPw2Show((v) => !v)}>
                <Ionicons name={pw2Show ? "eye" : "eye-off"} size={18} color="#9CA3AF" />
              </Pressable>
            </View>
            {!!errors.pw2 && <Text style={styles.errorText}>{errors.pw2}</Text>}

            {/* 이름 */}
            <Text style={styles.label}>
              이름 <Text style={{ color: "#EF4444" }}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="이름 입력"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={(t) => {
                setName(t);
                clearFieldError("name");
              }}
            />
            {!!errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            {/* ✅ 전화번호 */}
            <Text style={styles.label}>
              전화번호 <Text style={{ color: "#EF4444" }}>*</Text>
            </Text>

            <View style={styles.phoneBox}>
              <TextInput
                ref={phoneRefA}
                style={styles.phoneInputA}
                value={phoneA}
                onChangeText={(t) => {
                  const v = onlyDigits(t, 3);
                  setPhoneA(v);
                  clearFieldError("phone");
                  if (v.length === 3) phoneRefB.current?.focus();
                }}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="010"
                placeholderTextColor="#9CA3AF"
              />

              <View style={styles.phoneHyphenWrap}>
                <Text style={styles.phoneHyphen}>-</Text>
              </View>

              <TextInput
                ref={phoneRefB}
                style={styles.phoneInputB}
                value={phoneB}
                onChangeText={(t) => {
                  const v = onlyDigits(t, 4);
                  setPhoneB(v);
                  clearFieldError("phone");
                  if (v.length === 4) phoneRefC.current?.focus();
                }}
                onKeyPress={onKeyPressPhone("B")}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="0000"
                placeholderTextColor="#9CA3AF"
              />

              <View style={styles.phoneHyphenWrap}>
                <Text style={styles.phoneHyphen}>-</Text>
              </View>

              <TextInput
                ref={phoneRefC}
                style={styles.phoneInputC}
                value={phoneC}
                onChangeText={(t) => {
                  const v = onlyDigits(t, 4);
                  setPhoneC(v);
                  clearFieldError("phone");
                }}
                onKeyPress={onKeyPressPhone("C")}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="0000"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {!!errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

            {/* 이메일(선택) */}
            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={styles.input}
              placeholder="example@email.com (선택)"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                clearFieldError("email");
              }}
            />
            {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            {/* 약관 동의 */}
            <Pressable
              style={styles.agreeRow}
              onPress={() => {
                setAgree1((v) => !v);
                clearFieldError("agree");
              }}
            >
              <View style={[styles.checkBox, agree1 && styles.checkBoxOn]}>
                {agree1 && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.agreeText}>[필수] 서비스 이용약관에 동의합니다</Text>
            </Pressable>

            <Pressable
              style={styles.agreeRow}
              onPress={() => {
                setAgree2((v) => !v);
                clearFieldError("agree");
              }}
            >
              <View style={[styles.checkBox, agree2 && styles.checkBoxOn]}>
                {agree2 && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.agreeText}>[필수] 개인정보 처리방침에 동의합니다</Text>
            </Pressable>

            {!!errors.agree && <Text style={styles.errorText}>{errors.agree}</Text>}

            {/* 가입 버튼 */}
            <Pressable
              style={[styles.primaryBtn, !canSubmit && { opacity: 0.45 }]}
              disabled={!canSubmit}
              onPress={onSubmit}
            >
              <Text style={styles.primaryBtnText}>회원가입</Text>
            </Pressable>

            <View style={{ height: 28 }} />
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 56,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "800", color: "#111827" },

  body: { paddingHorizontal: 18, paddingBottom: 50 },
  logoCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 18,
    marginBottom: 18,
    ...SHADOW.soft,
  },

  label: { fontSize: 14, fontWeight: "800", color: "#374151", marginTop: 10, marginBottom: 8 },

  input: {
    height: 52,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },

  pwRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  eyeBtn: { position: "absolute", right: 10, height: 52, justifyContent: "center", paddingHorizontal: 8 },

  agreeRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  checkBoxOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  agreeText: { fontSize: 13, color: "#374151" },

  primaryBtn: {
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    ...SHADOW.soft,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "900" },

  errorText: {
    marginTop: -8,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "800",
    color: "#EF4444",
  },

  // =========================
  // ✅✅ 여기부터 "전화번호 스타일"만 수정
  // =========================

  // 한 박스
  phoneBox: {
    height: 52,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,

    flexDirection: "row",
    alignItems: "center",
  },

  // 하이픈 칸(고정 폭) → 가운데 정렬
  phoneHyphenWrap: {
    width: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  phoneHyphen: {
    fontSize: 14,
    fontWeight: "800",
    color: "#6B7280",
    lineHeight: 18,
    textAlign: "center",
  },

  // ✅ 3칸을 "동일 폭"으로 보이게: 전부 flex:1
  phoneInputA: {
    flex: 1,
    height: 52,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    paddingVertical: 0,
    ...(Platform.OS === "android" ? { includeFontPadding: false, textAlignVertical: "center" as const } : {}),
  },
  phoneInputB: {
    flex: 1,
    height: 52,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    paddingVertical: 0,
    ...(Platform.OS === "android" ? { includeFontPadding: false, textAlignVertical: "center" as const } : {}),
  },
  phoneInputC: {
    flex: 1,
    height: 52,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    paddingVertical: 0,
    ...(Platform.OS === "android" ? { includeFontPadding: false, textAlignVertical: "center" as const } : {}),
  },
});
