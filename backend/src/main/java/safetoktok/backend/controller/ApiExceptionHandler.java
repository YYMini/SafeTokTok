package safetoktok.backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException error) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("success", false, "message", error.getMessage()));
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<Map<String, Object>> handleMissingHeader() {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("success", false, "message", "로그인 사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요."));
    }
}
