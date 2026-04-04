import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SHADOW } from "../../constants/theme";

type Method = "phone" | "email";
type Step = 1 | 2 | 3 | 4;

type Errors = Partial<Record<"contact" | "name" | "code", string>>;

const DEMO = {
  phoneDigits: "01012345678", // 010-1234-5678
  email: "stt@naver.com",
  name: "admin",
  code: "123456",
  foundId: "admin",
} as const;

export default function FindIdScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [method, setMethod] = useState<Method>("phone");

  // Step1: phone/email
  const [email, setEmail] = useState(""); // stt@naver.com를 직접 입력해야 통과
  const [phoneA, setPhoneA] = useState(""); // 3
  const [phoneB, setPhoneB] = useState(""); // 4
  const [phoneC, setPhoneC] = useState(""); // 4
  const phoneDigits = useMemo(() => `${phoneA}${phoneB}${phoneC}`, [phoneA, phoneB, phoneC]);

  // Step2: name/org
  const [name, setName] = useState("");

  // Step3: code
  const [code, setCode] = useState("");

  const [errors, setErrors] = useState<Errors>({});

  // refs
  const phoneRefA = useRef<TextInput>(null);
  const phoneRefB = useRef<TextInput>(null);
  const phoneRefC = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const codeRef = useRef<TextInput>(null);

  // scroll
  const scrollRef = useRef<ScrollView>(null);
  const [yContact, setYContact] = useState(0);
  const [yName, setYName] = useState(0);
  const [yCode, setYCode] = useState(0);

  const scrollToY = (y: number) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 18), animated: true });
    });
  };

  const clearError = (k: keyof Errors) => {
    setErrors((prev) => {
      if (!prev[k]) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

  const onlyDigits = (t: string, max: number) => t.replace(/[^0-9]/g, "").slice(0, max);

  /**
   * ✅ 처음 페이지 진입 시 자동 focus 막기
   */
  const didEnterRef = useRef(false);
  const shouldAutoFocusRef = useRef<null | "step2" | "step3">(null);

  useEffect(() => {
    if (!didEnterRef.current) {
      didEnterRef.current = true;
      return;
    }

    if (step === 2 && shouldAutoFocusRef.current === "step2") {
      shouldAutoFocusRef.current = null;
      setTimeout(() => {
        nameRef.current?.focus();
        scrollToY(yName);
      }, 60);
      return;
    }

    if (step === 3 && shouldAutoFocusRef.current === "step3") {
      shouldAutoFocusRef.current = null;
      setTimeout(() => {
        codeRef.current?.focus();
        scrollToY(yCode);
      }, 60);
      return;
    }
  }, [step, yName, yCode]);

  const validateStep1 = () => {
    const next: Errors = {};
    if (method === "phone") {
      if (phoneDigits.length !== 11) next.contact = "전화번호는 11자리 이내로 입력해주세요";
      else if (phoneDigits !== DEMO.phoneDigits) next.contact = "가입 정보와 일치하지 않습니다";
    } else {
      const v = email.trim();
      if (!v) next.contact = "이메일을 입력해주세요";
      else if (v !== DEMO.email) next.contact = "가입 정보와 일치하지 않습니다";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStep2 = () => {
    const next: Errors = {};
    const v = name.trim();
    if (!v) next.name = "이름 또는 단체명을 입력해주세요";
    else if (v !== DEMO.name) next.name = "가입 정보와 일치하지 않습니다";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStep3 = () => {
    const next: Errors = {};
    const v = code.trim();
    if (v.length !== 6) next.code = "인증코드 6자리를 입력해주세요";
    else if (v !== DEMO.code) next.code = "인증코드가 올바르지 않습니다";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onNext = () => {
    if (step === 1) {
      if (!validateStep1()) return;
      shouldAutoFocusRef.current = "step2";
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!validateStep2()) return;
      shouldAutoFocusRef.current = "step3";
      setStep(3);
      return;
    }
    if (step === 3) {
      if (!validateStep3()) return;
      setStep(4);
      return;
    }
  };

  const resetAll = () => {
    setStep(1);
    setErrors({});
    setEmail("");
    setPhoneA("");
    setPhoneB("");
    setPhoneC("");
    setName("");
    setCode("");
    shouldAutoFocusRef.current = null;
  };

  const headerTitle = step === 4 ? "아이디 찾기 완료" : "아이디 찾기";

  // ✅ 단계별 hero 텍스트를 바꾸기 쉽게 한 곳에서 관리
  const HERO_TEXT = useMemo(() => {
    if (step === 1) return { title: "전화번호 또는 이메일", sub: "전화번호 또는 이메일을 입력하세요" };
    if (step === 2) return { title: "이름 또는 단체명", sub: "이름 또는 단체명을 입력하세요" };
    if (step === 3) return { title: "인증코드", sub: "전송된 6자리 인증코드를 입력하세요" };
    return { title: "완료", sub: "" };
  }, [step]);

  return (
    <LinearGradient colors={[COLORS.bgTop ?? COLORS.bg, COLORS.bgBottom ?? COLORS.bg]} style={{ flex: 1 }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: "transparent" }}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.topTitle}>{headerTitle}</Text>
          <View style={{ width: 44 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* 상단 고정 영역 */}
          {step !== 4 ? (
            <View style={styles.hero}>
              <View style={styles.logoCircle}>
                <Ionicons name="search" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.heroTitle}>{HERO_TEXT.title}</Text>
              <Text style={styles.heroSub}>{HERO_TEXT.sub}</Text>
            </View>
          ) : (
            <View style={styles.heroDone}>
              <Ionicons name="checkmark-circle" size={44} color={COLORS.success ?? "#22C55E"} />
              <Text style={styles.doneTitle}>아이디 확인 완료</Text>
              <Text style={styles.doneSub}>아래에서 아이디를 확인하세요</Text>
            </View>
          )}

          <View style={styles.card}>
            {step === 1 && (
              <View onLayout={(e) => setYContact(e.nativeEvent.layout.y)}>
                <View style={styles.contactWrap}>
                  <View style={styles.methodRow}>
                    <Pressable
                      style={styles.methodBtn}
                      hitSlop={8}
                      onPress={() => {
                        setMethod("phone");
                        clearError("contact");
                        setTimeout(() => phoneRefA.current?.focus(), 80);
                      }}
                    >
                      <Text style={[styles.methodText, method !== "phone" && styles.methodTextOff]}>
                        전화번호
                      </Text>
                    </Pressable>

                    <Text style={styles.methodDivider}>|</Text>

                    <Pressable
                      style={styles.methodBtn}
                      hitSlop={8}
                      onPress={() => {
                        setMethod("email");
                        clearError("contact");
                        setTimeout(() => emailRef.current?.focus(), 80);
                      }}
                    >
                      <Text style={[styles.methodText, method !== "email" && styles.methodTextOff]}>
                        이메일
                      </Text>
                    </Pressable>
                  </View>

                  {method === "phone" ? (
                    // ✅ 박스 아무데나 눌러도 입력 포커스 되게 (체감상 “입력 안 됨” 방지)
                    <Pressable
                      style={styles.phoneBox}
                      onPress={() => {
                        // 비어있는 첫 칸으로 포커스
                        if (phoneA.length < 3) phoneRefA.current?.focus();
                        else if (phoneB.length < 4) phoneRefB.current?.focus();
                        else phoneRefC.current?.focus();
                        scrollToY(yContact);
                      }}
                    >
                      <TextInput
                        ref={phoneRefA}
                        style={styles.phoneInputA}
                        value={phoneA}
                        onChangeText={(t) => {
                          const v = onlyDigits(t, 3);
                          setPhoneA(v);
                          clearError("contact");
                          if (v.length === 3) phoneRefB.current?.focus();
                        }}
                        onFocus={() => scrollToY(yContact)}
                        keyboardType="number-pad"
                        maxLength={3}
                        placeholder="010"
                        placeholderTextColor="#9CA3AF"
                        returnKeyType="next"
                      />
                      <Text style={styles.phoneHyphen}>-</Text>

                      <TextInput
                        ref={phoneRefB}
                        style={styles.phoneInputB}
                        value={phoneB}
                        onChangeText={(t) => {
                          const v = onlyDigits(t, 4);
                          setPhoneB(v);
                          clearError("contact");
                          if (v.length === 4) phoneRefC.current?.focus();
                        }}
                        onKeyPress={({ nativeEvent }) => {
                          if (nativeEvent.key === "Backspace" && phoneB.length === 0) {
                            phoneRefA.current?.focus();
                          }
                        }}
                        keyboardType="number-pad"
                        maxLength={4}
                        placeholder="0000"
                        placeholderTextColor="#9CA3AF"
                      />
                      <Text style={styles.phoneHyphen}>-</Text>

                      <TextInput
                        ref={phoneRefC}
                        style={styles.phoneInputC}
                        value={phoneC}
                        onChangeText={(t) => {
                          const v = onlyDigits(t, 4);
                          setPhoneC(v);
                          clearError("contact");
                        }}
                        onFocus={() => scrollToY(yContact)}
                        keyboardType="number-pad"
                        maxLength={4}
                        placeholder="0000"
                        placeholderTextColor="#9CA3AF"
                        returnKeyType="done"
                      />
                    </Pressable>
                  ) : (
                    // ✅ 이메일도 박스 아무데나 눌러도 포커스 + 입력되게 확실히
                    <Pressable
                      style={styles.emailBox}
                      onPress={() => {
                        emailRef.current?.focus();
                        scrollToY(yContact);
                      }}
                    >
                      <TextInput
                        ref={emailRef}
                        style={styles.emailInput}
                        value={email}
                        onChangeText={(t) => {
                          setEmail(t);
                          clearError("contact");
                        }}
                        onFocus={() => scrollToY(yContact)}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        placeholder="이메일을 입력해주세요"
                        placeholderTextColor="#9CA3AF"
                        returnKeyType="done"
                      />
                    </Pressable>
                  )}
                </View>

                {!!errors.contact && <Text style={styles.errorText}>{errors.contact}</Text>}

                <Pressable style={styles.primaryBtn} onPress={onNext}>
                  <Text style={styles.primaryBtnText}>다음</Text>
                </Pressable>
              </View>
            )}

            {step === 2 && (
              <View onLayout={(e) => setYName(e.nativeEvent.layout.y)}>
                <View style={styles.singleInputBox}>
                  <TextInput
                    ref={nameRef}
                    style={styles.singleInput}
                    value={name}
                    onChangeText={(t) => {
                      setName(t);
                      clearError("name");
                    }}
                    onFocus={() => scrollToY(yName)}
                    placeholder="이름 또는 단체명을 입력해주세요"
                    placeholderTextColor="#9CA3AF"
                    returnKeyType="done"
                  />
                </View>

                {!!errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

                <Pressable style={styles.primaryBtn} onPress={onNext}>
                  <Text style={styles.primaryBtnText}>확인</Text>
                </Pressable>
              </View>
            )}

            {step === 3 && (
              <View onLayout={(e) => setYCode(e.nativeEvent.layout.y)}>

                <View style={styles.singleInputBox}>
                  <TextInput
                    ref={codeRef}
                    style={[styles.singleInput, { textAlign: "center", letterSpacing: 4 }]}
                    value={code}
                    onChangeText={(t) => {
                      setCode(onlyDigits(t, 6));
                      clearError("code");
                    }}
                    onFocus={() => scrollToY(yCode)}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="● ● ● ● ● ●"
                    placeholderTextColor="rgba(17,24,39,0.28)"
                    returnKeyType="done"
                  />
                </View>

                {!!errors.code && <Text style={styles.errorText}>{errors.code}</Text>}

                <Pressable style={styles.primaryBtn} onPress={onNext}>
                  <Text style={styles.primaryBtnText}>인증 완료</Text>
                </Pressable>
              </View>
            )}

{step === 4 && (
  <View>
    {/* 아이디 표시 네모칸 */}
    <View style={styles.resultCard}>
      <Text style={styles.resultTitle}>찾은 아이디</Text>
      <Text style={styles.resultId}>{DEMO.foundId}</Text>
    </View>

    {/* 🔥 네모칸 밖으로 버튼 이동 */}
    <Pressable
      style={[styles.primaryBtn, { marginTop: 18 }]}
      onPress={() => router.replace("/(auth)/login")}
    >
      <Text style={styles.primaryBtnText}>로그인으로 이동</Text>
    </Pressable>
  </View>
)}

          </View>

          <View style={{ height: 26 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "900", color: "#111827" },

  body: {
    paddingHorizontal: 22,
    paddingBottom: 40,
  },

  hero: { alignItems: "center", marginTop: 18, marginBottom: 14 },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.soft,
    marginBottom: 10,
  },
  heroTitle: { fontSize: 18, fontWeight: "900", color: "#111827", marginTop: 9 },
  heroSub: { marginTop: 4, fontSize: 13, fontWeight: "700", color: "rgba(17,24,39,0.55)", textAlign: "center" },

  heroDone: { alignItems: "center", marginTop: 22, marginBottom: 14 },
  doneTitle: { marginTop: 10, fontSize: 22, fontWeight: "900", color: "#111827" },
  doneSub: { marginTop: 8, fontSize: 13, fontWeight: "800", color: "rgba(17,24,39,0.55)" },

  card: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    padding: 16,
    marginTop: -13,
    ...SHADOW.card,
  },

  contactWrap: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "rgba(255,255,255,0.65)",
    overflow: "hidden",
    marginBottom: 12,
  },

  methodRow: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  methodBtn: {
    width: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  methodDivider: {
    width: 18,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: "rgba(17,24,39,0.25)",
    marginHorizontal: 6,
  },
  methodText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  methodTextOff: {
    color: "rgba(17,24,39,0.35)",
  },

  phoneBox: {
    height: 54,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  phoneHyphen: {
    width: 18,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(17,24,39,0.45)",
  },
  phoneInputA: {
    flex: 3,
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    paddingVertical: 0,
    letterSpacing: 0,
  },
  phoneInputB: {
    flex: 4,
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    paddingVertical: 0,
    letterSpacing: 0,
  },
  phoneInputC: {
    flex: 4,
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    paddingVertical: 0,
    letterSpacing: 0,
  },

  // ✅ 이메일 입력이 “확실히” 되게: 컨테이너를 Pressable로 + input에 flex:1
  emailBox: {
    height: 54,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  emailInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    paddingVertical: 0,
  },

  singleInputBox: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    paddingHorizontal: 14,
    justifyContent: "center",
    marginBottom: 12,
  },
  singleInput: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    paddingVertical: 0,
  },

  errorText: {
    marginTop: -4,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: "900",
    color: "#EF4444",
    textAlign: "center",
  },

  primaryBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.floating,
    marginTop: 6,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "900" },

  resultCard: {
    borderRadius: 18,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.90)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    ...SHADOW.card,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.success ?? "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 10,
  },
  resultTitle: { textAlign: "center", fontSize: 16, fontWeight: "900", color: "rgba(0, 0, 0, 0.55)" },
  resultId: { textAlign: "center", marginTop: 10, fontSize: 26, fontWeight: "900", color: "#111827" },
});
