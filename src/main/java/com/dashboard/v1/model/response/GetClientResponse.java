package com.dashboard.v1.model.response;

import lombok.Data;


@Data
public class GetClientResponse {
    private String projectId;
    private String complete;
    private String terminate;
    private String quotafull;
    private String securityTerminate;
}
