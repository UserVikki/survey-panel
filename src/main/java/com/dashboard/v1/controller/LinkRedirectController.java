package com.dashboard.v1.controller;

import com.dashboard.v1.entity.*;
import com.dashboard.v1.repository.ProjectRepository;
import com.dashboard.v1.repository.SurveyResponseRepository;
import com.dashboard.v1.repository.UserRepository;
import com.dashboard.v1.repository.VendorProjectLinkRepository;
import com.dashboard.v1.security.LinkRedirectService;
import com.dashboard.v1.service.IPInfoService;
import com.dashboard.v1.util.SslUtil;
import com.dashboard.v1.util.UrlUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.http.HttpServletRequest;
import java.net.URI;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@RestController
public class LinkRedirectController {

    private static final Logger logger = LoggerFactory.getLogger(LinkRedirectController.class);

    @Autowired
    private VendorProjectLinkRepository vendorProjectLinkRepository;

    @Autowired
    private SurveyResponseRepository surveyResponseRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private IPInfoService iPInfoService;

    @Autowired
    private UrlUtils urlUtils;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LinkRedirectService linkRedirectService;

    @GetMapping("/survey")
    public ResponseEntity<String> vendorClick(@RequestParam("uid") String uid,
                                              @RequestParam("pid") String pid,
                                              @RequestParam("token") String token,
                                              @RequestParam("country") String country,
                                              HttpServletRequest request) {

        logger.info("========== SURVEY CLICK START ==========");
        logger.info("Received vendor click callback - uid: {}, pid: {}, token: {}, country: {}", uid, pid, token, country);


        Optional<Project> projectOpt = projectRepository.findByProjectIdentifierToken(pid);
        if(!projectOpt.isPresent()){
            logger.warn("Project not found for pid: {}", pid);
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create("/rejection?type=TERMINATE"))
                    .build();
        }

        if(projectOpt.get().getCounts() <= projectOpt.get().getComplete()){
            logger.warn("Project quota full for pid: {}", pid);
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create("/rejection?type=QUOTA_FULL"))
                    .build();
        }
        logger.info("Project found: {} (Status: {})", pid, projectOpt.get().getStatus());


        Optional<User> vendor = userRepository.findByToken(token);

        if (!vendor.isPresent()) {
            logger.error("Vendor not found for token: {}", token);
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create("/rejection?type=TERMINATE"))
                    .build();
        }

        // Step 2: Check project status
        if(projectOpt.get().getStatus() != ProjectStatus.ACTIVE ){
            logger.warn("Project is INACTIVE - pid: {}", pid);
            String rejectionType = projectOpt.get().getStatus() == ProjectStatus.INACTIVE ? "PAUSED" : "CLOSED";
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create("/rejection?type=" + rejectionType))
                    .build();
        }
        logger.debug("Project status is ACTIVE - proceeding...");

        // Step 3: Check if survey already attempted by UID
        logger.debug("Step 3: Checking if survey already attempted by uid: {}", uid);
        Optional<SurveyResponse> surveyResponseOpt = surveyResponseRepository.findByUId(uid);

        if (surveyResponseOpt.isPresent()) {
            logger.warn("Survey already attempted by uid: {} for project: {}", uid, pid);
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create("/rejection?type=TERMINATE"))
                    .build();

        }
        logger.debug("No existing survey found for uid: {}", uid);

        // Step 4: Get client IP address
        String ip = getClientIp(request);
        logger.info("Client IP address: {}", ip);

        // Step 5: Verify country based on IP
        SslUtil.disableSslVerification();
        logger.debug("Step 5: Fetching country code for IP: {}", ip);
        String countryCode = iPInfoService.getIPInfo(ip);
        logger.info("IP country code: {}, Expected country: {}", countryCode, country);

        if(countryCode != null && !countryCode.equalsIgnoreCase(country)) {
            logger.warn("Country mismatch - IP country: {}, Expected: {}, Blocking access", countryCode, country);
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create("/rejection?type=IP"))
                    .build();
        }
        logger.debug("Country verification passed");

        // Step 6: Check if IP already attempted this survey
        logger.debug("Step 6: Checking if IP {} already attempted survey for project: {}", ip, projectOpt.get().getProjectIdentifier());
        List<SurveyResponse> matchingIpSurveys = surveyResponseRepository.findByIpAddress(ip, projectOpt.get().getProjectIdentifier());
        logger.debug("Found {} surveys from this IP for project: {}", matchingIpSurveys.size(), projectOpt.get().getProjectIdentifier());

        if (!matchingIpSurveys.isEmpty()) {
            logger.warn("Survey already attempted by IP: {} for project: {}", ip, pid);
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create("/rejection?type=TERMINATE"))
                    .build();
        }
        logger.debug("No previous survey attempts found for this IP and project");


        // Step 7: Create new survey response
        logger.info("Step 7: Creating new survey response - uid: {}, pid: {}, ip: {}", uid, pid, ip);
        SurveyResponse newResponse = new SurveyResponse();
        newResponse.setUId(uid);
        newResponse.setProjectId(projectOpt.get().getProjectIdentifier());
        newResponse.setStartTime(ZonedDateTime.now(ZoneId.of("Asia/Kolkata")).toLocalDateTime());
        newResponse.setIpAddress(ip);
        logger.debug("Survey start time set to: {}", ZonedDateTime.now(ZoneId.of("Asia/Kolkata")).toLocalDateTime());

        newResponse.setVendorUsername(vendor.get().getUsername());
        logger.info("Vendor found: {}", vendor.get().getUsername());

        // Step 9: Get redirect URL from project
        logger.debug("Step 9: Fetching redirect URL for country: {}", country);
        newResponse.setCountry(country);

        try {
            surveyResponseRepository.save(newResponse);
            logger.info("Survey response saved successfully - uid: {}, pid: {}, vendor: {}",
                    uid, pid, newResponse.getVendorUsername());
        } catch (Exception e) {
            logger.error("Error saving survey response - uid: {}, pid: {}", uid, pid, e);
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create("/rejection?type=INTERNAL_ERROR"))
                    .build();
        }
        return linkRedirectService.passedSurvey(projectOpt.get(), uid, pid, country);
    }

    @GetMapping("/rejection")
    public ModelAndView showRejectionPage(@RequestParam("type") String type) {
        logger.info("Rejection page requested - type: {}", type);

        try {
            SurveyRejection rejectionType = SurveyRejection.valueOf(type.toUpperCase());
            return linkRedirectService.rejectedSurvey(rejectionType);
        } catch (IllegalArgumentException e) {
            logger.error("Invalid rejection type: {}", type);
            return linkRedirectService.rejectedSurvey(SurveyRejection.INTERNAL_ERROR);
        }
    }

    public String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");  // Get IP from proxy/load balancer
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");  // Alternative header
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();  // Default method
        }

        // If multiple IPs (e.g., from proxies), get the first one
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }

        return ip;
    }

}
