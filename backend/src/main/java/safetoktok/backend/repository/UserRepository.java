package safetoktok.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import safetoktok.backend.entity.UserEntity;

import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long> {
    boolean existsByLoginId(String loginId);

    Optional<UserEntity> findByLoginId(String loginId);
}
