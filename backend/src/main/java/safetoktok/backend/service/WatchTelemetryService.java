package safetoktok.backend.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import safetoktok.backend.dto.WatchTelemetryRequest;
import safetoktok.backend.dto.WatchTelemetryResponse;
import safetoktok.backend.entity.WatchTelemetry;
import safetoktok.backend.repository.WatchTelemetryRepository;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class WatchTelemetryService {
    private final WatchTelemetryRepository watchTelemetryRepository;

    public WatchTelemetryService(WatchTelemetryRepository watchTelemetryRepository) {
        this.watchTelemetryRepository = watchTelemetryRepository;
    }

    @Transactional
    public WatchTelemetryResponse saveTelemetry(WatchTelemetryRequest request) {
        Long childId = request.getChildId() == null ? 1L : request.getChildId();
        Long recordedAt = request.getRecordedAt() == null ? System.currentTimeMillis() : request.getRecordedAt();
        String source = request.getSource() == null || request.getSource().isBlank()
                ? "galaxy-watch"
                : request.getSource();

        WatchTelemetry telemetry = new WatchTelemetry(
                childId,
                request.getLatitude(),
                request.getLongitude(),
                request.getHeartRate(),
                recordedAt,
                source
        );

        return toResponse(watchTelemetryRepository.save(telemetry));
    }

    @Transactional(readOnly = true)
    public Map<Long, WatchTelemetryResponse> getLatestTelemetry() {
        Map<Long, WatchTelemetryResponse> latestByChildId = new LinkedHashMap<>();

        for (WatchTelemetry telemetry : watchTelemetryRepository.findAllByOrderByRecordedAtDescIdDesc()) {
            latestByChildId.putIfAbsent(telemetry.getChildId(), toResponse(telemetry));
        }

        return latestByChildId;
    }

    @Transactional(readOnly = true)
    public WatchTelemetryResponse getLatestTelemetryByChildId(Long childId) {
        return watchTelemetryRepository.findTopByChildIdOrderByRecordedAtDescIdDesc(childId)
                .map(this::toResponse)
                .orElse(null);
    }

    private WatchTelemetryResponse toResponse(WatchTelemetry telemetry) {
        return new WatchTelemetryResponse(
                telemetry.getChildId(),
                telemetry.getLatitude(),
                telemetry.getLongitude(),
                telemetry.getHeartRate(),
                telemetry.getRecordedAt(),
                telemetry.getSource()
        );
    }
}
