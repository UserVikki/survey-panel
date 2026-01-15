package com.dashboard.v1.controller;

import com.dashboard.v1.entity.SurveyResponse;
import com.dashboard.v1.entity.SurveyStatus;
import com.dashboard.v1.repository.SurveyResponseRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;


@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private static final Logger logger = LoggerFactory.getLogger(DashboardController.class);

    private final SurveyResponseRepository surveyResponseRepository;

    // This endpoint returns the counts of each survey status for a given project.
    @GetMapping("/project/{projectId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'VENDOR')")
    public ResponseEntity<?> getProjectDashboard(@PathVariable String projectId) {
        Optional<List<SurveyResponse>> responsesOptional = surveyResponseRepository.findByProjectId(projectId);

        if (!responsesOptional.isPresent()) {
            Map<String, Long> result = new HashMap<>();
            result.put("complete", 0L);
            result.put("terminate", 0L);
            result.put("quotafull", 0L);
            return ResponseEntity.ok(
                    result
            );
        }

        // Unwrap the Optional to get the actual list
        List<SurveyResponse> responses = responsesOptional.get();

        long completeCount = responses.stream().filter(r -> r.getStatus() == SurveyStatus.COMPLETE).count();
        long terminateCount = responses.stream().filter(r -> r.getStatus() == SurveyStatus.TERMINATE).count();
        long quotaFullCount = responses.stream().filter(r -> r.getStatus() == SurveyStatus.QUOTAFULL).count();

        Map<String, Long> result = new HashMap<>();
        result.put("complete", completeCount);
        result.put("terminate", terminateCount);
        result.put("quotafull", quotaFullCount);

        return ResponseEntity.ok(result);
    }

}
