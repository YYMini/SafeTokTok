// app/(tabs)/index.tsx
import Header from "@/components/Header";
import { COLORS, SHADOW } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

declare global {
  interface Window {
    kakao: any;
  }
}

type Target = {
  id: string;
  name: string;
  sub: string;
};

type Profile = {
  name: string;
  userId: string;
  email: string;
  phone: string;
  imageUri: string | null;
  role?: "user" | "guardian";
  roleLabel?: string;
};

type FieldErrors = {
  name?: string;
  userId?: string;
  email?: string;
  phone?: string;
};

const PROFILE_KEY = "profileData_v1";
const TARGETS_KEY = "linkedTargets_v1";
const LOGIN_KEY = "isLoggedIn";
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

const DEFAULT_TARGETS: Target[] = [
  { id: "m1", name: "김민준", sub: "7세 · 자녀" },
  { id: "s1", name: "이서윤", sub: "5세 · 자녀" },
];

export default function TrackingDashboard() {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [linkedTargets, setLinkedTargets] = useState<Target[]>(DEFAULT_TARGETS);
  const [showLoginToast, setShowLoginToast] = useState(false);

  useEffect(() => {
    setShowLoginToast(true);

    const timer = setTimeout(() => {
      setShowLoginToast(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [savedProfile, savedTargets, savedAccountId] = await Promise.all([
          AsyncStorage.getItem(PROFILE_KEY),
          AsyncStorage.getItem(TARGETS_KEY),
          AsyncStorage.getItem(ACCOUNT_ID_KEY),
        ]);

        if (savedProfile) {
          const parsed = JSON.parse(savedProfile) as Partial<Profile>;

          setProfile({
            ...DEFAULT_PROFILE,
            ...parsed,
            userId: savedAccountId ?? parsed.userId ?? DEFAULT_PROFILE.userId,
            phone: parsed.phone ?? DEFAULT_PROFILE.phone,
            imageUri: parsed.imageUri ?? null,
          });
        } else if (savedAccountId) {
          setProfile({
            ...DEFAULT_PROFILE,
            userId: savedAccountId,
          });
        }

        if (savedTargets) {
          const parsedTargets = JSON.parse(savedTargets) as Target[];
          if (Array.isArray(parsedTargets)) {
            setLinkedTargets(parsedTargets);
          }
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const saveProfile = async (next: Profile) => {
    setProfile(next);

    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      await AsyncStorage.setItem(ACCOUNT_ID_KEY, next.userId.trim());
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

  const logout = async () => {
    try {
      await AsyncStorage.setItem(LOGIN_KEY, "false");
    } catch {
      // ignore
    }

    setProfileOpen(false);
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.safe}>
      {showLoginToast && (
        <View style={styles.loginToastWrap}>
          <View style={styles.loginToastBox}>
            <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
            <Text style={styles.loginToastText}>로그인이 성공했습니다.</Text>
          </View>
        </View>
      )}

      <StatusBar hidden />

      <View style={styles.topBar}>
        <Header
          roleLabel={profile.name}
          showLogout={false}
          profileImageUri={profile.imageUri}
          onPressSettings={() => router.push("/settings")}
          onPressRole={() => setProfileOpen(true)}
        />
      </View>

      <View style={styles.body}>
        <MapPlaceholder
          profile={profile}
          linkedTargets={linkedTargets}
          onSaveTargets={saveTargets}
        />
      </View>

      <ProfileModal
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
        linkedTargets={linkedTargets}
        profile={profile}
        onSaveProfile={saveProfile}
        onSaveTargets={saveTargets}
        onPressSave={() => setProfileOpen(false)}
        onPressLogout={logout}
      />
    </View>
  );
}

function MapPlaceholder({
  profile,
  linkedTargets,
  onSaveTargets,
}: {
  profile: Profile;
  linkedTargets: Target[];
  onSaveTargets: (targets: Target[]) => Promise<void> | void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);
  const routeLineRef = useRef<any>(null);
  const routeOverlayRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<number | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [showRouteInfo, setShowRouteInfo] = useState(false);
  const [mapMode, setMapMode] = useState<"default" | "satellite" | "roadview">(
    "default",
  );
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [dangerNoticeVisible, setDangerNoticeVisible] = useState(true);
  const [mockZoom, setMockZoom] = useState(1);
  const [mockPan, setMockPan] = useState({ x: 0, y: 0 });

  const isUserRole = profile.role === "user";

  // 현재 위험 상황이 발생한 대상자 기준값
  // 나중에 실제 알림/서버 연동 시 이 객체만 위험 대상자 데이터로 바꾸면
  // SOS 문구, 위험 아이콘, 길 안내 도착지가 모두 같은 대상자를 따라갑니다.
  const dangerTarget: DangerTarget = {
    id: linkedTargets[0]?.id ?? "m1",
    name: linkedTargets[0]?.name ?? "김민준",
    x: 70,
    y: 280,
    markerSize: 38,
    latitude: 37.5702,
    longitude: 126.9818,
  };

  const dangerTargetName = dangerTarget.name;
  const sosName = dangerTarget.name;

  const guardianPosition = { latitude: 37.5665, longitude: 126.978 };
  const dangerPosition = {
    latitude: dangerTarget.latitude,
    longitude: dangerTarget.longitude,
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

  const drawWebRoute = () => {
    if (!window.kakao?.maps || !mapInstanceRef.current) return;

    clearWebRoute();

    const guardianLatLng = new window.kakao.maps.LatLng(
      guardianPosition.latitude,
      guardianPosition.longitude,
    );
    const dangerLatLng = new window.kakao.maps.LatLng(
      dangerPosition.latitude,
      dangerPosition.longitude,
    );

    routeLineRef.current = new window.kakao.maps.Polyline({
      map: mapInstanceRef.current,
      path: [guardianLatLng, dangerLatLng],
      strokeWeight: 5,
      strokeColor: "#2563EB",
      strokeOpacity: 0.85,
      strokeStyle: "solid",
    });

    const infoPosition = new window.kakao.maps.LatLng(
      (guardianPosition.latitude + dangerPosition.latitude) / 2,
      (guardianPosition.longitude + dangerPosition.longitude) / 2,
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
          color:#111827;
          font-weight:700;
          white-space:nowrap;
        ">
          <div style="color:#2563EB;font-weight:900;margin-bottom:2px;">도보 8분</div>
          <div>520m · 남동쪽</div>
        </div>
      `,
      yAnchor: 1.1,
    });

    routeOverlayRef.current.setMap(mapInstanceRef.current);
    mapInstanceRef.current.setBounds(
      new window.kakao.maps.LatLngBounds(guardianLatLng, dangerLatLng),
    );
  };

  const renderMarkers = (
    targets: {
      childId: number;
      name: string;
      latitude: number;
      longitude: number;
    }[],
  ) => {
    if (!window.kakao?.maps || !mapInstanceRef.current) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));

    markersRef.current = [];
    overlaysRef.current = [];

    targets.forEach((target) => {
      const position = new window.kakao.maps.LatLng(
        target.latitude,
        target.longitude,
      );

      const marker = new window.kakao.maps.Marker({
        position,
        map: mapInstanceRef.current,
      });

      const isDanger = target.name === dangerTargetName;
      const content = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
          ${
            isDanger
              ? `<div style="width:26px;height:26px;border-radius:13px;background:#FF2F45;color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 8px rgba(255,47,69,0.45);">!</div>`
              : ""
          }
          <div style="
            background: ${isDanger ? "#F04A16" : "#12B85C"};
            border-radius: 9px;
            padding: 4px 9px;
            font-size: 12px;
            font-weight: 800;
            color: white;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          ">
            ${target.name}
          </div>
        </div>
      `;

      const overlay = new window.kakao.maps.CustomOverlay({
        position,
        content,
        yAnchor: 2.2,
      });

      overlay.setMap(mapInstanceRef.current);

      markersRef.current.push(marker);
      overlaysRef.current.push(overlay);
    });
  };

  const getChildIdFromUrl = () => {
    if (Platform.OS !== "web") return 1;

    const params = new URLSearchParams(window.location.search);
    const value = Number(params.get("childId"));
    return Number.isNaN(value) || value <= 0 ? 1 : value;
  };

  const childId = getChildIdFromUrl();

  const sendLocationToServer = async (lat: number, lng: number) => {
    try {
      await fetch("http://localhost:8080/api/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          childId,
          latitude: lat,
          longitude: lng,
        }),
      });
    } catch (error) {
      console.log("위치 전송 실패", error);
    }
  };

  const fetchLatestLocations = async () => {
    try {
      const response = await fetch(
        "http://localhost:8080/api/locations/latest",
      );
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        renderMarkers(data);
        setIsReady(true);
      }
    } catch (error) {
      console.log("최신 위치 조회 실패", error);
    }
  };

  const zoomIn = () => {
    if (Platform.OS === "web" && mapInstanceRef.current) {
      mapInstanceRef.current.setLevel(
        Math.max(1, mapInstanceRef.current.getLevel() - 1),
      );
      return;
    }

    setMockZoom((prev) => Math.min(prev + 0.12, 1.28));
  };

  const zoomOut = () => {
    if (Platform.OS === "web" && mapInstanceRef.current) {
      mapInstanceRef.current.setLevel(
        Math.min(14, mapInstanceRef.current.getLevel() + 1),
      );
      return;
    }

    setMockZoom((prev) => Math.max(prev - 0.12, 0.9));
  };

  const fitMap = () => {
    if (Platform.OS === "web" && mapInstanceRef.current && window.kakao?.maps) {
      mapInstanceRef.current.setCenter(
        new window.kakao.maps.LatLng(37.5665, 126.978),
      );
      mapInstanceRef.current.setLevel(3);
      return;
    }

    setMockZoom(1);
    setMockPan({ x: 0, y: 0 });
  };

  const moveToGuardian = () => {
    // 우측 세 번째 위치 아이콘은 현재 목업 화면 기준 "화면 맞춤"으로 동작
    // 지도 배경만 초기화하고, 지오펜스/대상자/보호자 프로필 위치는 그대로 유지
    fitMap();
  };

  const handleToggleRoute = () => {
    setShowRouteInfo((prev) => {
      const next = !prev;

      if (Platform.OS === "web") {
        setTimeout(() => {
          if (next) drawWebRoute();
          else clearWebRoute();
        }, 0);
      }

      return next;
    });
  };

  const openSatelliteMode = () => {
    setMapMode("satellite");

    if (Platform.OS === "web" && mapInstanceRef.current && window.kakao?.maps) {
      mapInstanceRef.current.addOverlayMapTypeId(
        window.kakao.maps.MapTypeId.SKYVIEW,
      );
    }
  };

  const openRoadViewMode = () => {
    setMapMode("roadview");
  };

  const closeModeScreen = () => {
    if (
      Platform.OS === "web" &&
      mapMode === "satellite" &&
      mapInstanceRef.current &&
      window.kakao?.maps
    ) {
      mapInstanceRef.current.removeOverlayMapTypeId(
        window.kakao.maps.MapTypeId.SKYVIEW,
      );
    }

    setMapMode("default");
  };

  const handleAddTarget = async (target: Target) => {
    await onSaveTargets([...linkedTargets, target]);
    setTargetModalOpen(false);
  };

  const handlePressSOS = () => {
    setSosActive(true);
    setDangerNoticeVisible(true);
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const startGeolocation = () => {
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
          setErrorText(`현재 위치를 가져오지 못했습니다. (${err.message})`);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );

      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          await sendLocationToServer(latitude, longitude);
        },
        (err) => {
          setErrorText(`위치 추적 실패: ${err.message}`);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 3000,
        },
      );
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

      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.map}>
      {Platform.OS === "web" ? (
        <>
          {!isReady && !errorText && (
            <ActivityIndicator size="large" style={styles.mapLoading} />
          )}

          {!!errorText && (
            <View style={styles.mapErrorBox}>
              <Text>{errorText}</Text>
            </View>
          )}

          <div
            ref={mapContainerRef}
            style={{ width: "100%", height: "100%" }}
          />
        </>
      ) : (
        <MockMap
          showRouteInfo={showRouteInfo}
          mapMode={mapMode}
          dangerNoticeVisible={dangerNoticeVisible}
          sosActive={sosActive}
          sosName={sosName}
          dangerTargetName={dangerTargetName}
          dangerTarget={dangerTarget}
          isUserRole={isUserRole}
          zoom={mockZoom}
          pan={mockPan}
          onPan={setMockPan}
          onToggleRoute={handleToggleRoute}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFit={fitMap}
          onOpenSatelliteMode={openSatelliteMode}
          onOpenRoadViewMode={openRoadViewMode}
          onCloseModeScreen={closeModeScreen}
          onMoveToGuardian={moveToGuardian}
          onOpenTargetModal={() => setTargetModalOpen(true)}
          onPressSOS={handlePressSOS}
          onCloseNotice={() => setDangerNoticeVisible(false)}
        />
      )}

      {Platform.OS === "web" && (
        <>
          <MapOverlayControls
            showRouteInfo={showRouteInfo}
            mapMode={mapMode}
            dangerNoticeVisible={dangerNoticeVisible}
            sosActive={sosActive}
            sosName={sosName}
            dangerTargetName={dangerTargetName}
            dangerTarget={dangerTarget}
            isUserRole={isUserRole}
            onToggleRoute={handleToggleRoute}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onFit={fitMap}
            onOpenSatelliteMode={openSatelliteMode}
            onOpenRoadViewMode={openRoadViewMode}
            onCloseModeScreen={closeModeScreen}
            onMoveToGuardian={moveToGuardian}
            onOpenTargetModal={() => setTargetModalOpen(true)}
            onPressSOS={handlePressSOS}
            onCloseNotice={() => setDangerNoticeVisible(false)}
          />
        </>
      )}

      <TargetRegisterModal
        visible={targetModalOpen}
        onClose={() => setTargetModalOpen(false)}
        onRegister={handleAddTarget}
      />
    </View>
  );
}

