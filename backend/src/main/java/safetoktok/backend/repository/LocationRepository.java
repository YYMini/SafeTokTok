package safetoktok.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
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
                where l2.childId = l.childId
            )
            """)
    List<LocationEntity> findLatestLocationsByChild();

    Optional<LocationEntity> findTopByChildIdOrderByCreatedAtDesc(Long childId);

    void deleteByChildId(Long childId);

    @Query("""
            select l
            from LocationEntity l
            where l.childId in :childIds
              and l.createdAt = (
                select max(l2.createdAt)
                from LocationEntity l2
                where l2.childId = l.childId
              )
            """)
    List<LocationEntity> findLatestLocationsByChildIds(List<Long> childIds);
}
