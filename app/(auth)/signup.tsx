import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { API_BASE_URL } from "../../constants/api";
import { COLORS, SHADOW } from "../../constants/theme";

type BackendRole = "PARENT";
type ModalType = "terms" | "privacy" | "safety" | null;

type Errors = Partial<
  Record<"userId" | "pw" | "pw2" | "name" | "phone" | "email" | "agree", string>
>;

const STORAGE_KEYS = {
  accountId: "authAccountId",
  accountPw: "authAccountPw",
  accountRole: "authAccountRole",
  currentUserId: "currentUserId",
  currentUserRole: "currentUserRole",
  profile: "profileData_v1",
  targets: "linkedTargets_v1",
  remember: "rememberMe",
  savedId: "savedLoginId",
  savedPw: "savedLoginPw",
  permissionConsentPending: "permissionConsentPending",
} as const;

export default function SignupScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const phoneInputRef = useRef<TextInput>(null);

  const [userId, setUserId] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");

  const [idChecked, setIdChecked] = useState(false);
  const [idCheckMessage, setIdCheckMessage] = useState("");

  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);
  const [agree3, setAgree3] = useState(false);

  const [pwShow, setPwShow] = useState(false);
  const [pw2Show, setPw2Show] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [modalType, setModalType] = useState<ModalType>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = agree1 && agree2 && agree3 && !submitting;

  const ID_REGEX = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]+$/;
  const PW_REGEX = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]+$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const goLogin = () => {
    Keyboard.dismiss();
    setModalType(null);
    router.replace("/(auth)/login");
  };

  const scrollToField = (y: number) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y, animated: true });
    }, 250);
  };

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

  const checkUserIdDuplicate = async () => {
    const trimmedId = userId.trim();

    if (!trimmedId) {
      setErrors((prev) => ({ ...prev, userId: "아이디를 입력해주세요" }));
      return;
    }

    if (trimmedId.length < 3) {
      setErrors((prev) => ({
        ...prev,
        userId: "아이디는 3자 이상 입력해주세요",
      }));
      return;
    }

    if (!ID_REGEX.test(trimmedId)) {
      setErrors((prev) => ({
        ...prev,
        userId: "아이디는 영문/숫자/기호로만 가능합니다",
      }));
      return;
    }

    const savedId = await AsyncStorage.getItem(STORAGE_KEYS.accountId);

    if (savedId === trimmedId) {
      setIdChecked(false);
      setIdCheckMessage("");
      setErrors((prev) => ({ ...prev, userId: "이미 사용 중인 아이디입니다" }));
      return;
    }

    clearFieldError("userId");
    setIdChecked(true);
    setIdCheckMessage("사용 가능한 아이디입니다");
  };

  const validateAll = () => {
    const next: Errors = {};

    const trimmedId = userId.trim();
    const trimmedPw = pw;
    const trimmedPw2 = pw2;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedId) next.userId = "아이디를 입력해주세요";
    else if (trimmedId.length < 3)
      next.userId = "아이디는 3자 이상 입력해주세요";
    else if (!ID_REGEX.test(trimmedId))
      next.userId = "아이디는 영문/숫자/기호로만 가능합니다";
    else if (!idChecked) next.userId = "아이디 중복 확인을 해주세요";

    if (!trimmedPw) next.pw = "비밀번호를 입력해주세요";
    else if (trimmedPw.length < 5) next.pw = "비밀번호는 5자 이상 입력해주세요";
    else if (!PW_REGEX.test(trimmedPw))
      next.pw = "비밀번호는 영문/숫자/기호로만 가능합니다";

    if (!trimmedPw2) next.pw2 = "비밀번호 확인을 입력해주세요";
    else if (trimmedPw2 !== trimmedPw)
      next.pw2 = "비밀번호가 일치하지 않습니다";

    if (!trimmedName) next.name = "이름을 입력해주세요";
    else if (trimmedName.length < 2) next.name = "이름은 2자 이상 입력해주세요";

    if (!phoneDigits) next.phone = "전화번호를 입력해주세요";
    else if (phoneDigits.length !== 11)
      next.phone = "전화번호는 11자리만 가능합니다";

    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail))
      next.email = "이메일 형식이 올바르지 않습니다";

    if (!(agree1 && agree2 && agree3))
      next.agree = "필수 약관에 모두 동의해주세요";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const checkDuplicate = async () => {
    try {
      const savedId = await AsyncStorage.getItem(STORAGE_KEYS.accountId);
      const trimmedId = userId.trim();

      if (savedId && savedId === trimmedId) {
        setErrors((prev) => ({
          ...prev,
          userId: "이미 사용 중인 아이디입니다",
        }));
        setIdChecked(false);
        setIdCheckMessage("");
        return false;
      }

      return true;
    } catch {
      return true;
    }
  };

  const renderPhoneCell = (
    value: string,
    placeholder: string,
    width: number,
  ) => {
    const shown = value || placeholder;
    const isPlaceholder = value.length === 0;

    return (
      <View style={[styles.phoneCell, { width }]}>
        <Text
          style={[
            styles.phoneCellText,
            isPlaceholder && styles.phonePlaceholder,
          ]}
        >
          {shown}
        </Text>
      </View>
    );
  };

  const phoneA = phoneDigits.slice(0, 3);
  const phoneB = phoneDigits.slice(3, 7);
  const phoneC = phoneDigits.slice(7, 11);

  const openModal = (type: ModalType) => setModalType(type);

  const agreeByModal = () => {
    if (modalType === "terms") setAgree1(true);
    if (modalType === "privacy") setAgree2(true);
    if (modalType === "safety") setAgree3(true);

    clearFieldError("agree");
    setModalType(null);
  };

  const modalTitle =
    modalType === "terms"
      ? "서비스 이용약관"
      : modalType === "privacy"
        ? "개인정보 처리방침"
        : "생체정보 및 위치정보 수집·이용 동의";

  const modalBody =
    modalType === "terms"
      ? `안심톡톡 서비스 이용약관입니다.

1. 본 서비스는 보호자와 사용자의 안전 관리를 위해 제공됩니다.
2. 회원은 정확한 정보를 입력해야 하며, 타인의 정보를 무단으로 사용할 수 없습니다.
3. 보호자/사용자 역할에 따라 제공되는 기능이 다를 수 있습니다.
4. 위치 확인, 알림, 프로필 관리 등 앱 내 기능은 안전 확인 목적을 위해 사용됩니다.
5. 부정확한 정보 입력으로 인해 발생하는 문제는 사용자에게 책임이 있을 수 있습니다.
6. 회원은 서비스 이용 중 언제든지 계정 정보 수정 또는 서비스 이용 중단을 요청할 수 있습니다.
7. 본 약관에 동의해야 회원가입 및 기본 서비스 이용이 가능합니다.`
      : modalType === "privacy"
        ? `안심톡톡 개인정보 처리방침입니다.

1. 수집 항목은 아이디, 비밀번호, 이름, 전화번호, 이메일입니다.
2. 수집된 정보는 로그인, 프로필 표시, 보호자/사용자 정보 관리에 사용됩니다.
3. 비밀번호는 로그인 확인을 위한 용도로만 사용됩니다.
4. 전화번호는 보호자/사용자 연결 정보로 활용될 수 있습니다.
5. 이메일은 선택 입력 항목이며, 입력한 경우 계정 관리 목적으로 활용될 수 있습니다.
6. 개인정보는 사용자의 동의 없이 외부에 제공되지 않습니다.
7. 회원 탈퇴 또는 서비스 이용 종료 시 관련 정보는 삭제될 수 있습니다.`
        : `안심톡톡 ㅁ생체정보 및 위치정보 수집·이용 동의입니다.

1. 안심톡톡은 사용자의 안전 확인을 위해 위치정보 및 생체 관련 정보를 활용할 수 있습니다.
2. 위치정보는 실시간 사용자의 위치 확인, 위험 상황 알림 기능 제공을 위해 사용됩니다.
3. 생체정보는 사용자의 안전 상태 확인 기능 제공을 위한 목적으로만 활용됩니다.
4. 수집된 정보는 안전 관리 목적 외의 용도로 사용되지 않습니다.
5. 위치 및 생체정보는 보호자/사용자 연결 기능과 연동될 수 있습니다.
6. 해당 동의는 안전 서비스 이용을 위한 필수 항목입니다.
7. 동의하지 않을 경우 회원가입 및 주요 안전 관리 기능 이용이 제한될 수 있습니다.`;

  const onSubmit = async () => {
    const ok = validateAll();
    if (!ok) return;

    const duplicateOk = await checkDuplicate();
    if (!duplicateOk) return;

    const phoneFormatted = `${phoneA}-${phoneB}-${phoneC}`;
    const backendRole: BackendRole = "PARENT";

    const profilePayload = {
      name: name.trim(),
      userId: userId.trim(),
      email: email.trim(),
      phone: phoneFormatted,
      imageUri: null,
      role: "guardian",
      roleLabel: "보호자",
    };

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          loginId: userId.trim(),
          password: pw,
          name: name.trim(),
          email: email.trim(),
          phone: phoneFormatted,
          role: backendRole,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const responseText = await response.text();
      let created: {
        id?: number;
        userId?: number;
        parentId?: number;
        childId?: number;
        role?: BackendRole;
      } = {};

      if (responseText) {
        try {
          created = JSON.parse(responseText);
        } catch {
          created = {};
        }
      }

      const createdId =
        created.id ??
        created.userId ??
        created.parentId ??
        created.childId ??
        Date.now();
      const createdRole = created.role ?? backendRole;

      await AsyncStorage.setItem(STORAGE_KEYS.accountId, userId.trim());
      await AsyncStorage.setItem(STORAGE_KEYS.accountPw, pw);
      await AsyncStorage.setItem(STORAGE_KEYS.accountRole, "guardian");
      await AsyncStorage.setItem(STORAGE_KEYS.currentUserId, String(createdId));
      await AsyncStorage.setItem(STORAGE_KEYS.currentUserRole, createdRole);
      await AsyncStorage.setItem(
        `${STORAGE_KEYS.permissionConsentPending}_user_${createdId}`,
        "true",
      );
      await AsyncStorage.setItem(
        STORAGE_KEYS.profile,
        JSON.stringify(profilePayload),
      );
      await AsyncStorage.setItem(STORAGE_KEYS.targets, JSON.stringify([]));

      await AsyncStorage.setItem(STORAGE_KEYS.remember, "false");
      await AsyncStorage.removeItem(STORAGE_KEYS.savedId);
      await AsyncStorage.removeItem(STORAGE_KEYS.savedPw);

      router.replace("/(auth)/login");
    } catch (error) {
      console.log("회원가입 실패", error);
      setErrors((prev) => ({
        ...prev,
        agree:
          "회원가입에 실패했습니다. 입력 정보 또는 이미 가입된 아이디인지 확인해주세요.",
      }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={goLogin} hitSlop={20}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>

        <Text style={styles.topTitle}>회원가입</Text>

        <View style={styles.rightBlank} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <LinearGradient
          colors={[COLORS.bgTop, COLORS.bgBottom]}
          style={styles.flex}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            scrollEnabled
            nestedScrollEnabled
            overScrollMode="always"
          >
            <View style={styles.logoCircle}>
              <Ionicons
                name="shield-checkmark"
                size={23}
                color={COLORS.primary}
              />
            </View>

            <Text style={styles.label}>
              아이디 <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.idRow}>
              <TextInput
                style={[styles.input, styles.idInput]}
                placeholder="아이디 입력"
                placeholderTextColor="#9CA3AF"
                value={userId}
                onChangeText={(t) => {
                  setUserId(t);
                  setIdChecked(false);
                  setIdCheckMessage("");
                  clearFieldError("userId");
                }}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
              />
              <Pressable
                style={styles.idCheckBtn}
                onPress={checkUserIdDuplicate}
              >
                <Text style={styles.idCheckBtnText}>중복 확인</Text>
              </Pressable>
            </View>
            {!!errors.userId && (
              <Text style={styles.errorText}>{errors.userId}</Text>
            )}
            {!!idCheckMessage && (
              <Text style={styles.successText}>{idCheckMessage}</Text>
            )}

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
              <Pressable
                style={styles.eyeBtn}
                onPress={() => setPwShow((v) => !v)}
              >
                <Ionicons
                  name={pwShow ? "eye" : "eye-off"}
                  size={18}
                  color="#9CA3AF"
                />
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
              <Pressable
                style={styles.eyeBtn}
                onPress={() => setPw2Show((v) => !v)}
              >
                <Ionicons
                  name={pw2Show ? "eye" : "eye-off"}
                  size={18}
                  color="#9CA3AF"
                />
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
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
            />
            {!!errors.name && (
              <Text style={styles.errorText}>{errors.name}</Text>
            )}

            <Text style={styles.label}>
              전화번호 <Text style={styles.required}>*</Text>
            </Text>
            <Pressable
              style={styles.phoneBox}
              onPress={() => {
                phoneInputRef.current?.focus();
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
                  clearFieldError("phone");
                }}
                keyboardType="number-pad"
                maxLength={11}
                returnKeyType="done"
                caretHidden
              />
            </Pressable>
            {!!errors.phone && (
              <Text style={styles.errorText}>{errors.phone}</Text>
            )}

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
            {!!errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}

            <View style={styles.agreeRow}>
              <Pressable
                style={[styles.checkBox, agree1 && styles.checkBoxOn]}
                onPress={() => {
                  setAgree1((v) => !v);
                  clearFieldError("agree");
                }}
              >
                {agree1 && <Ionicons name="checkmark" size={14} color="#fff" />}
              </Pressable>
              <Text style={styles.agreeText}>[필수] 서비스 이용약관</Text>
              <Pressable onPress={() => openModal("terms")}>
                <Text style={styles.detailText}>자세히 보기</Text>
              </Pressable>
            </View>

            <View style={styles.agreeRow}>
              <Pressable
                style={[styles.checkBox, agree2 && styles.checkBoxOn]}
                onPress={() => {
                  setAgree2((v) => !v);
                  clearFieldError("agree");
                }}
              >
                {agree2 && <Ionicons name="checkmark" size={14} color="#fff" />}
              </Pressable>
              <Text style={styles.agreeText}>[필수] 개인정보 처리방침</Text>
              <Pressable onPress={() => openModal("privacy")}>
                <Text style={styles.detailText}>자세히 보기</Text>
              </Pressable>
            </View>

            <View style={styles.agreeRow}>
              <Pressable
                style={[styles.checkBox, agree3 && styles.checkBoxOn]}
                onPress={() => {
                  setAgree3((v) => !v);
                  clearFieldError("agree");
                }}
              >
                {agree3 && <Ionicons name="checkmark" size={14} color="#fff" />}
              </Pressable>
              <Text style={styles.agreeText}>
                [필수] 생체정보 및 위치정보 동의
              </Text>
              <Pressable onPress={() => openModal("safety")}>
                <Text style={styles.detailText}>자세히 보기</Text>
              </Pressable>
            </View>

            {!!errors.agree && (
              <Text style={styles.errorText}>{errors.agree}</Text>
            )}

            <Pressable
              style={[
                styles.primaryBtn,
                !canSubmit && styles.primaryBtnDisabled,
              ]}
              disabled={!canSubmit}
              onPress={onSubmit}
            >
              <Text style={styles.primaryBtnText}>
                {submitting ? "저장 중..." : "회원가입"}
              </Text>
            </Pressable>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>

      <Modal visible={!!modalType} transparent animationType="fade">
        <View style={styles.modalDim}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalBody}>{modalBody}</Text>
            </ScrollView>

            <Pressable style={styles.modalAgreeBtn} onPress={agreeByModal}>
              <Text style={styles.modalAgreeText}>동의</Text>
            </Pressable>

            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => setModalType(null)}
            >
              <Text style={styles.modalCloseText}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  flex: { flex: 1 },

  topBar: {
    height: 56,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,

    borderBottomWidth: 0,
    elevation: 0,

    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },

  backBtn: {
    width: 48,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    elevation: 20,
  },

  topTitle: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    zIndex: 1,
  },

  rightBlank: { width: 48 },
  scroll: { flex: 1 },

  body: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 40,
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

  required: { color: "#EF4444" },

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

  roleBtnTextOn: { color: "#fff" },

  idRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  idInput: {
    flex: 1,
    marginBottom: 0,
  },

  idCheckBtn: {
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  idCheckBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
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

  phonePlaceholder: { color: "#9CA3AF" },

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
    marginRight: 8,
  },

  checkBoxOn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },

  agreeText: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
  },

  detailText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
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

  primaryBtnDisabled: { opacity: 0.45 },

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

  successText: {
    marginTop: -8,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "800",
    color: "#10B981",
  },

  modalDim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  modalBox: {
    width: "100%",
    maxWidth: 320,
    maxHeight: "78%",
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 20,
    ...SHADOW.soft,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
  },

  modalScroll: {
    maxHeight: 260,
  },

  modalBody: {
    fontSize: 13,
    lineHeight: 20,
    color: "#4B5563",
    marginBottom: 18,
  },

  modalAgreeBtn: {
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  modalAgreeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },

  modalCloseBtn: {
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },

  modalCloseText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "800",
  },
});
