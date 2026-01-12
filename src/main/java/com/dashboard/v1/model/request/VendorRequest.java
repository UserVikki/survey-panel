package com.dashboard.v1.model.request;

import lombok.Data;

@Data
public class VendorRequest {
    private String username;
    private String email;
    private String company;
    private String complete;
    private String terminate;
    private String quotafull;
    private String securityTerminate;
}
