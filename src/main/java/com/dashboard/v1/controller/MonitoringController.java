package com.dashboard.v1.controller;

import com.dashboard.v1.entity.RequestLog;
import com.dashboard.v1.service.RequestLogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/monitoring")
@PreAuthorize("hasRole('ADMIN')")
public class MonitoringController {

    private static final Logger logger = LoggerFactory.getLogger(MonitoringController.class);

    @Autowired
    private RequestLogService requestLogService;

    /**
     * Get all failed requests
     */
    @GetMapping("/failed-requests")
    public ResponseEntity<List<RequestLog>> getFailedRequests() {
        logger.info("Fetching all failed requests");
        List<RequestLog> failedRequests = requestLogService.getFailedRequests();
        return ResponseEntity.ok(failedRequests);
    }

    /**
     * Get failed requests since a specific time
     */
    @GetMapping("/failed-requests/since")
    public ResponseEntity<List<RequestLog>> getFailedRequestsSince(@RequestParam int hours) {
        logger.info("Fetching failed requests from last {} hours", hours);
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        List<RequestLog> failedRequests = requestLogService.getFailedRequestsSince(since);
        return ResponseEntity.ok(failedRequests);
    }

    /**
     * Get system health status
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getHealthStatus() {
        logger.info("Checking system health");

        Map<String, Object> health = new HashMap<>();

        try {
            // Check recent failures
            Long recentFailures = requestLogService.countRecentFailures();
            health.put("recentFailures", recentFailures);
            health.put("status", recentFailures > 10 ? "WARNING" : "HEALTHY");
            health.put("timestamp", LocalDateTime.now());
            health.put("message", recentFailures > 10 ?
                "High failure rate detected in the last hour" :
                "System operating normally");

            return ResponseEntity.ok(health);
        } catch (Exception e) {
            logger.error("Error checking health status", e);
            health.put("status", "ERROR");
            health.put("message", "Failed to check system health");
            return ResponseEntity.status(500).body(health);
        }
    }

    /**
     * Get request history for a specific user
     */
    @GetMapping("/user-requests/{username}")
    public ResponseEntity<List<RequestLog>> getUserRequests(@PathVariable String username) {
        logger.info("Fetching request history for user: {}", username);
        List<RequestLog> requests = requestLogService.getRequestsByUsername(username);
        return ResponseEntity.ok(requests);
    }

    /**
     * Get monitoring dashboard data
     */
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardData() {
        logger.info("Fetching monitoring dashboard data");

        Map<String, Object> dashboard = new HashMap<>();

        try {
            Long recentFailures = requestLogService.countRecentFailures();
            List<RequestLog> last24HoursFailures = requestLogService.getFailedRequestsSince(
                LocalDateTime.now().minusHours(24)
            );

            dashboard.put("recentFailures", recentFailures);
            dashboard.put("last24HoursFailures", last24HoursFailures.size());
            dashboard.put("criticalFailures", last24HoursFailures.stream()
                .filter(r -> r.getResponseStatus() != null && r.getResponseStatus() >= 500)
                .count());
            dashboard.put("timestamp", LocalDateTime.now());

            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            logger.error("Error fetching dashboard data", e);
            Map<String, Object> errorMap = new HashMap<>();
            errorMap.put("error", "Failed to fetch dashboard data");
            return ResponseEntity.status(500).body(errorMap);
        }
    }
}

