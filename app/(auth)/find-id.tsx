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
type Step = 1 | 2 | 3 | 4;
type PhoneSection = "A" | "B" | "C";

type Errors = Partial<Record<"contact" | "name" | "code", string>>;

const PROFILE_KEY = "profileData_v1";

type ProfileData = {
  name: string;
  userId: string;
  email: string;
  phone: string;
  imageUri: string | null;
};

const DEFAULT_PROFILE: ProfileData = {
  name: "보호자",
  userId: "admin",
  email: "stt@naver.com",
  phone: "010-0000-0000",
  imageUri: null,
};

const DEMO_CODE = "123456";

function PhoneVisualSlot({
  max,
  baseText,
  digits,
  digitW,
  showCursor,
  cursorIndex,
  onPress,
}: {
  max: number;
  baseText: string;
  digits: string;
  digitW: number;
  showCursor: boolean;
  cursorIndex: number;
  onPress: () => void;
}) {
  const len = Math.min(digits.length, max);
  const shownBase = baseText.slice(0, max);
  const slotWidth = digitW * max;
  const safeCursorIndex = Math.max(0, Math.min(cursorIndex, max));

  return (
    <Pressable onPress={onPress} style={[styles.slotWrap, { width: slotWidth, height: 24 }]}>
      <View style={styles.slotRow} pointerEvents="none">
        {shownBase.split("").map((ch, i) => (
          <Text
            key={`b-${i}`}
            style={[styles.slotBaseChar, { width: digitW }, i < len && styles.charTransparent]}
          >
            {ch}
          </Text>
        ))}
      </View>

      <View style={[styles.slotRow, styles.slotOverlay]} pointerEvents="none">
        {digits
          .padEnd(max, " ")
          .slice(0, max)
          .split("")
          .map((ch, i) => (
            <Text key={`t-${i}`} style={[styles.slotTopChar, { width: digitW }]}>
              {ch}
            </Text>
          ))}
      </View>

      {showCursor && (
        <View
          pointerEvents="none"
          style={[
            styles.slotCursor,
            {
              left: safeCursorIndex * digitW - 1,
            },
          ]}
        />
      )}
    </Pressable>
  );
}

