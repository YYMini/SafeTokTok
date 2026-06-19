package com.safetoktok.wear;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.view.Gravity;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity {
    static final String PREFS_NAME = "watch_settings";
    static final String KEY_SERVER_URL = "server_url";
    static final String KEY_CHILD_ID = "child_id";
    static final String KEY_TELEMETRY_STATUS = "telemetry_status";
    private static final int PERMISSION_REQUEST_CODE = 1001;

    private EditText serverUrlInput;
    private EditText childIdInput;
    private TextView statusText;
    private ScrollView scrollView;
    private boolean startAfterPermission;
    private final Handler statusHandler = new Handler(Looper.getMainLooper());
    private final Runnable statusUpdater = new Runnable() {
        @Override
        public void run() {
            String status = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                    .getString(KEY_TELEMETRY_STATUS, "Ready");
            statusText.setText(status);
            statusHandler.postDelayed(this, 1_000L);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        SharedPreferences preferences = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String serverUrl = preferences.getString(KEY_SERVER_URL, getString(R.string.default_server_url));
        long childId = preferences.getLong(KEY_CHILD_ID, 1L);

        scrollView = new ScrollView(this);
        scrollView.setFillViewport(true);
        scrollView.setVerticalScrollBarEnabled(true);
        scrollView.setSmoothScrollingEnabled(true);

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER_HORIZONTAL);
        int padding = dp(12);
        layout.setPadding(padding, padding, padding, padding);

        TextView title = new TextView(this);
        title.setText("SafeTokTok Watch");
        title.setTextSize(16);
        title.setGravity(Gravity.CENTER);
        layout.addView(title, fullWidth());

        serverUrlInput = new EditText(this);
        serverUrlInput.setSingleLine(true);
        serverUrlInput.setTextSize(12);
        serverUrlInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        serverUrlInput.setImeOptions(EditorInfo.IME_ACTION_NEXT);
        serverUrlInput.setSelectAllOnFocus(true);
        serverUrlInput.setText(serverUrl);
        serverUrlInput.setHint("Server URL");
        serverUrlInput.setOnEditorActionListener((view, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_NEXT) {
                childIdInput.requestFocus();
                return true;
            }
            return false;
        });
        layout.addView(serverUrlInput, fullWidth());

        childIdInput = new EditText(this);
        childIdInput.setSingleLine(true);
        childIdInput.setTextSize(14);
        childIdInput.setInputType(InputType.TYPE_CLASS_NUMBER);
        childIdInput.setImeOptions(EditorInfo.IME_ACTION_DONE);
        childIdInput.setSelectAllOnFocus(true);
        childIdInput.setText(String.valueOf(childId));
        childIdInput.setHint("Child ID");
        childIdInput.setOnEditorActionListener((view, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_DONE) {
                childIdInput.clearFocus();
                scrollView.post(() -> scrollView.fullScroll(ScrollView.FOCUS_DOWN));
                return false;
            }
            return false;
        });
        layout.addView(childIdInput, fullWidth());

        LinearLayout buttonRow = new LinearLayout(this);
        buttonRow.setOrientation(LinearLayout.HORIZONTAL);
        buttonRow.setGravity(Gravity.CENTER);

        Button startButton = new Button(this);
        startButton.setText("Start");
        startButton.setMinHeight(dp(40));
        startButton.setOnClickListener(view -> startTelemetry());
        buttonRow.addView(startButton, weightedButton());

        Button stopButton = new Button(this);
        stopButton.setText("Stop");
        stopButton.setMinHeight(dp(40));
        stopButton.setOnClickListener(view -> stopTelemetry());
        buttonRow.addView(stopButton, weightedButton());
        layout.addView(buttonRow, fullWidth());

        statusText = new TextView(this);
        statusText.setText(preferences.getString(KEY_TELEMETRY_STATUS, "Ready"));
        statusText.setTextSize(12);
        statusText.setGravity(Gravity.CENTER);
        statusText.setMinLines(2);
        layout.addView(statusText, fullWidth());

        scrollView.addView(layout, new ScrollView.LayoutParams(
                ScrollView.LayoutParams.MATCH_PARENT,
                ScrollView.LayoutParams.WRAP_CONTENT
        ));
        setContentView(scrollView);
    }

    private void startTelemetry() {
        String serverUrl = serverUrlInput.getText().toString().trim();
        long childId = parseChildId(childIdInput.getText().toString());
        if (!serverUrl.startsWith("http://") && !serverUrl.startsWith("https://")) {
            setStatus("Server URL must start with http:// or https://");
            return;
        }
        if (childId <= 0) {
            setStatus("Child ID must be greater than 0");
            return;
        }

        saveSettings(serverUrl, childId);
        if (!requestMissingPermissions()) {
            startAfterPermission = true;
            setStatus("Allow permissions, then telemetry starts");
            return;
        }

        beginTelemetry();
    }

    private void beginTelemetry() {
        Intent intent = new Intent(this, TelemetryService.class);
        startForegroundService(intent);
        setStatus("Starting telemetry...");
        scrollView.post(() -> scrollView.fullScroll(ScrollView.FOCUS_DOWN));
    }

    private void stopTelemetry() {
        stopService(new Intent(this, TelemetryService.class));
        setStatus("Stopped");
    }

    private void saveSettings(String serverUrl, long childId) {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_SERVER_URL, serverUrl)
                .putLong(KEY_CHILD_ID, childId)
                .apply();
    }

    private boolean requestMissingPermissions() {
        List<String> missing = new ArrayList<>();
        addIfMissing(missing, Manifest.permission.ACCESS_FINE_LOCATION);
        addIfMissing(missing, Manifest.permission.BODY_SENSORS);
        addIfMissing(missing, Manifest.permission.POST_NOTIFICATIONS);

        if (!missing.isEmpty()) {
            requestPermissions(missing.toArray(new String[0]), PERMISSION_REQUEST_CODE);
            return false;
        }
        return true;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != PERMISSION_REQUEST_CODE || !startAfterPermission) {
            return;
        }

        startAfterPermission = false;
        if (hasAllPermissions()) {
            beginTelemetry();
        } else {
            setStatus("Location, heart rate and notification permissions are required");
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        statusHandler.removeCallbacks(statusUpdater);
        statusHandler.post(statusUpdater);
    }

    @Override
    protected void onPause() {
        statusHandler.removeCallbacks(statusUpdater);
        super.onPause();
    }

    private void addIfMissing(List<String> missing, String permission) {
        if (checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) {
            missing.add(permission);
        }
    }

    private boolean hasAllPermissions() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                && checkSelfPermission(Manifest.permission.BODY_SENSORS) == PackageManager.PERMISSION_GRANTED
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
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

    private LinearLayout.LayoutParams weightedButton() {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                0,
                LinearLayout.LayoutParams.WRAP_CONTENT,
                1f
        );
        params.setMargins(dp(2), 0, dp(2), 0);
        return params;
    }

    private void setStatus(String status) {
        getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_TELEMETRY_STATUS, status)
                .apply();
        statusText.setText(status);
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density);
    }
}
