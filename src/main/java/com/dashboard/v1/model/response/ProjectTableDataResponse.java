package com.dashboard.v1.model.response;

import com.dashboard.v1.entity.ProjectStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProjectTableDataResponse {
    private String projectIdentifier;
    private ProjectStatus status;
    private Long complete;
    private Long terminate;
    private Long quotafull;
    private Long securityTerminate;
    private Long counts;
    private List<String> vendorsUsername;
    private String loi;
    private String ir;
    private String quota;
    private String cpi;
}

