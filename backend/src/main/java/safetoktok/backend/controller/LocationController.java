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
        // X-User-Id 헤더에서 로그인된 사용자ID 우선 사용, 없으면 요청본문의 userId 사용
        Long userId = currentUserId != null ? currentUserId : request.getUserId();
        if (userId == null) {
            throw new IllegalArgumentException("로그인 사용자 정보를 찾을 수 없습니다.");
        }

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("위치를 저장할 사용자를 찾을 수 없습니다."));

        // 부모(PARENT)와 자녀(CHILD) 계정만 위치 저장 가능
        if (user.getRole() != UserRole.CHILD && user.getRole() != UserRole.PARENT) {
            throw new IllegalArgumentException("부모 또는 자녀 계정만 위치를 저장할 수 있습니다.");
        }

        if (!isKakaoMapCoordinate(request.getLatitude(), request.getLongitude())) {
            throw new IllegalArgumentException("카카오맵 표시 범위 밖 위치는 저장할 수 없습니다.");
        }

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
        result.put("userId", user.getId());
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
        // 자녀 ID 목록 조회
        List<Long> childIds = parentChildRepository.findByParentId(parent.getId())
                .stream()
                .map(ParentChildEntity::getChildId)
                .toList();

        // 부모 자신의 ID도 포함 (부모 본인 위치도 지도에 표시)
        List<Long> allIds = new java.util.ArrayList<>(childIds);
        allIds.add(0, parent.getId());

        if (allIds.isEmpty()) {
            return List.of();
        }

        Map<Long, UserEntity> users = userRepository.findAllById(allIds)
                .stream()
                .collect(Collectors.toMap(UserEntity::getId, user -> user));

        return locationRepository.findLatestLocationsByUserIds(allIds)
                .stream()
                .filter(location -> isKakaoMapCoordinate(location.getLatitude(), location.getLongitude()))
                .map(location -> {
                    UserEntity user = users.get(location.getUserId());
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

        // 같은 부모 계정에 속한 다른 자녀 및 부모 위치 포함
        parentIds.forEach(parentId -> parentChildRepository.findByParentId(parentId)
                .forEach(relation -> childIds.add(relation.getChildId())));

        // 부모 위치도 함께 조회
        parentIds.forEach(childIds::add);

        Map<Long, UserEntity> children = userRepository.findAllById(childIds)
                .stream()
                .collect(Collectors.toMap(UserEntity::getId, child -> child));

        return locationRepository.findLatestLocationsByUserIds(List.copyOf(childIds))
                .stream()
                .filter(location -> isKakaoMapCoordinate(location.getLatitude(), location.getLongitude()))
                .map(location -> {
                    UserEntity child = children.get(location.getUserId());
                    String name = child == null ? location.getName() : child.getName();
                    return toLocationResponse(location, name);
                })
                .toList();
    }

    private LocationResponse toLocationResponse(LocationEntity location, String name) {
        return new LocationResponse(
                location.getUserId(),
                name,
                location.getLatitude(),
                location.getLongitude()
        );
    }

    private boolean isKakaoMapCoordinate(Double latitude, Double longitude) {
        return latitude != null
                && longitude != null
                && Double.isFinite(latitude)
                && Double.isFinite(longitude)
                && latitude >= 33
                && latitude <= 39.5
                && longitude >= 124
                && longitude <= 132;
    }
}
