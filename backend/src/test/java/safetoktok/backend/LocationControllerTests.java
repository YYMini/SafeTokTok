package safetoktok.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import safetoktok.backend.controller.LocationController;
import safetoktok.backend.dto.LocationRequest;
import safetoktok.backend.dto.LocationResponse;
import safetoktok.backend.entity.LocationEntity;
import safetoktok.backend.entity.ParentChildEntity;
import safetoktok.backend.entity.UserEntity;
import safetoktok.backend.entity.UserRole;
import safetoktok.backend.repository.LocationRepository;
import safetoktok.backend.repository.ParentChildRepository;
import safetoktok.backend.repository.UserRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@Transactional
class LocationControllerTests {
    @Autowired
    private LocationController locationController;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ParentChildRepository parentChildRepository;

    @Autowired
    private LocationRepository locationRepository;

    @Test
    void parentCanSaveLocationUsingCurrentUserId() {
        UserEntity parent = saveUser("parent-save", "Parent Save", UserRole.PARENT);
        UserEntity unrelatedChild = saveUser("unrelated-child-save", "Unrelated Child Save", UserRole.CHILD);

        LocationRequest request = locationRequest(unrelatedChild.getId(), 37.5665, 126.9780);
        Map<String, Object> result = locationController.saveLocation(parent.getId(), request);

        assertEquals(true, result.get("success"));
        assertEquals(parent.getId(), result.get("userId"));

        List<LocationEntity> savedLocations = locationRepository.findAll();
        assertEquals(1, savedLocations.size());
        assertEquals(parent.getId(), savedLocations.get(0).getUserId());
    }

    @Test
    void parentLatestLocationsIncludeParentAndConnectedChildrenOnly() {
        UserEntity parent = saveUser("parent-latest", "Parent Latest", UserRole.PARENT);
        UserEntity child = saveUser("child-latest", "Child Latest", UserRole.CHILD);
        UserEntity unrelatedChild = saveUser("unrelated-child-latest", "Unrelated Child Latest", UserRole.CHILD);
        parentChildRepository.save(new ParentChildEntity(parent.getId(), child.getId()));

        locationRepository.save(new LocationEntity(parent.getId(), parent.getName(), 37.5665, 126.9780));
        locationRepository.save(new LocationEntity(child.getId(), child.getName(), 37.5651, 126.9895));
        locationRepository.save(new LocationEntity(unrelatedChild.getId(), unrelatedChild.getName(), 35.1796, 129.0756));

        List<LocationResponse> latestLocations = locationController.getLatestLocations(parent.getId());
        List<Long> userIds = latestLocations.stream()
                .map(LocationResponse::getUserId)
                .toList();

        assertEquals(2, latestLocations.size());
        assertTrue(userIds.contains(parent.getId()));
        assertTrue(userIds.contains(child.getId()));
        assertFalse(userIds.contains(unrelatedChild.getId()));

        Map<Long, String> namesByUserId = latestLocations.stream()
                .collect(Collectors.toMap(LocationResponse::getUserId, LocationResponse::getName));
        assertEquals(parent.getName(), namesByUserId.get(parent.getId()));
        assertEquals(child.getName(), namesByUserId.get(child.getId()));
    }

    private UserEntity saveUser(String loginId, String name, UserRole role) {
        return userRepository.save(new UserEntity(loginId, "password", name, 10, null, null, role));
    }

    private LocationRequest locationRequest(Long userId, Double latitude, Double longitude) {
        LocationRequest request = new LocationRequest();
        request.setUserId(userId);
        request.setLatitude(latitude);
        request.setLongitude(longitude);
        return request;
    }
}
