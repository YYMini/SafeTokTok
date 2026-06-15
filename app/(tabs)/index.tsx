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
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

type ConnectionApiResponse = {
  id: number;
  name: string;
  age?: number | null;
  loginId?: string;
  role: "PARENT" | "CHILD";
};

type ChildDraft = {
  name: string;
  age: string;
  loginId: string;
  password: string;
};

const PROFILE_KEY = "profileData_v1";
const TARGETS_KEY = "linkedTargets_v1";
const LOGIN_KEY = "isLoggedIn";
const CURRENT_USER_ID_KEY = "currentUserId";
const CURRENT_USER_ROLE_KEY = "currentUserRole";
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
};

type TooltipField = "userId" | "email" | "phone" | null;

export default function TrackingDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [linkedTargets, setLinkedTargets] = useState<Target[]>(DEFAULT_TARGETS);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [savedProfile, savedUserId, savedRole] = await Promise.all([
          AsyncStorage.getItem(PROFILE_KEY),
          AsyncStorage.getItem(CURRENT_USER_ID_KEY),
          AsyncStorage.getItem(CURRENT_USER_ROLE_KEY),
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
            phone: parsed.phone ?? DEFAULT_PROFILE.phone,
            imageUri: parsed.imageUri ?? null,
          });
        }

        setLinkedTargets([]);
      } catch {
        // ignore
      }
    })();
  }, []);

  const toTarget = (child: ChildApiResponse): Target => ({
    id: String(child.childId),
    name: child.name,
    sub: `${child.age ?? "-"}세 자녀`,
    age: child.age ?? undefined,
    loginId: child.loginId,
    latitude: child.latitude,
    longitude: child.longitude,
  });

  const toConnectionTarget = (connection: ConnectionApiResponse): Target => ({
    id: `${connection.role}-${connection.id}`,
    name: connection.name,
    sub:
      connection.role === "PARENT"
        ? "부모"
        : `${connection.age ?? "-"}세 자녀`,
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
      Alert.alert("자녀 추가 실패", "로그인 사용자 정보를 찾을 수 없습니다.");
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
        name: child.name.trim(),
        age: Number(child.age),
        loginId: child.loginId.trim(),
        password: child.password,
      }),
    });

    if (!response.ok) {
      let message = `자녀 추가에 실패했습니다. (HTTP ${response.status})`;
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
    const nextTargets = [...linkedTargets, createdTarget];
    await saveTargets(nextTargets);
    return createdTarget;
  };

  const deleteChild = async (target: Target) => {
    const childId = Number(target.id);
    if (!Number.isFinite(childId)) {
      throw new Error("삭제할 자녀 정보를 확인할 수 없습니다.");
    }

    const response = await fetch(`${API_BASE_URL}/api/children/${childId}`, {
      method: "DELETE",
      headers: {
        ...(currentUserId ? { "X-User-Id": String(currentUserId) } : {}),
        "X-Login-Id": profile.userId,
      },
    });

    if (!response.ok) {
      let message = `자녀 삭제에 실패했습니다. (HTTP ${response.status})`;
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
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
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

      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Header
          roleLabel={profile.name}
          showLogout={false}
          profileImageUri={profile.imageUri}
          onPressSettings={() => router.push("/settings")}
          onPressRole={() => setProfileOpen(true)}
        />
      </View>

      <View style={styles.body}>
        <MapPlaceholder currentUserId={currentUserId} currentUserRole={currentUserRole} />
      </View>

      <ProfileModal
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
        linkedTargets={linkedTargets}
        profile={profile}
        onSaveProfile={saveProfile}
        onSaveTargets={saveTargets}
        onAddChild={addChild}
        onDeleteChild={deleteChild}
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
}: {
  currentUserId: number | null;
  currentUserRole: string | null;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const mobileWebViewRef = useRef<WebView>(null);
  const markersRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<number | null>(null);
  const latestUserIdRef = useRef<number | null>(currentUserId);
  const latestUserRoleRef = useRef<string | null>(currentUserRole);
  const hasRenderedMarkersRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [errorText, setErrorText] = useState("");

  const mobileMapHtml = `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
        <style>
          html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
        </style>
        <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=d74e3a0d741775a29ef17516bf90fe89&autoload=false"></script>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map;
          var markers = [];
          var overlays = [];

          function clearMarkers() {
            markers.forEach(function(marker) { marker.setMap(null); });
            overlays.forEach(function(overlay) { overlay.setMap(null); });
            markers = [];
            overlays = [];
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
            clearMarkers();

            var bounds = new kakao.maps.LatLngBounds();

            targets.forEach(function(target) {
              var position = new kakao.maps.LatLng(target.latitude, target.longitude);
              var marker = new kakao.maps.Marker({ position: position, map: map });
              var overlay = new kakao.maps.CustomOverlay({
                position: position,
                yAnchor: 2.2,
                content: '<div style="background:white;border:1px solid #2563eb;border-radius:12px;padding:4px 8px;font-size:12px;font-weight:700;color:#2563eb;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.18);">' + escapeHtml(target.name) + '</div>'
              });
              overlay.setMap(map);
              markers.push(marker);
              overlays.push(overlay);
              bounds.extend(position);
            });

            if (targets.length === 1) {
              map.setCenter(bounds.getSouthWest());
              map.setLevel(3);
            } else if (targets.length > 1) {
              map.setBounds(bounds);
            }
          }

          document.addEventListener('message', function(event) {
            try {
              var payload = JSON.parse(event.data);
              if (payload.type === 'markers') renderTargets(payload.targets);
            } catch (e) {}
          });

          window.addEventListener('message', function(event) {
            try {
              var payload = JSON.parse(event.data);
              if (payload.type === 'markers') renderTargets(payload.targets);
            } catch (e) {}
          });

          kakao.maps.load(function() {
            map = new kakao.maps.Map(document.getElementById('map'), {
              center: new kakao.maps.LatLng(37.5665, 126.9780),
              level: 3
            });
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
          });
        </script>
      </body>
    </html>
  `;

  useEffect(() => {
    latestUserIdRef.current = currentUserId;
    latestUserRoleRef.current = currentUserRole;
  }, [currentUserId, currentUserRole]);

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

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const groups = new Map<
      string,
      {
        latitude: number;
        longitude: number;
        targets: typeof targets;
      }
    >();

    targets.forEach((target) => {
      const key = `${target.latitude.toFixed(4)},${target.longitude.toFixed(4)}`;
      const group = groups.get(key);
      if (group) {
        const nextCount = group.targets.length + 1;
        group.latitude =
          (group.latitude * group.targets.length + target.latitude) / nextCount;
        group.longitude =
          (group.longitude * group.targets.length + target.longitude) / nextCount;
        group.targets.push(target);
      } else {
        groups.set(key, {
          latitude: target.latitude,
          longitude: target.longitude,
          targets: [target],
        });
      }
    });

    groups.forEach((group) => {
      const position = new window.kakao.maps.LatLng(
        group.latitude,
        group.longitude,
      );
      const isGroup = group.targets.length > 1;
      const labelText = isGroup
        ? `${group.targets.length}명`
        : escapeHtml(group.targets[0].name);

      const marker = new window.kakao.maps.Marker({
        position,
        map: mapInstanceRef.current,
      });
      const content = `
        <div style="
          background: white;
          border: 1px solid #2563eb;
          border-radius: 12px;
          padding: 4px 8px;
          font-size: 12px;
          font-weight: 600;
          color: #2563eb;
          white-space: nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        ">
          ${labelText}
        </div>
      `;

      const overlay = new window.kakao.maps.CustomOverlay({
        position,
        content,
        yAnchor: 2.2,
      });

      overlay.setMap(mapInstanceRef.current);

      if (isGroup) {
        const names = group.targets
          .map((target) => `<li style="padding:2px 0;">${escapeHtml(target.name)}</li>`)
          .join("");
        const popup = new window.kakao.maps.CustomOverlay({
          position,
          yAnchor: 1.75,
          zIndex: 4,
          content: `
            <div style="
              min-width: 120px;
              background: white;
              border: 1px solid rgba(37,99,235,0.35);
              border-radius: 12px;
              padding: 8px 10px;
              box-shadow: 0 4px 14px rgba(0,0,0,0.18);
              font-size: 12px;
              color: #111827;
            ">
              <div style="font-weight: 800; color: #2563eb; margin-bottom: 4px;">이 위치의 대상자</div>
              <ul style="list-style:none; margin:0; padding:0;">${names}</ul>
            </div>
          `,
        });

        window.kakao.maps.event.addListener(marker, "click", () => {
          const isOpen = overlaysRef.current.includes(popup);
          overlaysRef.current
            .filter((item) => item.__groupPopup)
            .forEach((item) => item.setMap(null));
          overlaysRef.current = overlaysRef.current.filter((item) => !item.__groupPopup);

          if (!isOpen) {
            popup.__groupPopup = true;
            popup.setMap(mapInstanceRef.current);
            overlaysRef.current.push(popup);
          }
        });
      }

      markersRef.current.push(marker);
      overlaysRef.current.push(overlay);
    });
  };

  const renderMobileMarkers = (
    targets: {
      childId: number;
      name: string;
      latitude: number;
      longitude: number;
    }[],
  ) => {
    mobileWebViewRef.current?.postMessage(
      JSON.stringify({
        type: "markers",
        targets,
      }),
    );
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

      const response = await fetch(`${API_BASE_URL}/api/locations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": String(currentUserId),
        },
        body: JSON.stringify({
          childId: currentUserId,
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

      if (Array.isArray(data) && data.length > 0) {
        if (Platform.OS === "web") {
          renderMarkers(data);
        } else {
          renderMobileMarkers(data);
        }
        hasRenderedMarkersRef.current = true;
        setIsReady(true);
      } else if (!hasRenderedMarkersRef.current) {
        setIsReady(true);
      }
    } catch (error) {
      console.log("최신 위치 조회 실패", error);
      setErrorText(`최신 위치 조회 실패: ${getApiAddressHint()}`);
    }
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
        (location) => {
          sendLocationToServer(
            location.coords.latitude,
            location.coords.longitude,
          );
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
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [currentUserId, currentUserRole]);

  if (Platform.OS !== "web") {
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

        <WebView
          ref={mobileWebViewRef}
          source={{ html: mobileMapHtml }}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          onMessage={(event) => {
            try {
              const payload = JSON.parse(event.nativeEvent.data);
              if (payload.type === "ready") {
                fetchLatestLocations();
              }
            } catch {
              // ignore
            }
          }}
          style={{ flex: 1, backgroundColor: "#DCEEFF" }}
        />
      </View>
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

      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
    </View>
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
              i < len && styles.charTransparent,
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
  canManageChildren: boolean;
}) {
  const [draft, setDraft] = useState<Profile>(profile);
  const [draftTargets, setDraftTargets] = useState<Target[]>(linkedTargets);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [tooltipField, setTooltipField] = useState<TooltipField>(null);
  const [childModalOpen, setChildModalOpen] = useState(false);
  const [childDraft, setChildDraft] = useState<ChildDraft>({
    name: "",
    age: "",
    loginId: "",
    password: "",
  });
  const [childError, setChildError] = useState("");
  const [addingChild, setAddingChild] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Target | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deletingChild, setDeletingChild] = useState(false);

  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [editingKey, setEditingKey] = useState<
    null | "userId" | "email" | "phone"
  >(null);

  const userIdRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  const [userIdSelection, setUserIdSelection] = useState({
    start: profile.userId.length,
    end: profile.userId.length,
  });
  const [emailSelection, setEmailSelection] = useState({
    start: profile.email.length,
    end: profile.email.length,
  });

  const [digitW, setDigitW] = useState<number>(14);
  const [digitH, setDigitH] = useState<number>(20);

  const A_BASE = "010";
  const B_BASE = "0000";

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

  const validateAll = () => {
    const nextErrors: FieldErrors = {
      userId: validateUserId(draft.userId),
      email: validateEmail(draft.email),
      phone: validatePhone(phoneDigits),
    };

    setErrors(nextErrors);
    clearTooltipTimer();
    setTooltipField(null);

    return !nextErrors.userId && !nextErrors.email && !nextErrors.phone;
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
    setChildDraft({ name: "", age: "", loginId: "", password: "" });
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

    setChildDraft({ name: "", age: "", loginId: "", password: "" });
    setChildError("");
    setAddingChild(false);
  }, [childModalOpen]);

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

  const enterEdit = (field: "userId" | "email" | "phone") => {
    setEditingName(false);
    clearTooltipTimer();
    setTooltipField(null);

    if (editingKey === field) return;
    setEditingKey(field);

    if (field === "phone") {
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 0);
      return;
    }

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
      name: childDraft.name.trim(),
      age: childDraft.age.trim(),
      loginId: childDraft.loginId.trim(),
      password: childDraft.password,
    };

    if (!trimmed.name || !trimmed.age || !trimmed.loginId || !trimmed.password) {
      setChildError("자녀 이름, 나이, 아이디, 비밀번호를 모두 입력해주세요.");
      return;
    }

    const ageNumber = Number(trimmed.age);
    if (!Number.isInteger(ageNumber) || ageNumber <= 0) {
      setChildError("나이는 숫자로 입력해주세요.");
      return;
    }

    setAddingChild(true);
    try {
      const created = await onAddChild(trimmed);
      setDraftTargets((prev) => [...prev, created]);
      setChildDraft({ name: "", age: "", loginId: "", password: "" });
      setChildError("");
      setChildModalOpen(false);
    } catch (error) {
      console.log("자녀 추가 실패", error);
      setChildError(
        error instanceof Error
          ? error.message
          : "자녀 추가에 실패했습니다. 서버 상태를 확인해주세요.",
      );
    } finally {
      setAddingChild(false);
    }
  };

  const onSave = async () => {
    const isValid = validateAll();
    if (!isValid) return;

    const phone = `${aView}-${bView}-${cView}`;
    const nextProfile = {
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

      <View
        style={{ position: "absolute", opacity: 0, left: -9999, top: -9999 }}
      >
        <Text
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 0) setDigitW(width);
            if (height > 0) setDigitH(height);
          }}
          style={{
            fontSize: 14,
            fontWeight: "800",
            fontVariant:
              Platform.OS === "ios" ? (["tabular-nums"] as any) : undefined,
            letterSpacing: 0,
            includeFontPadding: false,
          }}
        >
          0
        </Text>
      </View>

      <View style={styles.modalCenter} pointerEvents="box-none">
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
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable onPress={hideKeyboardAndTooltip}>
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
                      autoFocus
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
                        setEditingName(true);
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

                <View style={styles.cardDivider} />
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
                <ScrollView
                  style={styles.targetsScroll}
                  contentContainerStyle={styles.targetsScrollContent}
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
                        연결된 대상자가 없습니다.
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
                    <Text style={styles.addChildBtnText}>자녀 추가하기</Text>
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
            </Pressable>
          </ScrollView>
        </View>
      </View>
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
            <Text style={styles.childModalTitle}>자녀 추가하기</Text>
            <Pressable
              onPress={() => setChildModalOpen(false)}
              style={styles.modalCloseBtn}
              hitSlop={10}
            >
              <Ionicons name="close" size={12} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.childModalBody}>
            <TextInput
              value={childDraft.name}
              onChangeText={(text) => changeChildDraft("name", text)}
              placeholder="자녀 이름"
              placeholderTextColor="rgba(17,24,39,0.35)"
              style={styles.childInput}
              returnKeyType="next"
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
            <TextInput
              value={childDraft.loginId}
              onChangeText={(text) => changeChildDraft("loginId", text)}
              placeholder="자녀 로그인 아이디"
              placeholderTextColor="rgba(17,24,39,0.35)"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.childInput}
              returnKeyType="next"
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
            />
            <TextInput
              value={childDraft.password}
              onChangeText={(text) => changeChildDraft("password", text)}
              placeholder="비밀번호"
              placeholderTextColor="rgba(17,24,39,0.35)"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.childInput}
              returnKeyType="done"
              onSubmitEditing={submitChild}
              autoComplete="new-password"
              textContentType="newPassword"
              importantForAutofill="no"
            />

            {!!childError && (
              <Text style={styles.childErrorText}>{childError}</Text>
            )}

            <Pressable
              style={[styles.childSaveBtn, addingChild && { opacity: 0.55 }]}
              onPress={submitChild}
              disabled={addingChild}
            >
              <Text style={styles.childSaveBtnText}>
                {addingChild ? "저장 중..." : "저장"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { backgroundColor: COLORS.primary },
  body: { flex: 1 },

  map: { flex: 1, backgroundColor: "#DCEEFF" },
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
    maxHeight: "81%",
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "visible",
    ...SHADOW.floating,
  },

  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 0,
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
    backgroundColor: "rgba(59,130,246,0.85)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...SHADOW.card,
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
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  namePress: { height: 28, justifyContent: "center" },
  profileName: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    lineHeight: 24,
    textAlign: "center",
  },

  nameInput: {
    height: 28,
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    lineHeight: 24,
    textAlign: "center",
    borderWidth: 0,
    backgroundColor: "transparent",
    paddingVertical: 0,
    paddingHorizontal: 0,
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
    minWidth: 190,
    maxWidth: 230,
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
    minHeight: 135,
    maxHeight: 135,
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
    minHeight: 150,
  },
  targetRow: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  divider: { height: 1, backgroundColor: "rgba(17,24,39,0.06)" },

  emptyTargetsBox: {
    flex: 1,
    minHeight: 150,
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
    paddingHorizontal: 22,
  },
  childModalSheet: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    backgroundColor: "#fff",
    overflow: "hidden",
    ...SHADOW.floating,
  },
  childModalTop: {
    height: 50,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  childModalTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  childModalBody: {
    padding: 16,
    gap: 9,
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
