package com.dashboard.v1.service;

import com.dashboard.v1.entity.RequestLog;
import com.dashboard.v1.repository.RequestLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
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
     */
    @Async
    @Transactional
    public void logRequest(String requestId, HttpServletRequest request, String username, String requestBody) {
        try {
            RequestLog log = new RequestLog();
            log.setRequestId(requestId != null ? requestId : generateRequestId());
            log.setMethod(request.getMethod());
            log.setEndpoint(request.getRequestURI());
            log.setUserAgent(request.getHeader("User-Agent"));
            log.setIpAddress(getClientIpAddress(request));
            log.setUsername(username);
            log.setRequestBody(requestBody);

            requestLogRepository.save(log);
            logger.debug("Request logged: {} {} - {}", request.getMethod(), request.getRequestURI(), log.getRequestId());
        } catch (Exception e) {
            logger.error("Failed to log request", e);
        }
    }

    /**
     * Update request log with response status and completion time
     */
    @Async
    @Transactional
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

