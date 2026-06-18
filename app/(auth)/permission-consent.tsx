import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AppState,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { COLORS, SHADOW } from "../../constants/theme";

const PERMISSION_CONSENT_KEY = "permissionConsent";
const LOCATION_CONSENT_KEY = "locationConsent";
const HEALTH_CONSENT_KEY = "healthConsent";
const PERMISSION_CONSENT_PENDING_KEY = "permissionConsentPending";
const CURRENT_USER_ID_KEY = "currentUserId";

const buildAccountKey = (baseKey: string, ownerId: string) =>
  `${baseKey}_user_${ownerId || "unknown"}`;

/**
 * Health Connect 실제 연동 전까지 사용하는 준비 상태값입니다.
 * 나중에 react-native-health-connect 권한 요청이 정상 연결되면
 * healthState를 Health Connect 권한 결과 기준으로 granted 처리하면 됩니다.
 */
type PermissionState = "idle" | "granted";

export default function PermissionConsentScreen() {
  const router = useRouter();

  const [locationState, setLocationState] = useState<PermissionState>("idle");
  const [healthState, setHealthState] = useState<PermissionState>("idle");
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [openedLocationSettings, setOpenedLocationSettings] = useState(false);
  const [permissionOwnerId, setPermissionOwnerId] = useState("unknown");

  const locationDone = locationState === "granted";
  const healthDone = healthState === "granted";
  const canStart = locationDone;

  const permissionConsentKey = useMemo(
    () => buildAccountKey(PERMISSION_CONSENT_KEY, permissionOwnerId),
    [permissionOwnerId],
  );
  const permissionConsentPendingKey = useMemo(
    () => buildAccountKey(PERMISSION_CONSENT_PENDING_KEY, permissionOwnerId),
    [permissionOwnerId],
  );
  const locationConsentKey = useMemo(
    () => buildAccountKey(LOCATION_CONSENT_KEY, permissionOwnerId),
    [permissionOwnerId],
  );
  const healthConsentKey = useMemo(
    () => buildAccountKey(HEALTH_CONSENT_KEY, permissionOwnerId),
    [permissionOwnerId],
  );

  const stateLabel = useMemo(() => {
    const getLabel = (state: PermissionState) => {
      if (state === "granted") return "허용 완료";
      return "대기 중";
    };

    return {
      location: getLabel(locationState),
      health: getLabel(healthState),
    };
  }, [locationState, healthState]);

  const resetLocationConsent = async () => {
    setLocationState("idle");
    await AsyncStorage.removeItem(locationConsentKey);
    await AsyncStorage.removeItem(permissionConsentKey);
  };

  const checkLocationPermission = async (shouldResetIfDenied = false) => {
    try {
      const current = await Location.getForegroundPermissionsAsync();

      if (current.status === "granted") {
        setLocationState("granted");
        await AsyncStorage.setItem(locationConsentKey, "true");
        return true;
      }

      if (shouldResetIfDenied) {
        await resetLocationConsent();
      }

      return false;
    } catch {
      if (shouldResetIfDenied) {
        await resetLocationConsent();
      }

      return false;
    }
  };

  useEffect(() => {
    const initPermissionState = async () => {
      const savedCurrentUserId =
        (await AsyncStorage.getItem(CURRENT_USER_ID_KEY)) ?? "unknown";

      setPermissionOwnerId(savedCurrentUserId);
    };

    initPermissionState();
  }, []);

  useEffect(() => {
    if (!permissionOwnerId) return;

    const loadPermissionState = async () => {
      const [savedLocationConsent, savedHealthConsent] = await Promise.all([
        AsyncStorage.getItem(locationConsentKey),
        AsyncStorage.getItem(healthConsentKey),
      ]);

      if (savedLocationConsent === "true") {
        setLocationState("granted");
      }

      if (savedHealthConsent === "true") {
        setHealthState("granted");
      }

      await checkLocationPermission(false);
    };

    loadPermissionState();
  }, [permissionOwnerId, locationConsentKey, healthConsentKey]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (state) => {
      if (state !== "active") return;

      if (openedLocationSettings) {
        setOpenedLocationSettings(false);

        /**
         * 설정 화면에 들어갔다가 그냥 나온 경우에는 granted가 아니므로
         * 절대 허용 완료로 처리하지 않습니다.
         */
        await checkLocationPermission(false);
      }
    });

    return () => subscription.remove();
  }, [openedLocationSettings]);

  const requestLocationPermission = async () => {
    if (loadingLocation || locationDone) return;

    try {
      setLoadingLocation(true);

      /**
       * 위치정보 확인 버튼을 누르면 OS 권한 팝업을 띄우지 않고
       * 앱 설정 화면으로 이동합니다.
       * 이미 허용된 권한 상태는 설정 화면 재진입 시 초기화하지 않습니다.
       */
      setOpenedLocationSettings(true);
      await Linking.openSettings();
    } catch {
      await resetLocationConsent();
      Alert.alert("오류", "설정 화면을 열지 못했습니다.");
    } finally {
      setLoadingLocation(false);
    }
  };

  const openHealthConnect = async () => {
    if (loadingHealth || healthDone) return;

    try {
      setLoadingHealth(true);

      /**
       * 현재는 Health Connect 실제 권한 요청 코드를 연결하기 전 단계입니다.
       * 나중에 삼성 헬스/Health Connect 설치 후 react-native-health-connect로
       * Steps, HeartRate 권한 요청을 붙이면 이 버튼에서 실제 권한 화면이 열리게 됩니다.
       *
       * 지금은 사용자가 Health Connect를 설치/확인할 수 있도록 Play Store 화면으로 연결합니다.
       * 설치되어 있지 않거나 에뮬레이터에서 열 수 없는 경우 안내만 표시합니다.
       */
      const healthConnectMarketUrl =
        "market://details?id=com.google.android.apps.healthdata";
      const healthConnectWebUrl =
        "https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata";

      const canOpenMarket = await Linking.canOpenURL(healthConnectMarketUrl);

      if (canOpenMarket) {
        await Linking.openURL(healthConnectMarketUrl);
      } else {
        await Linking.openURL(healthConnectWebUrl);
      }

      setHealthState("idle");
      await AsyncStorage.removeItem(healthConsentKey);
      await AsyncStorage.removeItem(permissionConsentKey);

      Alert.alert(
        "Health Connect 연동 필요",
        "실제 심박수와 걸음수 데이터를 사용하려면 Health Connect 및 삼성 헬스 연동 후 권한 요청 기능을 연결해야 합니다.",
      );
    } catch {
      setHealthState("idle");
      Alert.alert(
        "Health Connect 확인 필요",
        "Health Connect를 열지 못했습니다. 실제 기기에서 삼성 헬스와 Health Connect 설치 후 다시 확인해주세요.",
      );
    } finally {
      setLoadingHealth(false);
    }
  };

  const startApp = async () => {
    const locationAllowed = await checkLocationPermission(true);

    if (!locationAllowed) {
      Alert.alert(
        "위치정보 권한 필요",
        "대시보드로 이동하기 전에 위치정보 권한을 허용해주세요.",
      );
      return;
    }

    await AsyncStorage.setItem(permissionConsentKey, "true");
    await AsyncStorage.removeItem(permissionConsentPendingKey);
    router.replace("/(tabs)");
  };

  return (
    <LinearGradient
      colors={[COLORS.bgTop ?? COLORS.bg, COLORS.bgBottom ?? COLORS.bg]}
      style={styles.safe}
    >
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
        </View>

        <Text style={styles.title}>서비스 권한 동의</Text>

        <Text style={styles.subText}>
          안심톡톡의 위치 및 생체정보 기반{"\n"}
          안전 관리 기능을 위해 아래 권한이 필요합니다.
        </Text>

        <View style={styles.card}>
          <PermissionRow
            icon="location-outline"
            title="위치정보 권한"
            requiredType="required"
            description={"보호자와 대상자의 위치 확인 및\n안전구역 이탈 감지에 사용됩니다."}
            stateText={stateLabel.location}
            state={locationState}
            loading={loadingLocation}
            buttonText="위치정보 확인"
            onPress={requestLocationPermission}
          />

          <View style={styles.divider} />

          <PermissionRow
            icon="pulse-outline"
            title="생체정보 권한"
            requiredType="optional"
            description={"심박수, 걸음수 등 건강 데이터를\nHealth Connect로 연동합니다."}
            stateText={stateLabel.health}
            state={healthState}
            loading={loadingHealth}
            buttonText="생체정보 확인"
            onPress={openHealthConnect}
          />
        </View>

        <View style={styles.startArea}>
          <Pressable
            onPress={startApp}
            disabled={!canStart}
            hitSlop={10}
            style={styles.startLink}
          >
            <Text
              style={[
                styles.startText,
                !canStart && styles.startTextDisabled,
              ]}
            >
              시작하기
            </Text>

            <Ionicons
              name="chevron-forward"
              size={14}
              color={canStart ? COLORS.primary : "rgba(17,24,39,0.28)"}
            />
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

function PermissionRow({
  icon,
  title,
  requiredType,
  description,
  stateText,
  state,
  loading,
  buttonText,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  requiredType?: "required" | "optional";
  description: string;
  stateText: string;
  state: PermissionState;
  loading: boolean;
  buttonText: string;
  onPress: () => void;
}) {
  const isGranted = state === "granted";

  return (
    <View style={styles.permissionRow}>
      <View style={styles.permissionTop}>
        <View style={styles.permissionIconBox}>
          <Ionicons name={icon} size={22} color={COLORS.primary} />
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.permissionTitleRow}>
            <View style={styles.permissionTitleLeft}>
              <Text style={styles.permissionTitle}>{title}</Text>

              {requiredType && (
                <Text style={styles.requiredOptionalText}>
                  {requiredType === "required" ? "(필수)" : "(선택)"}
                </Text>
              )}
            </View>

            <View style={[styles.stateBadge, isGranted && styles.stateBadgeGranted]}>
              <Text
                style={[
                  styles.stateBadgeText,
                  isGranted && styles.stateBadgeTextGranted,
                ]}
              >
                {stateText}
              </Text>
            </View>
          </View>

          <Text style={styles.permissionDesc}>{description}</Text>
        </View>
      </View>

      <Pressable
        style={[styles.permissionBtn, isGranted && styles.permissionBtnDone]}
        onPress={onPress}
        disabled={loading || isGranted}
      >
        <Text
          style={[
            styles.permissionBtnText,
            isGranted && styles.permissionBtnTextDone,
          ]}
        >
          {loading ? "확인 중..." : buttonText}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },

  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 45,
    justifyContent: "center",
    transform: [{ translateY: -18 }],
  },

  iconCircle: {
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
    ...SHADOW.soft,
  },

  title: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },

  subText: {
    alignSelf: "center",
    maxWidth: 310,
    marginTop: 6,
    marginBottom: 17,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
    color: "rgba(17,24,39,0.58)",
  },

  card: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    padding: 16,
    ...SHADOW.floating,
  },

  permissionRow: {
    gap: 13,
  },

  permissionTop: {
    flexDirection: "row",
    gap: 12,
  },

  permissionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(37,99,235,0.09)",
    alignItems: "center",
    justifyContent: "center",
  },

  permissionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  permissionTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
    flexShrink: 1,
  },

  requiredOptionalText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#111827",
  },

  permissionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#111827",
  },

  permissionDesc: {
    marginTop: 5,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: "rgba(17,24,39,0.56)",
  },

  stateBadge: {
    paddingHorizontal: 8,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },

  stateBadgeGranted: {
    backgroundColor: "rgba(34,197,94,0.12)",
  },

  stateBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#64748B",
  },

  stateBadgeTextGranted: {
    color: "#16A34A",
  },

  permissionBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  permissionBtnDone: {
    backgroundColor: "rgba(37,99,235,0.09)",
  },

  permissionBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },

  permissionBtnTextDone: {
    color: COLORS.primary,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.07)",
    marginVertical: 16,
  },

  startArea: {
    width: "100%",
    maxWidth: 340,
    alignSelf: "center",
    alignItems: "flex-end",
    marginTop: 14,
  },

  startLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 5,
    paddingHorizontal: 2,
  },

  startText: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.primary,
  },

  startTextDisabled: {
    color: "rgba(17,24,39,0.28)",
  },
});
