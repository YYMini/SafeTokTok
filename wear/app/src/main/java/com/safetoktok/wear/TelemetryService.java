package com.safetoktok.wear;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.IBinder;
import android.util.Log;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class TelemetryService extends Service implements SensorEventListener, LocationListener {
    private static final String TAG = "SafeTokTokWear";
    private static final String CHANNEL_ID = "watch_telemetry";
    private static final long SEND_INTERVAL_SECONDS = 15L;

    private ScheduledExecutorService scheduler;
    private SensorManager sensorManager;
    private LocationManager locationManager;
    private Sensor heartRateSensor;
    private volatile Location lastLocation;
    private volatile Float lastHeartRate;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(1, createNotification());

        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);

        startHeartRateUpdates();
        startLocationUpdates();

        scheduler = Executors.newSingleThreadScheduledExecutor();
        scheduler.scheduleAtFixedRate(this::sendTelemetry, 3L, SEND_INTERVAL_SECONDS, TimeUnit.SECONDS);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (scheduler != null) {
            scheduler.shutdownNow();
        }
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
        if (locationManager != null) {
            locationManager.removeUpdates(this);
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void startHeartRateUpdates() {
        if (checkSelfPermission(Manifest.permission.BODY_SENSORS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        heartRateSensor = sensorManager.getDefaultSensor(Sensor.TYPE_HEART_RATE);
        if (heartRateSensor != null) {
            sensorManager.registerListener(this, heartRateSensor, SensorManager.SENSOR_DELAY_NORMAL);
        }
    }

    private void startLocationUpdates() {
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        try {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 10_000L, 5f, this);
            Location gpsLocation = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            if (gpsLocation != null) {
                lastLocation = gpsLocation;
            }
        } catch (IllegalArgumentException exception) {
            Log.w(TAG, "GPS provider is unavailable", exception);
        }
    }

    private void sendTelemetry() {
        SharedPreferences preferences = getSharedPreferences(MainActivity.PREFS_NAME, Context.MODE_PRIVATE);
        String serverUrl = preferences.getString(MainActivity.KEY_SERVER_URL, getString(R.string.default_server_url));
        long childId = preferences.getLong(MainActivity.KEY_CHILD_ID, 1L);

        Location location = lastLocation;
        Float heartRate = lastHeartRate;
        if (location == null && heartRate == null) {
            return;
        }

        try {
            JSONObject body = new JSONObject();
            body.put("childId", childId);
            body.put("latitude", location == null ? JSONObject.NULL : location.getLatitude());
            body.put("longitude", location == null ? JSONObject.NULL : location.getLongitude());
            body.put("heartRate", heartRate == null ? JSONObject.NULL : heartRate);
            body.put("recordedAt", System.currentTimeMillis());
            body.put("source", "galaxy-watch");

            byte[] payload = body.toString().getBytes(StandardCharsets.UTF_8);
            HttpURLConnection connection = (HttpURLConnection) new URL(serverUrl).openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(5_000);
            connection.setReadTimeout(5_000);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json; charset=UTF-8");
            connection.setFixedLengthStreamingMode(payload.length);

            try (OutputStream outputStream = connection.getOutputStream()) {
                outputStream.write(payload);
            }

            int responseCode = connection.getResponseCode();
            if (responseCode < 200 || responseCode >= 300) {
                Log.w(TAG, "Telemetry failed with HTTP " + responseCode);
            }
            connection.disconnect();
        } catch (Exception exception) {
            Log.w(TAG, "Telemetry send failed", exception);
        }
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_HEART_RATE && event.values.length > 0) {
            lastHeartRate = event.values[0];
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
    }

    @Override
    public void onLocationChanged(Location location) {
        lastLocation = location;
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {
    }

    @Override
    public void onProviderEnabled(String provider) {
    }

    @Override
    public void onProviderDisabled(String provider) {
    }

    private Notification createNotification() {
        return new Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("SafeTokTok Watch")
                .setContentText("Sending location and heart rate")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setOngoing(true)
                .build();
    }

    private void createNotificationChannel() {
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Watch telemetry",
                NotificationManager.IMPORTANCE_LOW
        );
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.createNotificationChannel(channel);
    }
}
