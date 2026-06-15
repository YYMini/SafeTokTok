package safetoktok.backend.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import safetoktok.backend.dto.LocationRequest;
import safetoktok.backend.dto.LocationResponse;
import safetoktok.backend.entity.LocationEntity;
import safetoktok.backend.entity.ParentChildEntity;
import safetoktok.backend.entity.UserEntity;
import safetoktok.backend.entity.UserRole;
import safetoktok.backend.repository.LocationRepository;
import safetoktok.backend.repository.ParentChildRepository;
import safetoktok.backend.repository.UserRepository;

import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/locations")
@CrossOrigin(origins = "*")
public class LocationController {
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final ParentChildRepository parentChildRepository;

    public LocationController(
            LocationRepository locationRepository,
            UserRepository userRepository,
            ParentChildRepository parentChildRepository
    ) {
        this.locationRepository = locationRepository;
        this.userRepository = userRepository;
        this.parentChildRepository = parentChildRepository;
    }

    @PostMapping(produces = "application/json; charset=UTF-8")
    public Map<String, Object> saveLocation(
            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId,
            @RequestBody LocationRequest request
    ) {
        Long userId = currentUserId != null ? currentUserId : request.getChildId();
        if (userId == null) {
            throw new IllegalArgumentException("로그인 사용자 정보를 찾을 수 없습니다.");
        }

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("위치를 저장할 사용자를 찾을 수 없습니다."));

        LocationEntity location = new LocationEntity(
                user.getId(),
                user.getName(),
                request.getLatitude(),
                request.getLongitude()
        );

        locationRepository.save(location);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "위치 저장 완료");
        result.put("childId", user.getId());
        result.put("latitude", request.getLatitude());
        result.put("longitude", request.getLongitude());
        return result;
    }

    @GetMapping(value = "/latest", produces = "application/json; charset=UTF-8")
    public List<LocationResponse> getLatestLocations(
            @RequestHeader(value = "X-User-Id", required = false) Long currentUserId
    ) {
        if (currentUserId == null) {
            return List.of();
        }

        UserEntity user = userRepository.findById(currentUserId).orElse(null);
        if (user == null) {
            return List.of();
        }

        if (user.getRole() == UserRole.PARENT) {
            return getLatestLocationsForParent(user);
        }

        return getLatestLocationsForChildGroup(user);
    }

    private List<LocationResponse> getLatestLocationsForParent(UserEntity parent) {
        List<Long> childIds = parentChildRepository.findByParentId(parent.getId())
                .stream()
                .map(ParentChildEntity::getChildId)
                .toList();

        Set<Long> visibleUserIds = new LinkedHashSet<>();
        visibleUserIds.add(parent.getId());
        visibleUserIds.addAll(childIds);

        Map<Long, UserEntity> users = userRepository.findAllById(visibleUserIds)
                .stream()
                .collect(Collectors.toMap(UserEntity::getId, child -> child));

        return locationRepository.findLatestLocationsByChildIds(List.copyOf(visibleUserIds))
                .stream()
                .map(location -> {
                    UserEntity user = users.get(location.getChildId());
                    String name = user == null ? location.getName() : user.getName();
                    return toLocationResponse(location, name);
                })
                .toList();
    }

    private List<LocationResponse> getLatestLocationsForChildGroup(UserEntity childUser) {
        Set<Long> childIds = new LinkedHashSet<>();
        childIds.add(childUser.getId());

        List<Long> parentIds = parentChildRepository.findByChildId(childUser.getId())
                .stream()
                .map(ParentChildEntity::getParentId)
                .toList();

        parentIds.forEach(parentId -> parentChildRepository.findByParentId(parentId)
                .forEach(relation -> childIds.add(relation.getChildId())));

        Map<Long, UserEntity> children = userRepository.findAllById(childIds)
                .stream()
                .collect(Collectors.toMap(UserEntity::getId, child -> child));

        return locationRepository.findLatestLocationsByChildIds(List.copyOf(childIds))
                .stream()
                .map(location -> {
                    UserEntity child = children.get(location.getChildId());
                    String name = child == null ? location.getName() : child.getName();
                    return toLocationResponse(location, name);
                })
                .toList();
    }

    private LocationResponse toLocationResponse(LocationEntity location, String name) {
        return new LocationResponse(
                location.getChildId(),
                name,
                location.getLatitude(),
                location.getLongitude()
        );
    }
}
