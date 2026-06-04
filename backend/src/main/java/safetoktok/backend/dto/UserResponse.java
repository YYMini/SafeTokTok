package safetoktok.backend.dto;

import safetoktok.backend.entity.UserEntity;
import safetoktok.backend.entity.UserRole;

public class UserResponse {
    private Long id;
    private String loginId;
    private String name;
    private Integer age;
    private String email;
    private String phone;
    private UserRole role;

    public UserResponse() {
    }

    public UserResponse(UserEntity user) {
        this.id = user.getId();
        this.loginId = user.getLoginId();
        this.name = user.getName();
        this.age = user.getAge();
        this.email = user.getEmail();
        this.phone = user.getPhone();
        this.role = user.getRole();
    }

    public Long getId() {
        return id;
    }

    public String getLoginId() {
        return loginId;
    }

    public String getName() {
        return name;
    }

    public Integer getAge() {
        return age;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public UserRole getRole() {
        return role;
    }
}
