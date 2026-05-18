package safetoktok.backend.controller;

import org.springframework.web.bind.annotation.*;
import safetoktok.backend.dto.LocationRequest;
import safetoktok.backend.dto.LocationResponse;
import safetoktok.backend.entity.LocationEntity;
import safetoktok.backend.repository.LocationRepository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/locations")
@CrossOrigin(origins = "*")
public class LocationController {

    private final LocationRepository locationRepository;

    public LocationController(LocationRepository locationRepository) {
        this.locationRepository = locationRepository;
    }

    @PostMapping(produces = "application/json; charset=UTF-8")
    public Map<String, Object> saveLocation(@RequestBody LocationRequest request) {
        String name;
        if (request.getChildId() == 1L) {
            name = "이서윤";
        } else if (request.getChildId() == 2L) {
            name = "김민준";
        } else if (request.getChildId() == 3L) {
            name = "박하린";
        } else {
            name = "알 수 없음";
        }

        LocationEntity location = new LocationEntity(
                request.getChildId(),
                name,
                request.getLatitude(),
                request.getLongitude()
        );

        locationRepository.save(location);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("message", "위치 저장 완료");
        result.put("childId", request.getChildId());
        result.put("latitude", request.getLatitude());
        result.put("longitude", request.getLongitude());
        return result;
    }

    @GetMapping(value = "/latest", produces = "application/json; charset=UTF-8")
    public List<LocationResponse> getLatestLocations() {
        Map<Long, LocationResponse> merged = new HashMap<>();

        merged.put(2L, new LocationResponse(2L, "김민준", 37.5612, 127.0081));
        merged.put(3L, new LocationResponse(3L, "박하린", 37.5584, 127.0049));

        Map<Long, LocationResponse> latestLocations = locationRepository.findLatestLocationsByChild()
                .stream()
                .collect(Collectors.toMap(
                        LocationEntity::getChildId,
                        location -> new LocationResponse(
                                location.getChildId(),
                                location.getName(),
                                location.getLatitude(),
                                location.getLongitude()
                        ),
                        (first, second) -> second
                ));

        merged.putAll(latestLocations);

        return new ArrayList<>(merged.values());
    }
}