type MapMode = "default" | "satellite" | "roadview";

type DangerTarget = {
  id: string;
  name: string;
  x: number;
  y: number;
  markerSize: number;
  latitude: number;
  longitude: number;
};

type DangerAlert = {
  id: string;
  type: "sos" | "geofence" | "heart";
  title: string;
  timeText: string;
};

type MapOverlayProps = {
  showRouteInfo: boolean;
  mapMode: MapMode;
  dangerNoticeVisible: boolean;
  sosActive: boolean;
  sosName: string;
  dangerTargetName: string;
  dangerTarget: DangerTarget;
  isUserRole: boolean;
  onToggleRoute: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onOpenSatelliteMode: () => void;
  onOpenRoadViewMode: () => void;
  onCloseModeScreen: () => void;
  onMoveToGuardian: () => void;
  onOpenTargetModal: () => void;
  onPressSOS: () => void;
  onCloseNotice: () => void;
};

type MockMapProps = MapOverlayProps & {
  zoom: number;
  pan: { x: number; y: number };
  onPan: (pan: { x: number; y: number }) => void;
};

function MockMap(props: MockMapProps) {
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [dangerPopupOpen, setDangerPopupOpen] = useState(false);
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // 현재는 목업 데이터지만, 추후 서버/센서 데이터가 들어오면
  // 이 배열만 실시간 데이터로 교체하면 팝업 내용이 자동 반영됩니다.
  const recentDangerAlerts: DangerAlert[] = [
    {
      id: "alert_sos",
      type: "sos",
      title: `${props.dangerTarget.name} SOS 요청`,
      timeText: "5분 전",
    },
    {
      id: "alert_geofence",
      type: "geofence",
      title: "안전구역 이탈",
      timeText: "15분 전",
    },
    {
      id: "alert_heart",
      type: "heart",
      title: "심박수 이상",
      timeText: "30분 전",
    },
  ];

  const startMapDrag = (pageX: number, pageY: number) => {
    dragStartRef.current = {
      x: pageX - props.pan.x,
      y: pageY - props.pan.y,
    };
    setIsDraggingMap(true);
  };

  const moveMapDrag = (pageX: number, pageY: number) => {
    if (!isDraggingMap) return;

    props.onPan({
      x: pageX - dragStartRef.current.x,
      y: pageY - dragStartRef.current.y,
    });
  };

  const endMapDrag = () => {
    setIsDraggingMap(false);
  };

  if (props.mapMode === "satellite") {
    return (
      <MapModeScreen
        type="satellite"
        title="위성지도 모드"
        description="위성 화면으로 지도를 확인하고 있습니다."
        onBack={props.onCloseModeScreen}
      />
    );
  }

  if (props.mapMode === "roadview") {
    return (
      <MapModeScreen
        type="roadview"
        title="거리뷰 모드"
        description="주변 도로와 이동 경로를 거리뷰로 확인하고 있습니다."
        onBack={props.onCloseModeScreen}
      />
    );
  }

  return (
    <View
      style={styles.mockMap}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setMapSize({ width, height });
      }}
    >
      {/* 지도 그룹: 배경 지도 + 지오펜스 + 대상자/보호자 + 경로선이 실제 지도처럼 함께 이동 */}
      <View
        style={[
          styles.draggableMapGroup,
          {
            transform: [
              { translateX: props.pan.x },
              { translateY: props.pan.y },
              { scale: props.zoom },
            ],
          },
        ]}
        onStartShouldSetResponder={() => false}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => {
          startMapDrag(event.nativeEvent.pageX, event.nativeEvent.pageY);
        }}
        onResponderMove={(event) => {
          moveMapDrag(event.nativeEvent.pageX, event.nativeEvent.pageY);
        }}
        onResponderRelease={endMapDrag}
        onResponderTerminate={endMapDrag}
        onResponderTerminationRequest={() => false}
      >
        <View style={styles.mockMapCanvas}>
          <View style={[styles.mockRoad, styles.roadVerticalLeft]} />
          <View style={[styles.mockRoad, styles.roadVerticalCenter]} />
          <View style={[styles.mockRoad, styles.roadVerticalRight]} />
          <View style={[styles.mockRoad, styles.roadHorizontalTop]} />
          <View style={[styles.mockRoad, styles.roadHorizontalMiddle]} />
          <View style={[styles.mockRoad, styles.roadHorizontalBottom]} />
          <View style={styles.mockDiagonalRoad} />

          <View style={styles.placeSchool}>
            <Text style={styles.placeEmoji}>🏫</Text>
            <Text style={styles.placeText}>강남초등학교</Text>
          </View>

          <View style={styles.placePolice}>
            <Text style={styles.placeEmoji}>🚔</Text>
            <Text style={styles.placeText}>강남경찰서</Text>
          </View>

          <View style={styles.placeLibrary}>
            <Text style={styles.placeEmoji}>📚</Text>
            <Text style={styles.placeText}>시립도서관</Text>
          </View>

          <View style={styles.placeMart}>
            <Text style={styles.placeEmoji}>🏪</Text>
            <Text style={styles.placeText}>이마트</Text>
          </View>

          <View style={styles.placeFood}>
            <Text style={styles.placeEmoji}>🍽️</Text>
            <Text style={styles.placeText}>맛있는집</Text>
          </View>
        </View>

        <View style={styles.safeZone} />

        {props.showRouteInfo && (
          <MockRouteLine
            mapWidth={mapSize.width}
            mapHeight={mapSize.height}
            dangerTarget={props.dangerTarget}
          />
        )}

        <View style={styles.targetGreenWrap}>
          <View style={styles.personMarkerRingGreen}>
            <View style={styles.personCircleGreen}>
              <Text style={styles.personEmoji}>👶</Text>
            </View>
          </View>
          <Text style={styles.greenName}>이서윤</Text>
        </View>

        <Pressable
          style={[
            styles.targetOrangeWrap,
            { left: props.dangerTarget.x, top: props.dangerTarget.y },
          ]}
          onPress={() => setDangerPopupOpen(true)}
          hitSlop={10}
        >
          <View style={styles.markerAlertBadgeSmall}>
            <Text style={styles.markerAlertText}>!</Text>
          </View>
          <View style={styles.personMarkerRingOrange}>
            <View style={styles.personCircleOrange}>
              <Text style={styles.personEmoji}>👶</Text>
            </View>
          </View>
          <Text style={styles.orangeName}>{props.dangerTarget.name}</Text>
        </Pressable>

        <View style={styles.guardianWrap}>
          <View style={styles.guardianMarkerRing}>
            <View style={styles.guardianCircle}>
              <Ionicons name="person-outline" size={17} color="#fff" />
            </View>
          </View>
          <Text style={styles.guardianName}>보호자</Text>
        </View>
      </View>

      {/* 고정 UI: 버튼, 상단 알림, 최근 알림 팝업, 모달 */}
      <DangerAlertPopup
        visible={dangerPopupOpen}
        alerts={recentDangerAlerts}
        onClose={() => setDangerPopupOpen(false)}
      />

      <MapOverlayControls {...props} />
    </View>
  );
}

