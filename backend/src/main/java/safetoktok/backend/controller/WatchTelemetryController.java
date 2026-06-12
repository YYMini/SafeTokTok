package safetoktok.backend.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import safetoktok.backend.dto.WatchTelemetryRequest;
import safetoktok.backend.dto.WatchTelemetryResponse;
import safetoktok.backend.service.WatchTelemetryService;

import java.util.Map;

@RestController
@RequestMapping("/api/watch/telemetry")
@CrossOrigin(origins = "*")
public class WatchTelemetryController {

    private final WatchTelemetryService watchTelemetryService;

    public WatchTelemetryController(WatchTelemetryService watchTelemetryService) {
        this.watchTelemetryService = watchTelemetryService;
    }

    @PostMapping(produces = "application/json; charset=UTF-8")
    public Map<String, Object> saveTelemetry(@RequestBody WatchTelemetryRequest request) {
        WatchTelemetryResponse telemetry = watchTelemetryService.saveTelemetry(request);

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("success", true);
        result.put("childId", telemetry.getChildId());
        result.put("recordedAt", telemetry.getRecordedAt());
        return result;
    }

    @GetMapping(value = "/latest", produces = "application/json; charset=UTF-8")
    public Map<Long, WatchTelemetryResponse> getLatestTelemetry() {
        return watchTelemetryService.getLatestTelemetry();
    }

    @GetMapping(value = "/latest/{childId}", produces = "application/json; charset=UTF-8")
    public WatchTelemetryResponse getLatestTelemetryByChildId(@PathVariable Long childId) {
        return watchTelemetryService.getLatestTelemetryByChildId(childId);
    }
}
