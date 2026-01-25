package com.dashboard.v1.interceptor;

import com.dashboard.v1.service.RequestLogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.util.ContentCachingRequestWrapper;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;

@Component
public class RequestLoggingInterceptor implements HandlerInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(RequestLoggingInterceptor.class);

    @Autowired
    private RequestLogService requestLogService;

    private static final String REQUEST_ID_ATTRIBUTE = "requestId";
    private static final String REQUEST_START_TIME_ATTRIBUTE = "requestStartTime";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // Generate unique request ID
        String requestId = java.util.UUID.randomUUID().toString();
        request.setAttribute(REQUEST_ID_ATTRIBUTE, requestId);
        request.setAttribute(REQUEST_START_TIME_ATTRIBUTE, System.currentTimeMillis());

        // Get authenticated username
        String username = getAuthenticatedUsername();

        // Get request body for POST/PUT/DELETE requests
        String requestBody = null;
        if ("POST".equals(request.getMethod()) || "PUT".equals(request.getMethod()) || "DELETE".equals(request.getMethod())) {
            try {
                if (request instanceof ContentCachingRequestWrapper) {
                    ContentCachingRequestWrapper wrapper = (ContentCachingRequestWrapper) request;
                    byte[] content = wrapper.getContentAsByteArray();
                    if (content.length > 0) {
                        requestBody = new String(content, StandardCharsets.UTF_8);
                    }
                }
            } catch (Exception e) {
                logger.warn("Failed to read request body", e);
            }
        }

        // Log request asynchronously - extract data first to avoid null issues
        requestLogService.logRequestFromHttpServletRequest(requestId, request, username, requestBody);

        logger.info("Request started: {} {} - ID: {}", request.getMethod(), request.getRequestURI(), requestId);

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        String requestId = (String) request.getAttribute(REQUEST_ID_ATTRIBUTE);
        Long startTime = (Long) request.getAttribute(REQUEST_START_TIME_ATTRIBUTE);

        if (requestId != null && startTime != null) {
            long processingTime = System.currentTimeMillis() - startTime;
            Integer responseStatus = response.getStatus();
            String errorMessage = ex != null ? ex.getMessage() : null;

            // Update request log with completion details
            requestLogService.updateRequestLog(requestId, responseStatus, errorMessage, processingTime);

            logger.info("Request completed: {} - Status: {} - Time: {}ms", requestId, responseStatus, processingTime);

            // Alert on failures
            if (responseStatus >= 500) {
                logger.error("Server error detected: {} {} - Status: {} - ID: {}",
                    request.getMethod(), request.getRequestURI(), responseStatus, requestId);
            }
        }
    }

    private String getAuthenticatedUsername() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getPrincipal())) {
                return authentication.getName();
            }
        } catch (Exception e) {
            logger.debug("Could not get authenticated username", e);
        }
        return null;
    }
}

