package com.dashboard.v1.controller;

import com.dashboard.v1.entity.*;
import com.dashboard.v1.repository.ProjectRepository;
import com.dashboard.v1.repository.SurveyResponseRepository;
import com.dashboard.v1.repository.UserRepository;
import com.dashboard.v1.service.ProjectVendorService;
import com.dashboard.v1.util.SslUtil;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/survey")
@RequiredArgsConstructor
public class SurveyResponseController {

    private static final Logger logger = LoggerFactory.getLogger(SurveyResponseController.class);

    private final SurveyResponseRepository surveyResponseRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;
    private final ProjectVendorService projectVendorService;

    @GetMapping("/complete")
    public ResponseEntity<?> submitComplete(@RequestParam String UID) {
        logger.info("inside SurveyResponseController /survey/complete UID : {}", UID);
        return saveSurveyResponse(UID, SurveyStatus.COMPLETE);
    }

    @GetMapping("/terminate")
    public ResponseEntity<?> submitTerminate(@RequestParam String UID) {
        logger.info("inside SurveyResponseController /survey/terminate UID : {}", UID);
        return saveSurveyResponse(UID, SurveyStatus.TERMINATE);
    }

    @GetMapping("/quotafull")
    public ResponseEntity<?> submitQuotaFull(@RequestParam String UID) {
        logger.info("inside SurveyResponseController /survey/quotafull UID : {}", UID);
        return saveSurveyResponse(UID, SurveyStatus.QUOTAFULL);
    }

    @GetMapping("/securityTerminate")
    public ResponseEntity<?> submitSecurityTerminate(@RequestParam String UID) {
        logger.info("inside SurveyResponseController /survey/securityTerminate UID : {}", UID);
        return saveSurveyResponse(UID, SurveyStatus.SECURITYTERMINATE);
    }

    private ResponseEntity<?> saveSurveyResponse(String UID, SurveyStatus status) {
        // Validate the project exists.

        Optional<SurveyResponse> surveyResponse = surveyResponseRepository.findByUId(UID);

        if(!surveyResponse.isPresent()){
            return ResponseEntity.ok("Survey response does not match with any vendor click");
        }
        SurveyResponse res = surveyResponse.get();

        Project project = projectRepository.findByProjectIdentifier(surveyResponse.get().getProjectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        Optional<User> vendor = userRepository.findByUsername(res.getVendorUsername());

        if(!(surveyResponse.get().getStatus() == SurveyStatus.IN_PROGRESS)) return ResponseEntity.ok("THIS UID is already registered for a response ");

        res.setStatus(status);
        res.setEndTime(ZonedDateTime.now(ZoneId.of("Asia/Kolkata")).toLocalDateTime());
        surveyResponseRepository.save(res);

        // Update project counts based on survey status
        switch (status) {
            case COMPLETE:
                Long completeCount = project.getComplete();
                project.setComplete(completeCount + 1);
                logger.info("Incremented complete count for project {} to {}", project.getProjectIdentifier(), completeCount + 1);
                projectRepository.save(project);
                break;

            case TERMINATE:
                Long terminateCount = project.getTerminate();
                project.setTerminate(terminateCount + 1);
                logger.info("Incremented terminate count for project {} to {}", project.getProjectIdentifier(), terminateCount + 1);
                projectRepository.save(project);
                break;

            case QUOTAFULL:
                Long quotaFullCount = project.getQuotafull();
                project.setQuotafull(quotaFullCount + 1);
                logger.info("Incremented quota full count for project {} to {}", project.getProjectIdentifier(), quotaFullCount + 1);
                projectRepository.save(project);
                break;

            case SECURITYTERMINATE:
                Long securityTerminateCount = project.getSecurityTerminate();
                project.setSecurityTerminate(securityTerminateCount + 1);
                logger.info("Incremented security terminate count for project {} to {}", project.getProjectIdentifier(), securityTerminateCount + 1);
                projectRepository.save(project);
                break;

            default:
                logger.warn("Unhandled survey status: {} for project {}", status, project.getProjectIdentifier());
                break;
        }

        projectVendorService.incrementSurveyCount(res.getVendorUsername(), res.getProjectId(), status);

        return notifyVendorWithUid(vendor.get(), status, UID);
    }

    @GetMapping("/api/survey-responses/all")
    public List<SurveyResponse> getAllSurveyResponses() {
        return surveyResponseRepository.findAllOrderByCreatedAt();
    }

    private String getVendorApiUrl(User vendor, SurveyStatus status) {
        switch (status) {
            case COMPLETE:
                return vendor.getComplete();
            case TERMINATE:
                return vendor.getTerminate();
            case QUOTAFULL:
                return vendor.getQuotafull();
            case SECURITYTERMINATE:
                return vendor.getSecurityTerminate();
            default:
                return null;
        }
    }

    public ResponseEntity<String> notifyVendorWithUid(User vendor, SurveyStatus status, String UID) {
        String vendorApiUrl = getVendorApiUrl(vendor, status);

        if (vendorApiUrl == null) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body("No Vendor Redirects configured for status: " + status);
        }

        vendorApiUrl = vendorApiUrl.replace("[AMI]", UID);

         logger.info("Notifying vendor at URL: {}", vendorApiUrl);

        try {
            SslUtil.disableSslVerification();

            UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(vendorApiUrl);
            ResponseEntity<String> response = restTemplate.getForEntity(builder.toUriString(), String.class);

            return ResponseEntity.ok("Vendor notified successfully: " + response.getBody());

        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to notify vendor: " + e.getMessage());
        }
    }

}
