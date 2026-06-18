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
type Errors = Partial<Record<"contact" | "name" | "code", string>>;

type SavedProfile = {
  name?: string;
  userId?: string;
  email?: string;
  phone?: string;
  age?: number | string | null;
};

const STORAGE_KEYS = {
  accountId: "authAccountId",
  profile: "profileData_v1",
} as const;

const AUTH_CODE = "123456";

export default function FindIdScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [method, setMethod] = useState<Method>("phone");

  const [email, setEmail] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [savedId, setSavedId] = useState("");
  const [foundId, setFoundId] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const phoneInputRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const codeRef = useRef<TextInput>(null);

  const scrollRef = useRef<ScrollView>(null);
  const [yContact, setYContact] = useState(0);
  const [yName, setYName] = useState(0);
  const [yCode, setYCode] = useState(0);

  const loadSavedAccount = async () => {
    const accountId = (await AsyncStorage.getItem(STORAGE_KEYS.accountId)) ?? "";
    const profileRaw = await AsyncStorage.getItem(STORAGE_KEYS.profile);

    let profile: SavedProfile | null = null;

    if (profileRaw) {
      try {
        profile = JSON.parse(profileRaw);
      } catch {
        profile = null;
      }
    }

    setSavedId(accountId);
    return { accountId, profile };
  };

  useEffect(() => {
    loadSavedAccount();
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

  const onlyDigits = (t: string, max: number) =>
    t.replace(/[^0-9]/g, "").slice(0, max);

  const normalizeEmail = (v: string) => v.trim().toLowerCase();
  const normalizePhone = (v?: string) => (v ?? "").replace(/[^0-9]/g, "");

  const validateStep1 = async () => {
    const next: Errors = {};
    const { accountId, profile } = await loadSavedAccount();

    if (!accountId || !profile) {
      next.contact = "가입된 회원 정보가 없습니다";
      setErrors(next);
      return false;
    }

    if (method === "phone") {
      const savedPhoneDigits = normalizePhone(profile.phone);

      if (phoneDigits.length !== 11) {
        next.contact = "전화번호는 11자리로 입력해주세요";
      } else if (!savedPhoneDigits || phoneDigits !== savedPhoneDigits) {
        next.contact = "가입 정보와 일치하지 않습니다";
      }
    } else {
      const inputEmail = normalizeEmail(email);
      const savedEmail = normalizeEmail(profile.email ?? "");

      if (!inputEmail) {
        next.contact = "이메일을 입력해주세요";
      } else if (!savedEmail || inputEmail !== savedEmail) {
        next.contact = "가입 정보와 일치하지 않습니다";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStep2 = async () => {
    const next: Errors = {};
    const { accountId, profile } = await loadSavedAccount();

    const inputName = name.trim();
    const savedName = profile?.name?.trim() ?? "";

    if (!accountId || !profile) {
      next.name = "가입된 회원 정보가 없습니다";
    } else if (!inputName) {
      next.name = "이름 또는 단체명을 입력해주세요";
    } else if (inputName !== savedName) {
      next.name = "가입 정보와 일치하지 않습니다";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateStep3 = () => {
    const next: Errors = {};
    const v = code.trim();

    if (v.length !== 6) next.code = "인증코드 6자리를 입력해주세요";
    else if (v !== AUTH_CODE) next.code = "인증코드가 올바르지 않습니다";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onNext = async () => {
    if (step === 1) {
      const ok = await validateStep1();
      if (!ok) return;
      setStep(2);
      return;
    }

    if (step === 2) {
      const ok = await validateStep2();
      if (!ok) return;
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!validateStep3()) return;
      setFoundId(savedId);
      setStep(4);
    }
  };
  const headerTitle = step === 4 ? "아이디 찾기 완료" : "아이디 찾기";

  const HERO_TEXT = useMemo(() => {
    if (step === 1) return { title: "전화번호 또는 이메일", sub: "회원가입 시 입력한 정보를 입력하세요" };
    if (step === 2) return { title: "이름 또는 단체명", sub: "회원가입 시 입력한 이름을 입력하세요" };
    if (step === 3) return { title: "인증코드", sub: "인증코드 6자리를 입력하세요" };
    return { title: "완료", sub: "" };
  }, [step]);

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

  return (
    <LinearGradient
      colors={[COLORS.bgTop ?? COLORS.bg, COLORS.bgBottom ?? COLORS.bg]}
      style={{ flex: 1 }}
    >
      <SafeAreaView edges={[]} style={{ backgroundColor: "transparent" }}>
        <View style={styles.topBar}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.replace("/(auth)/login")}
            hitSlop={12}
          >
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
          {step !== 4 ? (
            <View style={styles.hero}>
              <View style={styles.logoCircle}>
                <Ionicons name="search" size={23} color={COLORS.primary} />
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
                    <View style={styles.methodInner}>
                      <Pressable
                        style={styles.methodBtn}
                        hitSlop={8}
                        onPress={() => {
                          setMethod("phone");

                          setPhoneDigits("");
                          setEmail("");

                          clearError("contact");
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

                          setPhoneDigits("");
                          setEmail("");

                          clearError("contact");
                        }}
                      >
                        <Text style={[styles.methodText, method !== "email" && styles.methodTextOff]}>
                          이메일
                        </Text>
                      </Pressable>
                    </View>
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
                        {renderPhoneCell(phoneA, "000", 54)}
                        <Text style={styles.phoneHyphen}>-</Text>
                        {renderPhoneCell(phoneB, "0000", 64)}
                        <Text style={styles.phoneHyphen}>-</Text>
                        {renderPhoneCell(phoneC, "0000", 64)}
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
                        inputMode="numeric"
                        maxLength={11}
                        returnKeyType="done"
                        caretHidden
                        contextMenuHidden
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
                      {email.length === 0 && (
                        <Text style={styles.centerPlaceholder}>이메일을 입력해주세요</Text>
                      )}

                      <TextInput
                        ref={emailRef}
                        style={styles.centerInput}
                        value={email}
                        onChangeText={(t) => {
                          setEmail(t);
                          clearError("contact");
                        }}
                        onFocus={() => scrollToY(yContact)}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        placeholder=""
                        returnKeyType="done"
                        textAlign="center"
                        textAlignVertical="center"
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
                <Pressable
                  style={styles.singleInputBox}
                  onPress={() => {
                    nameRef.current?.focus();
                    scrollToY(yName);
                  }}
                >
                  {name.length === 0 && (
                    <Text style={styles.centerPlaceholder}>이름 또는 단체명을 입력해주세요</Text>
                  )}

                  <TextInput
                    ref={nameRef}
                    style={styles.centerInput}
                    value={name}
                    onChangeText={(t) => {
                      setName(t);
                      clearError("name");
                    }}
                    onFocus={() => scrollToY(yName)}
                    placeholder=""
                    returnKeyType="done"
                    autoCorrect={false}
                    textAlign="center"
                    textAlignVertical="center"
                  />
                </Pressable>

                {!!errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

                <Pressable style={styles.primaryBtn} onPress={onNext}>
                  <Text style={styles.primaryBtnText}>확인</Text>
                </Pressable>
              </View>
            )}

            {step === 3 && (
              <View onLayout={(e) => setYCode(e.nativeEvent.layout.y)}>
                <Pressable
                  style={styles.singleInputBox}
                  onPress={() => {
                    codeRef.current?.focus();
                    scrollToY(yCode);
                  }}
                >
                  {code.length === 0 && (
                    <Text style={[styles.centerPlaceholder, styles.codePlaceholder]}>
                      ● ● ● ● ● ●
                    </Text>
                  )}

                  {code.length > 0 && (
                    <Text style={styles.codeVisibleText}>{code}</Text>
                  )}

                  <TextInput
                    ref={codeRef}
                    style={styles.hiddenCodeInput}
                    value={code}
                    onChangeText={(t) => {
                      setCode(onlyDigits(t, 6));
                      clearError("code");
                    }}
                    onFocus={() => scrollToY(yCode)}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder=""
                    returnKeyType="done"
                    contextMenuHidden
                    caretHidden
                  />
                </Pressable>

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
                  <Text style={styles.resultId}>{foundId}</Text>
                </View>

                <Pressable
                  style={[styles.primaryBtn, { marginTop: 21 }]}
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

  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    paddingTop: 2,
  },

  body: {
    paddingHorizontal: 22,
    paddingBottom: 40,
  },

  hero: {
    alignItems: "center",
    marginTop: 18,
    marginBottom: 14,
  },

  logoCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    ...SHADOW.soft,
  },

  heroTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginTop: 9,
  },

  heroSub: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(17,24,39,0.55)",
    textAlign: "center",
  },

  heroDone: {
    alignItems: "center",
    marginTop: 22,
    marginBottom: 14,
  },

  doneTitle: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },

  doneSub: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(17,24,39,0.55)",
  },

  card: {
    alignSelf: "center",
    width: "86%",
    maxWidth: 300,
    padding: 0,
    marginTop: 6,
    backgroundColor: "transparent",
  },

  contactWrap: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 300,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "rgba(255,255,255,0.82)",
    overflow: "hidden",
    marginBottom: 24,
  },

  methodRow: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },

  methodInner: {
    width: 218,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  methodBtn: {
    width: 92,
    alignItems: "center",
    justifyContent: "center",
  },

  methodDivider: {
    width: 34,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: "rgba(17,24,39,0.25)",
  },

  methodText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },

  methodTextOff: {
    color: "rgba(17,24,39,0.35)",
  },

  phoneBox: {
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    position: "relative",
  },

  phoneDisplayRow: {
    width: 222,
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
    width: 20,
    textAlign: "center",
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    position: "relative",
  },

  singleInputBox: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    position: "relative",
  },

  centerPlaceholder: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "900",
    color: "#9CA3AF",
    zIndex: 1,
  },

  centerInput: {
    width: "100%",
    height: "100%",
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    textAlignVertical: "center",
    paddingHorizontal: 0,
    paddingVertical: 0,
    zIndex: 2,
  },

  hiddenCodeInput: {
    position: "absolute",
    opacity: 0,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },

  codePlaceholder: {
    fontSize: 15,
    letterSpacing: 4,
  },

  codeVisibleText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    letterSpacing: 4,
    zIndex: 2,
  },

  errorText: {
    marginTop: -14,
    marginBottom: 12,
    fontSize: 12,
    fontWeight: "900",
    color: "#EF4444",
    textAlign: "center",
  },

  primaryBtn: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 300,
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 0,

    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 7 },
    elevation: 7,
  },

  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },

  resultCard: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 300,
    marginTop: -1,
    borderRadius: 18,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",

    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  resultTitle: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "900",
    color: "rgba(0,0,0,0.55)",
  },

  resultId: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 26,
    fontWeight: "900",
    color: "#111827",
  },
});
