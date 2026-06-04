package safetoktok.backend.dto;

public class ChildResponse {
    private Long childId;
    private String name;
    private Integer age;
    private String loginId;
    private Double latitude;
    private Double longitude;

    public ChildResponse() {
    }

    public ChildResponse(Long childId, String name, Integer age, String loginId, Double latitude, Double longitude) {
        this.childId = childId;
        this.name = name;
        this.age = age;
        this.loginId = loginId;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public Long getChildId() {
        return childId;
    }

    public String getName() {
        return name;
    }

    public Integer getAge() {
        return age;
    }

    public String getLoginId() {
        return loginId;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }
}
