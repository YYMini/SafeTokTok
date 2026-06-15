package safetoktok.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import safetoktok.backend.entity.LocationEntity;

import java.util.List;
import java.util.Optional;

public interface LocationRepository extends JpaRepository<LocationEntity, Long> {
    @Query("""
            select l
            from LocationEntity l
            where l.createdAt = (
                select max(l2.createdAt)
                from LocationEntity l2
                where l2.userId = l.userId
            )
            """)
    List<LocationEntity> findLatestLocationsByUser();

    Optional<LocationEntity> findTopByUserIdOrderByCreatedAtDesc(Long userId);

    void deleteByUserId(Long userId);

    @Query("""
            select l
            from LocationEntity l
            where l.userId in :userIds
              and l.createdAt = (
                select max(l2.createdAt)
                from LocationEntity l2
                where l2.userId = l.userId
              )
            """)
    List<LocationEntity> findLatestLocationsByUserIds(@Param("userIds") List<Long> userIds);
}
