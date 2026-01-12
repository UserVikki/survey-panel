package com.dashboard.v1.model.request;

import com.dashboard.v1.entity.CountryLink;
import com.dashboard.v1.entity.ProjectStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CreateProjectRequest {
    private String projectIdentifier;
    private ProjectStatus status;
    private String counts;
    private List<CountryLink> countryLinks;
    private String clientUsername;
}
