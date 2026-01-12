package com.dashboard.v1.controller;

import com.dashboard.v1.AppProperties;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequiredArgsConstructor
public class RedirectsLinkController {

    private static final Logger logger = LoggerFactory.getLogger(RedirectsLinkController.class);

    final AppProperties appProperties;

    @GetMapping("/redirects")
    public ResponseEntity<?> getRedirects() {
        logger.info("inside RedirectsController /redirects");
        Map<String, String> response = new HashMap<>();

        response.put("complete", appProperties.getDomain() + "/survey/complete?UID=[AMI]");
        response.put("terminate", appProperties.getDomain() + "/survey/terminate?UID=[AMI]");
        response.put("quotafull", appProperties.getDomain() + "/survey/quotafull?UID=[AMI]");
        response.put("securityTerminate", appProperties.getDomain() + "/survey/securityTerminate?UID=[AMI]");

        return ResponseEntity.ok(response);
    }
}
