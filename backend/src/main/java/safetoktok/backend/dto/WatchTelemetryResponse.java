package safetoktok.backend.dto;

public class WatchTelemetryResponse {
    private Long childId;
    private Double latitude;
    private Double longitude;
    private Double heartRate;
    private Long recordedAt;
    private String source;

    public WatchTelemetryResponse() {
    }

    public WatchTelemetryResponse(Long childId, Double latitude, Double longitude, Double heartRate, Long recordedAt, String source) {
        this.childId = childId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.heartRate = heartRate;
        this.recordedAt = recordedAt;
        this.source = source;
    }

    public Long getChildId() {
        return childId;
    }

    public void setChildId(Long childId) {
        this.childId = childId;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public Double getHeartRate() {
        return heartRate;
    }

    public void setHeartRate(Double heartRate) {
        this.heartRate = heartRate;
    }

    public Long getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(Long recordedAt) {
        this.recordedAt = recordedAt;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }
}
