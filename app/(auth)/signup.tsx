import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
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
import { COLORS, SHADOW } from "../../constants/theme";

type Role = "user" | "guardian";

type Errors = Partial<
  Record<"role" | "userId" | "pw" | "pw2" | "name" | "phone" | "email" | "agree", string>
>;

const STORAGE_KEYS = {
  accountId: "authAccountId",
  accountPw: "authAccountPw",
  accountRole: "authAccountRole",
  profile: "profileData_v1",
  targets: "linkedTargets_v1",
  remember: "rememberMe",
  savedId: "savedLoginId",
  savedPw: "savedLoginPw",
} as const;

export default function SignupScreen() {
  const router = useRouter();

  const [role, setRole] = useState<Role | null>("guardian");
  const [userId, setUserId] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");

  const phoneInputRef = useRef<TextInput>(null);

  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);
  const [pwShow, setPwShow] = useState(false);
  const [pw2Show, setPw2Show] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const canSubmit = agree1 && agree2;

  const ID_REGEX = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]+$/;
  const PW_REGEX = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]+$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const clearFieldError = (key: keyof Errors) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const onlyDigits = (t: string, max: number) =>
    t.replace(/[^0-9]/g, "").slice(0, max);

  const validateAll = () => {
    const next: Errors = {};

    const trimmedId = userId.trim();
    const trimmedPw = pw;
    const trimmedPw2 = pw2;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!role) next.role = "역할을 선택해주세요";

    if (!trimmedId) next.userId = "아이디를 입력해주세요";
    else if (trimmedId.length < 4 || trimmedId.length > 20)
      next.userId = "아이디는 4~20자 이내로 입력해주세요";
    else if (!ID_REGEX.test(trimmedId))
      next.userId = "아이디는 영문/숫자/기호로만 가능합니다";

    if (!trimmedPw) next.pw = "비밀번호를 입력해주세요";
    else if (trimmedPw.length < 5 || trimmedPw.length > 20)
      next.pw = "비밀번호는 5~20자 이내로 입력해주세요";
    else if (!PW_REGEX.test(trimmedPw))
      next.pw = "비밀번호는 영문/숫자/기호로만 가능합니다";

    if (!trimmedPw2) next.pw2 = "비밀번호 확인을 입력해주세요";
    else if (trimmedPw2 !== trimmedPw)
      next.pw2 = "비밀번호가 일치하지 않습니다";

    if (!trimmedName) next.name = "이름을 입력해주세요";

    if (!phoneDigits) next.phone = "전화번호를 입력해주세요";
    else if (phoneDigits.length !== 11)
      next.phone = "전화번호는 11자리(010-0000-0000)만 가능합니다";

    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail))
      next.email = "이메일 형식이 올바르지 않습니다";

    if (!(agree1 && agree2)) next.agree = "필수 약관에 동의해주세요";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const checkDuplicate = async () => {
    try {
      const savedId = await AsyncStorage.getItem(STORAGE_KEYS.accountId);
      const savedPw = await AsyncStorage.getItem(STORAGE_KEYS.accountPw);
      const savedProfileRaw = await AsyncStorage.getItem(STORAGE_KEYS.profile);

      if (!savedId && !savedPw && !savedProfileRaw) return true;

      let savedProfile: {
        name?: string;
        userId?: string;
        email?: string;
        phone?: string;
        role?: Role;
        roleLabel?: string;
      } | null = null;

      if (savedProfileRaw) savedProfile = JSON.parse(savedProfileRaw);

      const trimmedId = userId.trim();
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();
      const savedPhoneDigits = savedProfile?.phone?.replace(/-/g, "") ?? "";

      const DUP_MSG = "이미 등록된 회원 정보입니다";
      const nextErrors: Errors = {};
      let duplicateFound = false;

      if (savedId && savedId === trimmedId) {
        nextErrors.userId = DUP_MSG;
        duplicateFound = true;
      }

      if (savedPw && savedPw === pw) {
        nextErrors.pw = DUP_MSG;
        duplicateFound = true;
      }

      if (savedProfile?.name && savedProfile.name === trimmedName) {
        nextErrors.name = DUP_MSG;
        duplicateFound = true;
      }

      if (trimmedEmail && savedProfile?.email === trimmedEmail) {
        nextErrors.email = DUP_MSG;
        duplicateFound = true;
      }

      if (savedPhoneDigits && savedPhoneDigits === phoneDigits) {
        nextErrors.phone = DUP_MSG;
        duplicateFound = true;
      }

      if (duplicateFound) {
        setErrors((prev) => ({ ...prev, ...nextErrors }));
        return false;
      }

      return true;
    } catch {
      setErrors((prev) => ({
        ...prev,
        agree: "회원 정보 확인 중 오류가 발생했습니다",
      }));
      return false;
    }
  };

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

  const phoneA = phoneDigits.slice(0, 3);
  const phoneB = phoneDigits.slice(3, 7);
  const phoneC = phoneDigits.slice(7, 11);

  const onSubmit = async () => {
    const ok = validateAll();
    if (!ok || !role) return;

    const duplicateOk = await checkDuplicate();
    if (!duplicateOk) return;

    const phoneFormatted = `${phoneA}-${phoneB}-${phoneC}`;

    const profilePayload = {
      name: name.trim(),
      userId: userId.trim(),
      email: email.trim(),
      phone: phoneFormatted,
      imageUri: null,
      role,
      roleLabel: role === "guardian" ? "보호자" : "사용자",
    };

    try {
      await AsyncStorage.setItem(STORAGE_KEYS.accountId, userId.trim());
      await AsyncStorage.setItem(STORAGE_KEYS.accountPw, pw);
      await AsyncStorage.setItem(STORAGE_KEYS.accountRole, role);
      await AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profilePayload));

      await AsyncStorage.setItem(STORAGE_KEYS.remember, "false");
      await AsyncStorage.removeItem(STORAGE_KEYS.savedId);
      await AsyncStorage.removeItem(STORAGE_KEYS.savedPw);

      router.replace("/(auth)/login");
    } catch {
      setErrors((prev) => ({
        ...prev,
        agree: "회원가입 정보를 저장하지 못했습니다",
      }));
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>
        <Text style={styles.topTitle}>회원가입</Text>
        <View style={styles.rightBlank} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "undefined"}
      >
        <LinearGradient colors={[COLORS.bgTop, COLORS.bgBottom]} style={styles.flex}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            scrollEnabled={true}
            nestedScrollEnabled={true}
            overScrollMode="always"
          >
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark" size={23} color={COLORS.primary} />
          </View>

          <Text style={styles.label}>
            역할 선택 <Text style={styles.required}>*</Text>
          </Text>

          <View style={styles.roleRow}>
            <Pressable
              style={[styles.roleBtn, role === "guardian" && styles.roleBtnOn]}
              onPress={() => {
                setRole("guardian");
                clearFieldError("role");
              }}
            >
              <Ionicons
                name="people-outline"
                size={16}
                color={role === "guardian" ? "#fff" : "#6B7280"}
              />
              <Text style={[styles.roleBtnText, role === "guardian" && styles.roleBtnTextOn]}>
                보호자
              </Text>
            </Pressable>

            <Pressable
              style={[styles.roleBtn, role === "user" && styles.roleBtnOn]}
              onPress={() => {
                setRole("user");
                clearFieldError("role");
              }}
            >
              <Ionicons
                name="person-outline"
                size={16}
                color={role === "user" ? "#fff" : "#6B7280"}
              />
              <Text style={[styles.roleBtnText, role === "user" && styles.roleBtnTextOn]}>
                사용자
              </Text>
            </Pressable>
          </View>

          {!!errors.role && <Text style={styles.errorText}>{errors.role}</Text>}

          <Text style={styles.label}>
            아이디 <Text style={styles.required}>*</Text>
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

          <Text style={styles.label}>
            비밀번호 <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.pwRow}>
            <TextInput
              style={[styles.input, styles.pwInput]}
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
            />
            <Pressable style={styles.eyeBtn} onPress={() => setPwShow((v) => !v)}>
              <Ionicons name={pwShow ? "eye" : "eye-off"} size={18} color="#9CA3AF" />
            </Pressable>
          </View>
          {!!errors.pw && <Text style={styles.errorText}>{errors.pw}</Text>}

          <Text style={styles.label}>
            비밀번호 확인 <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.pwRow}>
            <TextInput
              style={[styles.input, styles.pwInput]}
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
            />
            <Pressable style={styles.eyeBtn} onPress={() => setPw2Show((v) => !v)}>
              <Ionicons name={pw2Show ? "eye" : "eye-off"} size={18} color="#9CA3AF" />
            </Pressable>
          </View>
          {!!errors.pw2 && <Text style={styles.errorText}>{errors.pw2}</Text>}

          <Text style={styles.label}>
            이름 <Text style={styles.required}>*</Text>
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

          <Text style={styles.label}>
            전화번호 <Text style={styles.required}>*</Text>
          </Text>
          <Pressable style={styles.phoneBox} onPress={() => phoneInputRef.current?.focus()}>
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
                clearFieldError("phone");
              }}
              keyboardType="number-pad"
              maxLength={11}
              returnKeyType="done"
              caretHidden
            />
          </Pressable>
          {!!errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

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

          <Pressable
            style={[styles.primaryBtn, !canSubmit && styles.primaryBtnDisabled]}
            disabled={!canSubmit}
            onPress={onSubmit}
          >
            <Text style={styles.primaryBtnText}>회원가입</Text>
          </Pressable>
        </ScrollView>
      </LinearGradient>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },

  flex: {
    flex: 1,
  },

  topBar: {
    height: 56,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },

  backBtn: {
    width: 40,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },

  topTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  rightBlank: {
    width: 40,
  },

  scroll: {
    flex: 1,
  },

  body: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 35,
  },

  logoCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 10,
    ...SHADOW.soft,
  },

  label: {
    fontSize: 13,
    fontWeight: "800",
    color: "#374151",
    marginTop: 8,
    marginBottom: 7,
  },

  required: {
    color: "#EF4444",
  },

  roleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },

  roleBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  roleBtnOn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  roleBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#4B5563",
  },

  roleBtnTextOn: {
    color: "#fff",
  },

  input: {
    height: 46,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
    fontSize: 14,
    color: "#111827",
  },

  pwRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  pwInput: {
    flex: 1,
    marginBottom: 0,
    paddingRight: 46,
  },

  eyeBtn: {
    position: "absolute",
    right: 10,
    height: 46,
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  phoneBox: {
    height: 46,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
    justifyContent: "center",
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
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },

  phonePlaceholder: {
    color: "#9CA3AF",
  },

  phoneHyphen: {
    marginHorizontal: 2,
    fontSize: 14,
    fontWeight: "800",
    color: "#6B7280",
  },

  hiddenPhoneInput: {
    position: "absolute",
    opacity: 0,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },

  agreeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

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

  checkBoxOn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  agreeText: {
    fontSize: 13,
    color: "#374151",
  },

  primaryBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    ...SHADOW.soft,
  },

  primaryBtnDisabled: {
    opacity: 0.45,
  },

  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },

  errorText: {
    marginTop: -8,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "800",
    color: "#EF4444",
  },
});