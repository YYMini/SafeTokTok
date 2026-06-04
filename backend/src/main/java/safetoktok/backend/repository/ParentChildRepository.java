package safetoktok.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import safetoktok.backend.entity.ParentChildEntity;

import java.util.List;
import java.util.Optional;

public interface ParentChildRepository extends JpaRepository<ParentChildEntity, Long> {
    List<ParentChildEntity> findByParentId(Long parentId);

    List<ParentChildEntity> findByChildId(Long childId);

    Optional<ParentChildEntity> findByParentIdAndChildId(Long parentId, Long childId);

    void deleteByChildId(Long childId);
}
