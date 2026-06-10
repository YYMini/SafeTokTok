# SafeTokTok Wear

Galaxy Watch용 1차 워치 앱입니다. 워치에서 위치와 심박수를 수집해서 Spring Boot 백엔드의 `/api/watch/telemetry`로 전송합니다.

## 실행

Android Studio에서 `wear/` 폴더를 별도 프로젝트로 열고 Wear OS 에뮬레이터나 Galaxy Watch 기기에 실행합니다.

루트에서 Gradle로 빌드하려면:

```powershell
cd wear
..\backend\gradlew.bat assembleDebug
```

## 서버 URL

기본 서버 URL은 에뮬레이터 기준입니다.

```text
http://10.0.2.2:8080/api/watch/telemetry
```

실제 Galaxy Watch에서 테스트할 때는 PC와 워치를 같은 네트워크에 두고, 앱 화면의 Server URL을 PC LAN IP로 바꿔야 합니다.

```text
http://192.168.x.x:8080/api/watch/telemetry
```

백엔드는 기본적으로 `8080` 포트에서 실행합니다.
