package com.safetoktok.wear;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity {
    static final String PREFS_NAME = "watch_settings";
    static final String KEY_SERVER_URL = "server_url";
    static final String KEY_CHILD_ID = "child_id";

    private EditText serverUrlInput;
    private EditText childIdInput;
    private TextView statusText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        SharedPreferences preferences = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String serverUrl = preferences.getString(KEY_SERVER_URL, getString(R.string.default_server_url));
        long childId = preferences.getLong(KEY_CHILD_ID, 1L);

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER_HORIZONTAL);
        int padding = dp(16);
        layout.setPadding(padding, padding, padding, padding);

        TextView title = new TextView(this);
        title.setText("SafeTokTok Watch");
        title.setTextSize(18);
        title.setGravity(Gravity.CENTER);
        layout.addView(title, fullWidth());

        serverUrlInput = new EditText(this);
        serverUrlInput.setSingleLine(false);
        serverUrlInput.setText(serverUrl);
        serverUrlInput.setHint("Server URL");
        layout.addView(serverUrlInput, fullWidth());

        childIdInput = new EditText(this);
        childIdInput.setSingleLine(true);
        childIdInput.setText(String.valueOf(childId));
        childIdInput.setHint("Child ID");
        layout.addView(childIdInput, fullWidth());

        Button startButton = new Button(this);
        startButton.setText("Start");
        startButton.setOnClickListener(view -> startTelemetry());
        layout.addView(startButton, fullWidth());

        Button stopButton = new Button(this);
        stopButton.setText("Stop");
        stopButton.setOnClickListener(view -> stopTelemetry());
        layout.addView(stopButton, fullWidth());

        statusText = new TextView(this);
        statusText.setText("Ready");
        statusText.setGravity(Gravity.CENTER);
        layout.addView(statusText, fullWidth());

        setContentView(layout);
        requestMissingPermissions();
    }

    private void startTelemetry() {
        saveSettings();
        if (!requestMissingPermissions()) {
            statusText.setText("Permission required");
            return;
        }

        Intent intent = new Intent(this, TelemetryService.class);
        startForegroundService(intent);
        statusText.setText("Sending telemetry");
    }

    private void stopTelemetry() {
        stopService(new Intent(this, TelemetryService.class));
        statusText.setText("Stopped");
    }

    private void saveSettings() {
        long childId = parseChildId(childIdInput.getText().toString());
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_SERVER_URL, serverUrlInput.getText().toString().trim())
                .putLong(KEY_CHILD_ID, childId)
                .apply();
    }

    private boolean requestMissingPermissions() {
        List<String> missing = new ArrayList<>();
        addIfMissing(missing, Manifest.permission.ACCESS_FINE_LOCATION);
        addIfMissing(missing, Manifest.permission.BODY_SENSORS);
        addIfMissing(missing, Manifest.permission.POST_NOTIFICATIONS);

        if (!missing.isEmpty()) {
            requestPermissions(missing.toArray(new String[0]), 1001);
            return false;
        }
        return true;
    }

    private void addIfMissing(List<String> missing, String permission) {
        if (checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) {
            missing.add(permission);
        }
    }

    private long parseChildId(String value) {
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException exception) {
            return 1L;
        }
    }

    private LinearLayout.LayoutParams fullWidth() {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(0, dp(4), 0, dp(4));
        return params;
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density);
    }
}
