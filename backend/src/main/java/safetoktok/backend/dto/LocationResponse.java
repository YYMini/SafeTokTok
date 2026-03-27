package safetoktok.backend.dto;

public class LocationResponse {
    private Long childId;
    private String name;
    private Double latitude;
    private Double longitude;

    public LocationResponse() {
    }

    public LocationResponse(Long childId, String name, Double latitude, Double longitude) {
        this.childId = childId;
        this.name = name;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public Long getChildId() {
        return childId;
    }

    public void setChildId(Long childId) {
        this.childId = childId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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
}