package safetoktok.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "parent_child",
        uniqueConstraints = @UniqueConstraint(columnNames = {"parent_id", "child_id"})
)
public class ParentChildEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "parent_id", nullable = false)
    private Long parentId;

    @Column(name = "child_id", nullable = false)
    private Long childId;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    protected ParentChildEntity() {
    }

    public ParentChildEntity(Long parentId, Long childId) {
        this.parentId = parentId;
        this.childId = childId;
    }

    @PrePersist
    void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public Long getParentId() {
        return parentId;
    }

    public Long getChildId() {
        return childId;
    }
}
