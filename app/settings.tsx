// app/settings.tsx
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SHADOW } from "../constants/theme";

type Profile = {
  name: string;
  userId: string;
  email: string;
  phone: string;
  imageUri: string | null;
  age?: number | string | null;
  role?: "user" | "guardian" | "PARENT" | "CHILD";
  roleLabel?: string;
};

type Target = {
  id: string;
  name: string;
  sub: string;
  age?: number;
  loginId?: string;
};

type WorkArea = {
  id: string;
  name: string;
  address: string;
};

type NotificationSettings = {
  interval: number;
  danger: boolean;
  safeZone: boolean;
  bio: boolean;
  battery: boolean;
  push: boolean;
  vibration: boolean;
};

type SafeZoneSettings = {
  areaId: string;
  areaName: string;
  radius: number;
};

type InfoModalType = "terms" | "privacy" | null;

const PROFILE_KEY = "profileData_v1";
const TARGETS_KEY = "linkedTargets_v1";
const ACCOUNT_ID_KEY = "authAccountId";
const CURRENT_USER_ROLE_KEY = "currentUserRole";
const CURRENT_USER_ID_KEY = "currentUserId";
const WORK_AREAS_KEY = "workAreas_v1";
const SAFE_ZONE_KEY = "safeZoneSettings_v1";
const NOTIFICATION_KEY = "notificationSettings_v1";

const DEFAULT_PROFILE: Profile = {
  name: "보호자",
  userId: "admin",
  email: "stt@naver.com",
  phone: "010-0000-0000",
  imageUri: null,
  role: "guardian",
  roleLabel: "보호자",
};

const DEFAULT_TARGETS: Target[] = [];

const DEFAULT_WORK_AREAS: WorkArea[] = [
  { id: "w1", name: "서울특별시청 무교로청사", address: "서울특별시 중구" },
  { id: "w2", name: "예원학교", address: "서울특별시 중구" },
  { id: "w3", name: "삼정아트테라스정동", address: "서울특별시 중구" },
];

const DEFAULT_SAFE_ZONE: SafeZoneSettings = {
  areaId: "w1",
  areaName: "서울특별시청 무교로청사",
  radius: 300,
};

const DEFAULT_NOTI: NotificationSettings = {
  interval: 10,
  danger: true,
  safeZone: true,
  bio: true,
  battery: true,
  push: true,
  vibration: false,
};

