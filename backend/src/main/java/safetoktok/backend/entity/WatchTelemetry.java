package safetoktok.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "watch_telemetry")
public class WatchTelemetry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long childId;

    private Double latitude;
    private Double longitude;
    private Double heartRate;

    @Column(nullable = false)
    private Long recordedAt;

    @Column(nullable = false, length = 50)
    private String source;

    @Column(nullable = false)
    private Long createdAt;

    protected WatchTelemetry() {
    }

    public WatchTelemetry(Long childId, Double latitude, Double longitude, Double heartRate, Long recordedAt, String source) {
        this.childId = childId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.heartRate = heartRate;
        this.recordedAt = recordedAt;
        this.source = source;
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = System.currentTimeMillis();
        }
    }

    public Long getId() {
        return id;
    }

    public Long getChildId() {
        return childId;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public Double getHeartRate() {
        return heartRate;
    }

    public Long getRecordedAt() {
        return recordedAt;
    }

    public String getSource() {
        return source;
    }

    public Long getCreatedAt() {
        return createdAt;
    }
}
