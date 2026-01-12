package com.dashboard.v1.controller;

import com.dashboard.v1.entity.*;
import com.dashboard.v1.repository.ProjectRepository;
import com.dashboard.v1.repository.SurveyResponseRepository;
import com.dashboard.v1.repository.UserRepository;
import com.dashboard.v1.repository.VendorProjectLinkRepository;
import com.dashboard.v1.service.IPInfoService;
import com.dashboard.v1.util.SslUtil;
import com.dashboard.v1.util.UrlUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import javax.servlet.http.HttpServletRequest;
import java.io.UnsupportedEncodingException;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Objects;
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

    @GetMapping("/survey")
    public ResponseEntity<String> vendorClick(@RequestParam("uid") String uid,
                                              @RequestParam("pid") String pid,
                                              @RequestParam("token") String token,
                                              @RequestParam("country") String country,
                                              HttpServletRequest request) throws UnsupportedEncodingException {

        logger.info("========== SURVEY CLICK START ==========");
        logger.info("Received vendor click callback - uid: {}, pid: {}, token: {}, country: {}", uid, pid, token, country);

        // Step 1: Validate project exists
        logger.debug("Step 1: Checking if project exists for pid: {}", pid);
        Optional<Project> projectOpt = projectRepository.findByProjectIdentifier(pid);
        if(!projectOpt.isPresent()){
            logger.warn("Project not found for pid: {}", pid);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Project not found for pid: " + pid);
        }
        logger.info("Project found: {} (Status: {})", pid, projectOpt.get().getStatus());

        // Step 2: Check project status
        if(projectOpt.get().getStatus() == ProjectStatus.INACTIVE){
            logger.warn("Project is INACTIVE - pid: {}", pid);
            return ResponseEntity.status(HttpStatus.GONE)
                    .body("Project is Closed : " + pid);
        }
        logger.debug("Project status is ACTIVE - proceeding...");

        // Step 3: Check if survey already attempted by UID
        logger.debug("Step 3: Checking if survey already attempted by uid: {}", uid);
        Optional<SurveyResponse> surveyResponseOpt = surveyResponseRepository.findByUId(uid);

        if (surveyResponseOpt.isPresent()) {
            logger.warn("Survey already attempted by uid: {} for project: {}", uid, pid);
            return ResponseEntity.ok("ALREADY ATTEMPTED SURVEY");
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
            return ResponseEntity.ok("Access restricted: Your IP address does not correspond to the selected country. ;)");
        }
        logger.debug("Country verification passed");

        // Step 6: Check if IP already attempted this survey
        logger.debug("Step 6: Checking if IP {} already attempted survey for project: {}", ip, pid);
        List<SurveyResponse> matchingIpSurveys = surveyResponseRepository.findByIpAddress(ip, pid);
        logger.debug("Found {} surveys from this IP for project: {}", matchingIpSurveys.size(), pid);

        for (SurveyResponse survey : matchingIpSurveys) {
            if (Objects.equals(survey.getProjectId(), pid)) {
                logger.warn("Survey already attempted by IP: {} for project: {}", ip, pid);
                return ResponseEntity.ok("ALREADY ATTEMPTED SURVEY");
            }
        }
        logger.debug("No previous survey attempts found for this IP and project");

        // Step 7: Create new survey response
        logger.info("Step 7: Creating new survey response - uid: {}, pid: {}, ip: {}", uid, pid, ip);
        SurveyResponse newResponse = new SurveyResponse();
        newResponse.setUId(uid);
        newResponse.setProjectId(pid);
        ZonedDateTime now = ZonedDateTime.now(ZoneId.of("Asia/Kolkata"));
        newResponse.setTimeStart(now.toLocalDateTime());
        newResponse.setIpAddress(ip);
        logger.debug("Survey start time set to: {}", now.toLocalDateTime());

        // Step 8: Validate vendor by token
        logger.debug("Step 8: Looking up vendor by token: {}", token);
        Optional<User> vendor = userRepository.findByToken(token);

        if (vendor.isPresent()) {
            String vendorUsername = vendor.get().getUsername();
            newResponse.setVendorUsername(vendorUsername);
            logger.info("Vendor found: {}", vendorUsername);
        } else {
            logger.error("Vendor not found for token: {}", token);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Vendor not found for token: " + token);
        }

        // Step 9: Get redirect URL from project
        logger.debug("Step 9: Fetching redirect URL for country: {}", country);
        Project project = projectOpt.get();
        newResponse.setCountry(country);
        List<CountryLink> links = project.getCountryLinks();
        logger.debug("Project has {} country links", links != null ? links.size() : 0);

        // Find the first matching country and get its originalLink
        String redirectUrl = links.stream()
                .filter(link -> Objects.equals(link.getCountry().name(), country))
                .map(CountryLink::getOriginalLink)
                .findFirst()
                .orElse(null);

        if(redirectUrl == null){
            logger.error("No survey link found for country: {} in project: {}", country, pid);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("no survey links found in the project, please create new project with same links properly");
        }
        logger.info("Found redirect URL for country {}: {}", country, redirectUrl);

        String url = redirectUrl.trim();

        // Step 10: Set survey status and save
        newResponse.setStatus(SurveyStatus.IN_PROGRESS);
        logger.debug("Step 10: Saving survey response with status: IN_PROGRESS");

        try {
            surveyResponseRepository.save(newResponse);
            logger.info("Survey response saved successfully - uid: {}, pid: {}, vendor: {}",
                       uid, pid, newResponse.getVendorUsername());
        } catch (Exception e) {
            logger.error("Error saving survey response - uid: {}, pid: {}", uid, pid, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error saving survey response: " + e.getMessage());
        }

        // Step 11: Build redirect URL
        HttpHeaders headers = new HttpHeaders();
        url = url.replace("[AMI]", uid);
        logger.info("Step 11: Final redirect URL (with uid replaced): {}", url);

        // Step 12: Validate URL and redirect
        if (!isValidURL(url)) {
            logger.error("Invalid redirect URL: {}", url);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid redirect URL: " + url);
        }

        headers.setLocation(URI.create(url));
        logger.info("Redirecting to survey URL: {}", url);
        logger.info("========== SURVEY CLICK SUCCESS - Redirecting ==========");

        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(url)).build();
    }

    private boolean isValidURL(String url) {
        try {
            new URI(url);
            return true;
        } catch (URISyntaxException e) {
            return false;
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
