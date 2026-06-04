package safetoktok.backend.dto;

import safetoktok.backend.entity.UserRole;

public class ConnectionResponse {
    private Long id;
    private String name;
    private Integer age;
    private String loginId;
    private UserRole role;

    public ConnectionResponse() {
    }

    public ConnectionResponse(Long id, String name, Integer age, String loginId, UserRole role) {
        this.id = id;
        this.name = name;
        this.age = age;
        this.loginId = loginId;
        this.role = role;
    }

    public Long getId() {
        return id;
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

    public UserRole getRole() {
        return role;
    }
}
