package safetoktok.backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import safetoktok.backend.dto.LoginRequest;
import safetoktok.backend.dto.SignupRequest;
import safetoktok.backend.dto.UserResponse;
import safetoktok.backend.entity.UserEntity;
import safetoktok.backend.entity.UserRole;
import safetoktok.backend.repository.UserRepository;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {
    private final UserRepository userRepository;

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse signup(@RequestBody SignupRequest request) {
        validateRequired(request.getLoginId(), "loginId");
        validateRequired(request.getPassword(), "password");
        validateRequired(request.getName(), "name");

        if (userRepository.existsByLoginId(request.getLoginId().trim())) {
            throw new IllegalArgumentException("이미 사용 중인 아이디입니다.");
        }

        UserRole role = request.getRole() == null ? UserRole.PARENT : request.getRole();
        UserEntity user = new UserEntity(
                request.getLoginId().trim(),
                request.getPassword(),
                request.getName().trim(),
                request.getAge(),
                blankToNull(request.getEmail()),
                blankToNull(request.getPhone()),
                role
        );

        return new UserResponse(userRepository.save(user));
    }

    @PostMapping("/login")
    public UserResponse login(@RequestBody LoginRequest request) {
        validateRequired(request.getLoginId(), "loginId");
        validateRequired(request.getPassword(), "password");

        UserEntity user = userRepository.findByLoginId(request.getLoginId().trim())
                .orElseThrow(() -> new IllegalArgumentException("아이디 또는 비밀번호가 올바르지 않습니다."));

        if (!user.getPassword().equals(request.getPassword())) {
            throw new IllegalArgumentException("아이디 또는 비밀번호가 올바르지 않습니다.");
        }

        return new UserResponse(user);
    }

    private void validateRequired(String value, String fieldName) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(fieldName + " is required.");
        }
    }

    private String blankToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }
}
