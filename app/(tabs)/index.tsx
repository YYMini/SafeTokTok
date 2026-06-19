// app/(tabs)/index.tsx
import Header from "@/components/Header";
import { API_BASE_URL, isUsingLocalApiBaseUrl } from "@/constants/api";
import { COLORS, RADIUS, SHADOW } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

declare global {
  interface Window {
    kakao: any;
  }
}

type Target = {
  id: string;
  name: string;
  sub: string;
  age?: number;
  loginId?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type Profile = {
  name: string;
  userId: string;
  email: string;
  phone: string;
  age?: number | string | null;
  imageUri: string | null;
  role?: "PARENT" | "CHILD" | "guardian" | "user";
};

type ChildApiResponse = {
  childId: number;
  name: string;
  age?: number | null;
  loginId?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type WatchTelemetryApiResponse = {
  childId: number;
  latitude?: number | null;
  longitude?: number | null;
  heartRate?: number | null;
  recordedAt?: number | null;
  source?: string | null;
};

type WatchTelemetryItem = WatchTelemetryApiResponse & {
  name: string;
};

type ConnectionApiResponse = {
  id: number;
  name: string;
  age?: number | null;
  loginId?: string;
  role: "PARENT" | "CHILD";
};

type ChildDraft = {
  loginId: string;
  password: string;
  passwordConfirm: string;
  name: string;
  age: string;
};

type MapTarget = {
  userId: number;
  name: string;
  latitude: number;
  longitude: number;
  loginId?: string;
  danger?: boolean;
  current?: boolean;
};

const isKakaoMapCoordinate = (latitude: number, longitude: number) =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= 33 &&
  latitude <= 39.5 &&
  longitude >= 124 &&
  longitude <= 132;

const SAVED_POINT_LABELS = [
  { label: "admin1", latitude: 37.5654, longitude: 126.9766 },
  { label: "user1", latitude: 37.5662, longitude: 126.9778 },
];

const SAVED_POINT_MATCH_RANGE = 0.00035;

const getSavedPointLabel = (latitude: number, longitude: number) => {
  const matched = SAVED_POINT_LABELS.find(
    (point) =>
      Math.abs(point.latitude - latitude) <= SAVED_POINT_MATCH_RANGE &&
      Math.abs(point.longitude - longitude) <= SAVED_POINT_MATCH_RANGE,
  );

  return matched?.label;
};

const PROFILE_KEY = "profileData_v1";
const TARGETS_KEY = "linkedTargets_v1";
const LOGIN_KEY = "isLoggedIn";
const CURRENT_USER_ID_KEY = "currentUserId";
const CURRENT_USER_ROLE_KEY = "currentUserRole";
const ACCOUNT_ID_KEY = "authAccountId";
const PERMISSION_CONSENT_PENDING_KEY = "permissionConsentPending";
const SOS_STATE_KEY = "sosState_v1";
const DEFAULT_PROFILE: Profile = {
  name: "보호자",
  userId: "admin",
  email: "stt@naver.com",
  phone: "010-0000-0000",
  imageUri: null,
};

const DEFAULT_TARGETS: Target[] = [];

type FieldErrors = {
  userId?: string;
  email?: string;
  phone?: string;
  age?: string;
};

type TooltipField = "userId" | "email" | "phone" | "age" | null;

export default function TrackingDashboard() {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [linkedTargets, setLinkedTargets] = useState<Target[]>(DEFAULT_TARGETS);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [sosActive, setSosActive] = useState(false);
  const [sosRequesterId, setSosRequesterId] = useState("");
  const [sosRequesterUserId, setSosRequesterUserId] = useState<number | null>(null);
  const [sosMessageHidden, setSosMessageHidden] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [savedProfile, savedUserId, savedRole, savedAccountId, savedSos] = await Promise.all([
          AsyncStorage.getItem(PROFILE_KEY),
          AsyncStorage.getItem(CURRENT_USER_ID_KEY),
          AsyncStorage.getItem(CURRENT_USER_ROLE_KEY),
          AsyncStorage.getItem(ACCOUNT_ID_KEY),
          AsyncStorage.getItem(SOS_STATE_KEY),
        ]);

        if (savedUserId) {
          const parsedUserId = Number(savedUserId);
          if (!Number.isNaN(parsedUserId)) {
            setCurrentUserId(parsedUserId);
          }
        }

        if (savedRole) {
          setCurrentUserRole(savedRole);
          if (savedRole === "CHILD") {
            setLinkedTargets([]);
            await AsyncStorage.setItem(TARGETS_KEY, JSON.stringify([]));
          }
        }

        if (savedProfile) {
          const parsed = JSON.parse(savedProfile) as Partial<Profile>;
          setProfile({
            ...DEFAULT_PROFILE,
            ...parsed,
            userId: savedAccountId ?? parsed.userId ?? DEFAULT_PROFILE.userId,
            phone: parsed.phone ?? DEFAULT_PROFILE.phone,
            age: parsed.age ?? null,
            imageUri: parsed.imageUri ?? null,
          });
        } else if (savedAccountId) {
          setProfile({ ...DEFAULT_PROFILE, userId: savedAccountId });
        }

        if (savedSos) {
          try {
            const parsedSos = JSON.parse(savedSos) as {
              active?: boolean;
              requesterId?: string;
              userId?: number | string | null;
            };
            setSosActive(!!parsedSos.active);
            setSosRequesterId(parsedSos.requesterId ?? "");
            const parsedRequesterUserId =
              parsedSos.userId !== null && parsedSos.userId !== undefined
                ? Number(parsedSos.userId)
                : null;
            setSosRequesterUserId(
              Number.isFinite(parsedRequesterUserId) ? parsedRequesterUserId : null,
            );
            setSosMessageHidden(false);
          } catch {
            // ignore
          }
        }

        setLinkedTargets([]);
      } catch {
        // ignore
      } finally {
        setProfileReady(true);
      }
    })();
  }, []);

  const toTarget = (child: ChildApiResponse): Target => ({
    id: String(child.childId),
    name: child.name,
    sub: "대상자",
    age: child.age ?? undefined,
    loginId: child.loginId,
    latitude: child.latitude,
    longitude: child.longitude,
  });

  const toConnectionTarget = (connection: ConnectionApiResponse): Target => ({
    id: `${connection.role}-${connection.id}`,
    name: connection.name,
    sub: connection.role === "PARENT" ? "보호자" : "대상자",
    age: connection.age ?? undefined,
    loginId: connection.loginId,
  });

  const fetchChildren = async (parentId: number) => {
    const response = await fetch(`${API_BASE_URL}/api/children`, {
      headers: {
        "X-User-Id": String(parentId),
        "X-Login-Id": profile.userId,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as ChildApiResponse[];
    if (Array.isArray(data)) {
      await saveTargets(data.map(toTarget));
    }
  };

  const fetchConnections = async (userId: number) => {
    const response = await fetch(`${API_BASE_URL}/api/children/connections`, {
      headers: {
        "X-User-Id": String(userId),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as ConnectionApiResponse[];
    if (Array.isArray(data)) {
      await saveTargets(data.map(toConnectionTarget));
    }
  };

  useEffect(() => {
    if (!currentUserId || currentUserRole !== "PARENT") return;

    fetchChildren(currentUserId).catch((error) => {
      console.log("자녀 목록 조회 실패", error);
    });
  }, [currentUserId, currentUserRole, profile.userId]);

  useEffect(() => {
    if (!currentUserId || currentUserRole !== "CHILD") return;

    fetchConnections(currentUserId).catch((error) => {
      console.log("연결 대상자 조회 실패", error);
      saveTargets([]).catch(() => {
        // ignore
      });
    });
  }, [currentUserId, currentUserRole]);

  const addChild = async (child: ChildDraft): Promise<Target> => {
    if (!currentUserId && !profile.userId) {
      Alert.alert("대상자 추가 실패", "로그인 사용자 정보를 찾을 수 없습니다.");
      throw new Error("Missing current user id");
    }

    const response = await fetch(`${API_BASE_URL}/api/children`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(currentUserId ? { "X-User-Id": String(currentUserId) } : {}),
        "X-Login-Id": profile.userId,
      },
      body: JSON.stringify({
        loginId: child.loginId.trim(),
        password: child.password,
        name: child.name.trim(),
        age: Number(child.age),
      }),
    });

    if (!response.ok) {
      let message = `대상자 추가에 실패했습니다. (HTTP ${response.status})`;
      try {
        const errorBody = await response.json();
        if (typeof errorBody?.message === "string") {
          message = errorBody.message;
        }
      } catch {
        // ignore
      }
      throw new Error(message);
    }

    const created = (await response.json()) as ChildApiResponse;
    const createdTarget = toTarget(created);

    try {
      await AsyncStorage.setItem(
        `${PERMISSION_CONSENT_PENDING_KEY}_user_${created.childId}`,
        "true",
      );
    } catch {
      // ignore
    }

    const nextTargets = [...linkedTargets, createdTarget];
    await saveTargets(nextTargets);
    return createdTarget;
  };

  const deleteChild = async (target: Target) => {
    const childId = Number(target.id);
    if (!Number.isFinite(childId)) {
      throw new Error("삭제할 대상자 정보를 확인할 수 없습니다.");
    }

    const response = await fetch(`${API_BASE_URL}/api/children/${childId}`, {
      method: "DELETE",
      headers: {
        ...(currentUserId ? { "X-User-Id": String(currentUserId) } : {}),
        "X-Login-Id": profile.userId,
      },
    });

    if (!response.ok) {
      let message = `대상자 삭제에 실패했습니다. (HTTP ${response.status})`;
      try {
        const errorBody = await response.json();
        if (typeof errorBody?.message === "string") {
          message = errorBody.message;
        }
      } catch {
        // ignore
      }
      throw new Error(message);
    }

    const nextTargets = linkedTargets.filter((item) => item.id !== target.id);
    await saveTargets(nextTargets);
  };

  const saveProfile = async (next: Profile) => {
    setProfile(next);
    try {
      await AsyncStorage.multiSet([
        [PROFILE_KEY, JSON.stringify(next)],
        [ACCOUNT_ID_KEY, next.userId],
      ]);
    } catch {
      Alert.alert("저장 실패", "프로필 설정을 저장하지 못했어요.");
    }
  };

  const saveTargets = async (next: Target[]) => {
    setLinkedTargets(next);
    try {
      await AsyncStorage.setItem(TARGETS_KEY, JSON.stringify(next));
    } catch {
      Alert.alert("저장 실패", "연결된 대상자 정보를 저장하지 못했어요.");
    }
  };

  const handleSosRequest = async () => {
    const requesterId = profile.userId || String(currentUserId ?? "");
    const isMyActiveSos = sosActive && sosRequesterId === requesterId;

    if (isMyActiveSos) {
      setSosActive(false);
      setSosRequesterId("");
      setSosRequesterUserId(null);
      setSosMessageHidden(false);

      try {
        await AsyncStorage.removeItem(SOS_STATE_KEY);
      } catch {
        // ignore
      }
      return;
    }

    setSosActive(true);
    setSosRequesterId(requesterId);
    setSosRequesterUserId(currentUserId);
    setSosMessageHidden(false);

    try {
      await AsyncStorage.setItem(
        SOS_STATE_KEY,
        JSON.stringify({
          active: true,
          requesterId,
          userId: currentUserId,
        }),
      );
    } catch {
      // ignore
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.setItem(LOGIN_KEY, "false");
      await AsyncStorage.removeItem(CURRENT_USER_ID_KEY);
      await AsyncStorage.removeItem(CURRENT_USER_ROLE_KEY);
    } catch {
      // ignore
    }
    setProfileOpen(false);
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.safe}>
      <StatusBar style="light" />

      <View style={styles.topBar}>
        <Header
          roleLabel={profileReady ? profile.name : ""}
          showLogout={false}
          profileImageUri={profile.imageUri}
          onPressSettings={() => router.push("/settings")}
          onPressRole={() => {
            if (profileReady) setProfileOpen(true);
          }}
        />
      </View>

      <View style={styles.body}>
        <MapPlaceholder
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          linkedTargets={linkedTargets}
          profileName={profile.name}
          profileUserId={profile.userId}
          sosActive={sosActive}
          sosRequesterId={sosRequesterId}
          sosRequesterUserId={sosRequesterUserId}
          sosMessageHidden={sosMessageHidden}
          onDismissSosMessage={() => setSosMessageHidden(true)}
          onPressSos={handleSosRequest}
        />
      </View>

      <ProfileModal
        visible={profileReady && profileOpen}
        onClose={() => setProfileOpen(false)}
        linkedTargets={linkedTargets}
        profile={profile}
        onSaveProfile={saveProfile}
        onSaveTargets={saveTargets}
        onAddChild={addChild}
        onDeleteChild={deleteChild}
        accountRoleLabel={currentUserRole === "CHILD" ? "대상자" : "보호자"}
        canManageChildren={currentUserRole === "PARENT"}
        onPressSave={() => setProfileOpen(false)}
        onPressLogout={logout}
      />
    </View>
  );
}

function MapPlaceholder({
  currentUserId,
  currentUserRole,
  linkedTargets,
  profileName,
  profileUserId,
  sosActive,
  sosRequesterId,
  sosRequesterUserId,
  sosMessageHidden,
  onDismissSosMessage,
  onPressSos,
}: {
  currentUserId: number | null;
  currentUserRole: string | null;
  linkedTargets: Target[];
  profileName: string;
  profileUserId: string;
  sosActive: boolean;
  sosRequesterId: string;
  sosRequesterUserId: number | null;
  sosMessageHidden: boolean;
  onDismissSosMessage: () => void;
  onPressSos: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const roadviewContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const roadviewRef = useRef<any>(null);
  const roadviewClientRef = useRef<any>(null);
  const mobileWebViewRef = useRef<WebView>(null);
  const markersRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);
  const routeLineRef = useRef<any>(null);
  const routeOverlayRef = useRef<any>(null);
  const currentPositionRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<number | null>(null);
  const latestUserIdRef = useRef<number | null>(currentUserId);
  const latestUserRoleRef = useRef<string | null>(currentUserRole);
  const latestTargetsRef = useRef<MapTarget[]>([]);
  const latestLinkedTargetsRef = useRef<Target[]>(linkedTargets);
  const markerLabelByUserIdRef = useRef<Record<string, string>>({});
  const sosStateRef = useRef<{
    active: boolean;
    requesterId: string;
    requesterUserId: number | null;
  }>({
    active: sosActive,
    requesterId: sosRequesterId,
    requesterUserId: sosRequesterUserId,
  });
  const selectedRoadviewTargetRef = useRef<MapTarget | null>(null);
  const hasRenderedMarkersRef = useRef(false);
  const keepFitModeRef = useRef(false);
  const isProgrammaticFitChangeRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [watchTelemetry, setWatchTelemetry] = useState<WatchTelemetryItem[]>([]);
  const [showRouteInfo, setShowRouteInfo] = useState(false);
  const [routeTargetModalOpen, setRouteTargetModalOpen] = useState(false);
  const [selectedRouteTarget, setSelectedRouteTarget] = useState<MapTarget | null>(null);
  const [mapTargets, setMapTargets] = useState<MapTarget[]>([]);
  const [mapMode, setMapMode] = useState<"default" | "satellite" | "roadview">("default");
  const [isRoadviewOpen, setIsRoadviewOpen] = useState(false);
  const roadviewUnsupportedMessage = "해당 위치는 거리뷰를 지원하지 않습니다";

  const mobileMapHtml = `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
        <style>
          html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
          #map {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
          }
          #roadview {
            display: none;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            z-index: 30;
            background: #d1d5db;
          }
        </style>
        <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=d74e3a0d741775a29ef17516bf90fe89&autoload=false"></script>
      </head>
      <body>
        <div id="map"></div>
        <div id="roadview"></div>
        <script>
          var map;
          var roadview;
          var roadviewClient;
          var roadviewContainer;
          var selectedRoadviewTarget = null;
          var isRoadviewActive = false;
          var markers = [];
          var overlays = [];
          var currentTargets = [];
          var currentPosition = null;
          var routeLine = null;
          var routeOverlay = null;
          var keepFitMode = false;
          var isProgrammaticFitChange = false;

          function relayoutMap() {
            if (!map) return;
            map.relayout();
          }

          function refreshMapTiles() {
            relayoutMap();
            setTimeout(relayoutMap, 0);
            setTimeout(relayoutMap, 120);
          }

          function isKakaoMapCoordinate(latitude, longitude) {
            return Number.isFinite(latitude) &&
              Number.isFinite(longitude) &&
              latitude >= 33 &&
              latitude <= 39.5 &&
              longitude >= 124 &&
              longitude <= 132;
          }

          function clearMarkers() {
            markers.forEach(function(marker) { marker.setMap(null); });
            overlays.forEach(function(overlay) { overlay.setMap(null); });
            markers = [];
            overlays = [];
          }

          function clearRoute() {
            if (routeLine) {
              routeLine.setMap(null);
              routeLine = null;
            }
            if (routeOverlay) {
              routeOverlay.setMap(null);
              routeOverlay = null;
            }
          }

          function postToApp(payload) {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }

          function getRoadviewPosition() {
            if (selectedRoadviewTarget && isKakaoMapCoordinate(selectedRoadviewTarget.latitude, selectedRoadviewTarget.longitude)) {
              return new kakao.maps.LatLng(selectedRoadviewTarget.latitude, selectedRoadviewTarget.longitude);
            }
            if (currentTargets.length > 0) {
              var target = currentTargets[0];
              return new kakao.maps.LatLng(target.latitude, target.longitude);
            }
            return map.getCenter();
          }

          function closeRoadview() {
            isRoadviewActive = false;
            if (roadviewContainer) {
              roadviewContainer.style.display = 'none';
            }
            refreshMapTiles();
            postToApp({ type: 'roadviewState', active: false });
          }

          function openRoadview() {
            if (!map || !roadviewContainer) return;
            var position = getRoadviewPosition();
            if (!roadviewClient) {
              roadviewClient = new kakao.maps.RoadviewClient();
            }
            roadviewClient.getNearestPanoId(position, 200, function(panoId) {
              if (!panoId) {
                closeRoadview();
                postToApp({ type: 'roadviewError', message: '해당 위치는 거리뷰를 지원하지 않습니다' });
                return;
              }
              roadviewContainer.style.display = 'block';
              if (!roadview) {
                roadview = new kakao.maps.Roadview(roadviewContainer);
              }
              roadview.relayout();
              roadview.setPanoId(panoId, position);
              setTimeout(function() { roadview.relayout(); }, 0);
              setTimeout(function() { roadview.relayout(); }, 120);
              isRoadviewActive = true;
              postToApp({ type: 'roadviewState', active: true });
            });
          }

          function toggleRoadview() {
            if (isRoadviewActive) closeRoadview();
            else openRoadview();
          }

          var savedPointCoordinates = {
            admin1: { latitude: 37.5654, longitude: 126.9766 },
            user1: { latitude: 37.5662, longitude: 126.9778 }
          };

          function getCanonicalTargetPosition(target) {
            if (target && target.name && savedPointCoordinates[target.name]) {
              return savedPointCoordinates[target.name];
            }

            if (target && target.loginId && savedPointCoordinates[target.loginId]) {
              return savedPointCoordinates[target.loginId];
            }

            return {
              latitude: target.latitude,
              longitude: target.longitude
            };
          }

          function getDistanceLabel(start, end) {
            return '약 314m';
          }

          function drawRoute(payload) {
            if (!map || !currentTargets.length) return;
            clearRoute();

            var currentTarget = currentTargets.find(function(item) {
              return !!item.current;
            }) || currentTargets[0];

            var target = currentTargets.find(function(item) {
              return payload && payload.targetId != null && String(item.userId) === String(payload.targetId);
            }) || currentTargets.find(function(item) {
              return payload && payload.targetName && item.name === payload.targetName;
            }) || currentTargets.find(function(item) {
              return !item.current;
            }) || currentTargets[0];

            var startPoint = getCanonicalTargetPosition(currentTarget);
            var endPoint = getCanonicalTargetPosition(target);

            var start = new kakao.maps.LatLng(startPoint.latitude, startPoint.longitude);
            var end = new kakao.maps.LatLng(endPoint.latitude, endPoint.longitude);
            var distanceLabel = getDistanceLabel(start, end);

            routeLine = new kakao.maps.Polyline({
              map: map,
              path: [start, end],
              strokeWeight: 5,
              strokeColor: '#2563eb',
              strokeOpacity: 0.88,
              strokeStyle: 'solid'
            });
            routeOverlay = new kakao.maps.CustomOverlay({
              map: map,
              position: new kakao.maps.LatLng(
                (start.getLat() + end.getLat()) / 2,
                (start.getLng() + end.getLng()) / 2
              ),
              yAnchor: 1.1,
              content: '<div style="background:white;border:1px solid rgba(37,99,235,0.25);border-radius:10px;padding:7px 10px;font-size:12px;font-weight:800;color:#2563eb;box-shadow:0 4px 12px rgba(15,23,42,0.18);white-space:nowrap;">' + distanceLabel + '</div>'
            });

            if (!keepFitMode) {
              map.panTo(start);
              map.setLevel(3);
            }
          }

          function fitMarkers() {
            if (!map) return;
            if (!currentTargets.length) {
              return;
            }

            keepFitMode = true;
            isProgrammaticFitChange = true;

            var bounds = new kakao.maps.LatLngBounds();
            currentTargets.forEach(function(target) {
              bounds.extend(new kakao.maps.LatLng(target.latitude, target.longitude));
            });
            refreshMapTiles();
            if (currentTargets.length === 1) {
              var target = currentTargets[0];
              map.panTo(new kakao.maps.LatLng(target.latitude, target.longitude));
              map.setLevel(3);
            } else {
              map.setBounds(bounds);
            }
            refreshMapTiles();
            setTimeout(function() {
              isProgrammaticFitChange = false;
            }, 250);
          }

          function handleCommand(payload) {
            if (!map || !payload) return;
            if (payload.type === 'markers') {
              renderTargets(payload.targets);
            } else if (payload.type === 'moveTo') {
              if (typeof payload.latitude === 'number' && typeof payload.longitude === 'number') {
                keepFitMode = false;
                refreshMapTiles();
                map.panTo(new kakao.maps.LatLng(payload.latitude, payload.longitude));
                map.setLevel(3);
                refreshMapTiles();
              }
            } else if (payload.type === 'zoomIn') {
              keepFitMode = false;
              map.setLevel(Math.max(1, map.getLevel() - 1));
              refreshMapTiles();
            } else if (payload.type === 'zoomOut') {
              keepFitMode = false;
              map.setLevel(Math.min(14, map.getLevel() + 1));
              refreshMapTiles();
            } else if (payload.type === 'fit') {
              fitMarkers();
            } else if (payload.type === 'satellite') {
              map.setMapTypeId(kakao.maps.MapTypeId.SKYVIEW);
            } else if (payload.type === 'default') {
              map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);
            } else if (payload.type === 'routeOn') {
              drawRoute(payload);
            } else if (payload.type === 'updateCurrentPosition') {
              if (typeof payload.latitude === 'number' && typeof payload.longitude === 'number') {
                currentPosition = { latitude: payload.latitude, longitude: payload.longitude };
              }
            } else if (payload.type === 'routeOff') {
              clearRoute();
            } else if (payload.type === 'roadviewToggle') {
              toggleRoadview();
            } else if (payload.type === 'roadviewClose') {
              closeRoadview();
            }
          }

          function escapeHtml(value) {
            return String(value || '')
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
          }

          function renderTargets(targets) {
            if (!map || !Array.isArray(targets)) return;
            if (targets.length === 0 && markers.length > 0) return;
            currentTargets = targets
              .filter(function(target) {
                return isKakaoMapCoordinate(target.latitude, target.longitude);
              })
              .sort(function(a, b) {
                if (!!a.current !== !!b.current) return a.current ? 1 : -1;
                if (!!a.danger !== !!b.danger) return a.danger ? 1 : -1;
                return 0;
              });
            clearMarkers();

            refreshMapTiles();

            currentTargets.forEach(function(target) {
              var position = new kakao.maps.LatLng(target.latitude, target.longitude);
              var marker = new kakao.maps.Marker({
                position: position,
                map: map,
                zIndex: target.current ? 1000 : (target.danger ? 900 : 10)
              });
              var dangerBadge = target.danger
                ? '<span style="position:absolute;top:-7px;right:-7px;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:8px;background:#ef4444;color:#fff;font-size:11px;font-weight:900;box-shadow:0 2px 5px rgba(0,0,0,0.22);">!</span>'
                : '';
              var overlay = new kakao.maps.CustomOverlay({
                position: position,
                yAnchor: 2.2,
                zIndex: target.current ? 1000 : (target.danger ? 900 : 10),
                content: '<div style="position:relative;background:white;border:1px solid ' + (target.danger ? '#ef4444' : '#2563eb') + ';border-radius:12px;padding:4px 8px;font-size:12px;font-weight:700;color:' + (target.danger ? '#ef4444' : '#2563eb') + ';white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.18);">' + escapeHtml(target.name) + dangerBadge + '</div>'
              });
              overlay.setMap(map);
              kakao.maps.event.addListener(marker, 'click', function() {
                selectedRoadviewTarget = target;
              });
              markers.push(marker);
              overlays.push(overlay);
            });
          }

          document.addEventListener('message', function(event) {
            try {
              var payload = JSON.parse(event.data);
              handleCommand(payload);
            } catch (e) {}
          });

          window.addEventListener('message', function(event) {
            try {
              var payload = JSON.parse(event.data);
              handleCommand(payload);
            } catch (e) {}
          });

          kakao.maps.load(function() {
            map = new kakao.maps.Map(document.getElementById('map'), {
              center: new kakao.maps.LatLng(37.5665, 126.9780),
              level: 3
            });
            roadviewContainer = document.getElementById('roadview');
            map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);
            kakao.maps.event.addListener(map, 'dragstart', function() {
              keepFitMode = false;
            });
            kakao.maps.event.addListener(map, 'zoom_changed', function() {
              if (!isProgrammaticFitChange) {
                keepFitMode = false;
              }
            });
            relayoutMap();
            setTimeout(relayoutMap, 100);
            setTimeout(relayoutMap, 500);
            postToApp({ type: 'ready' });
          });

          window.addEventListener('resize', relayoutMap);
        </script>
      </body>
    </html>
  `;

  useEffect(() => {
    latestUserIdRef.current = currentUserId;
    latestUserRoleRef.current = currentUserRole;
    latestTargetsRef.current = [];
    hasRenderedMarkersRef.current = false;
  }, [currentUserId, currentUserRole]);

  useEffect(() => {
    sosStateRef.current = {
      active: sosActive,
      requesterId: sosRequesterId,
      requesterUserId: sosRequesterUserId,
    };
  }, [sosActive, sosRequesterId, sosRequesterUserId]);

  useEffect(() => {
    latestLinkedTargetsRef.current = linkedTargets;
  }, [linkedTargets]);

  const renderMarkers = (targets: MapTarget[]) => {
    if (!window.kakao?.maps || !mapInstanceRef.current) return;
    const validTargets = targets.filter((target) =>
      isKakaoMapCoordinate(target.latitude, target.longitude),
    );
    const decoratedTargets = applyDangerState(validTargets);
    latestTargetsRef.current = decoratedTargets;
    setMapTargets(decoratedTargets);

    markersRef.current.forEach((marker) => marker.setMap(null));
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));

    markersRef.current = [];
    overlaysRef.current = [];
    mapInstanceRef.current.relayout?.();

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const renderTargetList = [...decoratedTargets].sort((a, b) => {
      if (!!a.current !== !!b.current) return a.current ? 1 : -1;
      if (!!a.danger !== !!b.danger) return a.danger ? 1 : -1;
      return 0;
    });

    renderTargetList.forEach((target) => {
      const position = new window.kakao.maps.LatLng(
        target.latitude,
        target.longitude,
      );
      const labelText = escapeHtml(target.name);
      const isDanger = !!target.danger;
      const zIndex = target.current ? 1000 : isDanger ? 900 : 10;

      const marker = new window.kakao.maps.Marker({
        position,
        map: mapInstanceRef.current,
        zIndex,
      });

      const content = `
        <div style="
          position: relative;
          background: white;
          border: 1px solid ${isDanger ? "#ef4444" : "#2563eb"};
          border-radius: 12px;
          padding: 4px 8px;
          font-size: 12px;
          font-weight: 600;
          color: ${isDanger ? "#ef4444" : "#2563eb"};
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        ">
          ${labelText}
          ${isDanger ? '<span style="position:absolute;top:-7px;right:-7px;display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:8px;background:#ef4444;color:#fff;font-size:11px;font-weight:900;box-shadow:0 2px 5px rgba(0,0,0,0.22);">!</span>' : ""}
        </div>
      `;

      const overlay = new window.kakao.maps.CustomOverlay({
        position,
        content,
        yAnchor: 2.2,
        zIndex,
      });

      overlay.setMap(mapInstanceRef.current);

      window.kakao.maps.event.addListener(marker, "click", () => {
        selectedRoadviewTargetRef.current = target;
      });

      markersRef.current.push(marker);
      overlaysRef.current.push(overlay);
    });

  };

  const renderMobileMarkers = (targets: MapTarget[]) => {
    const validTargets = targets.filter((target) =>
      isKakaoMapCoordinate(target.latitude, target.longitude),
    );
    const decoratedTargets = applyDangerState(validTargets);
    latestTargetsRef.current = decoratedTargets;
    setMapTargets(decoratedTargets);
    mobileWebViewRef.current?.postMessage(
      JSON.stringify({
        type: "markers",
        targets: decoratedTargets,
      }),
    );
  };

  const sendMobileMapCommand = (type: string, payload: Record<string, unknown> = {}) => {
    mobileWebViewRef.current?.postMessage(JSON.stringify({ type, ...payload }));
  };

  const getWatchTargetName = (childId: number) => {
    const matched = latestLinkedTargetsRef.current.find((target) => {
      const numericId = String(target.id).match(/\d+$/)?.[0];
      return Number(numericId) === childId;
    });
    if (matched?.name) return matched.name;
    if (latestUserRoleRef.current === "CHILD" && latestUserIdRef.current === childId) {
      return "내 워치";
    }
    return `자녀 ${childId}`;
  };

  const normalizeWatchTelemetry = (payload: unknown): WatchTelemetryApiResponse[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload as WatchTelemetryApiResponse[];

    if (typeof payload === "object") {
      const telemetry = payload as Partial<WatchTelemetryApiResponse>;
      if (typeof telemetry.childId === "number") {
        return [telemetry as WatchTelemetryApiResponse];
      }

      return Object.values(payload as Record<string, WatchTelemetryApiResponse | null>)
        .filter((item): item is WatchTelemetryApiResponse => !!item);
    }

    return [];
  };

  const mergeWatchTargets = (
    locationTargets: MapTarget[],
    telemetryItems: WatchTelemetryItem[],
  ) => {
    const merged = new Map<number, MapTarget>();
    locationTargets.forEach((target) => merged.set(target.userId, target));

    telemetryItems.forEach((item) => {
      if (
        typeof item.latitude !== "number" ||
        typeof item.longitude !== "number" ||
        !isKakaoMapCoordinate(item.latitude, item.longitude)
      ) {
        return;
      }

      merged.set(item.childId, {
        userId: item.childId,
        name: `${item.name} 워치`,
        loginId: `${item.name} 워치`,
        latitude: item.latitude,
        longitude: item.longitude,
      });
    });

    return Array.from(merged.values());
  };

  const fetchLatestWatchTelemetry = async (locationTargets: MapTarget[] = []) => {
    const userId = latestUserIdRef.current;
    const userRole = latestUserRoleRef.current;
    if (!userId) return locationTargets;

    try {
      const endpoint =
        userRole === "CHILD"
          ? `${API_BASE_URL}/api/watch/telemetry/latest/${userId}`
          : `${API_BASE_URL}/api/watch/telemetry/latest`;
      const response = await fetch(endpoint, {
        headers: { "X-User-Id": String(userId) },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      const linkedChildIds = new Set(
        latestLinkedTargetsRef.current
          .map((target) => Number(String(target.id).match(/\d+$/)?.[0]))
          .filter((id) => Number.isFinite(id)),
      );
      const telemetryItems = normalizeWatchTelemetry(payload)
        .filter((item) => {
          if (userRole === "CHILD") return item.childId === userId;
          return linkedChildIds.size === 0 || linkedChildIds.has(item.childId);
        })
        .map((item) => ({
          ...item,
          name: getWatchTargetName(item.childId),
        }));

      setWatchTelemetry(telemetryItems);
      return mergeWatchTargets(locationTargets, telemetryItems);
    } catch (error) {
      console.log("워치 생체정보 조회 실패", error);
      return locationTargets;
    }
  };

  const getCurrentMarkerName = (latitude?: number, longitude?: number) => {
    if (
      typeof latitude === "number" &&
      typeof longitude === "number"
    ) {
      const savedPointLabel = getSavedPointLabel(latitude, longitude);
      if (savedPointLabel) return savedPointLabel;
    }

    return profileUserId || String(currentUserId ?? "") || "내 위치";
  };

  const getNumericTargetId = (id: string) => {
    const numeric = id.match(/\d+$/)?.[0];
    return numeric ?? id;
  };

  const isUsableAccountLabel = (value?: string | null) => {
    const label = String(value ?? "").trim();
    return !!label && label !== "admin" && label !== "보호자" && label !== "대상자";
  };

  const rememberMarkerLabel = (
    userId: number | string | null | undefined,
    label?: string | null,
    force = false,
  ) => {
    if (userId === null || userId === undefined) return;

    const key = String(userId);
    const nextLabel = String(label ?? "").trim();

    if (!isUsableAccountLabel(nextLabel)) return;
    if (!force && markerLabelByUserIdRef.current[key]) return;

    markerLabelByUserIdRef.current[key] = nextLabel;
  };

  const getTargetAccountId = (target: MapTarget) => {
    const savedPointLabel = getSavedPointLabel(target.latitude, target.longitude);
    if (savedPointLabel) {
      rememberMarkerLabel(target.userId, savedPointLabel, true);
      return savedPointLabel;
    }

    if (String(target.userId) === String(currentUserId)) {
      return profileUserId || String(currentUserId ?? "") || "내 위치";
    }

    const storedLabel = markerLabelByUserIdRef.current[String(target.userId)];
    if (isUsableAccountLabel(storedLabel)) {
      return storedLabel;
    }

    const matchedTarget = linkedTargets.find((item) => {
      const itemId = getNumericTargetId(String(item.id));
      return (
        itemId === String(target.userId) ||
        item.loginId === target.loginId ||
        item.loginId === target.name
      );
    });

    if (isUsableAccountLabel(matchedTarget?.loginId)) {
      rememberMarkerLabel(target.userId, matchedTarget?.loginId, true);
      return matchedTarget!.loginId!;
    }

    if (isUsableAccountLabel(target.loginId)) {
      rememberMarkerLabel(target.userId, target.loginId, true);
      return target.loginId!;
    }

    if (isUsableAccountLabel(target.name)) {
      rememberMarkerLabel(target.userId, target.name);
      return target.name;
    }

    return String(target.userId);
  };

  const normalizeMarkerNames = (targets: MapTarget[]) =>
    targets.map((target) => {
      const label = getTargetAccountId(target);

      return {
        ...target,
        name: label,
        loginId: label,
      };
    });

  const addCurrentTargetIfNeeded = (targets: MapTarget[]) => {
    const currentPosition = currentPositionRef.current;

    if (
      !currentUserId ||
      !currentPosition ||
      !isKakaoMapCoordinate(currentPosition.latitude, currentPosition.longitude)
    ) {
      return targets;
    }

    const exists = targets.some(
      (target) => String(target.userId) === String(currentUserId),
    );

    if (exists) {
      return targets.map((target) =>
        String(target.userId) === String(currentUserId)
          ? {
              ...target,
              name: getCurrentMarkerName(currentPosition.latitude, currentPosition.longitude),
              loginId: getCurrentMarkerName(currentPosition.latitude, currentPosition.longitude),
              latitude: currentPosition.latitude,
              longitude: currentPosition.longitude,
              current: true,
            }
          : target,
      );
    }

    return [
      ...targets,
      {
        userId: currentUserId,
        name: getCurrentMarkerName(currentPosition.latitude, currentPosition.longitude),
        loginId: getCurrentMarkerName(currentPosition.latitude, currentPosition.longitude),
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        current: true,
      },
    ];
  };

  const applyDangerState = (targets: MapTarget[]) =>
    addCurrentTargetIfNeeded(normalizeMarkerNames(targets))
      .map((target) => {
        const isCurrent = String(target.userId) === String(currentUserId);
        const label = getTargetAccountId(target);
        const sosState = sosStateRef.current;
        const isSosRequester =
          sosState.active &&
          !!sosState.requesterId &&
          (label === sosState.requesterId ||
            target.name === sosState.requesterId ||
            (sosState.requesterUserId !== null &&
              String(target.userId) === String(sosState.requesterUserId)));

        return {
          ...target,
          name: label,
          loginId: label,
          current: isCurrent,
          danger: target.danger || isSosRequester,
        };
      })
      .sort((a, b) => {
        if (a.current !== b.current) return a.current ? 1 : -1;
        if (a.danger !== b.danger) return a.danger ? 1 : -1;
        return 0;
      });

  const refreshVisibleMarkers = () => {
    const targets =
      latestTargetsRef.current.length > 0
        ? latestTargetsRef.current
        : getFallbackMapTargets();

    if (targets.length === 0) return;

    if (Platform.OS === "web") {
      renderMarkers(targets);
    } else {
      renderMobileMarkers(targets);
    }
  };

  useEffect(() => {
    refreshVisibleMarkers();
  }, [sosActive, sosRequesterId, sosRequesterUserId]);

  const getFallbackMapTargets = (): MapTarget[] => {
    const targetsFromLinked = linkedTargets
      .filter(
        (target) =>
          typeof target.latitude === "number" &&
          typeof target.longitude === "number" &&
          isKakaoMapCoordinate(target.latitude, target.longitude),
      )
      .map((target, index) => ({
        userId: Number(target.id) || index + 1,
        name: target.loginId || target.name,
        latitude: target.latitude as number,
        longitude: target.longitude as number,
      }));

    if (targetsFromLinked.length > 0) {
      return targetsFromLinked;
    }

    const currentPosition = currentPositionRef.current;
    if (
      currentUserId &&
      currentPosition &&
      isKakaoMapCoordinate(currentPosition.latitude, currentPosition.longitude)
    ) {
      return [
        {
          userId: currentUserId,
          name: getCurrentMarkerName(),
          latitude: currentPosition.latitude,
          longitude: currentPosition.longitude,
        },
      ];
    }

    return [];
  };

  const clearWebRoute = () => {
    if (routeLineRef.current) {
      routeLineRef.current.setMap(null);
      routeLineRef.current = null;
    }

    if (routeOverlayRef.current) {
      routeOverlayRef.current.setMap(null);
      routeOverlayRef.current = null;
    }
  };

  const getWebRoadviewPosition = () => {
    if (!window.kakao?.maps || !mapInstanceRef.current) return null;
    const selectedTarget = selectedRoadviewTargetRef.current;
    if (
      selectedTarget &&
      isKakaoMapCoordinate(selectedTarget.latitude, selectedTarget.longitude)
    ) {
      return new window.kakao.maps.LatLng(
        selectedTarget.latitude,
        selectedTarget.longitude,
      );
    }
    const firstTarget = latestTargetsRef.current[0];
    if (
      firstTarget &&
      isKakaoMapCoordinate(firstTarget.latitude, firstTarget.longitude)
    ) {
      return new window.kakao.maps.LatLng(
        firstTarget.latitude,
        firstTarget.longitude,
      );
    }
    return mapInstanceRef.current.getCenter();
  };

  const closeWebRoadView = () => {
    if (roadviewContainerRef.current) {
      roadviewContainerRef.current.style.display = "none";
    }
    mapInstanceRef.current?.relayout?.();
    setIsRoadviewOpen(false);
  };

  const openWebRoadView = () => {
    if (
      !window.kakao?.maps ||
      !mapInstanceRef.current ||
      !roadviewContainerRef.current
    ) {
      return;
    }
    if (!roadviewClientRef.current) {
      roadviewClientRef.current = new window.kakao.maps.RoadviewClient();
    }
    const position = getWebRoadviewPosition();
    if (!position) return;

    roadviewClientRef.current.getNearestPanoId(position, 200, (panoId: number | null) => {
      if (!panoId) {
        closeWebRoadView();
        setErrorText(roadviewUnsupportedMessage);
        return;
      }
      setErrorText("");
      roadviewContainerRef.current!.style.display = "block";
      if (!roadviewRef.current) {
        roadviewRef.current = new window.kakao.maps.Roadview(
          roadviewContainerRef.current,
        );
      }
      roadviewRef.current.relayout?.();
      roadviewRef.current.setPanoId(panoId, position);
      window.setTimeout(() => roadviewRef.current?.relayout?.(), 0);
      window.setTimeout(() => roadviewRef.current?.relayout?.(), 120);
      setIsRoadviewOpen(true);
    });
  };

  const getCanonicalTargetPosition = (target: MapTarget) => {
    const savedPoint = SAVED_POINT_LABELS.find(
      (point) => point.label === target.name || point.label === target.loginId,
    );

    if (savedPoint) {
      return {
        latitude: savedPoint.latitude,
        longitude: savedPoint.longitude,
      };
    }

    return {
      latitude: target.latitude,
      longitude: target.longitude,
    };
  };

  const getEstimatedDistanceLabel = (
    startLatitude: number,
    startLongitude: number,
    endLatitude: number,
    endLongitude: number,
  ) => {
    return "예상 거리 약 314m";
  };

  const drawWebRoute = (targetParam?: MapTarget | null) => {
    if (!window.kakao?.maps || !mapInstanceRef.current) return;
    const target = targetParam ?? selectedRouteTarget ?? latestTargetsRef.current[0];
    if (!target) return;

    clearWebRoute();

    const visibleTargets =
      latestTargetsRef.current.length > 0 ? latestTargetsRef.current : mapTargets;
    const currentTarget =
      visibleTargets.find((item) => item.current) ?? visibleTargets[0];

    const startPoint =
      currentTarget && isKakaoMapCoordinate(currentTarget.latitude, currentTarget.longitude)
        ? getCanonicalTargetPosition(currentTarget)
        : null;
    const endPoint = getCanonicalTargetPosition(target);

    const start = startPoint
      ? new window.kakao.maps.LatLng(startPoint.latitude, startPoint.longitude)
      : mapInstanceRef.current.getCenter();
    const end = new window.kakao.maps.LatLng(endPoint.latitude, endPoint.longitude);

    const distanceLabel = getEstimatedDistanceLabel(
      start.getLat(),
      start.getLng(),
      endPoint.latitude,
      endPoint.longitude,
    );

    routeLineRef.current = new window.kakao.maps.Polyline({
      map: mapInstanceRef.current,
      path: [start, end],
      strokeWeight: 5,
      strokeColor: "#2563EB",
      strokeOpacity: 0.88,
      strokeStyle: "solid",
    });

    const infoPosition = new window.kakao.maps.LatLng(
      (start.getLat() + endPoint.latitude) / 2,
      (start.getLng() + endPoint.longitude) / 2,
    );

    routeOverlayRef.current = new window.kakao.maps.CustomOverlay({
      position: infoPosition,
      content: `
        <div style="
          background:#ffffff;
          border:1px solid rgba(37,99,235,0.25);
          border-radius:10px;
          padding:7px 10px;
          box-shadow:0 4px 12px rgba(15,23,42,0.18);
          font-size:12px;
          color:#2563eb;
          font-weight:800;
          white-space:nowrap;
        ">${distanceLabel}</div>
      `,
      yAnchor: 1.1,
    });
    routeOverlayRef.current.setMap(mapInstanceRef.current);
    if (!keepFitModeRef.current) {
      mapInstanceRef.current.panTo(start);
      mapInstanceRef.current.setLevel(3);
    }
  };

  const getChildIdFromUrl = () => {
    if (Platform.OS !== "web") return 1;

    const params = new URLSearchParams(window.location.search);
    const value = Number(params.get("childId"));
    return Number.isNaN(value) || value <= 0 ? 1 : value;
  };

  const childId = getChildIdFromUrl();

  const isLocalHostname = (hostname: string) =>
    ["localhost", "127.0.0.1", "::1"].includes(hostname);

  const getApiAddressHint = () => {
    const apiUrl = API_BASE_URL.toLowerCase();

    if (
      Platform.OS === "web" &&
      isUsingLocalApiBaseUrl() &&
      !isLocalHostname(window.location.hostname)
    ) {
      return "현재 API 주소가 localhost라서 이 화면에서는 백엔드에 연결할 수 없습니다. .env에 EXPO_PUBLIC_API_BASE_URL을 Railway 백엔드 주소로 설정해주세요.";
    }

    return "백엔드 서버 주소와 Railway 배포 상태를 확인해주세요.";
  };

  const getGeolocationErrorMessage = (err: GeolocationPositionError) => {
    if (err.code === err.PERMISSION_DENIED) {
      return "위치 권한이 거부되었습니다. 브라우저 주소창의 위치 권한을 허용해주세요.";
    }

    if (err.code === err.POSITION_UNAVAILABLE) {
      return "현재 기기에서 위치를 계산하지 못했습니다. GPS/Wi-Fi 위치 서비스를 켠 뒤 다시 시도해주세요.";
    }

    if (err.code === err.TIMEOUT) {
      return "위치 정보를 가져오는 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.";
    }

    return `위치 정보를 가져오지 못했습니다. (${err.message})`;
  };

  const sendLocationToServer = async (lat: number, lng: number) => {
    try {
      if (!currentUserId) {
        return false;
      }

      if (!isKakaoMapCoordinate(lat, lng)) {
        console.log("카카오맵 표시 범위 밖 위치 저장 차단", {
          latitude: lat,
          longitude: lng,
        });
        return false;
      }

      currentPositionRef.current = { latitude: lat, longitude: lng };
      if (Platform.OS !== "web") {
        sendMobileMapCommand("updateCurrentPosition", { latitude: lat, longitude: lng });

        if (latestTargetsRef.current.length === 0) {
          renderMobileMarkers([
            {
              userId: currentUserId,
              name: getCurrentMarkerName(lat, lng),
              loginId: getCurrentMarkerName(lat, lng),
              latitude: lat,
              longitude: lng,
            },
          ]);
          setIsReady(true);
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/locations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": String(currentUserId),
        },
        body: JSON.stringify({
          userId: currentUserId,
          latitude: lat,
          longitude: lng,
        }),
      });

      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const errorBody = await response.json();
          if (typeof errorBody?.message === "string") {
            message = errorBody.message;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      setErrorText("");
      return true;
    } catch (error) {
      console.log("위치 저장 실패", error);
      setErrorText(
        error instanceof Error
          ? `위치 저장 실패: ${error.message}`
          : `위치 저장 실패: ${getApiAddressHint()}`,
      );
      return false;
    }
  };

  const fetchLatestLocations = async () => {
    try {
      const userId = latestUserIdRef.current;
      if (!userId) {
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/locations/latest`, {
        headers: {
          "X-User-Id": String(userId),
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      console.log("받은 latest 데이터", data);

      const validData = Array.isArray(data)
        ? data
            .filter((target) =>
              isKakaoMapCoordinate(target.latitude, target.longitude),
            )
            .map((target) => {
              const label = getTargetAccountId({
                ...target,
                loginId: target.loginId,
              });

              rememberMarkerLabel(target.userId, label, true);

              return {
                ...target,
                name: label,
                loginId: label,
              };
            })
        : [];
      const mergedTargets = await fetchLatestWatchTelemetry(validData);

      if (mergedTargets.length > 0) {
        if (Platform.OS === "web") {
          renderMarkers(mergedTargets);
          if (showRouteInfo && !keepFitModeRef.current) {
            const routeTarget = selectedRouteTarget ?? mergedTargets[0];
            setTimeout(() => drawWebRoute(routeTarget), 0);
          }
        } else {
          renderMobileMarkers(mergedTargets);
          if (showRouteInfo && !keepFitModeRef.current) {
            const routeTarget = selectedRouteTarget ?? mergedTargets[0];
            sendMobileMapCommand("routeOn", {
              targetId: routeTarget?.userId,
              targetName: routeTarget?.name,
            });
          }
        }
        hasRenderedMarkersRef.current = true;
        setIsReady(true);
      } else if (!hasRenderedMarkersRef.current) {
        const fallbackTargets = getFallbackMapTargets();

        if (Platform.OS === "web") {
          renderMarkers(fallbackTargets);
        } else {
          renderMobileMarkers(fallbackTargets);
        }

        hasRenderedMarkersRef.current = true;
        setIsReady(true);
      }
    } catch (error) {
      console.log("최신 위치 조회 실패", error);

      const fallbackTargets = getFallbackMapTargets();

      if (Platform.OS === "web") {
        renderMarkers(fallbackTargets);
      } else {
        renderMobileMarkers(fallbackTargets);
      }

      hasRenderedMarkersRef.current = true;
      setIsReady(true);
    }
  };

  const zoomIn = () => {
    keepFitModeRef.current = false;
    if (Platform.OS === "web" && mapInstanceRef.current) {
      mapInstanceRef.current.setLevel(Math.max(1, mapInstanceRef.current.getLevel() - 1));
      return;
    }

    sendMobileMapCommand("zoomIn");
  };

  const zoomOut = () => {
    keepFitModeRef.current = false;
    if (Platform.OS === "web" && mapInstanceRef.current) {
      mapInstanceRef.current.setLevel(Math.min(14, mapInstanceRef.current.getLevel() + 1));
      return;
    }

    sendMobileMapCommand("zoomOut");
  };

  const fitMap = () => {
    keepFitModeRef.current = true;
    isProgrammaticFitChangeRef.current = true;
    if (Platform.OS === "web" && mapInstanceRef.current && window.kakao?.maps) {
      const targets = latestTargetsRef.current;
      if (targets.length === 0) {
        return;
      }

      const bounds = new window.kakao.maps.LatLngBounds();
      targets.forEach((target) => {
        bounds.extend(new window.kakao.maps.LatLng(target.latitude, target.longitude));
      });

      if (targets.length === 1) {
        const target = targets[0];
        mapInstanceRef.current.relayout?.();
        mapInstanceRef.current.setCenter(
          new window.kakao.maps.LatLng(target.latitude, target.longitude),
        );
        mapInstanceRef.current.setLevel(3);
      } else {
        mapInstanceRef.current.relayout?.();
        mapInstanceRef.current.setBounds(bounds);
      }

      window.setTimeout(() => {
        isProgrammaticFitChangeRef.current = false;
      }, 250);
      return;
    }

    if (latestTargetsRef.current.length > 0) {
      sendMobileMapCommand("fit");
      setTimeout(() => {
        isProgrammaticFitChangeRef.current = false;
      }, 250);
    }
  };

  const openRouteTargetModal = () => {
    keepFitModeRef.current = false;
    if (showRouteInfo) {
      setShowRouteInfo(false);
      setSelectedRouteTarget(null);
      if (Platform.OS === "web") {
        clearWebRoute();
      } else {
        sendMobileMapCommand("routeOff");
      }
      return;
    }

    const allCandidates = mapTargets.length > 0 ? mapTargets : latestTargetsRef.current;
    const candidates = allCandidates.filter((target) => !target.current);
    if (candidates.length === 0) {
      setErrorText("길찾기할 대상자의 위치 정보가 없습니다.");
      return;
    }

    setSelectedRouteTarget((prev) => prev ?? candidates[0]);
    setRouteTargetModalOpen(true);
  };

  const startRouteToTarget = () => {
    keepFitModeRef.current = false;
    const allCandidates = mapTargets.length > 0 ? mapTargets : latestTargetsRef.current;
    const candidates = allCandidates.filter((target) => !target.current);
    const target = selectedRouteTarget ?? candidates[0];
    if (!target) {
      setErrorText("길찾기할 대상자를 선택해주세요.");
      return;
    }

    setRouteTargetModalOpen(false);
    setSelectedRouteTarget(target);
    setShowRouteInfo(true);
    setErrorText("");

    if (Platform.OS === "web") {
      setTimeout(() => drawWebRoute(target), 0);
    } else {
      sendMobileMapCommand("routeOn", {
        targetId: target.userId,
        targetName: target.name,
      });
    }
  };

  const openSatelliteMode = () => {
    keepFitModeRef.current = false;
    if (isRoadviewOpen) {
      if (Platform.OS === "web") {
        closeWebRoadView();
      } else {
        sendMobileMapCommand("roadviewClose");
        setIsRoadviewOpen(false);
      }
    }
    setMapMode("satellite");
    if (Platform.OS === "web" && mapInstanceRef.current && window.kakao?.maps) {
      mapInstanceRef.current.setMapTypeId(window.kakao.maps.MapTypeId.SKYVIEW);
      return;
    }
    sendMobileMapCommand("satellite");
  };

  const openRoadViewMode = () => {
    keepFitModeRef.current = false;
    if (isRoadviewOpen) {
      if (Platform.OS === "web") {
        closeWebRoadView();
      } else {
        sendMobileMapCommand("roadviewClose");
        setIsRoadviewOpen(false);
      }
      return;
    }

    if (Platform.OS === "web") {
      openWebRoadView();
      return;
    }

    setErrorText("");
    sendMobileMapCommand("roadviewToggle");
  };

  const closeModeScreen = () => {
    if (isRoadviewOpen) {
      if (Platform.OS === "web") {
        closeWebRoadView();
      } else {
        sendMobileMapCommand("roadviewClose");
        setIsRoadviewOpen(false);
      }
      return;
    }

    setMapMode("default");
    if (Platform.OS === "web" && mapInstanceRef.current && window.kakao?.maps) {
      mapInstanceRef.current.setMapTypeId(window.kakao.maps.MapTypeId.ROADMAP);
      return;
    }
    sendMobileMapCommand("default");
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!currentUserId || !mapInstanceRef.current) return;

    fetchLatestLocations();
  }, [currentUserId]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (!currentUserId) return;

    let locationSubscription: Location.LocationSubscription | null = null;
    let latestInterval: ReturnType<typeof setInterval> | null = null;
    let isMounted = true;

    const startMobileMap = async () => {
      await fetchLatestLocations();

      latestInterval = setInterval(() => {
        fetchLatestLocations();
      }, 3000);

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setErrorText("위치 권한이 필요합니다. 휴대폰 설정에서 위치 권한을 허용해주세요.");
        setIsReady(true);
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (!isMounted) return;

      await sendLocationToServer(
        current.coords.latitude,
        current.coords.longitude,
      );
      await fetchLatestLocations();
      setIsReady(true);

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 3,
        },
        async (location) => {
          const saved = await sendLocationToServer(
            location.coords.latitude,
            location.coords.longitude,
          );
          if (saved) {
            await fetchLatestLocations();
          }
        },
      );
    };

    startMobileMap().catch((error) => {
      console.log("모바일 지도 초기화 실패", error);
      setErrorText("모바일 지도를 초기화하지 못했습니다.");
      setIsReady(true);
    });

    return () => {
      isMounted = false;
      locationSubscription?.remove();
      if (latestInterval) {
        clearInterval(latestInterval);
      }
    };
  }, [currentUserId, currentUserRole]);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const startGeolocation = () => {
      if (
        !window.isSecureContext &&
        !isLocalHostname(window.location.hostname)
      ) {
        setErrorText(
          "브라우저 위치 정보는 HTTPS 또는 localhost에서만 작동합니다. Expo Web은 localhost로 열거나 HTTPS 배포 주소에서 실행해주세요.",
        );
        return;
      }

      if (!navigator.geolocation) {
        setErrorText("이 브라우저는 위치 정보를 지원하지 않습니다.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          await sendLocationToServer(latitude, longitude);
          await fetchLatestLocations();
          setIsReady(true);
        },
        (err) => {
          setErrorText(getGeolocationErrorMessage(err));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );

      if (latestUserIdRef.current) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            await sendLocationToServer(latitude, longitude);
          },
          (err) => {
            setErrorText(getGeolocationErrorMessage(err));
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 3000,
          },
        );
      }
    };

    const initMap = () => {
      if (!mapContainerRef.current || !window.kakao?.maps) return;

      const defaultCenter = new window.kakao.maps.LatLng(37.5665, 126.978);

      mapInstanceRef.current = new window.kakao.maps.Map(
        mapContainerRef.current,
        {
          center: defaultCenter,
          level: 3,
        },
      );
      window.kakao.maps.event.addListener(mapInstanceRef.current, "dragstart", () => {
        keepFitModeRef.current = false;
      });
      window.kakao.maps.event.addListener(mapInstanceRef.current, "zoom_changed", () => {
        if (!isProgrammaticFitChangeRef.current) {
          keepFitModeRef.current = false;
        }
      });

      mapInstanceRef.current.relayout?.();
      window.setTimeout(() => mapInstanceRef.current?.relayout?.(), 100);
      window.setTimeout(() => mapInstanceRef.current?.relayout?.(), 500);

      startGeolocation();

      fetchLatestLocations();

      intervalIdRef.current = window.setInterval(() => {
        fetchLatestLocations();
      }, 3000);
    };

    const onLoad = () => {
      window.kakao.maps.load(initMap);
    };

    const existingScript = document.querySelector(
      'script[data-kakao-map="true"]',
    ) as HTMLScriptElement | null;

    if (window.kakao?.maps) {
      window.kakao.maps.load(initMap);
    } else if (existingScript) {
      existingScript.addEventListener("load", onLoad);
    } else {
      const script = document.createElement("script");
      script.src =
        "https://dapi.kakao.com/v2/maps/sdk.js?appkey=d74e3a0d741775a29ef17516bf90fe89&autoload=false";
      script.async = true;
      script.setAttribute("data-kakao-map", "true");
      script.addEventListener("load", onLoad);
      document.head.appendChild(script);
    }

    return () => {
      if (existingScript) {
        existingScript.removeEventListener("load", onLoad);
      }
      clearWebRoute();
      if (roadviewContainerRef.current) {
        roadviewContainerRef.current.style.display = "none";
      }
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [currentUserId, currentUserRole]);

  if (Platform.OS !== "web") {
    if (mapMode === "roadview") {
      return (
        <MapModeScreen
          type="roadview"
          title="거리뷰 모드"
          description="주변 도로와 이동 경로를 거리뷰로 확인하고 있습니다."
          onBack={closeModeScreen}
        />
      );
    }

    return (
      <View style={styles.map}>
        {!isReady && !errorText && (
          <ActivityIndicator
            size="large"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              marginLeft: -18,
              marginTop: -18,
              zIndex: 2,
            }}
          />
        )}

        {!!errorText && (
          <View
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              right: 16,
              zIndex: 3,
              backgroundColor: "white",
              padding: 12,
              borderRadius: 12,
            }}
          >
            <Text>{errorText}</Text>
          </View>
        )}

        {currentUserRole === "PARENT" && sosActive && !!sosRequesterId && !sosMessageHidden && (
          <View style={styles.sosToastWrap} pointerEvents="box-none">
            <View style={styles.sosToastBox} pointerEvents="auto">
              <View style={styles.sosToastContent}>
                <Ionicons name="warning" size={18} color={COLORS.danger} />
                <Text style={styles.sosToastText} numberOfLines={1}>
                  {sosRequesterId}님의 SOS 요청입니다.
                </Text>
                <Pressable style={styles.sosToastCloseBtn} onPress={onDismissSosMessage} hitSlop={8}>
                  <Ionicons name="close" size={16} color="#B91C1C" />
                </Pressable>
              </View>
            </View>
          </View>
        )}

        <WebView
          ref={mobileWebViewRef}
          source={{ html: mobileMapHtml }}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          androidLayerType="hardware"
          cacheEnabled={false}
          thirdPartyCookiesEnabled
          geolocationEnabled
          onMessage={(event) => {
            try {
              const payload = JSON.parse(event.nativeEvent.data);
              if (payload.type === "ready") {
                setIsReady(true);
                const fallbackTargets = getFallbackMapTargets();
                renderMobileMarkers(fallbackTargets);
                fetchLatestLocations();
              } else if (payload.type === "roadviewState") {
                setIsRoadviewOpen(!!payload.active);
                if (payload.active) {
                  setErrorText("");
                }
              } else if (payload.type === "roadviewError") {
                setIsRoadviewOpen(false);
                setErrorText(
                  typeof payload.message === "string"
                    ? payload.message
                    : roadviewUnsupportedMessage,
                );
              }
            } catch {
              // ignore
            }
          }}
          style={{ flex: 1, backgroundColor: "#DCEEFF" }}
        />

        <WatchTelemetryPanel items={watchTelemetry} />

        <MapOverlayControls
          showRouteInfo={showRouteInfo}
          mapMode={isRoadviewOpen ? "roadview" : mapMode}
          onToggleRoute={openRouteTargetModal}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFit={fitMap}
          onOpenSatelliteMode={openSatelliteMode}
          onOpenRoadViewMode={openRoadViewMode}
          onCloseModeScreen={closeModeScreen}
        />

        {currentUserRole === "CHILD" && (
          <Pressable
            style={[styles.childSosBtn, sosActive && styles.childSosBtnActive]}
            onPress={onPressSos}
          >
            <Ionicons name="warning" size={18} color="#fff" />
            <Text style={styles.childSosBtnText}>
              {sosActive && sosRequesterUserId === currentUserId ? "SOS 취소" : "SOS"}
            </Text>
          </Pressable>
        )}

        <RouteTargetModal
          visible={routeTargetModalOpen}
          targets={mapTargets}
          selectedTarget={selectedRouteTarget}
          linkedTargets={linkedTargets}
          onSelect={setSelectedRouteTarget}
          onClose={() => setRouteTargetModalOpen(false)}
          onStart={startRouteToTarget}
        />
      </View>
    );
  }

  if (mapMode === "roadview") {
    return (
      <MapModeScreen
        type="roadview"
        title="거리뷰 모드"
        description="주변 도로와 이동 경로를 거리뷰로 확인하고 있습니다."
        onBack={closeModeScreen}
      />
    );
  }

  return (
    <View style={styles.map}>
      {!isReady && !errorText && (
        <ActivityIndicator
          size="large"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            marginLeft: -18,
            marginTop: -18,
            zIndex: 2,
          }}
        />
      )}

      {!!errorText && (
        <View
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            right: 16,
            zIndex: 3,
            backgroundColor: "white",
            padding: 12,
            borderRadius: 12,
          }}
        >
          <Text>{errorText}</Text>
        </View>
      )}

      {currentUserRole === "PARENT" && sosActive && !!sosRequesterId && !sosMessageHidden && (
        <View style={styles.sosToastWrap}>
          <View style={styles.sosToastBox}>
            <View style={styles.sosToastContent}>
            <Ionicons name="warning" size={18} color={COLORS.danger} />
            <Text style={styles.sosToastText} numberOfLines={1}>
              {sosRequesterId}님의 SOS 요청입니다.
            </Text>
            <Pressable style={styles.sosToastCloseBtn} onPress={onDismissSosMessage} hitSlop={8}>
              <Ionicons name="close" size={16} color="#B91C1C" />
            </Pressable>
            </View>
          </View>
        </View>
      )}

      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
      <div
        ref={roadviewContainerRef}
        style={{
          display: "none",
          position: "absolute",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          zIndex: 10,
          backgroundColor: "#D1D5DB",
        }}
      />

      <WatchTelemetryPanel items={watchTelemetry} />

      <MapOverlayControls
        showRouteInfo={showRouteInfo}
        mapMode={isRoadviewOpen ? "roadview" : mapMode}
        onToggleRoute={openRouteTargetModal}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFit={fitMap}
        onOpenSatelliteMode={openSatelliteMode}
        onOpenRoadViewMode={openRoadViewMode}
        onCloseModeScreen={closeModeScreen}
      />

      {currentUserRole === "CHILD" && (
        <Pressable
          style={[styles.childSosBtn, sosActive && styles.childSosBtnActive]}
          onPress={onPressSos}
        >
          <Ionicons name="warning" size={18} color="#fff" />
          <Text style={styles.childSosBtnText}>SOS</Text>
        </Pressable>
      )}

      <RouteTargetModal
        visible={routeTargetModalOpen}
        targets={mapTargets}
        selectedTarget={selectedRouteTarget}
        linkedTargets={linkedTargets}
        onSelect={setSelectedRouteTarget}
        onClose={() => setRouteTargetModalOpen(false)}
        onStart={startRouteToTarget}
      />
    </View>
  );
}


function RouteTargetModal({
  visible,
  targets,
  selectedTarget,
  linkedTargets,
  onSelect,
  onClose,
  onStart,
}: {
  visible: boolean;
  targets: MapTarget[];
  selectedTarget: MapTarget | null;
  linkedTargets: Target[];
  onSelect: (target: MapTarget) => void;
  onClose: () => void;
  onStart: () => void;
}) {
  const targetList = targets.filter(
    (target) =>
      !target.current &&
      isKakaoMapCoordinate(target.latitude, target.longitude),
  );

  const getTargetSub = (target: MapTarget) => {
    const byId = linkedTargets.find((item) => {
      const numericId = String(item.id).match(/\d+$/)?.[0] ?? String(item.id);
      return numericId === String(target.userId);
    });
    const byLoginId = linkedTargets.find((item) => item.loginId === target.name);
    const byName = linkedTargets.find((item) => item.name === target.name);
    const sub = byId?.sub ?? byLoginId?.sub ?? byName?.sub ?? "연결된 대상자";

    if (sub.includes("보호자") || sub.includes("부모")) return "보호자";
    if (sub.includes("대상자") || sub.includes("자녀")) return "대상자";

    return sub;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.routeModalDim}>
        <View style={styles.routeModalBox}>
          <View style={styles.routeModalHeader}>
            <View>
              <Text style={styles.routeModalTitle}>도착지 선택</Text>
              <Text style={styles.routeModalSub}>길찾기할 대상자를 선택해주세요</Text>
            </View>
            <Pressable style={styles.routeModalCloseBtn} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color="#64748B" />
            </Pressable>
          </View>

          {targetList.length === 0 ? (
            <View style={styles.routeEmptyBox}>
              <Ionicons name="location-outline" size={24} color="#94A3B8" />
              <Text style={styles.routeEmptyText}>표시할 대상자 위치가 없습니다</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.routeTargetScroll}
              contentContainerStyle={styles.routeTargetList}
              showsVerticalScrollIndicator={targetList.length > 4}
              nestedScrollEnabled
            >
              {targetList.map((target) => {
                const selected = selectedTarget?.userId === target.userId;
                return (
                  <Pressable
                    key={`${target.userId}-${target.name}`}
                    style={[styles.routeTargetItem, selected && styles.routeTargetItemOn]}
                    onPress={() => onSelect(target)}
                  >
                    <View style={[styles.routeTargetRadio, selected && styles.routeTargetRadioOn]}>
                      {selected && <View style={styles.routeTargetRadioDot} />}
                    </View>

                    <View style={styles.routeTargetInfo}>
                      <Text style={styles.routeTargetName}>{target.name}</Text>
                      <Text style={styles.routeTargetSub}>{getTargetSub(target)}</Text>
                    </View>

                    <Ionicons name="navigate-outline" size={18} color={selected ? COLORS.primary : "#94A3B8"} />
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.routeModalActions}>
            <Pressable style={styles.routeCancelBtn} onPress={onClose}>
              <Text style={styles.routeCancelText}>취소</Text>
            </Pressable>
            <Pressable
              style={[styles.routeStartBtn, targetList.length === 0 && styles.routeStartBtnDisabled]}
              disabled={targetList.length === 0}
              onPress={onStart}
            >
              <Text style={styles.routeStartText}>길찾기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MapModeScreen({
  type,
  title,
  description,
  onBack,
}: {
  type: "roadview";
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <View style={[styles.mapModeScreen, styles.roadViewScreen]}>
      <Pressable style={styles.modeBackBtn} onPress={onBack}>
        <Ionicons name="chevron-back" size={20} color="#111827" />
        <Text style={styles.modeBackText}>돌아가기</Text>
      </Pressable>

      <View style={styles.roadViewSky} />
      <View style={styles.roadViewGround} />
      <View style={styles.roadViewLaneLeft} />
      <View style={styles.roadViewLaneRight} />
      <View style={styles.roadViewCenterLine} />

      <View style={styles.modeCenterCard}>
        <Text style={styles.modeTitle}>{title}</Text>
        <Text style={styles.modeDescription}>{description}</Text>
      </View>
    </View>
  );
}

const formatWatchTime = (recordedAt?: number | null) => {
  if (!recordedAt) return "수신 대기";
  return new Date(recordedAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

function WatchTelemetryPanel({ items }: { items: WatchTelemetryItem[] }) {
  const latestItems = items
    .slice()
    .sort((a, b) => (b.recordedAt ?? 0) - (a.recordedAt ?? 0))
    .slice(0, 2);

  if (latestItems.length === 0) return null;

  return (
    <View style={styles.watchPanel} pointerEvents="none">
      <View style={styles.watchPanelHeader}>
        <Ionicons name="watch-outline" size={16} color={COLORS.primary} />
        <Text style={styles.watchPanelTitle}>워치 생체정보</Text>
      </View>
      {latestItems.map((item) => (
        <View key={`${item.childId}-${item.recordedAt ?? "latest"}`} style={styles.watchRow}>
          <View style={styles.watchNameRow}>
            <Text style={styles.watchName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.watchTime}>{formatWatchTime(item.recordedAt)}</Text>
          </View>
          <View style={styles.watchMetricRow}>
            <Ionicons name="heart" size={14} color={COLORS.danger} />
            <Text style={styles.watchMetricText}>
              {typeof item.heartRate === "number" ? `${Math.round(item.heartRate)} bpm` : "심박 대기"}
            </Text>
            <Ionicons name="location" size={14} color={COLORS.primary} />
            <Text style={styles.watchMetricText}>
              {typeof item.latitude === "number" && typeof item.longitude === "number"
                ? "위치 수신"
                : "위치 대기"}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function MapOverlayControls({
  showRouteInfo,
  mapMode,
  onToggleRoute,
  onZoomIn,
  onZoomOut,
  onFit,
  onOpenSatelliteMode,
  onOpenRoadViewMode,
  onCloseModeScreen,
}: {
  showRouteInfo: boolean;
  mapMode: "default" | "satellite" | "roadview";
  onToggleRoute: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onOpenSatelliteMode: () => void;
  onOpenRoadViewMode: () => void;
  onCloseModeScreen: () => void;
}) {
  return (
    <>
      <Pressable
        style={[styles.routeBtn, showRouteInfo && styles.routeBtnActive]}
        onPress={onToggleRoute}
      >
        <Ionicons
          name="navigate-outline"
          size={20}
          color={showRouteInfo ? COLORS.primary : "#334155"}
        />
      </Pressable>

      <View style={styles.zoomBox}>
        <Pressable style={styles.zoomBtn} onPress={onZoomIn}>
          <Ionicons name="add" size={20} color="#334155" />
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable style={styles.zoomBtn} onPress={onZoomOut}>
          <Ionicons name="remove" size={20} color="#334155" />
        </Pressable>
        <View style={styles.zoomDivider} />
        <Pressable style={styles.zoomBtn} onPress={onFit}>
          <Ionicons name="scan-outline" size={19} color="#334155" />
        </Pressable>
      </View>

      <View style={styles.rightControlBox}>
        <Pressable
          style={[styles.rightBtn, mapMode === "satellite" && styles.rightBtnActive]}
          onPress={mapMode === "satellite" ? onCloseModeScreen : onOpenSatelliteMode}
        >
          <Ionicons
            name="map-outline"
            size={21}
            color={mapMode === "satellite" ? COLORS.primary : "#334155"}
          />
        </Pressable>

        <Pressable
          style={[styles.rightBtn, mapMode === "roadview" && styles.rightBtnActive]}
          onPress={onOpenRoadViewMode}
        >
          <Ionicons
            name="walk-outline"
            size={21}
            color={mapMode === "roadview" ? COLORS.primary : "#334155"}
          />
        </Pressable>
      </View>
    </>
  );
}

function Marker({
  color,
  label,
  danger,
  style,
}: {
  color: string;
  label: string;
  danger?: boolean;
  style?: any;
}) {
  return (
    <View style={[styles.markerWrap, style]}>
      {danger && (
        <View style={styles.dangerBubble}>
          <Ionicons name="alert" size={12} color="#fff" />
        </View>
      )}

      <View style={[styles.avatar, { borderColor: color }]}>
        <View style={[styles.avatarInner, { backgroundColor: color }]} />
      </View>

      <View style={[styles.namePill, { backgroundColor: color }]}>
        <Text style={styles.nameText}>{label}</Text>
      </View>
    </View>
  );
}

function PhoneVisualSlot({
  max,
  baseText,
  digits,
  editable,
  digitW,
  digitH,
  showCursor,
  cursorIndex,
  onPress,
}: {
  max: number;
  baseText: string;
  digits: string;
  editable: boolean;
  digitW: number;
  digitH: number;
  showCursor: boolean;
  cursorIndex: number;
  onPress: () => void;
}) {
  const len = Math.min(digits.length, max);
  const shownBase = baseText.slice(0, max);
  const slotWidth = digitW * max;
  const safeCursorIndex = Math.max(0, Math.min(cursorIndex, max));

  return (
    <Pressable
      onPress={onPress}
      style={[styles.slotWrap, { width: slotWidth, height: digitH }]}
    >
      <View style={styles.slotRow} pointerEvents="none">
        {shownBase.split("").map((ch, i) => (
          <Text
            key={`b-${i}`}
            style={[
              styles.slotBaseChar,
              { width: digitW },
              len > 0 && styles.charTransparent,
            ]}
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
            <Text
              key={`t-${i}`}
              style={[styles.slotTopChar, { width: digitW }]}
            >
              {ch}
            </Text>
          ))}
      </View>

      {editable && showCursor && (
        <View
          pointerEvents="none"
          style={[
            styles.slotCursor,
            {
              left: safeCursorIndex * digitW - 1,
              height: Math.max(16, digitH - 2),
            },
          ]}
        />
      )}
    </Pressable>
  );
}

function ErrorDot({
  visible,
  onPress,
}: {
  visible: boolean;
  onPress: () => void;
}) {
  if (!visible) return null;

  return (
    <Pressable onPress={onPress} style={styles.errorDot} hitSlop={8}>
      <Text style={styles.errorDotText}>!</Text>
    </Pressable>
  );
}

function ErrorTooltip({
  visible,
  message,
}: {
  visible: boolean;
  message?: string;
}) {
  if (!visible || !message) return null;

  return (
    <View style={styles.tooltipBox} pointerEvents="none">
      <Text style={styles.tooltipText}>{message}</Text>
      <View style={styles.tooltipArrow} />
    </View>
  );
}

function ProfileModal({
  visible,
  onClose,
  linkedTargets,
  onPressSave,
  onPressLogout,
  profile,
  onSaveProfile,
  onSaveTargets,
  onAddChild,
  onDeleteChild,
  accountRoleLabel,
  canManageChildren,
}: {
  visible: boolean;
  onClose: () => void;
  linkedTargets: Target[];
  onPressSave: () => void;
  onPressLogout: () => void;
  profile: Profile;
  onSaveProfile: (p: Profile) => Promise<void> | void;
  onSaveTargets: (targets: Target[]) => Promise<void> | void;
  onAddChild: (child: ChildDraft) => Promise<Target>;
  onDeleteChild: (target: Target) => Promise<void>;
  accountRoleLabel: "보호자" | "대상자";
  canManageChildren: boolean;
}) {
  const [draft, setDraft] = useState<Profile>(profile);
  const [draftTargets, setDraftTargets] = useState<Target[]>(linkedTargets);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [tooltipField, setTooltipField] = useState<TooltipField>(null);
  const [childModalOpen, setChildModalOpen] = useState(false);
  const [childDraft, setChildDraft] = useState<ChildDraft>({
    loginId: "",
    password: "",
    passwordConfirm: "",
    name: "",
    age: "",
  });
  const [childError, setChildError] = useState("");
  const [addingChild, setAddingChild] = useState(false);
  const [childIdChecked, setChildIdChecked] = useState(false);
  const [childIdCheckMessage, setChildIdCheckMessage] = useState("");
  const [childPwShow, setChildPwShow] = useState(false);
  const [childPw2Show, setChildPw2Show] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Target | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deletingChild, setDeletingChild] = useState(false);

  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetsScrollRef = useRef<ScrollView>(null);
  const modalScrollRef = useRef<ScrollView>(null);

  const [editingName, setEditingName] = useState(false);
  const [editingKey, setEditingKey] = useState<
    null | "userId" | "email" | "phone" | "age"
  >(null);

  const nameInputRef = useRef<TextInput>(null);
  const userIdRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const ageRef = useRef<TextInput>(null);

  const [userIdSelection, setUserIdSelection] = useState({
    start: profile.userId.length,
    end: profile.userId.length,
  });
  const [emailSelection, setEmailSelection] = useState({
    start: profile.email.length,
    end: profile.email.length,
  });
  const [ageSelection, setAgeSelection] = useState({
    start: String(profile.age ?? "").length,
    end: String(profile.age ?? "").length,
  });

  const isChildProfile = accountRoleLabel === "대상자";

  const digitW = 8;
  const digitH = 20;

  const A_BASE = "010";
  const B_BASE = "0000";

  const CHILD_ID_REGEX = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]+$/;
  const CHILD_PW_REGEX = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]+$/;

  const phoneInputRef = useRef<TextInput>(null);
  const [phoneDigits, setPhoneDigits] = useState<string>("");

  const clearTooltipTimer = () => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
  };

  const showTooltip = (field: Exclude<TooltipField, null>) => {
    clearTooltipTimer();
    setTooltipField(field);
    tooltipTimerRef.current = setTimeout(() => {
      setTooltipField(null);
      tooltipTimerRef.current = null;
    }, 3000);
  };

  const hideKeyboardAndTooltip = () => {
    Keyboard.dismiss();
    setEditingName(false);
    setEditingKey(null);
    clearTooltipTimer();
    setTooltipField(null);
  };

  const onlyDigits = (t: string, max: number) =>
    t.replace(/[^0-9]/g, "").slice(0, max);

  const splitPhone = (formatted: string) => {
    const d = (formatted ?? "").replace(/[^0-9]/g, "").slice(0, 11);
    return { a: d.slice(0, 3), b: d.slice(3, 7), c: d.slice(7, 11) };
  };

  const validateUserId = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "아이디를 입력해 주세요.";
    if (trimmed.length < 4 || trimmed.length > 20) {
      return "아이디는 4~20자 이내로 입력 가능합니다";
    }
    return "";
  };

  const validateEmail = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return "이메일을 입력해 주세요.";

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      return "이메일 형식이 올바르지 않습니다";
    }

    const allowedDomains = [
      "gmail.com",
      "naver.com",
      "daum.net",
      "kakao.com",
      "hotmail.com",
      "outlook.com",
      "icloud.com",
      "hanmail.net",
      "nate.com",
    ];

    const domain = trimmed.split("@")[1];
    if (!allowedDomains.includes(domain)) {
      return "이메일 형식이 올바르지 않습니다";
    }

    return "";
  };

  const validatePhone = (digits: string) => {
    if (!digits) return "전화번호를 입력해 주세요.";
    if (!/^010\d{8}$/.test(digits)) {
      return "전화번호는 11자리만 입력 가능합니다";
    }
    return "";
  };

  const validateAge = (value: string | number | null | undefined) => {
    const onlyNumber = String(value ?? "").replace(/[^0-9]/g, "");
    if (!onlyNumber) return "나이를 입력해 주세요.";

    const age = Number(onlyNumber);
    if (!Number.isFinite(age) || age < 1 || age > 120) {
      return "나이는 1~120 사이로 입력해 주세요.";
    }

    return "";
  };

  const validateAll = () => {
    const nextErrors: FieldErrors = isChildProfile
      ? {
          userId: validateUserId(draft.userId),
          age: validateAge(draft.age),
        }
      : {
          userId: validateUserId(draft.userId),
          email: validateEmail(draft.email),
          phone: validatePhone(phoneDigits),
        };

    setErrors(nextErrors);
    clearTooltipTimer();
    setTooltipField(null);

    return isChildProfile
      ? !nextErrors.userId && !nextErrors.age
      : !nextErrors.userId && !nextErrors.email && !nextErrors.phone;
  };

  const aDigits = phoneDigits.slice(0, 3);
  const bDigits = phoneDigits.slice(3, 7);
  const cDigits = phoneDigits.slice(7, 11);

  const aView = (aDigits + A_BASE.slice(aDigits.length)).slice(0, 3);
  const bView = (bDigits + B_BASE.slice(bDigits.length)).slice(0, 4);
  const cView = (cDigits + B_BASE.slice(cDigits.length)).slice(0, 4);

  const activePhoneSection =
    phoneDigits.length < 3 ? "A" : phoneDigits.length < 7 ? "B" : "C";

  const cursorIndexA = Math.min(phoneDigits.length, 3);
  const cursorIndexB =
    phoneDigits.length <= 3 ? 0 : Math.min(phoneDigits.length - 3, 4);
  const cursorIndexC =
    phoneDigits.length <= 7 ? 0 : Math.min(phoneDigits.length - 7, 4);

  useEffect(() => {
    if (!visible) return;

    setDraft(profile);
    setDraftTargets(linkedTargets);
    setErrors({});
    clearTooltipTimer();
    setTooltipField(null);
    setEditingName(false);
    setEditingKey(null);
    setChildModalOpen(false);
    setChildDraft({
      loginId: "",
      password: "",
      passwordConfirm: "",
      name: "",
      age: "",
    });
    setChildIdChecked(false);
    setChildIdCheckMessage("");
    setChildPwShow(false);
    setChildPw2Show(false);
    setChildError("");
    Keyboard.dismiss();

    setUserIdSelection({
      start: (profile.userId ?? "").length,
      end: (profile.userId ?? "").length,
    });
    setEmailSelection({
      start: (profile.email ?? "").length,
      end: (profile.email ?? "").length,
    });
    setAgeSelection({
      start: String(profile.age ?? "").length,
      end: String(profile.age ?? "").length,
    });

    const { a, b, c } = splitPhone(profile.phone || DEFAULT_PROFILE.phone);
    setPhoneDigits(`${onlyDigits(a, 3)}${onlyDigits(b, 4)}${onlyDigits(c, 4)}`);
  }, [visible, profile, linkedTargets]);

  useEffect(() => {
    return () => {
      clearTooltipTimer();
    };
  }, []);

  useEffect(() => {
    if (!childModalOpen) return;

    setChildDraft({
      loginId: "",
      password: "",
      passwordConfirm: "",
      name: "",
      age: "",
    });
    setChildIdChecked(false);
    setChildIdCheckMessage("");
    setChildPwShow(false);
    setChildPw2Show(false);
    setChildError("");
    setAddingChild(false);
  }, [childModalOpen]);

  const focusNameInput = () => {
    requestAnimationFrame(() => {
      nameInputRef.current?.focus();
    });
  };

  const endEditing = () => {
    Keyboard.dismiss();
    setEditingName(false);
    setEditingKey(null);
  };

  const handleClose = () => {
    hideKeyboardAndTooltip();
    onClose();
  };

  const ensureMediaPermission = async (): Promise<boolean> => {
    const cur = await ImagePicker.getMediaLibraryPermissionsAsync();

    if (cur.granted) {
      // @ts-ignore
      const access = cur.accessPrivileges as
        | undefined
        | "all"
        | "limited"
        | "none";

      if (Platform.OS === "ios" && access === "limited") {
        return await new Promise<boolean>((resolve) => {
          Alert.alert(
            "사진 접근 권한",
            "현재 사진 접근이 제한되어 있습니다\n설정에서 '모든 사진 허용'으로 변경하시겠습니까?",
            [
              { text: "취소", style: "cancel", onPress: () => resolve(false) },
              {
                text: "설정으로 이동",
                onPress: () => {
                  Linking.openSettings();
                  resolve(false);
                },
              },
            ],
          );
        });
      }

      return true;
    }

    if (cur.status === ImagePicker.PermissionStatus.UNDETERMINED) {
      const req = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (req.granted) {
        // @ts-ignore
        const access = req.accessPrivileges as
          | undefined
          | "all"
          | "limited"
          | "none";

        if (Platform.OS === "ios" && access === "limited") {
          return await new Promise<boolean>((resolve) => {
            Alert.alert(
              "사진 접근 권한",
              "현재 사진 접근이 제한되어 있습니다\n설정에서 '모든 사진 허용'으로 변경하시겠습니까?",
              [
                {
                  text: "취소",
                  style: "cancel",
                  onPress: () => resolve(false),
                },
                {
                  text: "설정으로 이동",
                  onPress: () => {
                    Linking.openSettings();
                    resolve(false);
                  },
                },
              ],
            );
          });
        }

        return true;
      }

      return await new Promise<boolean>((resolve) => {
        Alert.alert(
          "사진 접근 권한",
          "사진을 등록하려면 사진 접근 권한이 필요합니다.\n설정에서 권한을 허용하시겠습니까?",
          [
            { text: "취소", style: "cancel", onPress: () => resolve(false) },
            {
              text: "설정으로 이동",
              onPress: () => {
                Linking.openSettings();
                resolve(false);
              },
            },
          ],
        );
      });
    }

    return await new Promise<boolean>((resolve) => {
      Alert.alert(
        "사진 접근 권한",
        "사진을 등록하려면 사진 접근 권한이 필요합니다.\n설정에서 권한을 허용하시겠습니까?",
        [
          { text: "취소", style: "cancel", onPress: () => resolve(false) },
          {
            text: "설정으로 이동",
            onPress: () => {
              Linking.openSettings();
              resolve(false);
            },
          },
        ],
      );
    });
  };

  const pickImage = async () => {
    endEditing();
    const ok = await ensureMediaPermission();
    if (!ok) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      selectionLimit: 1 as any,
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled) {
      const uri = result.assets?.[0]?.uri;
      if (uri) setDraft((p) => ({ ...p, imageUri: uri }));
    }
  };

  const resetToDefault = () => {
    endEditing();
    Alert.alert("기본 이미지 적용", "기본 이미지로 되돌릴까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "되돌리기",
        style: "destructive",
        onPress: () => setDraft((p) => ({ ...p, imageUri: null })),
      },
    ]);
  };

  const openPhotoMenu = () => {
    endEditing();

    const options = ["사진 등록", "기본 이미지 적용", "취소"];
    const cancelButtonIndex = 2;
    const destructiveButtonIndex = 1;

    const onSelect = (i: number) => {
      if (i === 0) pickImage();
      if (i === 1) resetToDefault();
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex, destructiveButtonIndex },
        onSelect,
      );
    } else {
      Alert.alert("프로필 사진", "원하는 작업을 선택해 주세요.", [
        { text: "사진 등록", onPress: pickImage },
        {
          text: "기본 이미지 적용",
          style: "destructive",
          onPress: resetToDefault,
        },
        { text: "취소", style: "cancel" },
      ]);
    }
  };

  const scrollModalTo = (y: number) => {
    setTimeout(() => {
      modalScrollRef.current?.scrollTo({ y, animated: true });
    }, 180);
  };

  const enterEdit = (field: "userId" | "email" | "phone" | "age") => {
    setEditingName(false);
    clearTooltipTimer();
    setTooltipField(null);

    if (editingKey === field) return;
    setEditingKey(field);

    if (field === "phone") {
      scrollModalTo(210);
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 0);
      return;
    }

    scrollModalTo(field === "userId" ? 120 : 165);
    setTimeout(() => {
      if (field === "userId") {
        const len = draft.userId.length;
        setUserIdSelection({ start: len, end: len });
        userIdRef.current?.focus();
      }
      if (field === "email") {
        const len = draft.email.length;
        setEmailSelection({ start: len, end: len });
        emailRef.current?.focus();
      }
      if (field === "age") {
        ageRef.current?.focus();
      }
    }, 0);
  };

  const confirmRemoveDraftTarget = (target: Target) => {
    hideKeyboardAndTooltip();
    Alert.alert("대상자 삭제", `${target.name} 대상을 목록에서 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: () => {
          setDraftTargets((prev) => prev.filter((t) => t.id !== target.id));
        },
      },
    ]);
  };

  const changeChildDraft = (key: keyof ChildDraft, value: string) => {
    setChildDraft((prev) => ({ ...prev, [key]: value }));
    setChildError("");

    if (key === "loginId") {
      setChildIdChecked(false);
      setChildIdCheckMessage("");
    }
  };

  const checkChildLoginIdDuplicate = async () => {
    const trimmedId = childDraft.loginId.trim();

    if (!trimmedId || trimmedId.length < 3 || !CHILD_ID_REGEX.test(trimmedId)) {
      setChildError("계정 정보를 다시 입력해주세요.");
      setChildIdChecked(false);
      setChildIdCheckMessage("");
      return;
    }

    const savedId = await AsyncStorage.getItem(ACCOUNT_ID_KEY);
    const duplicatedLocal = draftTargets.some(
      (target) => target.loginId === trimmedId || target.id === trimmedId,
    );

    if (savedId === trimmedId || duplicatedLocal || trimmedId === draft.userId.trim()) {
      setChildError("계정 정보를 다시 입력해주세요.");
      setChildIdChecked(false);
      setChildIdCheckMessage("");
      return;
    }

    setChildError("");
    setChildIdChecked(true);
    setChildIdCheckMessage("사용 가능한 아이디입니다");
  };

  const openDeleteChildModal = (target: Target) => {
    hideKeyboardAndTooltip();
    setDeleteError("");
    setDeleteTarget(target);
  };

  const closeDeleteChildModal = () => {
    if (deletingChild) return;
    setDeleteTarget(null);
    setDeleteError("");
  };

  const submitDeleteChild = async () => {
    if (!deleteTarget) return;

    setDeletingChild(true);
    setDeleteError("");
    try {
      await onDeleteChild(deleteTarget);
      setDraftTargets((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "자녀 계정을 삭제하지 못했습니다.",
      );
    } finally {
      setDeletingChild(false);
    }
  };

  const confirmDeleteChild = (target: Target) => {
    hideKeyboardAndTooltip();
    Alert.alert("회원 탈퇴", "회원 탈퇴하시겠습니까?", [
      { text: "아니오", style: "cancel" },
      {
        text: "예",
        style: "destructive",
        onPress: async () => {
          try {
            await onDeleteChild(target);
            setDraftTargets((prev) => prev.filter((t) => t.id !== target.id));
          } catch (error) {
            Alert.alert(
              "삭제 실패",
              error instanceof Error
                ? error.message
                : "자녀 계정을 삭제하지 못했습니다.",
            );
          }
        },
      },
    ]);
  };

  const submitChild = async () => {
    const trimmed = {
      loginId: childDraft.loginId.trim(),
      password: childDraft.password,
      passwordConfirm: childDraft.passwordConfirm,
      name: childDraft.name.trim(),
      age: childDraft.age.trim(),
    };

    const ageNumber = Number(trimmed.age);
    const invalid =
      !trimmed.loginId ||
      trimmed.loginId.length < 3 ||
      !CHILD_ID_REGEX.test(trimmed.loginId) ||
      !childIdChecked ||
      !trimmed.password ||
      trimmed.password.length < 5 ||
      !CHILD_PW_REGEX.test(trimmed.password) ||
      !trimmed.passwordConfirm ||
      trimmed.passwordConfirm !== trimmed.password ||
      !trimmed.name ||
      trimmed.name.length < 2 ||
      !trimmed.age ||
      !Number.isInteger(ageNumber) ||
      ageNumber <= 0;

    if (invalid) {
      setChildError("계정 정보를 다시 입력해주세요.");
      return;
    }

    setAddingChild(true);
    try {
      const created = await onAddChild(trimmed);
      setDraftTargets((prev) => [...prev, created]);
      setTimeout(() => {
        targetsScrollRef.current?.scrollToEnd({ animated: true });
      }, 120);
      setChildDraft({
        loginId: "",
        password: "",
        passwordConfirm: "",
        name: "",
        age: "",
      });
      setChildIdChecked(false);
      setChildIdCheckMessage("");
      setChildPwShow(false);
      setChildPw2Show(false);
      setChildError("");
      setChildModalOpen(false);
    } catch (error) {
      console.log("대상자 추가 실패", error);
      setChildError("계정 정보를 다시 입력해주세요.");
    } finally {
      setAddingChild(false);
    }
  };

  const submitChildFromButton = () => {
    Keyboard.dismiss();
    setTimeout(submitChild, 0);
  };

  const onSave = async () => {
    const isValid = validateAll();
    if (!isValid) return;

    const phone = `${aView}-${bView}-${cView}`;
    const nextProfile = isChildProfile
      ? {
          ...draft,
          userId: draft.userId.trim(),
          age: Number(String(draft.age ?? "").replace(/[^0-9]/g, "")),
          email: "",
          phone: "",
        }
      : {
          ...draft,
          userId: draft.userId.trim(),
          email: draft.email.trim(),
          phone,
        };

    endEditing();
    await onSaveProfile(nextProfile);
    await onSaveTargets(draftTargets);
    onPressSave();
  };

  const onLogout = () => {
    hideKeyboardAndTooltip();
    onPressLogout();
  };

  return (
    <>
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.modalDim} onPress={handleClose} />
<KeyboardAvoidingView
        style={styles.modalCenter}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        pointerEvents="box-none"
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalTop}>
            <Text style={styles.modalTitle}>내 프로필</Text>
            <Pressable
              onPress={handleClose}
              style={styles.modalCloseBtn}
              hitSlop={10}
            >
              <Ionicons name="close" size={12} color="#fff" />
            </Pressable>
          </View>

          <ScrollView
            ref={modalScrollRef}
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View>
              <View style={styles.profileCenter}>
                <View style={styles.profileAvatar}>
                  {draft.imageUri ? (
                    <Image
                      source={{ uri: draft.imageUri }}
                      style={{ width: 86, height: 86, borderRadius: 43 }}
                    />
                  ) : (
                    <Ionicons
                      name="person"
                      size={30}
                      color="rgba(255,255,255,0.95)"
                    />
                  )}

                  <Pressable
                    onPress={openPhotoMenu}
                    style={styles.cameraBadge}
                    hitSlop={10}
                  >
                    <Ionicons name="camera" size={14} color={COLORS.primary} />
                  </Pressable>
                </View>

                <View style={styles.nameSlot}>
                  {editingName ? (
                    <TextInput
                      ref={nameInputRef}
                      value={draft.name}
                      placeholder="이름 입력"
                      onChangeText={(t) => setDraft((p) => ({ ...p, name: t }))}
                      onSubmitEditing={endEditing}
                      style={styles.nameInput}
                      returnKeyType="done"
                    />
                  ) : (
                    <Pressable
                      onPress={() => {
                        Keyboard.dismiss();
                        clearTooltipTimer();
                        setTooltipField(null);
                        setEditingKey(null);
                        scrollModalTo(0);
                        setEditingName(true);
                        focusNameInput();
                      }}
                      hitSlop={10}
                      style={styles.namePress}
                    >
                      <Text style={styles.profileName}>
                        {draft.name || "보호자"}
                      </Text>
                    </Pressable>
                  )}
                </View>

                <Text style={styles.profileRoleText}>{accountRoleLabel}</Text>
              </View>

              <View style={styles.infoCard}>
                <View>
                  <View style={styles.infoRow}>
                    <View style={styles.infoLeft}>
                      <View style={styles.iconWrap}>
                        <Ionicons
                          name="key-outline"
                          size={18}
                          color="rgba(17,24,39,0.55)"
                        />
                        <ErrorDot
                          visible={!!errors.userId}
                          onPress={() => showTooltip("userId")}
                        />
                      </View>

                      <Text style={styles.infoLabel}>ID</Text>

                      <ErrorTooltip
                        visible={tooltipField === "userId"}
                        message={errors.userId}
                      />
                    </View>

                    <View style={{ minWidth: 160, alignItems: "flex-end" }}>
                      <TextInput
                        ref={userIdRef}
                        value={draft.userId}
                        editable={editingKey === "userId"}
                        selection={userIdSelection}
                        onSelectionChange={(e) =>
                          setUserIdSelection(e.nativeEvent.selection)
                        }
                        onFocus={() => {
                          const len = draft.userId.length;
                          setUserIdSelection({ start: len, end: len });
                        }}
                        placeholder="아이디 입력"
                        placeholderTextColor="rgba(17,24,39,0.28)"
                        onChangeText={(t) => {
                          setDraft((p) => ({ ...p, userId: t }));
                          const len = t.length;
                          setUserIdSelection({ start: len, end: len });
                          setErrors((prev) => ({ ...prev, userId: undefined }));
                          if (tooltipField === "userId") {
                            clearTooltipTimer();
                            setTooltipField(null);
                          }
                        }}
                        onSubmitEditing={endEditing}
                        style={[
                          styles.infoInput,
                          editingKey !== "userId" && styles.infoInputReadOnly,
                        ]}
                        returnKeyType="done"
                      />

                      {editingKey !== "userId" && (
                        <Pressable
                          style={StyleSheet.absoluteFill}
                          onPress={() => enterEdit("userId")}
                        />
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                {isChildProfile ? (
                  <View>
                    <View style={styles.infoRow}>
                      <View style={styles.infoLeft}>
                        <View style={styles.iconWrap}>
                          <Ionicons
                            name="happy-outline"
                            size={18}
                            color="rgba(17,24,39,0.55)"
                          />
                          <ErrorDot
                            visible={!!errors.age}
                            onPress={() => showTooltip("age")}
                          />
                        </View>

                        <Text style={styles.infoLabel}>나이</Text>

                        <ErrorTooltip
                          visible={tooltipField === "age"}
                          message={errors.age}
                        />
                      </View>

                      <View style={{ minWidth: 160, alignItems: "flex-end" }}>
                        <TextInput
                          ref={ageRef}
                          value={String(draft.age ?? "")}
                          editable={editingKey === "age"}
                          selection={ageSelection}
                          onSelectionChange={(e) =>
                            setAgeSelection(e.nativeEvent.selection)
                          }
                          onFocus={() => {
                            const len = String(draft.age ?? "").length;
                            setAgeSelection({ start: len, end: len });
                          }}
                          placeholder="나이 입력"
                          placeholderTextColor="rgba(17,24,39,0.28)"
                          keyboardType="number-pad"
                          onChangeText={(t) => {
                            const next = t.replace(/[^0-9]/g, "").slice(0, 3);
                            setDraft((p) => ({ ...p, age: next }));
                            const len = next.length;
                            setAgeSelection({ start: len, end: len });
                            setErrors((prev) => ({ ...prev, age: undefined }));
                            if (tooltipField === "age") {
                              clearTooltipTimer();
                              setTooltipField(null);
                            }
                          }}
                          onSubmitEditing={endEditing}
                          style={[
                            styles.infoInput,
                            editingKey !== "age" && styles.infoInputReadOnly,
                          ]}
                          returnKeyType="done"
                        />

                        {editingKey !== "age" && (
                          <Pressable
                            style={StyleSheet.absoluteFill}
                            onPress={() => enterEdit("age")}
                          />
                        )}
                      </View>
                    </View>
                  </View>
                ) : (
                  <>
                    <View>
                      <View style={styles.infoRow}>
                        <View style={styles.infoLeft}>
                          <View style={styles.iconWrap}>
                            <Ionicons
                              name="mail-outline"
                              size={18}
                              color="rgba(17,24,39,0.55)"
                            />
                            <ErrorDot
                              visible={!!errors.email}
                              onPress={() => showTooltip("email")}
                            />
                          </View>

                          <Text style={styles.infoLabel}>이메일</Text>

                          <ErrorTooltip
                            visible={tooltipField === "email"}
                            message={errors.email}
                          />
                        </View>

                        <View style={{ minWidth: 160, alignItems: "flex-end" }}>
                          <TextInput
                            ref={emailRef}
                            value={draft.email}
                            editable={editingKey === "email"}
                            selection={emailSelection}
                            onSelectionChange={(e) =>
                              setEmailSelection(e.nativeEvent.selection)
                            }
                            onFocus={() => {
                              const len = draft.email.length;
                              setEmailSelection({ start: len, end: len });
                            }}
                            placeholder="이메일 입력"
                            placeholderTextColor="rgba(17,24,39,0.28)"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            onChangeText={(t) => {
                              setDraft((p) => ({ ...p, email: t }));
                              const len = t.length;
                              setEmailSelection({ start: len, end: len });
                              setErrors((prev) => ({ ...prev, email: undefined }));
                              if (tooltipField === "email") {
                                clearTooltipTimer();
                                setTooltipField(null);
                              }
                            }}
                            onSubmitEditing={endEditing}
                            style={[
                              styles.infoInput,
                              editingKey !== "email" && styles.infoInputReadOnly,
                            ]}
                            returnKeyType="done"
                          />

                          {editingKey !== "email" && (
                            <Pressable
                              style={StyleSheet.absoluteFill}
                              onPress={() => enterEdit("email")}
                            />
                          )}
                        </View>
                      </View>
                    </View>

                    <View style={styles.cardDivider} />

                    <View>
                      <View style={styles.infoRow}>
                        <View style={styles.infoLeft}>
                          <View style={styles.iconWrap}>
                            <Ionicons
                              name="call-outline"
                              size={18}
                              color="rgba(17,24,39,0.55)"
                            />
                            <ErrorDot
                              visible={!!errors.phone}
                              onPress={() => showTooltip("phone")}
                            />
                          </View>

                          <Text style={styles.infoLabel}>전화번호</Text>

                          <ErrorTooltip
                            visible={tooltipField === "phone"}
                            message={errors.phone}
                          />
                        </View>

                        <View style={styles.phoneRowBox}>
                          <PhoneVisualSlot
                            max={3}
                            baseText={A_BASE}
                            digits={aDigits}
                            editable={editingKey === "phone"}
                            digitW={digitW}
                            digitH={digitH}
                            showCursor={activePhoneSection === "A"}
                            cursorIndex={cursorIndexA}
                            onPress={() => enterEdit("phone")}
                          />

                          <Text style={styles.phoneHyphen}>-</Text>

                          <PhoneVisualSlot
                            max={4}
                            baseText={B_BASE}
                            digits={bDigits}
                            editable={editingKey === "phone"}
                            digitW={digitW}
                            digitH={digitH}
                            showCursor={activePhoneSection === "B"}
                            cursorIndex={cursorIndexB}
                            onPress={() => enterEdit("phone")}
                          />

                          <Text style={styles.phoneHyphen}>-</Text>

                          <PhoneVisualSlot
                            max={4}
                            baseText={B_BASE}
                            digits={cDigits}
                            editable={editingKey === "phone"}
                            digitW={digitW}
                            digitH={digitH}
                            showCursor={activePhoneSection === "C"}
                            cursorIndex={cursorIndexC}
                            onPress={() => enterEdit("phone")}
                          />

                          <TextInput
                            ref={phoneInputRef}
                            value={phoneDigits}
                            editable={editingKey === "phone"}
                            keyboardType="number-pad"
                            maxLength={11}
                            caretHidden
                            contextMenuHidden
                            selection={{
                              start: phoneDigits.length,
                              end: phoneDigits.length,
                            }}
                            onChangeText={(text) => {
                              const next = text.replace(/[^0-9]/g, "").slice(0, 11);
                              setPhoneDigits(next);
                              setErrors((prev) => ({ ...prev, phone: undefined }));
                              if (tooltipField === "phone") {
                                clearTooltipTimer();
                                setTooltipField(null);
                              }
                            }}
                            style={styles.hiddenPhoneInput}
                          />

                          {editingKey !== "phone" && (
                            <Pressable
                              style={StyleSheet.absoluteFill}
                              onPress={() => enterEdit("phone")}
                            />
                          )}
                        </View>
                      </View>
                    </View>
                  </>
                )}

                <View style={styles.cardDivider} />
              </View>

              <View style={styles.linkedHeader}>
                <Ionicons
                  name="person-outline"
                  size={16}
                  color="rgba(17,24,39,0.6)"
                />
                <Text style={styles.linkedTitle}>
                  연결된 {isChildProfile ? "보호자" : "대상자"} ({draftTargets.length})
                </Text>
              </View>

              <View style={styles.targetsCard}>
                <ScrollView
                  ref={targetsScrollRef}
                  style={styles.targetsScroll}
                  contentContainerStyle={styles.targetsScrollContent}
                  scrollEnabled
                  showsVerticalScrollIndicator={draftTargets.length > 2}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {draftTargets.map((t, index) => (
                    <View key={t.id}>
                      <View style={styles.targetRow}>
                        <View style={styles.targetAvatar}>
                          <Ionicons name="happy" size={18} color="#fff" />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.targetName}>{t.name}</Text>
                          <Text style={styles.targetSub}>{t.sub}</Text>
                        </View>

                        {canManageChildren && (
                          <Pressable
                            onPress={(event) => {
                              event.stopPropagation?.();
                              openDeleteChildModal(t);
                            }}
                            style={styles.trashBtn}
                            hitSlop={10}
                          >
                            <Ionicons
                              name="trash"
                              size={18}
                              color={COLORS.danger}
                            />
                          </Pressable>
                        )}
                      </View>

                      {index !== draftTargets.length - 1 && (
                        <View style={styles.divider} />
                      )}
                    </View>
                  ))}

                  {draftTargets.length === 0 && (
                    <View style={styles.emptyTargetsBox}>
                      <Text style={styles.emptyTargetsText}>
                        연결된 {isChildProfile ? "보호자" : "대상자"}가 없습니다.
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>

              {canManageChildren && (
                <View style={styles.addChildArea}>
                  <Pressable
                    style={styles.addChildBtn}
                    onPress={() => {
                      hideKeyboardAndTooltip();
                      setChildModalOpen(true);
                    }}
                  >
                    <Ionicons name="person-add-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.addChildBtnText}>대상자 추가하기</Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.modalBottomBtns}>
                <Pressable
                  style={[styles.bottomBtn, styles.btnPrimary]}
                  onPress={onSave}
                >
                  <Text style={[styles.bottomBtnText, styles.btnPrimaryText]}>
                    저장
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.bottomBtn, styles.btnGhost]}
                  onPress={onLogout}
                >
                  <Text style={[styles.bottomBtnText, styles.btnGhostText]}>
                    로그아웃
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    <Modal
      visible={!!deleteTarget}
      transparent
      animationType="fade"
      onRequestClose={closeDeleteChildModal}
    >
      <Pressable style={styles.childModalDim} onPress={closeDeleteChildModal}>
        <Pressable
          style={styles.deleteConfirmSheet}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={styles.deleteConfirmTitle}>회원 탈퇴하시겠습니까?</Text>
          {!!deleteTarget && (
            <Text style={styles.deleteConfirmSub}>{deleteTarget.name}</Text>
          )}
          {!!deleteError && (
            <Text style={styles.childErrorText}>{deleteError}</Text>
          )}

          <View style={styles.deleteConfirmBtns}>
            <Pressable
              style={[styles.deleteConfirmBtn, styles.btnGhost]}
              onPress={closeDeleteChildModal}
              disabled={deletingChild}
            >
              <Text style={[styles.bottomBtnText, styles.btnGhostText]}>아니오</Text>
            </Pressable>
            <Pressable
              style={[
                styles.deleteConfirmBtn,
                styles.deleteDangerBtn,
                deletingChild && { opacity: 0.55 },
              ]}
              onPress={submitDeleteChild}
              disabled={deletingChild}
            >
              <Text style={styles.deleteDangerText}>
                {deletingChild ? "삭제 중..." : "예"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>

    <Modal
      visible={childModalOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setChildModalOpen(false)}
    >
      <Pressable
        style={styles.childModalDim}
        onPress={() => {
          Keyboard.dismiss();
          setChildModalOpen(false);
        }}
      >
        <Pressable
          style={styles.childModalSheet}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.childModalTop}>
            <Text style={styles.childModalTitle}>대상자 추가하기</Text>
            <Pressable
              onPress={() => setChildModalOpen(false)}
              style={styles.modalCloseBtn}
              hitSlop={10}
            >
              <Ionicons name="close" size={12} color="#fff" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.childModalScroll}
            contentContainerStyle={styles.childModalBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.childIdRow}>
              <TextInput
                value={childDraft.loginId}
                onChangeText={(text) => changeChildDraft("loginId", text)}
                placeholder="아이디 입력"
                placeholderTextColor="rgba(17,24,39,0.35)"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                style={[styles.childInput, styles.childIdInput]}
                returnKeyType="next"
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
              />

              <Pressable style={styles.childIdCheckBtn} onPress={checkChildLoginIdDuplicate}>
                <Text style={styles.childIdCheckBtnText}>중복 확인</Text>
              </Pressable>
            </View>
            {!!childIdCheckMessage && (
              <Text style={styles.childSuccessText}>{childIdCheckMessage}</Text>
            )}

            <View style={styles.childPwRow}>
              <TextInput
                value={childDraft.password}
                onChangeText={(text) => changeChildDraft("password", text)}
                placeholder="비밀번호 입력"
                placeholderTextColor="rgba(17,24,39,0.35)"
                secureTextEntry={!childPwShow}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                style={[styles.childInput, styles.childPwInput]}
                returnKeyType="next"
                autoComplete="new-password"
                textContentType="newPassword"
                importantForAutofill="no"
              />

              <Pressable style={styles.childEyeBtn} onPress={() => setChildPwShow((v) => !v)}>
                <Ionicons name={childPwShow ? "eye" : "eye-off"} size={18} color="#9CA3AF" />
              </Pressable>
            </View>

            <View style={styles.childPwRow}>
              <TextInput
                value={childDraft.passwordConfirm}
                onChangeText={(text) => changeChildDraft("passwordConfirm", text)}
                placeholder="비밀번호 재입력"
                placeholderTextColor="rgba(17,24,39,0.35)"
                secureTextEntry={!childPw2Show}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                style={[styles.childInput, styles.childPwInput]}
                returnKeyType="next"
                autoComplete="new-password"
                textContentType="newPassword"
                importantForAutofill="no"
              />

              <Pressable style={styles.childEyeBtn} onPress={() => setChildPw2Show((v) => !v)}>
                <Ionicons name={childPw2Show ? "eye" : "eye-off"} size={18} color="#9CA3AF" />
              </Pressable>
            </View>

            <TextInput
              value={childDraft.name}
              onChangeText={(text) => changeChildDraft("name", text)}
              placeholder="이름 입력"
              placeholderTextColor="rgba(17,24,39,0.35)"
              style={styles.childInput}
              keyboardType="default"
              returnKeyType="next"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
            />

            <TextInput
              value={childDraft.age}
              onChangeText={(text) =>
                changeChildDraft("age", text.replace(/[^0-9]/g, ""))
              }
              placeholder="나이"
              placeholderTextColor="rgba(17,24,39,0.35)"
              keyboardType="number-pad"
              style={styles.childInput}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
            />
            {!!childError && (
              <Text style={styles.childErrorText}>{childError}</Text>
            )}

            <Pressable
              style={[styles.childSaveBtn, addingChild && { opacity: 0.55 }]}
              onPress={submitChildFromButton}
              disabled={addingChild}
            >
              <Text style={styles.childSaveBtnText}>
                {addingChild ? "저장 중..." : "저장"}
              </Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topBar: {
    backgroundColor: COLORS.primary,
  },
  body: { flex: 1 },

  map: { flex: 1, backgroundColor: "#DCEEFF", position: "relative" },
  watchPanel: {
    position: "absolute",
    left: 76,
    right: 84,
    bottom: 82,
    maxHeight: 142,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 19,
    ...SHADOW.card,
  },
  watchPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  watchPanelTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0F172A",
  },
  watchRow: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(15,23,42,0.08)",
    gap: 4,
  },
  watchNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  watchName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
  },
  watchTime: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
  },
  watchMetricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
  },
  watchMetricText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
    marginRight: 5,
  },
  sosToastWrap: {
    position: "absolute",
    top: Platform.select({ ios: 31, android: 23, default: 23 }),
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 50,
  },
  sosToastBox: {
    alignSelf: "center",
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    backgroundColor: "rgba(255, 235, 235, 0.92)",
    borderColor: "rgba(239,68,68,0.35)",
    ...SHADOW.soft,
  },
  sosToastContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  sosToastText: {
    marginLeft: 5,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 18,
    color: "#B91C1C",
  },
  sosToastCloseBtn: {
    marginLeft: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  childSosBtn: {
    position: "absolute",
    left: "50%",
    bottom: 26,
    marginLeft: -60,
    width: 120,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.danger,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    zIndex: 24,
    ...SHADOW.floating,
  },
  childSosBtnActive: {
    backgroundColor: "#B91C1C",
  },
  childSosBtnText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  routeBtn: {
    position: "absolute",
    left: 20,
    top: 22,
    width: 46,
    height: 46,
    borderRadius: 11,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
    ...SHADOW.card,
    elevation: 30,
  },
  routeBtnActive: {
    borderWidth: 2,
    borderColor: "rgba(37,99,235,0.28)",
  },
  routeModalDim: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.42)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  routeModalBox: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 22,
    backgroundColor: "#fff",
    padding: 18,
    ...SHADOW.card,
  },
  routeModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  routeModalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },
  routeModalSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  routeModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  routeEmptyBox: {
    height: 150,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  routeEmptyText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#64748B",
  },
  routeTargetScroll: {
    maxHeight: 272,
  },
  routeTargetList: {
    gap: 8,
    paddingVertical: 2,
  },
  routeTargetItem: {
    minHeight: 60,
    borderRadius: 15,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  routeTargetItemOn: {
    backgroundColor: "#EFF6FF",
    borderColor: "rgba(37,99,235,0.35)",
  },
  routeTargetRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  routeTargetRadioOn: {
    borderColor: COLORS.primary,
  },
  routeTargetRadioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  routeTargetInfo: {
    flex: 1,
  },
  routeTargetName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },
  routeTargetSub: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  routeModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  routeCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  routeCancelText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#475569",
  },
  routeStartBtn: {
    flex: 1.35,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  routeStartBtnDisabled: {
    opacity: 0.45,
  },
  routeStartText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#fff",
  },

  zoomBox: {
    position: "absolute",
    left: 20,
    bottom: 18,
    width: 44,
    borderRadius: 11,
    backgroundColor: "#fff",
    overflow: "hidden",
    zIndex: 20,
    ...SHADOW.card,
  },
  zoomBtn: {
    width: 44,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomDivider: {
    height: 1,
    backgroundColor: "rgba(15,23,42,0.10)",
  },
  rightControlBox: {
    position: "absolute",
    right: 20,
    bottom: 8,
    gap: 10,
    zIndex: 20,
  },
  rightBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.card,
  },
  rightBtnActive: {
    borderWidth: 2,
    borderColor: "rgba(37,99,235,0.28)",
  },
  mapModeScreen: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  roadViewScreen: {
    backgroundColor: "#CBD5E1",
  },
  modeBackBtn: {
    position: "absolute",
    left: 18,
    top: 18,
    width: 94,
    height: 38,
    borderRadius: 11,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    zIndex: 10,
    ...SHADOW.card,
  },
  modeBackText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "900",
  },
  modeCenterCard: {
    position: "absolute",
    left: 26,
    right: 26,
    top: "42%",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 18,
    paddingVertical: 18,
    alignItems: "center",
    ...SHADOW.card,
  },
  modeTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#111827",
  },
  modeDescription: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
  },
  roadViewSky: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "48%",
    backgroundColor: "#BFDBFE",
  },
  roadViewGround: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "58%",
    backgroundColor: "#475569",
  },
  roadViewLaneLeft: {
    position: "absolute",
    left: "28%",
    bottom: -50,
    width: 6,
    height: "62%",
    backgroundColor: "rgba(255,255,255,0.75)",
    transform: [{ rotate: "13deg" }],
  },
  roadViewLaneRight: {
    position: "absolute",
    right: "28%",
    bottom: -50,
    width: 6,
    height: "62%",
    backgroundColor: "rgba(255,255,255,0.75)",
    transform: [{ rotate: "-13deg" }],
  },
  roadViewCenterLine: {
    position: "absolute",
    left: "50%",
    bottom: 0,
    marginLeft: -3,
    width: 6,
    height: "45%",
    backgroundColor: "rgba(250,204,21,0.85)",
  },
  road: { position: "absolute", left: 0, right: 0, backgroundColor: "#94A3B8" },
  roadV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: "#94A3B8",
  },

  geofence: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 3,
    borderColor: "rgba(239,68,68,0.55)",
  },

  schoolTextOnly: {
    position: "absolute",
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(17,24,39,0.75)",
  },

  markerWrap: { position: "absolute", alignItems: "center" },
  dangerBubble: {
    position: "absolute",
    top: -8,
    zIndex: 3,
    width: 19,
    height: 19,
    borderRadius: 9,
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },

  avatar: {
    width: 37,
    height: 37,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.floating,
  },
  avatarInner: { width: 22, height: 22, borderRadius: 11 },

  namePill: {
    marginTop: 6,
    paddingHorizontal: 14,
    height: 30,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.card,
  },
  nameText: { color: "#fff", fontWeight: "900", fontSize: 13.5 },

  modalDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  modalCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 47,
    paddingBottom: 10,
  },
  modalSheet: {
    width: "88%",
    maxHeight: "85%",
    transform: [{ translateY: -13 }],
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "visible",
    ...SHADOW.floating,
  },

  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 18,
  },

  modalTop: {
    height: 50,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 2,
    marginLeft: 2,
  },
  modalCloseBtn: {
    width: 23,
    height: 23,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  profileCenter: { alignItems: "center", paddingTop: 22 },
  profileAvatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  cameraBadge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },

  nameSlot: {
    marginTop: 10,
    minHeight: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  namePress: { minHeight: 28, justifyContent: "center" },
  profileName: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    lineHeight: 24,
    textAlign: "center",
  },
  profileRoleText: {
    marginBottom: 2,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(17,24,39,0.5)",
    lineHeight: 16,
    textAlign: "center",
  },

  nameInput: {
    minWidth: 140,
    height: 28,
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    lineHeight: 24,
    textAlign: "center",
    borderWidth: 0,
    backgroundColor: "transparent",
    paddingVertical: 0,
    paddingHorizontal: 6,
    includeFontPadding: false,
  },

  infoCard: {
    marginHorizontal: 16,
    marginTop: 0,
    backgroundColor: "#fff",
    overflow: "visible",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(17,24,39,0.06)",
    marginLeft: 16,
    marginRight: 16,
  },

  infoRow: {
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoLeft: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 7.5,
  },
  infoLabel: { fontSize: 14, fontWeight: "700", color: "rgba(17,24,39,0.70)" },

  iconWrap: {
    position: "relative",
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  errorDot: {
    position: "absolute",
    left: -6,
    top: -10,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  errorDotText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "900",
    lineHeight: 10,
  },

  tooltipBox: {
    position: "absolute",
    left: -17,
    top: -51,
    backgroundColor: "rgba(17,24,39,0.94)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: "flex-start",
    maxWidth: 260,
    zIndex: 30,
  },

  tooltipText: {
    color: "#fff",
    fontSize: 11.5,
    fontWeight: "700",
    lineHeight: 16,
    flexShrink: 1,
  },

  tooltipArrow: {
    position: "absolute",
    left: 11,
    bottom: -6,
    width: 12,
    height: 12,
    backgroundColor: "rgba(17,24,39,0.94)",
    transform: [{ rotate: "45deg" }],
  },

  infoInput: {
    minWidth: 140,
    maxWidth: 210,
    fontSize: 14,
    fontWeight: "800",
    color: "rgba(14, 19, 32, 0.7)",
    textAlign: "right",
    borderWidth: 0,
    backgroundColor: "transparent",
    paddingVertical: 0,
    paddingHorizontal: 0,
    includeFontPadding: false,
  },
  infoInputReadOnly: { paddingVertical: 0 },

  phoneRowBox: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: 178,
    maxWidth: 220,
    marginRight: 8,
  },
  phoneHyphen: {
    width: 12,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "800",
    color: "rgba(17,24,39,0.45)",
    includeFontPadding: false,
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
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(17,24,39,0.28)",
    letterSpacing: 0,
    textAlign: "center",
    includeFontPadding: false,
  },
  slotTopChar: {
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(14, 19, 32, 0.70)",
    letterSpacing: 0,
    textAlign: "center",
    includeFontPadding: false,
  },
  charTransparent: { opacity: 0 },

  slotCursor: {
    position: "absolute",
    top: 1,
    width: 2,
    borderRadius: 1,
    backgroundColor: COLORS.primary,
  },

  hiddenPhoneInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },

  linkedHeader: {
    marginTop: 16,
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  linkedTitle: { fontSize: 16, fontWeight: "900", color: "rgba(17,24,39,0.7)" },

  targetsCard: {
    marginHorizontal: 16,
    marginTop: 10,
    height: 129,
    maxHeight: 129,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.06)",
    overflow: "hidden",
  },
  targetsScroll: {
    flex: 1,
  },
  targetsScrollContent: {
    minHeight: 129,
  },
  targetRow: {
    height: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  divider: { height: 1, backgroundColor: "rgba(17,24,39,0.06)" },

  emptyTargetsBox: {
    flex: 1,
    minHeight: 129,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  emptyTargetsText: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(17,24,39,0.42)",
  },

  targetAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
  },
  targetName: { fontSize: 16, fontWeight: "900", color: "#111827" },
  targetSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.55)",
  },

  trashBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(239,68,68,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  addChildArea: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  addChildBtn: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.22)",
    backgroundColor: "rgba(59,130,246,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addChildBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: COLORS.primary,
  },
  childForm: {
    marginTop: 10,
    gap: 8,
  },
  childModalDim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 47,
    paddingBottom: 10,
  },
  childModalKeyboardAvoiding: {
    width: "88%",
    maxHeight: "85%",
  },
  childModalSheet: {
    width: "88%",
    maxHeight: "85%",
    transform: [{ translateY: -13 }],
    borderRadius: 20,
    backgroundColor: "#fff",
    overflow: "hidden",
    ...SHADOW.floating,
  },
  childModalScroll: {
    flexGrow: 0,
  },
  childModalTop: {
    height: 50,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  childModalTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 2,
    marginLeft: 2,
  },
  childModalBody: {
    padding: 16,
    gap: 9,
    paddingBottom: 18,
  },
  childIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  childIdInput: {
    flex: 1,
  },
  childIdCheckBtn: {
    width: 82,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  childIdCheckBtnText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#fff",
  },
  childPwRow: {
    position: "relative",
    justifyContent: "center",
  },
  childPwInput: {
    paddingRight: 42,
  },
  childEyeBtn: {
    position: "absolute",
    right: 10,
    height: 42,
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  childSuccessText: {
    marginTop: -4,
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.success,
  },
  deleteConfirmSheet: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 18,
    backgroundColor: "#fff",
    padding: 18,
    gap: 12,
    ...SHADOW.floating,
  },
  deleteConfirmTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },
  deleteConfirmSub: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(17,24,39,0.55)",
    textAlign: "center",
  },
  deleteConfirmBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  deleteConfirmBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteDangerBtn: {
    backgroundColor: COLORS.danger,
  },
  deleteDangerText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#fff",
  },
  childInput: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  childNameInput: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  childErrorText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.danger,
  },
  childSaveBtn: {
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  childSaveBtnText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#fff",
  },

  modalBottomBtns: { padding: 16, flexDirection: "row", gap: 12 },
  bottomBtn: {
    flex: 1,
    height: 45,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBtnText: { fontSize: 16, fontWeight: "900" },

  btnPrimary: { backgroundColor: COLORS.primary },
  btnPrimaryText: { color: "#fff" },

  btnGhost: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
  },

  btnGhostText: { color: "rgba(17,24,39,0.75)" },
});
