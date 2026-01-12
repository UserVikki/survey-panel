package com.dashboard.v1.entity;

import lombok.Getter;
import lombok.Setter;

import javax.persistence.*;


@Entity
@Getter
@Setter
public class ProjectVendorCounts {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String vendorUsername;

    private String projectId;

    private Integer completedSurveys;

    private Integer terminatedSurveys;

    private Integer quotaFullSurveys;

    private Integer securityTerminateSurveys;

}


