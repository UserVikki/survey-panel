package com.dashboard.v1.model.request;

import lombok.Data;

import java.util.List;

@Data
public class ProjectVendorLinksRequest {
    private String projectId;
    private List<String> vendorIds;
}