export default function SettingsScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [targets, setTargets] = useState<Target[]>(DEFAULT_TARGETS);
  const [workAreas, setWorkAreas] = useState<WorkArea[]>(DEFAULT_WORK_AREAS);
  const [safeZone, setSafeZone] = useState<SafeZoneSettings>(DEFAULT_SAFE_ZONE);
  const [noti, setNoti] = useState<NotificationSettings>(DEFAULT_NOTI);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [infoModalType, setInfoModalType] = useState<InfoModalType>(null);

  const targetCountText = useMemo(() => `${targets.length}명`, [targets.length]);

  const isChildAccount =
    currentUserRole === "CHILD" ||
    profile.role === "CHILD" ||
    profile.role === "user" ||
    profile.roleLabel === "대상자";

  const roleText = isChildAccount ? "대상자" : "보호자";
  const managedUserText = isChildAccount ? "보호자" : "대상자";
  const managedCountText = `${targets.length}명`;
  const profileAge =
    profile.age ??
    targets.find(
      (target) =>
        String(target.id) === String(currentUserId) ||
        target.loginId === profile.userId ||
        target.name === profile.name,
    )?.age;

  const loadData = useCallback(async () => {
    try {
      const [
        savedProfile,
        savedTargets,
        savedAccountId,
        savedWorkAreas,
        savedSafeZone,
        savedNoti,
        savedCurrentUserRole,
        savedCurrentUserId,
      ] = await Promise.all([
        AsyncStorage.getItem(PROFILE_KEY),
        AsyncStorage.getItem(TARGETS_KEY),
        AsyncStorage.getItem(ACCOUNT_ID_KEY),
        AsyncStorage.getItem(WORK_AREAS_KEY),
        AsyncStorage.getItem(SAFE_ZONE_KEY),
        AsyncStorage.getItem(NOTIFICATION_KEY),
        AsyncStorage.getItem(CURRENT_USER_ROLE_KEY),
        AsyncStorage.getItem(CURRENT_USER_ID_KEY),
      ]);

      setCurrentUserRole(savedCurrentUserRole);
      setCurrentUserId(savedCurrentUserId);

      if (savedProfile) {
        const parsed = JSON.parse(savedProfile) as Partial<Profile>;
        setProfile({
          ...DEFAULT_PROFILE,
          ...parsed,
          userId: savedAccountId ?? parsed.userId ?? DEFAULT_PROFILE.userId,
          imageUri: parsed.imageUri ?? null,
        });
      } else if (savedAccountId) {
        setProfile({ ...DEFAULT_PROFILE, userId: savedAccountId });
      }

      if (savedTargets) {
        const parsedTargets = JSON.parse(savedTargets);

        if (Array.isArray(parsedTargets)) {
          const realTargets = parsedTargets.filter(
            (target) => target?.id !== "m1" && target?.id !== "s1"
          );

          setTargets(realTargets);

          if (realTargets.length !== parsedTargets.length) {
            await AsyncStorage.setItem(TARGETS_KEY, JSON.stringify(realTargets));
          }
        } else {
          setTargets([]);
        }
      } else {
        setTargets([]);
      }

      if (savedWorkAreas) {
        const parsedAreas = JSON.parse(savedWorkAreas);
        if (Array.isArray(parsedAreas) && parsedAreas.length > 0) {
          setWorkAreas(parsedAreas);
        }
      }

      if (savedSafeZone) {
        setSafeZone({ ...DEFAULT_SAFE_ZONE, ...JSON.parse(savedSafeZone) });
      }

      if (savedNoti) {
        setNoti({ ...DEFAULT_NOTI, ...JSON.parse(savedNoti) });
      }
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const saveSafeZone = async (next: SafeZoneSettings) => {
    setSafeZone(next);
    await AsyncStorage.setItem(SAFE_ZONE_KEY, JSON.stringify(next));
  };

  const saveNoti = async (next: NotificationSettings) => {
    setNoti(next);
    await AsyncStorage.setItem(NOTIFICATION_KEY, JSON.stringify(next));
  };

  const changeRadius = async (amount: number) => {
    const nextRadius = Math.min(1000, Math.max(100, safeZone.radius + amount));
    await saveSafeZone({ ...safeZone, radius: nextRadius });
  };

  const changeNotiInterval = async (amount: number) => {
    const nextInterval = Math.min(60, Math.max(5, noti.interval + amount));
    await saveNoti({ ...noti, interval: nextInterval });
  };

  const selectArea = async (area: WorkArea) => {
    await saveSafeZone({
      ...safeZone,
      areaId: area.id,
      areaName: area.name,
    });
    setAreaModalOpen(false);
  };

  const toggleNoti = async (key: keyof NotificationSettings) => {
    if (key === "interval") return;
    const next = { ...noti, [key]: !noti[key] };
    await saveNoti(next);
  };

  return (
    <LinearGradient
      colors={[COLORS.bgTop ?? "#F5F9FF", COLORS.bgBottom ?? "#EAF3FF"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView edges={[]} style={{ flex: 1 }}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>
          <Text style={styles.topTitle}>설정</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <View style={styles.profileTop}>
            <View style={styles.profileAvatar}>
              {profile.imageUri ? (
                <Image source={{ uri: profile.imageUri }} style={styles.profileImage} />
              ) : (
                <Ionicons name="person" size={26} color="#FFFFFF" />
              )}
            </View>

            <View style={styles.profileTextBox}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileRole}>{roleText}</Text>

            </View>
          </View>

          <Section title="계정 정보">
            <InfoRow icon="person-outline" label="ID" value={profile.userId || "-"} />
            {isChildAccount ? (
              <InfoRow icon="calendar-outline" label="나이" value={profileAge ? `${profileAge}세` : "-"} isLast />
            ) : (
              <>
                <InfoRow icon="call-outline" label="전화번호" value={profile.phone || "-"} />
                <InfoRow icon="mail-outline" label="이메일" value={profile.email || "-"} isLast />
              </>
            )}
          </Section>

          <Section title={`${managedUserText} 관리`}>
            <Pressable style={styles.linkRow} onPress={() => setTargetModalOpen(true)}>
              <View style={styles.rowLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name="people-outline" size={18} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.rowLabel}>등록된 {managedUserText}</Text>
                  <Text style={styles.rowSub}>총 {managedUserText} 수 {managedCountText}</Text>
                </View>
              </View>

              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{managedCountText}</Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </View>
            </Pressable>
          </Section>

          {!isChildAccount && (
          <Section title="안전구역 설정">
            <View style={styles.safeZoneBox}>
              <Text style={styles.safeZoneTitle}>지오펜스 반경</Text>
              <Text style={styles.safeZoneRadius}>{safeZone.radius}m</Text>

              <View style={styles.radiusRow}>
                <Pressable style={styles.radiusBtn} onPress={() => changeRadius(-50)}>
                  <Ionicons name="remove" size={20} color={COLORS.primary} />
                </Pressable>

                <View style={styles.radiusTrack}>
                  <View
                    style={[
                      styles.radiusFill,
                      { width: `${((safeZone.radius - 100) / 900) * 100}%` },
                    ]}
                  />
                </View>

                <Pressable style={styles.radiusBtn} onPress={() => changeRadius(50)}>
                  <Ionicons name="add" size={20} color={COLORS.primary} />
                </Pressable>
              </View>

              <Text style={styles.safeZoneDesc}>
                선택한 작업구역을 기준으로 안전구역 반경이 적용됩니다.
              </Text>
            </View>

            <Pressable style={styles.areaBtn} onPress={() => setAreaModalOpen(true)}>
              <View style={styles.rowLeft}>
                <View style={styles.iconCircle}>
                  <Ionicons name="location-outline" size={18} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.rowLabel}>안전 구역 위치 설정</Text>
                  <Text style={styles.rowSub}>{safeZone.areaName}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>
          </Section>

          )}

          {!isChildAccount && (
          <Section title="알림 설정">
            <View style={styles.notiIntervalBox}>
              <View style={styles.notiTopRow}>
                <View style={styles.rowLeft}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                  </View>
                  <Text style={styles.rowLabel}>알림 주기</Text>
                </View>

                <Text style={styles.intervalValue}>{noti.interval}분</Text>
              </View>

              <View style={styles.radiusRow}>
                <Pressable style={styles.radiusBtn} onPress={() => changeNotiInterval(-5)}>
                  <Ionicons name="remove" size={20} color={COLORS.primary} />
                </Pressable>

                <View style={styles.radiusTrack}>
                  <View
                    style={[
                      styles.radiusFill,
                      { width: `${((noti.interval - 5) / 55) * 100}%` },
                    ]}
                  />
                </View>

                <Pressable style={styles.radiusBtn} onPress={() => changeNotiInterval(5)}>
                  <Ionicons name="add" size={20} color={COLORS.primary} />
                </Pressable>
              </View>

              <View style={styles.intervalRangeRow}>
                <Text style={styles.intervalRangeText}>5분</Text>
                <Text style={styles.intervalRangeText}>60분</Text>
              </View>
            </View>

            <SwitchRow icon="warning-outline" label="위험 상황 알림" value={noti.danger} onValueChange={() => toggleNoti("danger")} />
            <SwitchRow icon="walk-outline" label="안전구역 이탈 알림" value={noti.safeZone} onValueChange={() => toggleNoti("safeZone")} />
            <SwitchRow icon="heart-outline" label="생체정보 이상 알림" value={noti.bio} onValueChange={() => toggleNoti("bio")} />
            <SwitchRow icon="battery-half-outline" label="배터리 부족 알림" value={noti.battery} onValueChange={() => toggleNoti("battery")} />
            <SwitchRow icon="notifications-outline" label="앱 푸시 알림" value={noti.push} onValueChange={() => toggleNoti("push")} />
            <SwitchRow icon="phone-portrait-outline" label="진동" value={noti.vibration} onValueChange={() => toggleNoti("vibration")} isLast />
          </Section>

          )}

          <Section title="긴급 연락처">
            <InfoRow icon="shield-outline" label="경찰서" value="112" />
            <InfoRow icon="medkit-outline" label="소방서" value="119" isLast />
          </Section>

          <Section title="권한 관리">
            <InfoRow
              icon="shield-checkmark-outline"
              label="서비스 권한 동의"
              value="관리"
              isLast
              onPress={() => router.push("/(auth)/permission-consent")}
            />
          </Section>

          <Section title="앱 정보">
            <InfoRow icon="information-circle-outline" label="앱 버전" value="1.0.0" />
            <InfoRow icon="document-text-outline" label="서비스 이용약관" value="보기" onPress={() => setInfoModalType("terms")} />
            <InfoRow icon="lock-closed-outline" label="개인정보 처리방침" value="보기" isLast onPress={() => setInfoModalType("privacy")} />
          </Section>
        </ScrollView>

        <RegisteredTargetModal
          visible={targetModalOpen}
          targets={targets}
          managedUserText={managedUserText}
          onClose={() => setTargetModalOpen(false)}
        />

        <WorkAreaModal
          visible={areaModalOpen}
          areas={workAreas}
          selectedId={safeZone.areaId}
          onSelect={selectArea}
          onClose={() => setAreaModalOpen(false)}
        />

        <InfoTextModal type={infoModalType} onClose={() => setInfoModalType(null)} />
      </SafeAreaView>
    </LinearGradient>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  isLast,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isLast?: boolean;
  onPress?: () => void;
}) {
  const Content = (
    <View style={[styles.infoRow, isLast && styles.noBorder]}>
      <View style={styles.rowLeft}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={18} color={COLORS.primary} />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>

      <View style={styles.rowRight}>
        <Text style={[styles.rowValue, onPress && styles.viewText]}>{value}</Text>
        {onPress && <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />}
      </View>
    </View>
  );

  if (!onPress) return Content;

  return (
    <Pressable onPress={onPress} hitSlop={6}>
      {Content}
    </Pressable>
  );
}

function SwitchRow({
  icon,
  label,
  value,
  onValueChange,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onValueChange: () => void;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.infoRow, isLast && styles.noBorder]}>
      <View style={styles.rowLeft}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={18} color={COLORS.primary} />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#D1D5DB", true: "#9CC7FF" }}
        thumbColor={value ? COLORS.primary : "#FFFFFF"}
      />
    </View>
  );
}

