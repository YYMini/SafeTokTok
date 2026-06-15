// app/(tabs)/explore.tsx
import Header from "@/components/Header";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type TabType = "location" | "bio";
type BioTabType = "heart" | "motion";

type Profile = {
  name: string;
  userId: string;
  email: string;
  phone: string;
  imageUri: string | null;
  role?: "user" | "guardian";
  roleLabel?: string;
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

const DEFAULT_PROFILE: Profile = {
  name: "보호자",
  userId: "admin",
  email: "stt@naver.com",
  phone: "010-0000-0000",
  imageUri: null,
  role: "guardian",
  roleLabel: "보호자",
};

const MOCK_LOCATION = {
  emergency: [
    { id: "e1", targetName: "김민준", occurredAt: "2025-11-11 14:32", address: "서울시 강남구 역삼동" },
    { id: "e2", targetName: "이서윤", occurredAt: "2025-11-10 18:45", address: "서울시 서초구 방배동" },
    { id: "e3", targetName: "김민준", occurredAt: "2025-11-09 16:12", address: "서울시 강남구 삼성동" },
    { id: "e4", targetName: "이서윤", occurredAt: "2025-11-08 11:20", address: "서울시 서초구 반포동" },
  ] as LocationAlert[],
  out: [
    { id: "o1", targetName: "김민준", occurredAt: "2025-11-11 12:15", address: "안전구역에서 120m 이탈", distance: 120 },
    { id: "o2", targetName: "이서윤", occurredAt: "2025-11-09 15:10", address: "안전구역에서 85m 이탈", distance: 85 },
    { id: "o3", targetName: "김민준", occurredAt: "2025-11-08 09:22", address: "안전구역에서 60m 이탈", distance: 60 },
  ] as LocationAlert[],
  back: [
    { id: "b1", targetName: "김민준", occurredAt: "2025-11-10 16:20", address: "안전구역으로 복귀" },
    { id: "b2", targetName: "이서윤", occurredAt: "2025-11-09 16:02", address: "안전구역으로 복귀" },
    { id: "b3", targetName: "김민준", occurredAt: "2025-11-08 10:01", address: "안전구역으로 복귀" },
  ] as LocationAlert[],
};

const MOCK_DEVICES: DeviceStatus[] = [
  { id: "d1", deviceName: "Galaxy Watch", targetName: "김민준", connected: true, battery: 75 },
  { id: "d2", deviceName: "Galaxy Watch", targetName: "이서윤", connected: false, lastUpdatedAt: "2025-11-19 09:30" },
];

const MOCK_BIO = {
  heart: [
    {
      id: "h1",
      targetName: "김민준",
      occurredAt: "2025-11-11 14:30",
      label: "심박수 이상",
      address: "현재 심박수 145 bpm",
      value: "145 bpm",
      valueColor: "#FF2F45",
    },
    {
      id: "h2",
      targetName: "김민준",
      occurredAt: "2025-11-10 20:30",
      label: "심박수 낮음",
      address: "현재 심박수 45 bpm",
      value: "45 bpm",
      valueColor: "#1267FF",
    },
  ] as BioAlert[],
  motion: [
    {
      id: "m1",
      targetName: "이서윤",
      occurredAt: "2025-11-10 13:10",
      label: "움직임 없음",
      address: "30분 이상 움직임 없음",
      value: "30분",
      valueColor: "#F59E0B",
    },
  ] as BioAlert[],
};

export default function AlertScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [tab, setTab] = useState<TabType>("location");
  const [bioTab, setBioTab] = useState<BioTabType>("heart");

  const [emergencyAlerts, setEmergencyAlerts] = useState<LocationAlert[]>(MOCK_LOCATION.emergency);
  const [outAlerts, setOutAlerts] = useState<LocationAlert[]>(MOCK_LOCATION.out);
  const [backAlerts, setBackAlerts] = useState<LocationAlert[]>(MOCK_LOCATION.back);

  const [devices, setDevices] = useState<DeviceStatus[]>(MOCK_DEVICES);
  const [heartAlerts, setHeartAlerts] = useState<BioAlert[]>(MOCK_BIO.heart);
  const [motionAlerts, setMotionAlerts] = useState<BioAlert[]>(MOCK_BIO.motion);

  const loadProfile = useCallback(async () => {
    try {
      const [savedProfile, savedAccountId] = await Promise.all([
        AsyncStorage.getItem(PROFILE_KEY),
        AsyncStorage.getItem(ACCOUNT_ID_KEY),
      ]);

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
       *
       * const response = await fetch(`${API_BASE_URL}/api/alerts`);
       * const data = await response.json();
       *
       * setEmergencyAlerts(data.location.emergency);
       * setOutAlerts(data.location.safeZoneOut);
       * setBackAlerts(data.location.safeZoneBack);
       * setDevices(data.bio.devices);
       * setHeartAlerts(data.bio.heart);
       * setMotionAlerts(data.bio.motion);
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

  const activeBioAlerts = useMemo(() => {
    if (bioTab === "heart") return heartAlerts;
    return motionAlerts;
  }, [bioTab, heartAlerts, motionAlerts]);

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
              <Ionicons name="location-outline" size={18} color={tab === "location" ? "#1267FF" : "#64748B"} />
              <Text style={[styles.mainTabText, tab === "location" && styles.mainTabTextOn]}>
                위치 추적
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.mainTab, tab === "bio" && styles.mainTabOn]}
            onPress={() => setTab("bio")}
          >
            <View style={styles.mainTabInner}>
              <Ionicons name="heart-outline" size={18} color={tab === "bio" ? "#1267FF" : "#64748B"} />
              <Text style={[styles.mainTabText, tab === "bio" && styles.mainTabTextOn]}>
                생체 정보
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
                badgeLabel="긴급"
              />

              <LocationGroupCard
                type="out"
                title="안전구역 이탈"
                alerts={outAlerts}
                color="#FF6B00"
                badgeLabel="이탈"
              />

              <LocationGroupCard
                type="back"
                title="안전구역 복귀"
                alerts={backAlerts}
                color="#00C853"
                badgeLabel="안전구역"
              />
            </View>
          ) : (
            <>
              <View style={styles.deviceTitleRow}>
                <Ionicons name="watch-outline" size={15} color="#1267FF" />
                <Text style={styles.deviceTitle}>웨어러블 기기 상태</Text>
              </View>

              {devices.map((device) => (
                <DeviceCard key={device.id} device={device} />
              ))}

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
                    {activeBioAlerts.map((item) => (
                      <BioAlertCard key={item.id} item={item} bioTab={bioTab} />
                    ))}
                  </ScrollView>
                </View>
              </View>
            </>
          )}

          <View style={{ height: 44 }} />
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
  badgeLabel,
}: {
  type: "emergency" | "out" | "back";
  title: string;
  alerts: LocationAlert[];
  color: string;
  badgeLabel: string;
}) {
  return (
    <View style={styles.locationBlock}>
      <View style={styles.locationBlockHeader}>
        <View style={styles.locationBlockTitleRow}>
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
          {alerts.map((item) => (
            <LocationAlertCard
              key={item.id}
              type={type}
              label={badgeLabel}
              item={item}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function LocationAlertCard({
  type,
  label,
  item,
}: {
  type: "emergency" | "out" | "back";
  label: string;
  item: LocationAlert;
}) {
  const isEmergency = type === "emergency";
  const isOut = type === "out";
  const color = isEmergency ? "#FF2F45" : isOut ? "#FF6B00" : "#00C853";
  const bg = isEmergency ? "#FFF8F9" : isOut ? "#FFFBF5" : "#F4FDF7";

  return (
    <View style={[styles.alertRow, { backgroundColor: bg }]}>
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

function DeviceCard({ device }: { device: DeviceStatus }) {
  return (
    <View style={[styles.deviceCard, styles.lightShadow]}>
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
          backgroundColor: color === "#F59E0B" ? "#FFFBEB" : "#FFF7F8",
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
}: {
  item: BioAlert;
  bioTab: BioTabType;
}) {
  const badgeColor = bioTab === "heart" ? "#FF2F45" : "#F59E0B";
  const bg = bioTab === "heart" ? "#FFF8F9" : "#FFFBEB";

  return (
    <View style={[styles.alertRow, { backgroundColor: bg }]}>
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
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },

  tabBar: {
    height: 50,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#D8E7FF",
  },
  mainTab: {
    flex: 1,
    borderBottomWidth: 3,
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
    gap: 5,
  },
  mainTabText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#64748B",
    textAlign: "center",
  },
  mainTabTextOn: {
    color: "#1267FF",
  },

  body: {
    paddingHorizontal: 12,
    paddingTop: 20,
    paddingBottom: 28,
  },

  locationGroup: {
    gap: 18,
  },
  locationBlock: {
    width: "100%",
  },
  locationBlockHeader: {
    minHeight: 32,
    marginBottom: 9,
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  locationBlockTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationBlockTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#334155",
  },
  totalCountText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#64748B",
  },

  locationListCard: {
    height: 136,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1.2,
    padding: 9,
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
    gap: 8,
    paddingRight: 2,
  },

  alertRow: {
    height: 55,
    borderRadius: 14,
    paddingHorizontal: 9,
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

  deviceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 11,
    paddingLeft: 2,
  },
  deviceTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#475569",
  },
  deviceCard: {
    minHeight: 70,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 13,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
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
    maxWidth: 92,
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
    height: 44,
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  bioTab: {
    flex: 1,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
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
    height: 136,
    backgroundColor: "#FFFFFF",
    padding: 9,
  },
  bioListScroll: {
    flex: 1,
  },
});