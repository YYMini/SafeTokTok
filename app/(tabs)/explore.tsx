// app/(tabs)/explore.tsx
import Header from "@/components/Header";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type TabType = "location" | "bio";
type BioTabType = "heart" | "motion";

type Profile = {
  name: string;
  userId: string;
  email: string;
  phone: string;
  age?: number | string | null;
  imageUri: string | null;
  role?: "user" | "guardian" | "PARENT" | "CHILD";
  roleLabel?: string;
};

type Target = {
  id: string;
  name: string;
  sub: string;
  age?: number;
  loginId?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type LocationAlert = {
  id: string;
  targetName: string;
  occurredAt: string;
  address: string;
  distance?: number;
};

type DeviceStatus = {
  id: string;
  deviceName: string;
  targetName: string;
  connected: boolean;
  battery?: number;
  lastUpdatedAt?: string;
};

type BioAlert = {
  id: string;
  targetName: string;
  occurredAt: string;
  label: string;
  address: string;
  value?: string;
  valueColor?: string;
};

const PROFILE_KEY = "profileData_v1";
const ACCOUNT_ID_KEY = "authAccountId";
const CURRENT_USER_ROLE_KEY = "currentUserRole";
const TARGETS_KEY = "linkedTargets_v1";

const DEFAULT_PROFILE: Profile = {
  name: "보호자",
  userId: "admin",
  email: "stt@naver.com",
  phone: "010-0000-0000",
  imageUri: null,
  role: "guardian",
  roleLabel: "보호자",
};

export default function AlertScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [linkedTargets, setLinkedTargets] = useState<Target[]>([]);
  const [tab, setTab] = useState<TabType>("location");
  const [bioTab, setBioTab] = useState<BioTabType>("heart");

  const targetLabel =
    currentUserRole === "CHILD"
      ? profile.userId || "user"
      : linkedTargets.find((item) => item.sub === "대상자")?.loginId ||
        linkedTargets.find((item) => item.sub === "대상자")?.name ||
        "user";

  const emergencyAlerts: LocationAlert[] = [
    {
      id: "e1",
      targetName: targetLabel,
      occurredAt: "2025-11-11 14:32",
      address: "SOS 긴급 요청 발생",
    },
    {
      id: "e2",
      targetName: targetLabel,
      occurredAt: "2025-11-11 13:18",
      address: "SOS 긴급 요청 발생",
    },
    {
      id: "e3",
      targetName: targetLabel,
      occurredAt: "2025-11-11 10:47",
      address: "SOS 긴급 요청 발생",
    },
  ];

  const outAlerts: LocationAlert[] = [
    {
      id: "o1",
      targetName: targetLabel,
      occurredAt: "2025-11-11 12:15",
      address: "안전구역에서 120m 이탈",
      distance: 120,
    },
    {
      id: "o2",
      targetName: targetLabel,
      occurredAt: "2025-11-11 11:02",
      address: "안전구역에서 85m 이탈",
      distance: 85,
    },
    {
      id: "o3",
      targetName: targetLabel,
      occurredAt: "2025-11-11 09:41",
      address: "안전구역에서 150m 이탈",
      distance: 150,
    },
  ];

  const backAlerts: LocationAlert[] = [];

  const deviceStatuses: DeviceStatus[] = [
    {
      id: "d1",
      deviceName: "Galaxy Watch",
      targetName: targetLabel,
      connected: true,
      battery: 75,
    },
  ];

  const heartAlerts: BioAlert[] = [
    {
      id: "h1",
      targetName: targetLabel,
      occurredAt: "2025-11-11 14:30",
      label: "심박수 이상",
      address: "현재 심박수 145 bpm",
      value: "145 bpm",
      valueColor: "#FF2F45",
    },
    {
      id: "h2",
      targetName: targetLabel,
      occurredAt: "2025-11-11 11:55",
      label: "심박수 이상",
      address: "현재 심박수 138 bpm",
      value: "138 bpm",
      valueColor: "#FF2F45",
    },
    {
      id: "h3",
      targetName: targetLabel,
      occurredAt: "2025-11-11 08:21",
      label: "심박수 이상",
      address: "현재 심박수 142 bpm",
      value: "142 bpm",
      valueColor: "#FF2F45",
    },
  ];

  const motionAlerts: BioAlert[] = [
    {
      id: "m1",
      targetName: targetLabel,
      occurredAt: "2025-11-11 13:10",
      label: "움직임 없음",
      address: "30분 이상 움직임 없음",
      value: "30분",
      valueColor: "#F59E0B",
    },
  ];

  const loadProfile = useCallback(async () => {
    try {
      const [savedProfile, savedAccountId, savedRole, savedTargets] = await Promise.all([
        AsyncStorage.getItem(PROFILE_KEY),
        AsyncStorage.getItem(ACCOUNT_ID_KEY),
        AsyncStorage.getItem(CURRENT_USER_ROLE_KEY),
        AsyncStorage.getItem(TARGETS_KEY),
      ]);

      setCurrentUserRole(savedRole);

      if (savedTargets) {
        try {
          const parsedTargets = JSON.parse(savedTargets) as Target[];
          setLinkedTargets(Array.isArray(parsedTargets) ? parsedTargets : []);
        } catch {
          setLinkedTargets([]);
        }
      } else {
        setLinkedTargets([]);
      }

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
    } catch {
      // ignore
    }
  }, []);

  const loadRealtimeAlerts = useCallback(async () => {
    try {
      /**
       * 백엔드 연동 시 실제 API로 교체.
       */
    } catch {
      // 서버 연결 전에는 목업값 유지
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      loadRealtimeAlerts();
    }, [loadProfile, loadRealtimeAlerts])
  );

  const activeBioAlerts = bioTab === "heart" ? heartAlerts : motionAlerts;

  return (
    <View style={styles.safe}>
      <View style={styles.topBar}>
        <Header
          roleLabel={profile.name}
          profileImageUri={profile.imageUri}
          showLogout={false}
          onPressSettings={() => router.push("/settings")}
        />
      </View>

      <LinearGradient colors={["#F2F7FF", "#FFFFFF"]} style={styles.screen}>
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.mainTab, tab === "location" && styles.mainTabOn]}
            onPress={() => setTab("location")}
          >
            <View style={styles.mainTabInner}>
              <Ionicons
                name="location-outline"
                size={18}
                color={tab === "location" ? "#1267FF" : "#64748B"}
              />
              <Text style={[styles.mainTabText, tab === "location" && styles.mainTabTextOn]}>
                위치추적
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.mainTab, tab === "bio" && styles.mainTabOn]}
            onPress={() => setTab("bio")}
          >
            <View style={styles.mainTabInner}>
              <Ionicons
                name="heart-outline"
                size={18}
                color={tab === "bio" ? "#1267FF" : "#64748B"}
              />
              <Text style={[styles.mainTabText, tab === "bio" && styles.mainTabTextOn]}>
                생체정보
              </Text>
            </View>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {tab === "location" ? (
            <View style={styles.locationGroup}>
              <LocationGroupCard
                type="emergency"
                title="긴급 요청"
                alerts={emergencyAlerts}
                color="#FF2F45"
                titleIcon="warning-outline"
                badgeLabel="긴급"
              />

              <LocationGroupCard
                type="out"
                title="안전구역 이탈"
                alerts={outAlerts}
                color="#FF6B00"
                titleIcon="walk-outline"
                badgeLabel="이탈"
              />

              <LocationGroupCard
                type="back"
                title="안전구역 복귀"
                alerts={backAlerts}
                color="#00C853"
                titleIcon="checkmark-circle-outline"
                badgeLabel="복귀"
              />
            </View>
          ) : (
            <>
              <View style={styles.deviceTitleRow}>
                <Ionicons name="watch-outline" size={15} color="#1267FF" />
                <Text style={styles.deviceTitle}>웨어러블 기기 상태</Text>
              </View>

              <DeviceListCard devices={deviceStatuses} />

              <View style={styles.eventTitleRow}>
                <Ionicons name="time-outline" size={15} color="#1267FF" />
                <Text style={styles.eventTitle}>실시간 생체정보 이력</Text>
              </View>

              <View style={styles.bioPanel}>
                <View style={styles.bioTabs}>
                  <BioTab
                    active={bioTab === "heart"}
                    icon="heart-outline"
                    label={`심박수 이상 (${heartAlerts.length})`}
                    color="#FF2F45"
                    onPress={() => setBioTab("heart")}
                  />
                  <BioTab
                    active={bioTab === "motion"}
                    icon="time-outline"
                    label={`움직임 없음 (${motionAlerts.length})`}
                    color="#F59E0B"
                    onPress={() => setBioTab("motion")}
                  />
                </View>

                <View style={styles.bioListCard}>
                  <ScrollView
                    style={styles.bioListScroll}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={activeBioAlerts.length > 2}
                    contentContainerStyle={styles.locationListContent}
                  >
                    {activeBioAlerts.length === 0 ? (
                      <View style={styles.emptyAlertBox}>
                        <Text style={styles.emptyAlertText}>해당 알림 내역이 없습니다.</Text>
                      </View>
                    ) : (
                      activeBioAlerts.map((item, index) => (
                        <BioAlertCard
                          key={item.id}
                          item={item}
                          bioTab={bioTab}
                          isLast={index === activeBioAlerts.length - 1}
                        />
                      ))
                    )}
                  </ScrollView>
                </View>
              </View>
            </>
          )}

          <View style={{ height: 25 }} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

