package com.dashboard.v1.service;

import com.dashboard.v1.entity.ProjectVendorCounts;
import com.dashboard.v1.entity.SurveyStatus;
import com.dashboard.v1.repository.ProjectVendorCountsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class ProjectVendorService {

    @Autowired
    private ProjectVendorCountsRepository repository;

    public void incrementSurveyCount(String vendorUsername, String projectId, SurveyStatus type) {
        Optional<ProjectVendorCounts> existing = repository.findByVendorUsernameAndProjectId(vendorUsername, projectId);

        ProjectVendorCounts entity;
        if (existing.isPresent()) {
            entity = existing.get();
        } else {
            entity = new ProjectVendorCounts();
            entity.setVendorUsername(vendorUsername);
            entity.setProjectId(projectId);
            entity.setCompletedSurveys(0);
            entity.setTerminatedSurveys(0);
            entity.setQuotaFullSurveys(0);
            entity.setSecurityTerminateSurveys(0);
        }

        // Increment based on type
        switch (type) {
            case COMPLETE:
                entity.setCompletedSurveys(entity.getCompletedSurveys() + 1);
                break;
            case TERMINATE:
                entity.setTerminatedSurveys(entity.getTerminatedSurveys() + 1);
                break;
            case QUOTAFULL:
                entity.setQuotaFullSurveys(entity.getQuotaFullSurveys() + 1);
                break;
            case SECURITYTERMINATE:
                entity.setSecurityTerminateSurveys(entity.getSecurityTerminateSurveys() + 1);
                break;
            default:
                throw new IllegalArgumentException("Invalid survey type: " + type);
        }

        repository.save(entity);
    }
}
