package com.dashboard.v1.model.response;

import com.dashboard.v1.entity.CountryLink;
import lombok.Data;

import java.util.List;

@Data
public class GetVendorResponse {
    private String projectId;
    private String complete;
    private String terminate;
    private String quotafull;
    private String securityTerminate;
    private List<CountryLink> links;
}
