package com.dashboard.v1.repository;

import com.dashboard.v1.entity.RequestLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RequestLogRepository extends JpaRepository<RequestLog, Long> {

    Optional<RequestLog> findByRequestId(String requestId);

    List<RequestLog> findByIsSuccessfulFalse();

    List<RequestLog> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT r FROM RequestLog r WHERE r.isSuccessful = false AND r.createdAt >= :since")
    List<RequestLog> findFailedRequestsSince(LocalDateTime since);

    @Query("SELECT COUNT(r) FROM RequestLog r WHERE r.createdAt >= :since AND r.isSuccessful = false")
    Long countFailedRequestsSince(LocalDateTime since);

    @Query("SELECT r FROM RequestLog r WHERE r.username = :username ORDER BY r.createdAt DESC")
    List<RequestLog> findByUsernameOrderByCreatedAtDesc(String username);
}