function LocationGroupCard({
  type,
  title,
  alerts,
  color,
  titleIcon,
  badgeLabel,
}: {
  type: "emergency" | "out" | "back";
  title: string;
  alerts: LocationAlert[];
  color: string;
  titleIcon: keyof typeof Ionicons.glyphMap;
  badgeLabel: string;
}) {
  return (
    <View style={styles.locationBlock}>
      <View style={styles.locationBlockHeader}>
        <View style={styles.locationBlockTitleRow}>
          <Ionicons name={titleIcon} size={17} color={color} />
          <Text style={styles.locationBlockTitle}>{title}</Text>
        </View>

        <Text style={styles.totalCountText}>총 {alerts.length}건</Text>
      </View>

      <View style={[styles.locationListCard, { borderColor: `${color}55` }]}>
        <ScrollView
          style={styles.locationListScroll}
          nestedScrollEnabled
          showsVerticalScrollIndicator={alerts.length > 2}
          contentContainerStyle={styles.locationListContent}
        >
          {alerts.length === 0 ? (
            <View style={styles.emptyAlertBox}>
              <Text style={styles.emptyAlertText}>해당 알림 내역이 없습니다.</Text>
            </View>
          ) : (
            alerts.map((item, index) => (
              <LocationAlertCard
                key={item.id}
                type={type}
                label={badgeLabel}
                item={item}
                isLast={index === alerts.length - 1}
              />
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function LocationAlertCard({
  type,
  label,
  item,
  isLast,
}: {
  type: "emergency" | "out" | "back";
  label: string;
  item: LocationAlert;
  isLast: boolean;
}) {
  const isEmergency = type === "emergency";
  const isOut = type === "out";
  const color = isEmergency ? "#FF2F45" : isOut ? "#FF6B00" : "#00C853";
  const bg = isEmergency ? "#FFF8F9" : isOut ? "#FFFBF5" : "#F4FDF7";

  return (
    <View
      style={[
        styles.alertRow,
        {
          backgroundColor: bg,
          borderBottomColor: `${color}25`,
          borderBottomWidth: isLast ? 0 : 1,
        },
      ]}
    >
      <View style={[styles.alertTypeBadge, { backgroundColor: color }]}>
        <Text style={styles.alertTypeBadgeText}>{label}</Text>
      </View>

      <View style={styles.alertContent}>
        <View style={styles.alertTopLine}>
          <Text style={styles.alertName} numberOfLines={1}>
            {item.targetName}
          </Text>

          <Text style={styles.alertTime} numberOfLines={1}>
            {item.occurredAt}
          </Text>
        </View>

        {!!item.address && (
          <Text style={styles.alertDesc} numberOfLines={1}>
            {item.address}
          </Text>
        )}
      </View>
    </View>
  );
}

function DeviceListCard({ devices }: { devices: DeviceStatus[] }) {
  if (devices.length === 0) {
    return (
      <View style={styles.emptyDeviceCard}>
        <Ionicons name="watch-outline" size={24} color="#94A3B8" />
        <Text style={styles.emptyDeviceTitle}>대상자 없음</Text>
        <Text style={styles.emptyDeviceText}>등록된 웨어러블 기기 대상자가 없습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.deviceListCard}>
      <ScrollView
        style={styles.deviceListScroll}
        nestedScrollEnabled
        showsVerticalScrollIndicator={devices.length > 2}
        contentContainerStyle={styles.deviceListContent}
      >
        {devices.map((device, index) => (
          <DeviceCard
            key={device.id}
            device={device}
            isLast={index === devices.length - 1}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function DeviceCard({
  device,
  isLast,
}: {
  device: DeviceStatus;
  isLast: boolean;
}) {
  return (
    <View
      style={[
        styles.deviceRow,
        {
          borderBottomWidth: isLast ? 0 : 1,
        },
      ]}
    >
      <View style={[styles.deviceIconCircle, !device.connected && styles.deviceIconOff]}>
        <Ionicons
          name="watch-outline"
          size={20}
          color={device.connected ? "#00C853" : "#94A3B8"}
        />
      </View>

      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName} numberOfLines={1}>
          {device.deviceName}
        </Text>
        <Text style={styles.deviceTarget} numberOfLines={1}>
          {device.targetName}
        </Text>
      </View>

      {device.connected ? (
        <View style={styles.batteryRow}>
          <Ionicons name="battery-half-outline" size={16} color="#00C853" />
          <Text style={styles.batteryText}>{device.battery}%</Text>
        </View>
      ) : (
        <Text style={styles.deviceTime} numberOfLines={1}>
          {device.lastUpdatedAt}
        </Text>
      )}
    </View>
  );
}

function BioTab({
  active,
  icon,
  label,
  color,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.bioTab,
        active && {
          borderBottomColor: color,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.bioTabInner}>
        <Ionicons name={icon} size={14} color={active ? color : "#64748B"} />
        <Text style={[styles.bioTabText, active && { color }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function BioAlertCard({
  item,
  bioTab,
  isLast,
}: {
  item: BioAlert;
  bioTab: BioTabType;
  isLast: boolean;
}) {
  const badgeColor = bioTab === "heart" ? "#FF2F45" : "#F59E0B";
  const bg = bioTab === "heart" ? "#FFF8F9" : "#FFFBEB";

  return (
    <View
      style={[
        styles.alertRow,
        {
          backgroundColor: bg,
          borderBottomColor: `${badgeColor}25`,
          borderBottomWidth: isLast ? 0 : 1,
        },
      ]}
    >
      <View style={[styles.alertTypeBadge, { backgroundColor: badgeColor }]}>
        <Text style={styles.alertTypeBadgeText}>
          {bioTab === "heart" ? "심박" : "움직임"}
        </Text>
      </View>

      <View style={styles.alertContent}>
        <View style={styles.alertTopLine}>
          <Text style={styles.alertName} numberOfLines={1}>
            {item.targetName}
          </Text>

          <Text style={styles.alertTime} numberOfLines={1}>
            {item.occurredAt}
          </Text>
        </View>

        <Text style={styles.alertDesc} numberOfLines={1}>
          {item.address}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#EAF3FF",
  },
  topBar: {
    backgroundColor: COLORS.primary,
  },
  screen: {
    flex: 1,
  },

  lightShadow: {
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 9,
    elevation: 2,
  },

  tabBar: {
    height: 48,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#D8E7FF",
  },
  mainTab: {
    flex: 1,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  mainTabOn: {
    borderBottomColor: "#1267FF",
  },
  mainTabInner: {
    flex: 1,
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  mainTabText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748B",
    textAlign: "center",
  },
  mainTabTextOn: {
    color: "#1267FF",
  },

  body: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  locationGroup: {
    gap: 18,
  },
  locationBlock: {
    width: "100%",
  },
  locationBlockHeader: {
    minHeight: 32,
    marginBottom: 7,
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginRight: 4,
  },
  locationBlockTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationBlockTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#334155",
  },
  totalCountText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#64748B",
  },

  locationListCard: {
    height: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1.2,
    overflow: "hidden",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 9,
    elevation: 2,
  },
  locationListScroll: {
    flex: 1,
  },
  locationListContent: {
    gap: 0,
    paddingRight: 0,
  },

  alertRow: {
    height: 70,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  alertTypeBadge: {
    width: 48,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  alertTypeBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  alertContent: {
    flex: 1,
    minWidth: 0,
  },
  alertTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  alertName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    flexShrink: 0,
  },
  alertTime: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
  alertDesc: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },

  emptyAlertBox: {
    flex: 1,
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 15,
    backgroundColor: "#FFFFFF",
  },
  emptyAlertText: {
    width: "100%",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "800",
    color: "#94A3B8",
  },

  deviceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 5,
    marginBottom: 13,
    paddingLeft: 2,
  },
  deviceTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#475569",
  },

  eventTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 22,
    paddingLeft: 2,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#475569",
  },

  deviceListCard: {
    height: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    overflow: "hidden",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 9,
    elevation: 2,
  },
  deviceListScroll: {
    flex: 1,
  },
  deviceListContent: {
    gap: 0,
    paddingRight: 0,
  },
  deviceRow: {
    height: 70,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  emptyDeviceCard: {
    height: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 9,
    elevation: 2,
  },
  emptyDeviceTitle: {
    marginTop: 7,
    fontSize: 14,
    fontWeight: "900",
    color: "#334155",
  },
  emptyDeviceText: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "600",
    color: "#94A3B8",
  },
  deviceIconCircle: {
    width: 41,
    height: 41,
    borderRadius: 21,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  deviceIconOff: {
    backgroundColor: "#F1F5F9",
  },
  deviceInfo: {
    flex: 1,
    minWidth: 0,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  deviceTarget: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  batteryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: 6,
  },
  batteryText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "700",
  },
  deviceTime: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    width: 120,
    textAlign: "right",
  },

  bioPanel: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    overflow: "hidden",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bioTabs: {
    height: 46,
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  bioTab: {
    flex: 1,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    backgroundColor: "#FFFFFF",
  },
  bioTabInner: {
    flex: 1,
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 1,
  },
  bioTabText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#64748B",
    textAlign: "center",
    flexShrink: 1,
  },
  bioListCard: {
    height: 140,
    backgroundColor: "#FFFFFF",
    padding: 0,
    overflow: "hidden",
  },
  bioListScroll: {
    flex: 1,
  },
});