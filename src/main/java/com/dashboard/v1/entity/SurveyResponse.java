package com.dashboard.v1.entity;

import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
public class SurveyResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private SurveyStatus status = SurveyStatus.IN_PROGRESS;

    private String ipAddress;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private String country;

    private String projectId;

    @Column(unique = true, nullable = false)
    private String uId;

    private String vendorUsername;

}