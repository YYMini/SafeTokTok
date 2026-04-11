// app/(auth)/find-password.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
type Step = 1 | 2 | 3 | 4 | 5 | 6;

type Errors = Partial<Record<"userId" | "contact" | "name" | "code" | "pw" | "pw2", string>>;

const AUTH_KEYS = {
  accountId: "authAccountId",
  accountPw: "authAccountPw",
} as const;

const DEMO = {
  userId: "admin",
  phoneDigits: "01012345678",
  email: "stt@naver.com",
  name: "admin",
  code: "123456",
} as const;

export default function FindPasswordScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [method, setMethod] = useState<Method>("phone");

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwShow, setPwShow] = useState(false);
  const [pw2Show, setPw2Show] = useState(false);

  const [errors, setErrors] = useState<Errors>({});

  const idRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const codeRef = useRef<TextInput>(null);
  const pwRef = useRef<TextInput>(null);
  const pw2Ref = useRef<TextInput>(null);

  const scrollRef = useRef<ScrollView>(null);
  const [yId, setYId] = useState(0);
  const [yContact, setYContact] = useState(0);
  const [yName, setYName] = useState(0);
  const [yCode, setYCode] = useState(0);
  const [yPw, setYPw] = useState(0);

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

  const didEnterRef = useRef(false);
  const shouldAutoFocusRef = useRef<null | "id" | "contactPhone" | "contactEmail" | "name" | "code" | "pw">(null);

  useEffect(() => {
    if (!didEnterRef.current) {
      didEnterRef.current = true;
      return;
    }

    if (step === 1 && shouldAutoFocusRef.current === "id") {
      shouldAutoFocusRef.current = null;
      setTimeout(() => {
        idRef.current?.focus();
        scrollToY(yId);
      }, 60);
      return;
    }

    if (step === 2) {
      const next = shouldAutoFocusRef.current;
      if (next === "contactPhone") {
        shouldAutoFocusRef.current = null;
        setTimeout(() => {
          phoneInputRef.current?.focus();
          scrollToY(yContact);
        }, 60);
        return;
      }
      if (next === "contactEmail") {
        shouldAutoFocusRef.current = null;
        setTimeout(() => {
          emailRef.current?.focus();
          scrollToY(yContact);
        }, 60);
        return;
      }
      return;
    }

    if (step === 3 && shouldAutoFocusRef.current === "name") {
      shouldAutoFocusRef.current = null;
      setTimeout(() => {
        nameRef.current?.focus();
        scrollToY(yName);
      }, 60);
      return;
    }

    if (step === 4 && shouldAutoFocusRef.current === "code") {
      shouldAutoFocusRef.current = null;
      setTimeout(() => {
        codeRef.current?.focus();
        scrollToY(yCode);
      }, 60);
      return;
    }

    if (step === 5 && shouldAutoFocusRef.current === "pw") {
      shouldAutoFocusRef.current = null;
      setTimeout(() => {
        pwRef.current?.focus();
        scrollToY(yPw);
      }, 60);
    }
  }, [step, yId, yContact, yName, yCode, yPw]);

  const validateStep1 = () => {
    const next: Errors = {};
    const v = userId.trim();
    if (!v) next.userId = "아이디를 입력해주세요";
    else if (v !== DEMO.userId) next.userId = "가입 정보와 일치하지 않습니다";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStep2 = () => {
    const next: Errors = {};
    if (method === "phone") {
      if (phoneDigits.length !== 11) next.contact = "전화번호는 11자리로 입력해주세요";
      else if (phoneDigits !== DEMO.phoneDigits) next.contact = "가입 정보와 일치하지 않습니다";
    } else {
      const v = email.trim();
      if (!v) next.contact = "이메일을 입력해주세요";
      else if (v !== DEMO.email) next.contact = "가입 정보와 일치하지 않습니다";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStep3 = () => {
    const next: Errors = {};
    const v = name.trim();
    if (!v) next.name = "이름 또는 단체명을 입력해주세요";
    else if (v !== DEMO.name) next.name = "가입 정보와 일치하지 않습니다";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStep4 = () => {
    const next: Errors = {};
    const v = code.trim();
    if (v.length !== 6) next.code = "인증코드 6자리를 입력해주세요";
    else if (v !== DEMO.code) next.code = "인증코드가 올바르지 않습니다";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStep5 = () => {
    const next: Errors = {};
    const p1 = pw;
    const p2 = pw2;

    if (!p1) next.pw = "새 비밀번호를 입력해주세요";
    else if (p1.length < 5) next.pw = "비밀번호는 5자 이상으로 입력해주세요";

    if (!p2) next.pw2 = "비밀번호 확인을 입력해주세요";
    else if (p2 !== p1) next.pw2 = "비밀번호가 일치하지 않습니다";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const headerTitle = step === 6 ? "비밀번호 재설정 완료" : "비밀번호 찾기";

  const HERO_TEXT = useMemo(() => {
    if (step === 1) return { title: "기존 아이디", sub: "아이디를 입력하세요" };
    if (step === 2) return { title: "전화번호 또는 이메일", sub: "전화번호 또는 이메일을 입력하세요" };
    if (step === 3) return { title: "이름 또는 단체명", sub: "이름 또는 단체명을 입력하세요" };
    if (step === 4) return { title: "인증코드", sub: "전송된 6자리 인증코드를 입력하세요" };
    if (step === 5) return { title: "비밀번호 재설정", sub: "새 비밀번호를 설정하세요" };
    return { title: "변경 완료", sub: "" };
  }, [step]);

  const step5Error = errors.pw2 || errors.pw;

  const phoneA = phoneDigits.slice(0, 3);
  const phoneB = phoneDigits.slice(3, 7);
  const phoneC = phoneDigits.slice(7, 11);

  const renderPhoneCell = (value: string, placeholder: string, width: number) => {
    const shown = value || placeholder;
    const isPlaceholder = value.length === 0;

    return (
      <View style={[styles.phoneCell, { width }]}>
        <Text style={[styles.phoneCellText, isPlaceholder && styles.phonePlaceholder]}>
          {shown}
        </Text>
      </View>
    );
  };

  const saveNewPassword = async () => {
    const nextId = DEMO.userId;
    const nextPw = pw.trim();

    await AsyncStorage.setItem(AUTH_KEYS.accountId, nextId);
    await AsyncStorage.setItem(AUTH_KEYS.accountPw, nextPw);
  };

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
          {step !== 6 ? (
            <View style={styles.hero}>
              <View style={styles.logoCircle}>
                <Ionicons name="key" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.heroTitle}>{HERO_TEXT.title}</Text>
              <Text style={styles.heroSub}>{HERO_TEXT.sub}</Text>
            </View>
          ) : (
            <View style={styles.heroDone}>
              <Ionicons name="checkmark-circle" size={44} color={COLORS.success ?? "#22C55E"} />
              <Text style={styles.doneTitle}>비밀번호 변경 완료</Text>
              <Text style={styles.doneSub}>새 비밀번호로 로그인 해주세요</Text>
            </View>
          )}

          <View style={styles.card}>
            {step === 1 && (
              <View onLayout={(e) => setYId(e.nativeEvent.layout.y)}>
                <View style={styles.singleInputBox}>
                  <TextInput
                    ref={idRef}
                    style={styles.singleInput}
                    value={userId}
                    onChangeText={(t) => {
                      setUserId(t);
                      clearError("userId");
                    }}
                    onFocus={() => scrollToY(yId)}
                    placeholder="아이디 입력"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                </View>

                {!!errors.userId && <Text style={styles.errorText}>{errors.userId}</Text>}

                <Pressable
                  style={styles.primaryBtn}
                  onPress={() => {
                    if (!validateStep1()) return;
                    shouldAutoFocusRef.current = method === "phone" ? "contactPhone" : "contactEmail";
                    setStep(2);
                  }}
                >
                  <Text style={styles.primaryBtnText}>다음</Text>
                </Pressable>
              </View>
            )}

            {step === 2 && (
              <View onLayout={(e) => setYContact(e.nativeEvent.layout.y)}>
                <View style={styles.contactWrap}>
                  <View style={styles.methodRow}>
                    <Pressable
                      style={styles.methodBtn}
                      hitSlop={8}
                      onPress={() => {
                        setMethod("phone");
                        clearError("contact");
                        setTimeout(() => phoneInputRef.current?.focus(), 80);
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
                    <Pressable
                      style={styles.phoneBox}
                      onPress={() => {
                        phoneInputRef.current?.focus();
                        scrollToY(yContact);
                      }}
                    >
                      <View style={styles.phoneDisplayRow}>
                        {renderPhoneCell(phoneA, "000", 72)}
                        <Text style={styles.phoneHyphen}>-</Text>
                        {renderPhoneCell(phoneB, "0000", 88)}
                        <Text style={styles.phoneHyphen}>-</Text>
                        {renderPhoneCell(phoneC, "0000", 88)}
                      </View>

                      <TextInput
                        ref={phoneInputRef}
                        style={styles.hiddenPhoneInput}
                        value={phoneDigits}
                        onChangeText={(t) => {
                          setPhoneDigits(onlyDigits(t, 11));
                          clearError("contact");
                        }}
                        onFocus={() => scrollToY(yContact)}
                        keyboardType="number-pad"
                        maxLength={11}
                        returnKeyType="done"
                        caretHidden
                      />
                    </Pressable>
                  ) : (
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

                <Pressable
                  style={styles.primaryBtn}
                  onPress={() => {
                    if (!validateStep2()) return;
                    shouldAutoFocusRef.current = "name";
                    setStep(3);
                  }}
                >
                  <Text style={styles.primaryBtnText}>다음</Text>
                </Pressable>
              </View>
            )}

            {step === 3 && (
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
                    placeholder="이름 또는 단체명 입력"
                    placeholderTextColor="#9CA3AF"
                    returnKeyType="done"
                  />
                </View>

                {!!errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

                <Pressable
                  style={styles.primaryBtn}
                  onPress={() => {
                    if (!validateStep3()) return;
                    shouldAutoFocusRef.current = "code";
                    setStep(4);
                  }}
                >
                  <Text style={styles.primaryBtnText}>확인</Text>
                </Pressable>
              </View>
            )}

            {step === 4 && (
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

                <Pressable
                  style={[styles.primaryBtn, { marginTop: 5 }]}
                  onPress={() => {
                    if (!validateStep4()) return;
                    shouldAutoFocusRef.current = "pw";
                    setStep(5);
                  }}
                >
                  <Text style={styles.primaryBtnText}>인증 완료</Text>
                </Pressable>
              </View>
            )}

            {step === 5 && (
              <View onLayout={(e) => setYPw(e.nativeEvent.layout.y)}>
                <View style={styles.pwGroup}>
                  <View style={styles.pwRow}>
                    <TextInput
                      ref={pwRef}
                      style={[styles.pwInput, { letterSpacing: 0.5 }]}
                      placeholder="새 비밀번호"
                      placeholderTextColor="#9CA3AF"
                      value={pw}
                      onChangeText={(t) => {
                        setPw(t);
                        clearError("pw");
                      }}
                      onFocus={() => scrollToY(yPw)}
                      secureTextEntry={!pwShow}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      onSubmitEditing={() => pw2Ref.current?.focus()}
                    />
                    <Pressable style={styles.eyeBtn} onPress={() => setPwShow((v) => !v)} hitSlop={8}>
                      <Ionicons name={pwShow ? "eye-off" : "eye"} size={20} color="rgba(17,24,39,0.45)" />
                    </Pressable>
                  </View>

                  <View style={styles.pwDivider} />

                  <View style={styles.pwRow}>
                    <TextInput
                      ref={pw2Ref}
                      style={styles.pwInput}
                      placeholder="새 비밀번호 확인"
                      placeholderTextColor="#9CA3AF"
                      value={pw2}
                      onChangeText={(t) => {
                        setPw2(t);
                        clearError("pw2");
                      }}
                      onFocus={() => scrollToY(yPw)}
                      secureTextEntry={!pw2Show}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                    />
                    <Pressable style={styles.eyeBtn} onPress={() => setPw2Show((v) => !v)} hitSlop={8}>
                      <Ionicons name={pw2Show ? "eye-off" : "eye"} size={20} color="rgba(17,24,39,0.45)" />
                    </Pressable>
                  </View>
                </View>

                {!!step5Error && <Text style={styles.errorTextPw}>{step5Error}</Text>}

                <Pressable
                  style={styles.primaryBtn}
                  onPress={async () => {
                    if (!validateStep5()) return;
                    await saveNewPassword();
                    setStep(6);
                  }}
                >
                  <Text style={styles.primaryBtnText}>변경 완료</Text>
                </Pressable>
              </View>
            )}

            {step === 6 && (
              <View>
                <Pressable
                  style={[styles.primaryBtn, { marginTop: 5 }]}
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

  body: { paddingHorizontal: 22, paddingBottom: 40 },

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
  heroTitle: { fontSize: 18, fontWeight: "900", color: "#111827", marginTop: 6 },
  heroSub: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(17,24,39,0.55)",
    textAlign: "center",
  },

  heroDone: { alignItems: "center", marginTop: 22, marginBottom: 14 },
  doneTitle: { marginTop: 10, fontSize: 22, fontWeight: "900", color: "#111827" },
  doneSub: { marginTop: 8, fontSize: 13, fontWeight: "800", color: "rgba(17,24,39,0.55)" },

  card: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    padding: 16,
    marginTop: -10,
    ...SHADOW.card,
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
  methodBtn: { width: 110, alignItems: "center", justifyContent: "center" },
  methodDivider: {
    width: 18,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: "rgba(17,24,39,0.25)",
    marginHorizontal: 6,
  },
  methodText: { fontSize: 15, fontWeight: "800", color: "#111827", textAlign: "center" },
  methodTextOff: { color: "rgba(17,24,39,0.35)" },

  phoneBox: {
    height: 54,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: "#fff",
    position: "relative",
  },
  phoneDisplayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  phoneCell: {
    alignItems: "center",
    justifyContent: "center",
  },
  phoneCellText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  phonePlaceholder: {
    color: "#9CA3AF",
  },
  phoneHyphen: {
    marginHorizontal: 2,
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(17,24,39,0.45)",
  },
  hiddenPhoneInput: {
    position: "absolute",
    opacity: 0,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },

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

  pwGroup: {
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    overflow: "hidden",
    ...SHADOW.soft,
  },
  pwRow: {
    height: 54,
    justifyContent: "center",
    position: "relative",
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    paddingLeft: 44,
  },
  pwInput: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    paddingVertical: 0,
    paddingRight: 34,
  },
  pwDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  eyeBtn: { position: "absolute", right: 12, height: 54, justifyContent: "center" },

  errorText: {
    marginTop: -4,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: "900",
    color: "#EF4444",
    textAlign: "center",
  },
  errorTextPw: {
    marginTop: 8,
    marginBottom: 2,
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
    marginTop: 17,
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
  resultTitle: { textAlign: "center", fontSize: 16, fontWeight: "900", color: "#111827" },
  resultHint: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(17,24,39,0.55)",
    marginBottom: 10,
  },
});