export default function FindIdScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [method, setMethod] = useState<Method>("phone");

  const [savedProfile, setSavedProfile] = useState<ProfileData>(DEFAULT_PROFILE);

  // Step1
  const [email, setEmail] = useState("");
  const [phoneA, setPhoneA] = useState("");
  const [phoneB, setPhoneB] = useState("");
  const [phoneC, setPhoneC] = useState("");
  const phoneDigits = useMemo(() => `${phoneA}${phoneB}${phoneC}`, [phoneA, phoneB, phoneC]);

  // Step2
  const [name, setName] = useState("");

  // Step3
  const [code, setCode] = useState("");

  const [errors, setErrors] = useState<Errors>({});

  // refs
  const phoneInputRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const codeRef = useRef<TextInput>(null);

  // scroll
  const scrollRef = useRef<ScrollView>(null);
  const [yContact, setYContact] = useState(0);
  const [yName, setYName] = useState(0);
  const [yCode, setYCode] = useState(0);

  // visual measure
  const [digitW, setDigitW] = useState(9);

  // active section
  const [activePhoneSection, setActivePhoneSection] = useState<PhoneSection>("A");
  const [phoneFocused, setPhoneFocused] = useState(false);

  const A_BASE = "010";
  const B_BASE = "0000";

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(PROFILE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<ProfileData>;
          setSavedProfile({
            ...DEFAULT_PROFILE,
            ...parsed,
            phone: parsed.phone ?? DEFAULT_PROFILE.phone,
            imageUri: parsed.imageUri ?? null,
          });
        }
      } catch {
        // ignore
      }
    })();
  }, []);

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
      const savedPhoneDigits = (savedProfile.phone ?? "").replace(/[^0-9]/g, "");
      if (phoneDigits.length !== 11) next.contact = "전화번호는 11자리만 입력 가능합니다";
      else if (phoneDigits !== savedPhoneDigits) next.contact = "가입 정보와 일치하지 않습니다";
    } else {
      const v = email.trim().toLowerCase();
      const savedEmail = (savedProfile.email ?? "").trim().toLowerCase();

      if (!v) next.contact = "이메일을 입력해주세요";
      else if (v !== savedEmail) next.contact = "가입 정보와 일치하지 않습니다";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStep2 = () => {
    const next: Errors = {};
    const v = name.trim();
    const savedName = (savedProfile.name ?? "").trim();

    if (!v) next.name = "이름 또는 단체명을 입력해주세요";
    else if (v !== savedName) next.name = "가입 정보와 일치하지 않습니다";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStep3 = () => {
    const next: Errors = {};
    const v = code.trim();
    if (v.length !== 6) next.code = "인증코드 6자리를 입력해주세요";
    else if (v !== DEMO_CODE) next.code = "인증코드가 올바르지 않습니다";
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

  const HERO_TEXT = useMemo(() => {
    if (step === 1) return { title: "전화번호 또는 이메일", sub: "전화번호 또는 이메일을 입력하세요" };
    if (step === 2) return { title: "이름 또는 단체명", sub: "이름 또는 단체명을 입력하세요" };
    if (step === 3) return { title: "인증코드", sub: "전송된 6자리 인증코드를 입력하세요" };
    return { title: "완료", sub: "" };
  }, [step]);

  const focusPhone = (section?: PhoneSection) => {
    const nextSection = section ?? activePhoneSection;
    setActivePhoneSection(nextSection);
    setTimeout(() => {
      phoneInputRef.current?.focus();
      scrollToY(yContact);
    }, 0);
  };

  const cursorIndexA = phoneA.length;
  const cursorIndexB = phoneB.length;
  const cursorIndexC = phoneC.length;

  const appendDigit = (d: string) => {
    if (activePhoneSection === "A") {
      if (phoneA.length < 3) {
        setPhoneA((prev) => (prev + d).slice(0, 3));
        return;
      }

      setActivePhoneSection("B");
      setPhoneB((prev) => (prev + d).slice(0, 4));
      return;
    }

    if (activePhoneSection === "B") {
      if (phoneB.length < 4) {
        setPhoneB((prev) => (prev + d).slice(0, 4));
        return;
      }

      setActivePhoneSection("C");
      setPhoneC((prev) => (prev + d).slice(0, 4));
      return;
    }

    if (activePhoneSection === "C") {
      if (phoneC.length < 4) {
        setPhoneC((prev) => (prev + d).slice(0, 4));
      }
    }
  };

  const removeDigit = () => {
    if (activePhoneSection === "C") {
      if (phoneC.length > 0) {
        setPhoneC((prev) => prev.slice(0, -1));
        return;
      }

      setActivePhoneSection("B");
      return;
    }

    if (activePhoneSection === "B") {
      if (phoneB.length > 0) {
        setPhoneB((prev) => prev.slice(0, -1));
        return;
      }

      setActivePhoneSection("A");
      return;
    }

    if (activePhoneSection === "A") {
      if (phoneA.length > 0) {
        setPhoneA((prev) => prev.slice(0, -1));
      }
    }
  };

  const onPhoneKeyPress = (key: string) => {
    clearError("contact");

    if (key === "Backspace") {
      removeDigit();
      return;
    }

    if (!/^[0-9]$/.test(key)) return;
    appendDigit(key);
  };

  const handlePhonePress = (section?: PhoneSection) => {
    const target = section ?? activePhoneSection;
    focusPhone(target);
  };

  return (
    <LinearGradient colors={[COLORS.bgTop ?? COLORS.bg, COLORS.bgBottom ?? COLORS.bg]} style={{ flex: 1 }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: "transparent" }}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.topTitle}>{step === 4 ? "아이디 찾기 완료" : "아이디 찾기"}</Text>
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
          <View style={styles.measureWrap}>
            <Text
              onLayout={(e) => {
                const { width } = e.nativeEvent.layout;
                if (width > 0) setDigitW(width);
              }}
              style={styles.measureText}
            >
              0
            </Text>
          </View>

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
                        handlePhonePress(activePhoneSection);
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
                      onPress={() => handlePhonePress(activePhoneSection)}
                    >
                      <PhoneVisualSlot
                        max={3}
                        baseText={A_BASE}
                        digits={phoneA}
                        digitW={digitW}
                        showCursor={phoneFocused && activePhoneSection === "A"}
                        cursorIndex={cursorIndexA}
                        onPress={() => handlePhonePress("A")}
                      />

                      <Text style={styles.phoneHyphen}>-</Text>

                      <PhoneVisualSlot
                        max={4}
                        baseText={B_BASE}
                        digits={phoneB}
                        digitW={digitW}
                        showCursor={phoneFocused && activePhoneSection === "B"}
                        cursorIndex={cursorIndexB}
                        onPress={() => handlePhonePress("B")}
                      />

                      <Text style={styles.phoneHyphen}>-</Text>

                      <PhoneVisualSlot
                        max={4}
                        baseText={B_BASE}
                        digits={phoneC}
                        digitW={digitW}
                        showCursor={phoneFocused && activePhoneSection === "C"}
                        cursorIndex={cursorIndexC}
                        onPress={() => handlePhonePress("C")}
                      />

                      <TextInput
                        ref={phoneInputRef}
                        style={styles.hiddenPhoneInput}
                        value=""
                        onChangeText={() => {}}
                        onKeyPress={({ nativeEvent }) => onPhoneKeyPress(nativeEvent.key)}
                        onFocus={() => {
                          setPhoneFocused(true);
                          scrollToY(yContact);
                        }}
                        onBlur={() => setPhoneFocused(false)}
                        keyboardType="number-pad"
                        caretHidden
                        contextMenuHidden
                        autoCorrect={false}
                        autoCapitalize="none"
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
                <View style={styles.resultCard}>
                  <Text style={styles.resultTitle}>찾은 아이디</Text>
                  <Text style={styles.resultId}>{savedProfile.userId}</Text>
                </View>

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

  measureWrap: {
    position: "absolute",
    opacity: 0,
    left: -9999,
    top: -9999,
  },
  measureText: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0,
    includeFontPadding: false,
    fontVariant: Platform.OS === "ios" ? (["tabular-nums"] as any) : undefined,
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
    justifyContent: "center",
    backgroundColor: "#fff",
    position: "relative",
  },

  phoneHyphen: {
    width: 58,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(17,24,39,0.45)",
  },

  slotWrap: {
    position: "relative",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  slotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  slotOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  slotBaseChar: {
    fontSize: 15,
    fontWeight: "800",
    color: "#9CA3AF",
    letterSpacing: 0,
    textAlign: "center",
    includeFontPadding: false,
    fontVariant: Platform.OS === "ios" ? (["tabular-nums"] as any) : undefined,
  },
  slotTopChar: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0,
    textAlign: "center",
    includeFontPadding: false,
    fontVariant: Platform.OS === "ios" ? (["tabular-nums"] as any) : undefined,
  },
  charTransparent: { opacity: 0 },

  slotCursor: {
    position: "absolute",
    top: 2,
    width: 2,
    height: 19,
    borderRadius: 1,
    backgroundColor: COLORS.primary,
  },

  hiddenPhoneInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
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