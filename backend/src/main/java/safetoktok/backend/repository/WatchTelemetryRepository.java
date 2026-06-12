package safetoktok.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import safetoktok.backend.entity.WatchTelemetry;

import java.util.List;
import java.util.Optional;

public interface WatchTelemetryRepository extends JpaRepository<WatchTelemetry, Long> {
    Optional<WatchTelemetry> findTopByChildIdOrderByRecordedAtDescIdDesc(Long childId);

    List<WatchTelemetry> findAllByOrderByRecordedAtDescIdDesc();
}
