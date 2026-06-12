# SafeTokTok Backend

## DB settings

The default backend configuration is prepared for a MySQL database server.

```powershell
$env:DB_URL="jdbc:mysql://localhost:3306/safetoktok?serverTimezone=Asia/Seoul&characterEncoding=UTF-8"
$env:DB_USERNAME="root"
$env:DB_PASSWORD="password"
$env:JPA_DDL_AUTO="update"
.\gradlew.bat bootRun
```

For quick local testing without MySQL, use the `local` profile. It stores data in an in-memory H2 database.

```powershell
.\gradlew.bat bootRun --args="--spring.profiles.active=local"
```

## Railway MySQL

Use the `railway` profile for the shared Railway MySQL database. Keep the password in environment variables only.

```powershell
$env:RAILWAY_DB_URL="jdbc:mysql://zephyr.proxy.rlwy.net:49115/railway?serverTimezone=Asia/Seoul&characterEncoding=UTF-8"
$env:RAILWAY_DB_USERNAME="root"
$env:RAILWAY_DB_PASSWORD="<Railway MySQL password>"
$env:JPA_DDL_AUTO="update"
.\gradlew.bat bootRun --args="--spring.profiles.active=railway"
```

When this profile is active, watch telemetry is stored in the `watch_telemetry` table.

## Watch telemetry API

The Galaxy Watch app sends location and heart-rate data here:

```text
POST /api/watch/telemetry
```

Example payload:

```json
{
  "childId": 1,
  "latitude": 37.1234,
  "longitude": 127.1234,
  "heartRate": 82.0,
  "recordedAt": 1710000000000,
  "source": "galaxy-watch"
}
```

Read latest data:

```text
GET /api/watch/telemetry/latest
GET /api/watch/telemetry/latest/{childId}
```
