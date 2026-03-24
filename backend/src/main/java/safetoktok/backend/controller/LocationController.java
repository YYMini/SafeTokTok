package safetoktok.backend.controller;

import org.springframework.web.bind.annotation.*;
import safetoktok.backend.dto.LocationRequest;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/locations")
@CrossOrigin(origins = "*")
public class LocationController {

    @PostMapping
public Map<String, Object> saveLocation(@RequestBody LocationRequest request) {
    System.out.println("위치 저장 요청 들어옴");
    System.out.println("childId = " + request.getChildId());
    System.out.println("latitude = " + request.getLatitude());
    System.out.println("longitude = " + request.getLongitude());

    Map<String, Object> result = new HashMap<>();
    result.put("success", true);
    result.put("message", "위치 저장 완료");
    result.put("childId", request.getChildId());
    result.put("latitude", request.getLatitude());
    result.put("longitude", request.getLongitude());
    return result;
}
}