function RegisteredTargetModal({
  visible,
  targets,
  managedUserText,
  onClose,
}: {
  visible: boolean;
  targets: Target[];
  managedUserText: string;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalDim}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>등록된 {managedUserText}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color="#111827" />
            </Pressable>
          </View>

          <Text style={styles.modalSub}>
            총 {targets.length}명의 {managedUserText}가 등록되었습니다.
          </Text>

          <View style={styles.modalList}>
            {targets.length > 0 ? (
              targets.map((target) => (
                <View key={target.id} style={styles.targetItem}>
                  <View style={styles.targetAvatar}>
                    <Ionicons name="person-outline" size={20} color={COLORS.primary} />
                  </View>
                  <View>
                    <Text style={styles.targetName}>{target.name}</Text>
                    <Text style={styles.targetSub}>{target.sub}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>등록된 {managedUserText}가 없습니다.</Text>
            )}
          </View>

          <Pressable style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseText}>확인</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function WorkAreaModal({
  visible,
  areas,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  areas: WorkArea[];
  selectedId: string;
  onSelect: (area: WorkArea) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalDim}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>작업구역 선택</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color="#111827" />
            </Pressable>
          </View>

          <Text style={styles.modalSub}>안전구역 반경을 적용할 작업구역을 선택하세요.</Text>

          <View style={styles.modalList}>
            {areas.map((area) => {
              const selected = area.id === selectedId;

              return (
                <Pressable
                  key={area.id}
                  style={[styles.areaItem, selected && styles.areaItemActive]}
                  onPress={() => onSelect(area)}
                >
                  <View style={styles.rowLeft}>
                    <View style={styles.targetAvatar}>
                      <Ionicons name="location-outline" size={20} color={COLORS.primary} />
                    </View>
                    <View>
                      <Text style={styles.targetName}>{area.name}</Text>
                      <Text style={styles.targetSub}>{area.address}</Text>
                    </View>
                  </View>

                  {selected && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function InfoTextModal({
  type,
  onClose,
}: {
  type: InfoModalType;
  onClose: () => void;
}) {
  const title =
    type === "terms"
      ? "서비스 이용약관"
      : type === "privacy"
        ? "개인정보 처리방침"
        : "";

  const body =
    type === "terms"
      ? `안심톡톡 서비스 이용약관입니다.

1. 본 서비스는 보호자와 대상자의 안전 관리를 위해 제공됩니다.
2. 회원은 정확한 계정 정보를 입력해야 하며, 타인의 정보를 무단으로 사용할 수 없습니다.
3. 보호자와 대상자 역할에 따라 제공되는 기능이 다를 수 있습니다.
4. 위치 확인, 안전구역 설정, 위험 알림, 대상자 관리 기능은 안전 확인 목적으로 사용됩니다.
5. 부정확한 정보 입력이나 기기 설정 오류로 인해 일부 기능이 정상적으로 동작하지 않을 수 있습니다.
6. 회원은 서비스 이용 중 언제든지 계정 정보 수정 또는 서비스 이용 중단을 요청할 수 있습니다.
7. 본 약관에 동의해야 안심톡톡의 주요 서비스를 이용할 수 있습니다.`
      : type === "privacy"
        ? `안심톡톡 개인정보 처리방침입니다.

1. 수집 항목은 아이디, 이름, 전화번호, 이메일, 프로필 이미지, 대상자 정보입니다.
2. 수집된 정보는 로그인, 프로필 표시, 보호자/대상자 연결, 알림 제공에 사용됩니다.
3. 위치 및 안전구역 관련 정보는 위험 상황 확인과 안전 관리 기능 제공을 위해 사용됩니다.
4. 전화번호와 이메일은 계정 확인 및 보호자 연락 정보로 활용될 수 있습니다.
5. 개인정보는 사용자의 동의 없이 외부에 제공되지 않습니다.
6. 서비스 이용 종료 또는 회원 탈퇴 시 관련 정보는 삭제될 수 있습니다.
7. 개인정보는 안전 관리 목적 외의 용도로 사용되지 않습니다.`
        : "";

  return (
    <Modal visible={!!type} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalDim}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color="#111827" />
            </Pressable>
          </View>

          <ScrollView style={styles.infoModalScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.infoModalText}>{body}</Text>
          </ScrollView>

          <Pressable style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseText}>확인</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 58,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(229,231,235,0.9)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 73,
  },

  profileTop: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    paddingVertical: 20,
    paddingHorizontal: 23,
    flexDirection: "row",
    alignItems: "center",
    ...SHADOW.card,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 39,
    backgroundColor: "#2F80FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    overflow: "hidden",
    ...SHADOW.card,
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 39,
  },
  profileTextBox: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  profileRole: {
    fontSize: 14,
    fontWeight: "800",
    color: "#6B7280",
  },

  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 14,
    overflow: "hidden",
    ...SHADOW.card,
  },

  infoRow: {
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  linkRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    flex: 1,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EEF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  rowSub: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  rowValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#6B7280",
    maxWidth: 150,
    textAlign: "right",
  },
  viewText: {
    color: COLORS.primary,
  },

  safeZoneBox: {
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  safeZoneTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },
  safeZoneRadius: {
    marginTop: 8,
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.primary,
  },
  radiusRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  radiusBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EEF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  radiusTrack: {
    flex: 1,
    height: 8,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  radiusFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  safeZoneDesc: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    lineHeight: 17,
  },
  areaBtn: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  notiIntervalBox: {
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  notiTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  intervalValue: {
    fontSize: 15,
    fontWeight: "900",
    color: COLORS.primary,
  },
  intervalRangeRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 46,
  },
  intervalRangeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },

  modalDim: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  modalBox: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  modalSub: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    lineHeight: 19,
  },
  modalList: {
    marginTop: 16,
    gap: 10,
  },
  targetItem: {
    minHeight: 64,
    borderRadius: 17,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  targetAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EEF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  targetName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },
  targetSub: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  areaItem: {
    minHeight: 66,
    borderRadius: 17,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  areaItemActive: {
    backgroundColor: "#EEF6FF",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.25)",
  },
  emptyText: {
    paddingVertical: 22,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "800",
    color: "#9CA3AF",
  },
  modalCloseBtn: {
    marginTop: 18,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  infoModalScroll: {
    marginTop: 16,
    maxHeight: 330,
  },
  infoModalText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    lineHeight: 22,
  },
});