function RouteSegment({
  from,
  to,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  const center = {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
  };

  return (
    <View
      style={[
        styles.routePathSegment,
        {
          left: center.x - length / 2,
          top: center.y - 2,
          width: length,
          transform: [{ rotate: `${angle}deg` }],
        },
      ]}
    />
  );
}

function MockRouteLine({
  mapWidth,
  mapHeight,
  dangerTarget,
}: {
  mapWidth: number;
  mapHeight: number;
  dangerTarget: DangerTarget;
}) {
  if (!mapWidth || !mapHeight) return null;

  /**
   * 목업 화면에서 실제로 보이는 마커 중심 좌표 기준
   *
   * 출발지: 보호자 프로필 원형 마커 중심
   * - guardianWrap: left 50%, marginLeft -23
   * - guardianMarkerRing: 40 x 40
   * - guardianName 포함 전체 높이를 고려해 원형 마커 중심을 계산
   *
   * 도착지: 현재 위험 상황 발생 대상자 원형 마커 중심
   * - dangerTarget 객체의 x, y, markerSize 기준
   * - 위험 대상자가 바뀌면 도착지도 자동으로 해당 대상자 중심으로 변경
   */
  const guardianCenter = {
    x: mapWidth / 2 - 3,
    y: mapHeight - 105,
  };

  const dangerCenter = {
    x: dangerTarget.x + dangerTarget.markerSize / 2,
    y: dangerTarget.y + dangerTarget.markerSize / 2,
  };

  // 경로 정보 박스는 보호자와 위험 대상자 사이의 선 중앙에 표시합니다.
  // 보호자 마커를 가리지 않도록 정확한 중앙에서 살짝 위쪽이 아닌, 선 중앙보다 약간 오른쪽/아래로만 보정합니다.
  const infoBoxWidth = 108;
  const infoBoxHeight = 26;

  const routeCenter = {
    x: (guardianCenter.x + dangerCenter.x) / 2,
    y: (guardianCenter.y + dangerCenter.y) / 2,
  };

  const infoBoxCenter = {
    x: routeCenter.x + 18,
    y: routeCenter.y + 12,
  };

  const infoBoxLeft = Math.max(
    12,
    Math.min(mapWidth - infoBoxWidth - 12, infoBoxCenter.x - infoBoxWidth / 2),
  );
  const infoBoxTop = Math.max(
    72,
    Math.min(mapHeight - 128, infoBoxCenter.y - infoBoxHeight / 2),
  );

  return (
    <View pointerEvents="none" style={styles.routeLayer}>
      <RouteSegment from={guardianCenter} to={dangerCenter} />

      <View
        style={[
          styles.routeMiniBox,
          {
            left: infoBoxLeft,
            top: infoBoxTop,
            width: infoBoxWidth,
          },
        ]}
      >
        <Text style={styles.routeMiniText}>도보 8분 · 520m</Text>
      </View>
    </View>
  );
}

function DangerAlertPopup({
  visible,
  alerts,
  onClose,
}: {
  visible: boolean;
  alerts: DangerAlert[];
  onClose: () => void;
}) {
  if (!visible) return null;

  return (
    <View style={styles.dangerPopupBox}>
      <View style={styles.dangerPopupHeader}>
        <Text style={styles.dangerPopupTitle}>최근 알림</Text>
        <Pressable style={styles.dangerPopupCloseBtn} onPress={onClose}>
          <Ionicons name="close" size={19} color="#334155" />
        </Pressable>
      </View>

      <View style={styles.dangerAlertList}>
        {alerts.map((alert) => {
          const isSos = alert.type === "sos";
          const isGeofence = alert.type === "geofence";

          return (
            <View
              key={alert.id}
              style={[
                styles.dangerAlertItem,
                isSos && styles.dangerAlertItemSos,
                isGeofence && styles.dangerAlertItemGeofence,
                alert.type === "heart" && styles.dangerAlertItemHeart,
              ]}
            >
              <View
                style={[
                  styles.dangerAlertIcon,
                  isSos && styles.dangerAlertIconSos,
                  isGeofence && styles.dangerAlertIconGeofence,
                  alert.type === "heart" && styles.dangerAlertIconHeart,
                ]}
              >
                <Ionicons
                  name={
                    isSos
                      ? "alert-circle-outline"
                      : isGeofence
                        ? "location-outline"
                        : "alert-circle-outline"
                  }
                  size={17}
                  color={isSos ? "#FF2F45" : isGeofence ? "#F97316" : "#D97706"}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.dangerAlertTitle,
                    isSos && styles.dangerAlertTitleSos,
                    isGeofence && styles.dangerAlertTitleGeofence,
                    alert.type === "heart" && styles.dangerAlertTitleHeart,
                  ]}
                >
                  {alert.title}
                </Text>
                <Text style={styles.dangerAlertTime}>{alert.timeText}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MapModeScreen({
  type,
  title,
  description,
  onBack,
}: {
  type: "satellite" | "roadview";
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <View
      style={[
        styles.modeScreen,
        type === "satellite" ? styles.satelliteScreen : styles.roadViewScreen,
      ]}
    >
      <Pressable style={styles.modeBackBtn} onPress={onBack}>
        <Ionicons name="chevron-back" size={20} color="#111827" />
        <Text style={styles.modeBackText}>돌아가기</Text>
      </Pressable>

      {type === "satellite" ? (
        <View style={styles.satelliteGrid}>
          <View style={styles.satelliteBlockLarge} />
          <View style={styles.satelliteBlockSmall} />
          <View style={styles.satelliteRoad} />
          <View style={styles.satelliteRoadSecond} />
        </View>
      ) : (
        <View style={styles.roadViewMock}>
          <View style={styles.roadViewSky} />
          <View style={styles.roadViewGround} />
          <View style={styles.roadViewLaneLeft} />
          <View style={styles.roadViewLaneRight} />
          <View style={styles.roadViewCenterLine} />
        </View>
      )}

      <View style={styles.modeCenterCard}>
        <Text style={styles.modeTitle}>{title}</Text>
        <Text style={styles.modeDescription}>{description}</Text>
      </View>
    </View>
  );
}

function MapOverlayControls({
  showRouteInfo,
  mapMode,
  dangerNoticeVisible,
  sosName,
  dangerTargetName,
  isUserRole,
  onToggleRoute,
  onZoomIn,
  onZoomOut,
  onFit,
  onOpenSatelliteMode,
  onOpenRoadViewMode,
  onMoveToGuardian,
  onOpenTargetModal,
  onPressSOS,
  onCloseNotice,
}: MapOverlayProps) {
  if (mapMode !== "default") return null;

  return (
    <>
      {dangerNoticeVisible && (
        <View style={styles.sosNoticeBox}>
          <View style={styles.sosNoticeLeft}>
            <View style={styles.noticeAlertIcon}>
              <Text style={styles.noticeAlertText}>!</Text>
            </View>
            <Text style={styles.sosNoticeText}>
              {sosName} 님이 SOS 요청을 했습니다
            </Text>
          </View>

          <Pressable
            onPress={onCloseNotice}
            hitSlop={10}
            style={styles.sosNoticeCloseBtn}
          >
            <Ionicons name="close" size={17} color="#475569" />
          </Pressable>
        </View>
      )}

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
        <Pressable style={styles.rightBtn} onPress={onOpenSatelliteMode}>
          <Ionicons name="map-outline" size={21} color="#334155" />
        </Pressable>

        <Pressable style={styles.rightBtn} onPress={onOpenRoadViewMode}>
          <Ionicons name="walk-outline" size={21} color="#334155" />
        </Pressable>

        <Pressable style={styles.rightBtn} onPress={onFit}>
          <Ionicons name="location-outline" size={21} color={COLORS.primary} />
        </Pressable>

        <Pressable
          style={[styles.rightBtn, styles.rightBtnPrimary]}
          onPress={onOpenTargetModal}
        >
          <Ionicons name="person-add-outline" size={21} color="#fff" />
        </Pressable>
      </View>

      {isUserRole && (
        <Pressable style={styles.sosBtn} onPress={onPressSOS}>
          <Ionicons name="alert-circle-outline" size={17} color="#fff" />
          <Text style={styles.sosBtnText}>SOS 긴급호출</Text>
        </Pressable>
      )}
    </>
  );
}

function TargetRegisterModal({
  visible,
  onClose,
  onRegister,
}: {
  visible: boolean;
  onClose: () => void;
  onRegister: (target: Target) => void;
}) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (!visible) return;

    setName("");
    setAge("");
    setPhone("");
    setRelation("");
    setAddress("");
  }, [visible]);

  const register = () => {
    if (!name.trim()) {
      Alert.alert("입력 확인", "대상자 이름을 입력해주세요.");
      return;
    }

    onRegister({
      id: `target_${Date.now()}`,
      name: name.trim(),
      sub: `${age.trim() || "-"}세 · ${relation.trim() || "대상자"}`,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.targetModalDim} onPress={onClose} />

      <KeyboardAvoidingView
        style={styles.targetModalKeyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.targetSheet}>
          <View style={styles.targetModalTop}>
            <Text style={styles.targetModalTitle}>대상자 등록</Text>

            <Pressable style={styles.targetCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.targetForm}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TargetInput
              icon="person-outline"
              label="이름"
              value={name}
              onChangeText={setName}
              placeholder="대상자 이름을 입력하세요"
            />

            <TargetInput
              icon="calendar-outline"
              label="나이"
              value={age}
              onChangeText={setAge}
              placeholder="나이를 입력하세요"
              keyboardType="number-pad"
            />

            <TargetInput
              icon="call-outline"
              label="연락처"
              value={phone}
              onChangeText={setPhone}
              placeholder="010-0000-0000"
              keyboardType="phone-pad"
            />

            <View style={styles.targetInputBlock}>
              <Text style={styles.targetLabel}>관계</Text>
              <View style={styles.selectBox}>
                <TextInput
                  value={relation}
                  onChangeText={setRelation}
                  placeholder="선택하세요"
                  placeholderTextColor="#9CA3AF"
                  style={styles.selectInput}
                />
                <Ionicons name="chevron-down" size={22} color="#64748B" />
              </View>
            </View>

            <View style={styles.targetInputBlock}>
              <View style={styles.targetLabelRow}>
                <Ionicons
                  name="location-outline"
                  size={21}
                  color={COLORS.primary}
                />
                <Text style={styles.targetLabel}>주소 (안전구역)</Text>
              </View>

              <View style={styles.addressBox}>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="주소를 입력하거나 검색하세요"
                  placeholderTextColor="#9CA3AF"
                  style={styles.addressInput}
                />
                <Pressable style={styles.searchBtn}>
                  <Ionicons name="search-outline" size={24} color="#fff" />
                </Pressable>
              </View>
            </View>

            <View style={styles.targetGuideBox}>
              <Text style={styles.targetGuideText}>
                💡 안내: 등록된 주소를 중심으로 안전구역이 자동 설정됩니다. 설정
                페이지에서 반경을 조정할 수 있습니다.
              </Text>
            </View>

            <View style={styles.targetBottomBtns}>
              <Pressable style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </Pressable>

              <Pressable style={styles.registerBtn} onPress={register}>
                <Text style={styles.registerBtnText}>등록하기</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function TargetInput({
  icon,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad" | "phone-pad";
}) {
  return (
    <View style={styles.targetInputBlock}>
      <View style={styles.targetLabelRow}>
        <Ionicons name={icon} size={21} color={COLORS.primary} />
        <Text style={styles.targetLabel}>{label}</Text>
      </View>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={keyboardType ?? "default"}
        style={styles.targetInput}
      />
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
}: {
  visible: boolean;
  onClose: () => void;
  linkedTargets: Target[];
  onPressSave: () => void;
  onPressLogout: () => void;
  profile: Profile;
  onSaveProfile: (p: Profile) => Promise<void> | void;
  onSaveTargets: (targets: Target[]) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<Profile>(profile);
  const [draftTargets, setDraftTargets] = useState<Target[]>(linkedTargets);
  const [errors, setErrors] = useState<FieldErrors>({});
  const phoneInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  const [phoneDigits, setPhoneDigits] = useState("");

  const ID_REGEX = /^[A-Za-z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]+$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const onlyDigits = (value: string) =>
    value.replace(/[^0-9]/g, "").slice(0, 11);

  const formatPhone = (digits: string) => {
    const d = onlyDigits(digits);
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
  };

  const phoneA = phoneDigits.slice(0, 3);
  const phoneB = phoneDigits.slice(3, 7);
  const phoneC = phoneDigits.slice(7, 11);

  const scrollToY = (y: number) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y, animated: true });
    }, 120);
  };

  useEffect(() => {
    if (!visible) return;

    setDraft(profile);
    setDraftTargets(linkedTargets);
    setPhoneDigits(onlyDigits(profile.phone));
    setErrors({});
    Keyboard.dismiss();
  }, [visible, profile, linkedTargets]);

  const validateName = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) return "이름을 입력해주세요";
    if (trimmed.length < 2) return "이름은 2자 이상 입력해주세요";

    return "";
  };

  const validateUserId = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) return "아이디를 입력해주세요";
    if (trimmed.length < 3) return "아이디는 3자 이상 입력해주세요";
    if (!ID_REGEX.test(trimmed))
      return "아이디는 영문/숫자/기호로만 가능합니다";

    return "";
  };

  const validateEmail = (value: string) => {
    const trimmed = value.trim();

    if (trimmed && !EMAIL_REGEX.test(trimmed)) {
      return "이메일 형식이 올바르지 않습니다";
    }

    return "";
  };

  const validatePhone = (digits: string) => {
    if (!digits) return "전화번호를 입력해주세요";
    if (digits.length !== 11) return "전화번호는 11자리만 가능합니다";

    return "";
  };

  const handleClose = () => {
    Keyboard.dismiss();

    setDraft(profile);
    setDraftTargets(linkedTargets);
    setPhoneDigits(onlyDigits(profile.phone));
    setErrors({});

    onClose();
  };

  const onSave = async () => {
    const nextErrors: FieldErrors = {
      name: validateName(draft.name),
      userId: validateUserId(draft.userId),
      email: validateEmail(draft.email),
      phone: validatePhone(phoneDigits),
    };

    setErrors(nextErrors);

    if (
      nextErrors.name ||
      nextErrors.userId ||
      nextErrors.email ||
      nextErrors.phone
    ) {
      return;
    }

    const nextProfile: Profile = {
      ...draft,
      name: draft.name.trim(),
      userId: draft.userId.trim(),
      email: draft.email.trim(),
      phone: formatPhone(phoneDigits),
      imageUri: draft.imageUri ?? null,
      role: draft.role ?? profile.role ?? "guardian",
      roleLabel:
        draft.roleLabel ??
        profile.roleLabel ??
        (draft.role === "user" ? "사용자" : "보호자"),
    };

    Keyboard.dismiss();

    await onSaveProfile(nextProfile);
    await onSaveTargets(draftTargets);

    onPressSave();
  };

  const onLogout = () => {
    Keyboard.dismiss();
    onPressLogout();
  };

  const removeTarget = (targetId: string) => {
    setDraftTargets((prev) => prev.filter((item) => item.id !== targetId));
  };

  const pickImage = async () => {
    Keyboard.dismiss();

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "사진 접근 권한",
        "사진을 등록하려면 사진 접근 권한이 필요합니다.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      selectionLimit: 1 as any,
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled) {
      const uri = result.assets?.[0]?.uri;

      if (uri) {
        setDraft((prev) => ({
          ...prev,
          imageUri: uri,
        }));
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.modalDim} onPress={handleClose} />

      <KeyboardAvoidingView
        style={styles.modalKeyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
      >
        <View style={styles.modalCenter} pointerEvents="box-none">
          <View style={styles.modalSheet}>
            <View style={styles.modalTop}>
              <Text style={styles.modalTitle}>내 프로필</Text>

              <Pressable
                onPress={handleClose}
                style={styles.modalCloseBtn}
                hitSlop={10}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </Pressable>
            </View>

            <ScrollView
              ref={scrollRef}
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.profileCenter}>
                <View style={styles.profileAvatarWrap}>
                  <View style={styles.profileAvatar}>
                    {draft.imageUri ? (
                      <Image
                        source={{ uri: draft.imageUri }}
                        style={styles.profileAvatarImage}
                      />
                    ) : (
                      <Ionicons name="person" size={38} color="#fff" />
                    )}
                  </View>

                  <Pressable
                    onPress={pickImage}
                    style={styles.cameraBadge}
                    hitSlop={8}
                  >
                    <Ionicons name="camera" size={14} color={COLORS.primary} />
                  </Pressable>
                </View>

                <TextInput
                  value={draft.name}
                  onFocus={() => scrollToY(0)}
                  onChangeText={(text) => {
                    setDraft((prev) => ({ ...prev, name: text }));
                    setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  style={styles.profileNameInput}
                  placeholder="이름 입력"
                  placeholderTextColor="rgba(17,24,39,0.35)"
                  textAlign="center"
                  returnKeyType="done"
                />

                <Text style={styles.roleText}>
                  {draft.roleLabel ??
                    (draft.role === "user" ? "사용자" : "보호자")}
                </Text>

                {!!errors.name && (
                  <Text style={styles.nameErrorText}>{errors.name}</Text>
                )}
              </View>

              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <View style={styles.infoLeft}>
                    <Ionicons
                      name="key-outline"
                      size={18}
                      color="rgba(17,24,39,0.55)"
                    />
                    <Text style={styles.infoLabel}>ID</Text>
                  </View>

                  <TextInput
                    value={draft.userId}
                    onFocus={() => scrollToY(20)}
                    onChangeText={(text) => {
                      setDraft((prev) => ({ ...prev, userId: text }));
                      setErrors((prev) => ({ ...prev, userId: undefined }));
                    }}
                    style={styles.infoInput}
                    placeholder="아이디 입력"
                    placeholderTextColor="rgba(17,24,39,0.28)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                </View>
                {!!errors.userId && (
                  <Text style={styles.modalErrorText}>{errors.userId}</Text>
                )}

                <View style={styles.cardDivider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoLeft}>
                    <Ionicons
                      name="mail-outline"
                      size={18}
                      color="rgba(17,24,39,0.55)"
                    />
                    <Text style={styles.infoLabel}>이메일</Text>
                  </View>

                  <TextInput
                    value={draft.email}
                    onFocus={() => scrollToY(70)}
                    onChangeText={(text) => {
                      setDraft((prev) => ({ ...prev, email: text }));
                      setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    style={styles.infoInput}
                    placeholder="이메일 입력"
                    placeholderTextColor="rgba(17,24,39,0.28)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                </View>
                {!!errors.email && (
                  <Text style={styles.modalErrorText}>{errors.email}</Text>
                )}

                <View style={styles.cardDivider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoLeft}>
                    <Ionicons
                      name="call-outline"
                      size={18}
                      color="rgba(17,24,39,0.55)"
                    />
                    <Text style={styles.infoLabel}>전화번호</Text>
                  </View>

                  <Pressable
                    style={styles.profilePhoneBox}
                    onPress={() => {
                      scrollToY(120);
                      phoneInputRef.current?.focus();
                    }}
                  >
                    <View style={styles.profilePhoneDisplayRow}>
                      <Text
                        style={[
                          styles.phoneCellText,
                          styles.phoneCellA,
                          !phoneA && styles.phonePlaceholder,
                        ]}
                      >
                        {phoneA || "000"}
                      </Text>

                      <Text style={styles.profilePhoneHyphen}>-</Text>

                      <Text
                        style={[
                          styles.phoneCellText,
                          styles.phoneCellB,
                          !phoneB && styles.phonePlaceholder,
                        ]}
                      >
                        {phoneB || "0000"}
                      </Text>

                      <Text style={styles.profilePhoneHyphen}>-</Text>

                      <Text
                        style={[
                          styles.phoneCellText,
                          styles.phoneCellB,
                          !phoneC && styles.phonePlaceholder,
                        ]}
                      >
                        {phoneC || "0000"}
                      </Text>
                    </View>

                    <TextInput
                      ref={phoneInputRef}
                      style={styles.hiddenPhoneInput}
                      value={phoneDigits}
                      onFocus={() => scrollToY(120)}
                      onChangeText={(text) => {
                        setPhoneDigits(onlyDigits(text));
                        setErrors((prev) => ({ ...prev, phone: undefined }));
                      }}
                      keyboardType="number-pad"
                      maxLength={11}
                      returnKeyType="done"
                      caretHidden
                      contextMenuHidden
                    />
                  </Pressable>
                </View>
                {!!errors.phone && (
                  <Text style={styles.modalErrorText}>{errors.phone}</Text>
                )}
              </View>

              <View style={styles.linkedHeader}>
                <Ionicons
                  name="person-outline"
                  size={16}
                  color="rgba(17,24,39,0.6)"
                />
                <Text style={styles.linkedTitle}>
                  연결된 대상자 ({draftTargets.length})
                </Text>
              </View>

              <View style={styles.targetsCard}>
                {draftTargets.length === 0 ? (
                  <View style={styles.emptyTargetsBox}>
                    <Text style={styles.emptyTargetsText}>
                      연결된 대상자가 없습니다.
                    </Text>
                  </View>
                ) : (
                  draftTargets.map((target, index) => (
                    <View key={target.id}>
                      <View style={styles.targetRow}>
                        <View style={styles.targetAvatar}>
                          <Ionicons name="happy" size={18} color="#fff" />
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.targetName}>{target.name}</Text>
                          <Text style={styles.targetSub}>{target.sub}</Text>
                        </View>

                        <Pressable
                          onPress={() => removeTarget(target.id)}
                          style={styles.trashBtn}
                          hitSlop={10}
                        >
                          <Ionicons
                            name="trash"
                            size={18}
                            color={COLORS.danger}
                          />
                        </Pressable>
                      </View>

                      {index !== draftTargets.length - 1 && (
                        <View style={styles.divider} />
                      )}
                    </View>
                  ))
                )}
              </View>

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
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { backgroundColor: COLORS.primary },
  body: { flex: 1 },

  map: {
    flex: 1,
    backgroundColor: "#DCEEFF",
    position: "relative",
    overflow: "hidden",
  },

  mockMap: {
    flex: 1,
    backgroundColor: "#DCEEFF",
    position: "relative",
    overflow: "hidden",
  },

  mockMapCanvas: {
    ...StyleSheet.absoluteFillObject,
  },

  draggableMapGroup: {
    ...StyleSheet.absoluteFillObject,
  },

  mockRoad: {
    position: "absolute",
    backgroundColor: "rgba(100,116,139,0.40)",
  },

  roadVerticalLeft: {
    left: 90,
    top: 0,
    bottom: 0,
    width: 9,
  },

  roadVerticalCenter: {
    left: 288,
    top: 98,
    bottom: 105,
    width: 7,
    opacity: 0.28,
  },

  roadVerticalRight: {
    right: 57,
    top: 292,
    bottom: 95,
    width: 7,
    opacity: 0.28,
  },

  roadHorizontalTop: {
    left: 0,
    right: 0,
    top: 190,
    height: 8,
    opacity: 0.26,
  },

  roadHorizontalMiddle: {
    left: 0,
    right: 0,
    top: 384,
    height: 9,
  },

  roadHorizontalBottom: {
    left: 0,
    right: 96,
    bottom: 388,
    height: 8,
    opacity: 0.24,
  },

  mockDiagonalRoad: {
    position: "absolute",
    left: 95,
    top: 390,
    width: 350,
    height: 9,
    backgroundColor: "rgba(100,116,139,0.40)",
    transform: [{ rotate: "49deg" }],
  },

  safeZone: {
    position: "absolute",
    left: 92,
    top: 92,
    width: 178,
    height: 178,
    borderRadius: 89,
    borderWidth: 3,
    borderColor: "rgba(255,47,69,0.58)",
    backgroundColor: "rgba(255,47,69,0.09)",
    shadowColor: "#FF2F45",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },

  routeLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 6,
  },

  routePathSegment: {
    position: "absolute",
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(37,99,235,0.88)",
    zIndex: 6,
  },

  routeDotGuardian: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: "#fff",
    zIndex: 8,
  },

  routeDotDanger: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF2F45",
    borderWidth: 2,
    borderColor: "#fff",
    zIndex: 8,
  },

  routeMiniBox: {
    position: "absolute",
    height: 26,
    width: 108,
    borderRadius: 8,
    backgroundColor: "#fff",
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.18)",
    zIndex: 9,
    ...SHADOW.card,
  },

  routeMiniTitle: {
    fontSize: 0,
    height: 0,
  },

  routeMiniText: {
    marginTop: 0,
    fontSize: 10.5,
    fontWeight: "900",
    color: "#334155",
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
    zIndex: 20,
    elevation: 0,
    shadowOpacity: 0,
  },

  routeBtnActive: {
    borderWidth: 2,
    borderColor: "rgba(37,99,235,0.28)",
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
    bottom: 18,
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

  rightBtnPrimary: {
    backgroundColor: COLORS.primary,
  },

  walkIcon: {
    fontSize: 27,
  },

  sosBtn: {
    position: "absolute",
    left: "50%",
    bottom: 56,
    width: 170,
    height: 44,
    marginLeft: -85,
    borderRadius: 13,
    backgroundColor: "#FF2F45",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    zIndex: 20,
    ...SHADOW.card,
  },

  sosBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },

  targetGreenWrap: {
    position: "absolute",
    left: 160,
    top: 150,
    alignItems: "center",
    zIndex: 8,
  },

  targetOrangeWrap: {
    position: "absolute",
    left: 70,
    top: 280,
    alignItems: "center",
    zIndex: 9,
  },

  personMarkerRingGreen: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...SHADOW.soft,
  },

  personMarkerRingOrange: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...SHADOW.soft,
  },

  personCircleGreen: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#12B85C",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  personCircleOrange: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F97316",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  personEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },

  greenName: {
    marginTop: -1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: "#12B85C",
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
  },

  orangeName: {
    marginTop: -1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: "#F04A16",
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
  },

  markerAlertBadgeSmall: {
    position: "absolute",
    top: -20,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FF2F45",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
    ...SHADOW.soft,
  },

  markerAlertText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 17,
  },

  guardianWrap: {
    position: "absolute",
    left: "50%",
    bottom: 60,
    marginLeft: -23,
    alignItems: "center",
    zIndex: 10,
  },

  guardianMarkerRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...SHADOW.soft,
  },

  guardianCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  guardianName: {
    marginTop: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
  },

  placeSchool: {
    position: "absolute",
    left: 156,
    top: 206,
    alignItems: "center",
  },

  placePolice: {
    position: "absolute",
    right: 18,
    top: 223,
    alignItems: "center",
  },

  placeLibrary: {
    position: "absolute",
    right: 105,
    top: 324,
    alignItems: "center",
  },

  placeMart: {
    position: "absolute",
    left: 162,
    bottom: 318,
    alignItems: "center",
  },

  placeFood: {
    position: "absolute",
    right: 150,
    bottom: 405,
    alignItems: "center",
  },

  placeEmoji: {
    fontSize: 15,
  },

  placeText: {
    marginTop: 2,
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
  },

  sosNoticeBox: {
    position: "absolute",
    top: 12,
    left: "50%",
    width: 286,
    minHeight: 46,
    marginLeft: -143,
    borderRadius: 13,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    ...SHADOW.card,
  },

  sosNoticeLeft: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingRight: 24,
  },

  sosNoticeCloseBtn: {
    position: "absolute",
    right: 10,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  noticeAlertIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF2F45",
    alignItems: "center",
    justifyContent: "center",
  },

  noticeAlertText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 17,
  },

  sosNoticeText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
  },

  dangerPopupBox: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 270,
    marginLeft: -134,
    marginTop: -116,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1.2,
    borderColor: "rgba(249,115,22,0.58)",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    zIndex: 80,
    ...SHADOW.card,
  },

  dangerPopupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },

  dangerPopupTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  dangerPopupCloseBtn: {
    width: 30,
    height: 30,
    marginRight: -3,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },

  dangerAlertList: {
    gap: 7,
  },

  dangerAlertItem: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  dangerAlertItemSos: {
    backgroundColor: "rgba(255,47,69,0.06)",
    borderColor: "rgba(255,47,69,0.22)",
  },

  dangerAlertItemGeofence: {
    backgroundColor: "rgba(249,115,22,0.07)",
    borderColor: "rgba(249,115,22,0.25)",
  },

  dangerAlertItemHeart: {
    backgroundColor: "rgba(250,204,21,0.10)",
    borderColor: "rgba(234,179,8,0.36)",
  },

  dangerAlertIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  dangerAlertIconSos: {
    backgroundColor: "rgba(255,47,69,0.10)",
  },

  dangerAlertIconGeofence: {
    backgroundColor: "rgba(249,115,22,0.11)",
  },

  dangerAlertIconHeart: {
    backgroundColor: "rgba(234,179,8,0.12)",
  },

  dangerAlertTitle: {
    fontSize: 12.5,
    fontWeight: "900",
  },

  dangerAlertTitleSos: {
    color: "#DC2626",
  },

  dangerAlertTitleGeofence: {
    color: "#EA580C",
  },

  dangerAlertTitleHeart: {
    color: "#B45309",
  },

  dangerAlertTime: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },

  modeScreen: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },

  satelliteScreen: {
    backgroundColor: "#1E3A2F",
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

  satelliteGrid: {
    ...StyleSheet.absoluteFillObject,
  },

  satelliteBlockLarge: {
    position: "absolute",
    left: 28,
    top: 96,
    width: 190,
    height: 160,
    backgroundColor: "rgba(34,197,94,0.22)",
    transform: [{ rotate: "10deg" }],
  },

  satelliteBlockSmall: {
    position: "absolute",
    right: 32,
    bottom: 130,
    width: 150,
    height: 150,
    backgroundColor: "rgba(234,179,8,0.18)",
    transform: [{ rotate: "-18deg" }],
  },

  satelliteRoad: {
    position: "absolute",
    left: -40,
    top: 330,
    width: 620,
    height: 24,
    backgroundColor: "rgba(226,232,240,0.22)",
    transform: [{ rotate: "31deg" }],
  },

  satelliteRoadSecond: {
    position: "absolute",
    left: 120,
    top: -30,
    width: 28,
    height: 900,
    backgroundColor: "rgba(226,232,240,0.18)",
    transform: [{ rotate: "-8deg" }],
  },

  roadViewMock: {
    ...StyleSheet.absoluteFillObject,
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

  mapLoading: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -18,
    marginTop: -18,
    zIndex: 2,
  },

  mapErrorBox: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    zIndex: 3,
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
  },

  targetModalDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  targetModalKeyboard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  targetSheet: {
    width: "88%",
    maxHeight: "88%",
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    alignSelf: "center",
    ...SHADOW.floating,
  },

  targetModalTop: {
    height: 50,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  targetModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
  },

  targetCloseBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  targetForm: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
  },

  targetInputBlock: {
    marginBottom: 12,
  },

  targetLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 9,
  },

  targetLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
  },

  targetInput: {
    height: 46,
    borderRadius: 13,
    borderWidth: 1.2,
    borderColor: "rgba(148,163,184,0.35)",
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  selectBox: {
    height: 46,
    borderRadius: 13,
    borderWidth: 1.2,
    borderColor: "rgba(148,163,184,0.35)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  selectInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  addressBox: {
    height: 46,
    borderRadius: 13,
    borderWidth: 1.2,
    borderColor: "rgba(148,163,184,0.35)",
    paddingLeft: 14,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  addressInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },

  searchBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  targetGuideBox: {
    borderRadius: 12,
    backgroundColor: "rgba(59,130,246,0.08)",
    borderWidth: 1.2,
    borderColor: "rgba(59,130,246,0.28)",
    padding: 10,
    marginBottom: 16,
  },

  targetGuideText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    color: "#475569",
  },

  targetBottomBtns: {
    flexDirection: "row",
    gap: 12,
  },

  cancelBtn: {
    flex: 1,
    height: 45,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "rgba(148,163,184,0.28)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },

  cancelBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#475569",
  },

  registerBtn: {
    flex: 1,
    height: 45,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.card,
  },

  registerBtnText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#fff",
  },

  modalDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  modalKeyboard: {
    flex: 1,
  },

  modalCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 0,
  },

  modalSheet: {
    width: "88%",
    maxHeight: "88%",
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    ...SHADOW.floating,
  },

  modalScroll: {
    flexGrow: 0,
  },

  modalScrollContent: {
    paddingBottom: 120,
  },

  modalTop: {
    height: 50,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  modalTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 1,
  },

  modalCloseBtn: {
    width: 28,
    height: 28,
    marginRight: -4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },

  profileCenter: {
    alignItems: "center",
    paddingTop: 22,
    paddingBottom: 8,
  },

  profileAvatarWrap: {
    position: "relative",
    width: 86,
    height: 86,
  },

  profileAvatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...SHADOW.card,
  },

  profileAvatarImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },

  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    ...SHADOW.card,
  },

  profileNameInput: {
    marginTop: 10,
    minWidth: 140,
    maxWidth: 220,
    height: 30,
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    paddingVertical: 0,
    paddingHorizontal: 0,
  },

  nameErrorText: {
    marginTop: 2,
    fontSize: 11.5,
    fontWeight: "800",
    color: COLORS.danger,
    textAlign: "center",
  },

  infoCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 0,
    borderWidth: 0,
    borderColor: "transparent",
    overflow: "visible",
  },

  cardDivider: {
    height: 1,
    backgroundColor: "rgba(17,24,39,0.06)",
    marginLeft: 16,
    marginRight: 16,
  },

  infoRow: {
    minHeight: 50,
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7.5,
  },

  infoLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "rgba(17,24,39,0.58)",
  },

  infoInput: {
    flex: 1,
    maxWidth: 190,
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(14,19,32,0.75)",
    textAlign: "right",
    borderWidth: 0,
    backgroundColor: "transparent",
    paddingVertical: 0,
    paddingHorizontal: 0,
    includeFontPadding: false,
  },

  modalErrorText: {
    marginTop: -6,
    marginBottom: 8,
    marginHorizontal: 16,
    fontSize: 11.5,
    fontWeight: "800",
    color: COLORS.danger,
    textAlign: "right",
  },

  profilePhoneBox: {
    minWidth: 108,
    alignItems: "flex-end",
    justifyContent: "center",
    position: "relative",
  },

  profilePhoneDisplayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },

  phoneCellText: {
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(14,19,32,0.75)",
    textAlign: "center",
    includeFontPadding: false,
  },

  phoneCellA: {
    width: 25,
  },

  phoneCellB: {
    width: 34,
  },

  phonePlaceholder: {
    color: "rgba(17,24,39,0.30)",
  },

  profilePhoneHyphen: {
    width: 5,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(17,24,39,0.45)",
    includeFontPadding: false,
  },

  hiddenPhoneInput: {
    position: "absolute",
    opacity: 0,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },

  linkedHeader: {
    marginTop: 16,
    marginHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  linkedTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "rgba(17,24,39,0.70)",
  },

  targetsCard: {
    marginHorizontal: 16,
    marginTop: 10,
    minHeight: 132,
    maxHeight: 160,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.06)",
    overflow: "hidden",
  },

  targetRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  divider: {
    height: 1,
    backgroundColor: "rgba(17,24,39,0.06)",
    marginLeft: 64,
  },

  emptyTargetsBox: {
    flex: 1,
    minHeight: 132,
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

  targetName: {
    fontSize: 15.5,
    fontWeight: "900",
    color: "#111827",
  },

  targetSub: {
    marginTop: 3,
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

  modalBottomBtns: {
    padding: 16,
    flexDirection: "row",
    gap: 12,
  },

  bottomBtn: {
    flex: 1,
    height: 45,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  bottomBtnText: {
    fontSize: 16,
    fontWeight: "900",
  },

  btnPrimary: {
    backgroundColor: COLORS.primary,
  },

  btnPrimaryText: {
    color: "#fff",
  },

  btnGhost: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.10)",
  },

  btnGhostText: {
    color: "rgba(17,24,39,0.75)",
  },

  loginToastWrap: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 999,
  },

  loginToastBox: {
    minHeight: 46,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: "rgba(235,255,243,0.95)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
    flexDirection: "row",
    alignItems: "center",
    ...SHADOW.soft,
  },

  loginToastText: {
    marginLeft: 7,
    fontSize: 15,
    fontWeight: "800",
    color: "#047857",
  },
  roleText: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(17,24,39,0.45)",
    textAlign: "center",
  },
});
