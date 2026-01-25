package com.dashboard.v1.service;

import com.dashboard.v1.entity.RequestLog;
import com.dashboard.v1.repository.RequestLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import javax.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class RequestLogService {

    private static final Logger logger = LoggerFactory.getLogger(RequestLogService.class);

    @Autowired
    private RequestLogRepository requestLogRepository;

    /**
     * Log request asynchronously to avoid blocking main request processing
     * Uses REQUIRES_NEW propagation to ensure logging runs in its own transaction
     * and is not affected by parent transaction rollbacks
     *
     * @param requestId Unique request identifier
     * @param method HTTP method (GET, POST, etc.)
     * @param endpoint Request URI
     * @param userAgent User-Agent header
     * @param ipAddress Client IP address
     * @param username Authenticated username (can be null)
     * @param requestBody Request body (can be null)
     */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logRequest(String requestId, String method, String endpoint,
                          String userAgent, String ipAddress, String username, String requestBody) {
        try {
            RequestLog log = new RequestLog();
            log.setRequestId(requestId != null ? requestId : generateRequestId());
            log.setMethod(method != null ? method : "UNKNOWN");
            log.setEndpoint(endpoint != null ? endpoint : "/unknown");
            log.setUserAgent(userAgent);
            log.setIpAddress(ipAddress);
            log.setUsername(username);
            log.setRequestBody(requestBody);

            requestLogRepository.save(log);
            logger.debug("Request logged: {} {} - {}", method, endpoint, log.getRequestId());
        } catch (Exception e) {
            logger.error("Failed to log request: {} {} - {}", method, endpoint, e.getMessage());
        }
    }

    /**
     * Helper method to extract request data and call async logging
     * This ensures all data is extracted before async execution
     */
    public void logRequestFromHttpServletRequest(String requestId, HttpServletRequest request,
                                                  String username, String requestBody) {
        try {
            String method = request.getMethod();
            String endpoint = request.getRequestURI();
            String userAgent = request.getHeader("User-Agent");
            String ipAddress = getClientIpAddress(request);

            // Call the async method with pre-extracted data
            logRequest(requestId, method, endpoint, userAgent, ipAddress, username, requestBody);
        } catch (Exception e) {
            logger.error("Failed to extract request data for logging", e);
        }
    }

    /**
     * Update request log with response status and completion time
     * Uses REQUIRES_NEW propagation to ensure logging runs in its own transaction
     * and is not affected by parent transaction rollbacks
     */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void updateRequestLog(String requestId, Integer responseStatus, String errorMessage, Long processingTimeMs) {
        try {
            RequestLog log = requestLogRepository.findByRequestId(requestId).orElse(null);
            if (log != null) {
                log.setResponseStatus(responseStatus);
                log.setErrorMessage(errorMessage);
                log.setProcessingTimeMs(processingTimeMs);
                log.setCompletedAt(LocalDateTime.now());
                log.setIsSuccessful(responseStatus != null && responseStatus >= 200 && responseStatus < 300);

                requestLogRepository.save(log);
                logger.debug("Request log updated: {} - Status: {}", requestId, responseStatus);
            }
        } catch (Exception e) {
            logger.error("Failed to update request log", e);
        }
    }

    /**
     * Get all failed requests
     */
    public List<RequestLog> getFailedRequests() {
        return requestLogRepository.findByIsSuccessfulFalse();
    }

    /**
     * Get failed requests since a specific time
     */
    public List<RequestLog> getFailedRequestsSince(LocalDateTime since) {
        return requestLogRepository.findFailedRequestsSince(since);
    }

    /**
     * Count failed requests in the last hour
     */
    public Long countRecentFailures() {
        return requestLogRepository.countFailedRequestsSince(LocalDateTime.now().minusHours(1));
    }

    /**
     * Get requests by username
     */
    public List<RequestLog> getRequestsByUsername(String username) {
        return requestLogRepository.findByUsernameOrderByCreatedAtDesc(username);
    }

    private String generateRequestId() {
        return UUID.randomUUID().toString();
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }

        return request.getRemoteAddr();
    }
}

