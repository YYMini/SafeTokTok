package safetoktok.backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;
import safetoktok.backend.dto.ChildCreateRequest;
import safetoktok.backend.dto.ChildResponse;
import safetoktok.backend.dto.ConnectionResponse;
import safetoktok.backend.entity.LocationEntity;
import safetoktok.backend.entity.ParentChildEntity;
import safetoktok.backend.entity.UserEntity;
import safetoktok.backend.entity.UserRole;
import safetoktok.backend.repository.LocationRepository;
import safetoktok.backend.repository.ParentChildRepository;
import safetoktok.backend.repository.UserRepository;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/children")
@CrossOrigin(origins = "*")
public class ChildController {
    private final UserRepository userRepository;
    private final ParentChildRepository parentChildRepository;
    private final LocationRepository locationRepository;

    public ChildController(
            UserRepository userRepository,
            ParentChildRepository parentChildRepository,
            LocationRepository locationRepository
    ) {
        this.userRepository = userRepository;
        this.parentChildRepository = parentChildRepository;
        this.locationRepository = locationRepository;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ChildResponse createChild(
            @RequestHeader(value = "X-User-Id", required = false) Long parentId,
            @RequestHeader(value = "X-Login-Id", required = false) String parentLoginId,
            @RequestBody ChildCreateRequest request
    ) {
        UserEntity parent = getParent(parentId, parentLoginId);
        validateRequired(request.getName(), "name");
        validateRequired(request.getLoginId(), "loginId");
        validateRequired(request.getPassword(), "password");

        String childLoginId = request.getLoginId().trim();
        if (userRepository.existsByLoginId(childLoginId)) {
            throw new IllegalArgumentException("이미 사용 중인 자녀 아이디입니다.");
        }

        UserEntity child = userRepository.save(new UserEntity(
                childLoginId,
                request.getPassword(),
                request.getName().trim(),
                request.getAge(),
                blankToNull(request.getEmail()),
                null,
                UserRole.CHILD
        ));

        parentChildRepository.save(new ParentChildEntity(parent.getId(), child.getId()));
        return toChildResponse(child, null);
    }

    @GetMapping
    public List<ChildResponse> getChildren(
            @RequestHeader(value = "X-User-Id", required = false) Long parentId,
            @RequestHeader(value = "X-Login-Id", required = false) String parentLoginId
    ) {
        UserEntity parent = getParent(parentId, parentLoginId);

        List<Long> childIds = parentChildRepository.findByParentId(parent.getId())
                .stream()
                .map(ParentChildEntity::getChildId)
                .toList();

        if (childIds.isEmpty()) {
            return List.of();
        }

        Map<Long, LocationEntity> latestLocations = locationRepository.findLatestLocationsByUserIds(childIds)
                .stream()
                .collect(Collectors.toMap(LocationEntity::getUserId, Function.identity()));

        return userRepository.findAllById(childIds)
                .stream()
                .map(child -> toChildResponse(child, latestLocations.get(child.getId())))
                .toList();
    }

    @GetMapping("/connections")
    public List<ConnectionResponse> getConnections(
            @RequestHeader(value = "X-User-Id", required = false) Long userId
    ) {
        if (userId == null) {
            return List.of();
        }

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("로그인 사용자 정보를 찾을 수 없습니다."));

        if (user.getRole() == UserRole.PARENT) {
            return getChildren(user.getId(), user.getLoginId())
                    .stream()
                    .map(child -> new ConnectionResponse(
                            child.getChildId(),
                            child.getName(),
                            child.getAge(),
                            child.getLoginId(),
                            UserRole.CHILD
                    ))
                    .toList();
        }

        Map<Long, ConnectionResponse> connections = new LinkedHashMap<>();
        List<ParentChildEntity> myRelations = parentChildRepository.findByChildId(user.getId());

        for (ParentChildEntity relation : myRelations) {
            userRepository.findById(relation.getParentId())
                    .ifPresent(parent -> connections.put(
                            parent.getId(),
                            new ConnectionResponse(parent.getId(), parent.getName(), parent.getAge(), parent.getLoginId(), parent.getRole())
                    ));

            parentChildRepository.findByParentId(relation.getParentId())
                    .stream()
                    .filter(siblingRelation -> !siblingRelation.getChildId().equals(user.getId()))
                    .forEach(siblingRelation -> userRepository.findById(siblingRelation.getChildId())
                            .ifPresent(sibling -> connections.put(
                                    sibling.getId(),
                                    new ConnectionResponse(sibling.getId(), sibling.getName(), sibling.getAge(), sibling.getLoginId(), sibling.getRole())
                            )));
        }

        return new ArrayList<>(connections.values());
    }

    @DeleteMapping("/{childId}")
    @Transactional
    public Map<String, Object> deleteChild(
            @RequestHeader(value = "X-User-Id", required = false) Long parentId,
            @RequestHeader(value = "X-Login-Id", required = false) String parentLoginId,
            @PathVariable Long childId
    ) {
        UserEntity parent = getParent(parentId, parentLoginId);
        ParentChildEntity relation = parentChildRepository.findByParentIdAndChildId(parent.getId(), childId)
                .orElseThrow(() -> new IllegalArgumentException("현재 부모 계정과 연결된 자녀만 삭제할 수 있습니다."));

        UserEntity child = userRepository.findById(childId)
                .orElseThrow(() -> new IllegalArgumentException("삭제할 자녀 계정을 찾을 수 없습니다."));

        if (child.getRole() != UserRole.CHILD) {
            throw new IllegalArgumentException("자녀 계정만 삭제할 수 있습니다.");
        }

        locationRepository.deleteByUserId(childId);
        parentChildRepository.delete(relation);
        parentChildRepository.deleteByChildId(childId);
        userRepository.delete(child);

        return Map.of("success", true, "childId", childId);
    }

    private UserEntity getParent(Long parentId, String parentLoginId) {
        UserEntity parent = null;
        if (parentId != null) {
            parent = userRepository.findById(parentId).orElse(null);
        }

        if (parent == null && parentLoginId != null && !parentLoginId.trim().isEmpty()) {
            parent = userRepository.findByLoginId(parentLoginId.trim()).orElse(null);
        }

        if (parent == null) {
            throw new IllegalArgumentException("부모 계정을 찾을 수 없습니다. 부모 계정으로 다시 로그인해주세요.");
        }

        if (parent.getRole() != UserRole.PARENT) {
            throw new IllegalArgumentException("부모 계정만 자녀를 추가할 수 있습니다.");
        }

        return parent;
    }

    private ChildResponse toChildResponse(UserEntity child, LocationEntity location) {
        return new ChildResponse(
                child.getId(),
                child.getName(),
                child.getAge(),
                child.getLoginId(),
                location == null ? null : location.getLatitude(),
                location == null ? null : location.getLongitude()
        );
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
