package com.dashboard.v1.controller;

import com.dashboard.v1.entity.SurveyResponse;
import com.dashboard.v1.entity.SurveyStatus;
import com.dashboard.v1.repository.SurveyResponseRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AnalyticsController {

    private static final Logger logger = LoggerFactory.getLogger(AnalyticsController.class);
    private final SurveyResponseRepository surveyResponseRepository;

    @GetMapping("/metrics")
    public ResponseEntity<?> getMetrics(@RequestParam(required = false) String market) {
        logger.info("Fetching analytics metrics for market: {}", market);

        List<SurveyResponse> allResponses = surveyResponseRepository.findAll();

        // Filter by market if specified
        if (market != null && !market.equalsIgnoreCase("all")) {
            allResponses = allResponses.stream()
                    .filter(r -> market.equalsIgnoreCase(r.getCountry()))
                    .collect(Collectors.toList());
        }

        // Current month stats
        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        List<SurveyResponse> currentMonthResponses = allResponses.stream()
                .filter(r -> r.getStartTime() != null && r.getStartTime().isAfter(startOfMonth))
                .collect(Collectors.toList());

        // Previous month stats
        LocalDateTime startOfLastMonth = LocalDate.now().minusMonths(1).withDayOfMonth(1).atStartOfDay();
        LocalDateTime endOfLastMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        List<SurveyResponse> lastMonthResponses = allResponses.stream()
                .filter(r -> r.getStartTime() != null &&
                        r.getStartTime().isAfter(startOfLastMonth) &&
                        r.getStartTime().isBefore(endOfLastMonth))
                .collect(Collectors.toList());

        long currentTotal = currentMonthResponses.size();
        long lastTotal = lastMonthResponses.size();
        double totalChange = calculatePercentChange(lastTotal, currentTotal);

        long currentComplete = countByStatus(currentMonthResponses, SurveyStatus.COMPLETE);
        long lastComplete = countByStatus(lastMonthResponses, SurveyStatus.COMPLETE);
        double completePercent = currentTotal > 0 ? (currentComplete * 100.0 / currentTotal) : 0;
        double completeChange = calculatePercentChange(
                lastTotal > 0 ? (lastComplete * 100.0 / lastTotal) : 0,
                completePercent
        );

        long currentTerminate = countByStatus(currentMonthResponses, SurveyStatus.TERMINATE);
        long lastTerminate = countByStatus(lastMonthResponses, SurveyStatus.TERMINATE);
        double terminatePercent = currentTotal > 0 ? (currentTerminate * 100.0 / currentTotal) : 0;
        double terminateChange = calculatePercentChange(
                lastTotal > 0 ? (lastTerminate * 100.0 / lastTotal) : 0,
                terminatePercent
        );

        long currentSecurityTerminate = countByStatus(currentMonthResponses, SurveyStatus.SECURITYTERMINATE);
        long lastSecurityTerminate = countByStatus(lastMonthResponses, SurveyStatus.SECURITYTERMINATE);
        double securityTerminatePercent = currentTotal > 0 ? (currentSecurityTerminate * 100.0 / currentTotal) : 0;
        double securityTerminateChange = calculatePercentChange(
                lastTotal > 0 ? (lastSecurityTerminate * 100.0 / lastTotal) : 0,
                securityTerminatePercent
        );

        long currentQuotaFull = countByStatus(currentMonthResponses, SurveyStatus.QUOTAFULL);
        long lastQuotaFull = countByStatus(lastMonthResponses, SurveyStatus.QUOTAFULL);
        double quotaFullPercent = currentTotal > 0 ? (currentQuotaFull * 100.0 / currentTotal) : 0;
        double quotaFullChange = calculatePercentChange(
                lastTotal > 0 ? (lastQuotaFull * 100.0 / lastTotal) : 0,
                quotaFullPercent
        );

        // Total drop = terminate + security terminate + quota full
        long currentDrop = currentTerminate + currentSecurityTerminate + currentQuotaFull;
        long lastDrop = lastTerminate + lastSecurityTerminate + lastQuotaFull;
        double dropPercent = currentTotal > 0 ? (currentDrop * 100.0 / currentTotal) : 0;
        double dropChange = calculatePercentChange(
                lastTotal > 0 ? (lastDrop * 100.0 / lastTotal) : 0,
                dropPercent
        );

        // Reconcile rate (mock data for now - would need actual reconciliation logic)
        double reconcileRate = currentTotal > 0 ? (currentComplete * 95.0 / currentTotal) : 0;
        double avgPlatformReconciliation = 92.5;

        Map<String, Object> metrics = new HashMap<>();

        Map<String, Object> totalTrafficsMap = new HashMap<>();
        totalTrafficsMap.put("value", currentTotal);
        totalTrafficsMap.put("change", totalChange);
        metrics.put("totalTraffics", totalTrafficsMap);

        Map<String, Object> completePercentMap = new HashMap<>();
        completePercentMap.put("value", Math.round(completePercent * 10.0) / 10.0);
        completePercentMap.put("change", Math.round(completeChange * 10.0) / 10.0);
        metrics.put("completePercent", completePercentMap);

        Map<String, Object> terminatePercentMap = new HashMap<>();
        terminatePercentMap.put("value", Math.round(terminatePercent * 10.0) / 10.0);
        terminatePercentMap.put("change", Math.round(terminateChange * 10.0) / 10.0);
        metrics.put("terminatePercent", terminatePercentMap);

        Map<String, Object> securityTerminatePercentMap = new HashMap<>();
        securityTerminatePercentMap.put("value", Math.round(securityTerminatePercent * 10.0) / 10.0);
        securityTerminatePercentMap.put("change", Math.round(securityTerminateChange * 10.0) / 10.0);
        metrics.put("securityTerminatePercent", securityTerminatePercentMap);

        Map<String, Object> quotaFullPercentMap = new HashMap<>();
        quotaFullPercentMap.put("value", Math.round(quotaFullPercent * 10.0) / 10.0);
        quotaFullPercentMap.put("change", Math.round(quotaFullChange * 10.0) / 10.0);
        metrics.put("quotaFullPercent", quotaFullPercentMap);

        Map<String, Object> totalDropPercentMap = new HashMap<>();
        totalDropPercentMap.put("value", Math.round(dropPercent * 10.0) / 10.0);
        totalDropPercentMap.put("change", Math.round(dropChange * 10.0) / 10.0);
        metrics.put("totalDropPercent", totalDropPercentMap);

        metrics.put("reconcileRate", Math.round(reconcileRate * 10.0) / 10.0);
        metrics.put("avgPlatformReconciliation", avgPlatformReconciliation);

        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/traffic-chart")
    public ResponseEntity<?> getTrafficChart(
            @RequestParam(defaultValue = "day") String view,
            @RequestParam(required = false) String market,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        logger.info("Fetching traffic chart data - view: {}, market: {}", view, market);

        List<SurveyResponse> allResponses = surveyResponseRepository.findAll();

        // Filter by market if specified
        if (market != null && !market.equalsIgnoreCase("all")) {
            allResponses = allResponses.stream()
                    .filter(r -> market.equalsIgnoreCase(r.getCountry()))
                    .collect(Collectors.toList());
        }

        Map<String, Long> chartData = new LinkedHashMap<>();

        if ("day".equalsIgnoreCase(view)) {
            // Last 30 days
            for (int i = 29; i >= 0; i--) {
                LocalDate date = LocalDate.now().minusDays(i);
                String label = date.format(DateTimeFormatter.ofPattern("MMM dd"));

                long count = allResponses.stream()
                        .filter(r -> r.getStartTime() != null &&
                                r.getStartTime().toLocalDate().equals(date))
                        .count();

                chartData.put(label, count);
            }
        } else if ("month".equalsIgnoreCase(view)) {
            // Last 12 months
            for (int i = 11; i >= 0; i--) {
                YearMonth yearMonth = YearMonth.now().minusMonths(i);
                String label = yearMonth.format(DateTimeFormatter.ofPattern("MMM yyyy"));

                LocalDateTime start = yearMonth.atDay(1).atStartOfDay();
                LocalDateTime end = yearMonth.atEndOfMonth().atTime(23, 59, 59);

                long count = allResponses.stream()
                        .filter(r -> r.getStartTime() != null &&
                                r.getStartTime().isAfter(start) &&
                                r.getStartTime().isBefore(end))
                        .count();

                chartData.put(label, count);
            }
        } else if ("custom".equalsIgnoreCase(view) && startDate != null && endDate != null) {
            // Custom date range - group by day
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
            LocalDate start = LocalDate.parse(startDate, formatter);
            LocalDate end = LocalDate.parse(endDate, formatter);

            for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
                String label = date.format(DateTimeFormatter.ofPattern("MMM dd"));
                LocalDate finalDate = date;

                long count = allResponses.stream()
                        .filter(r -> r.getStartTime() != null &&
                                r.getStartTime().toLocalDate().equals(finalDate))
                        .count();

                chartData.put(label, count);
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("labels", new ArrayList<>(chartData.keySet()));
        response.put("data", new ArrayList<>(chartData.values()));

        return ResponseEntity.ok(response);
    }

    @GetMapping("/markets")
    public ResponseEntity<?> getMarkets() {
        logger.info("Fetching available markets");

        List<String> markets = surveyResponseRepository.findAll().stream()
                .map(SurveyResponse::getCountry)
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        markets.add(0, "All");

        return ResponseEntity.ok(markets);
    }

    private long countByStatus(List<SurveyResponse> responses, SurveyStatus status) {
        return responses.stream()
                .filter(r -> r.getStatus() == status)
                .count();
    }

    private double calculatePercentChange(double oldValue, double newValue) {
        if (oldValue == 0) {
            return newValue > 0 ? 100.0 : 0.0;
        }
        return ((newValue - oldValue) / oldValue) * 100.0;
    }
}

