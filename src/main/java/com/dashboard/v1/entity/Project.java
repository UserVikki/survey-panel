package com.dashboard.v1.entity;

import lombok.*;

import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Getter
@Setter
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String projectIdentifier;

    @Column(nullable = false, unique = true)
    private String projectIdentifierToken;

    @Enumerated(EnumType.STRING)
    private ProjectStatus status = ProjectStatus.ACTIVE;

    private Long complete = 0L;

    private Long terminate = 0L;

    private Long quotafull = 0L;

    private Long securityTerminate = 0L;

    @ElementCollection
    @CollectionTable(name = "project_country_links", joinColumns = @JoinColumn(name = "project_id"))
    private List<CountryLink> countryLinks; // List of country-link pairs

    @ElementCollection
    @CollectionTable(name = "project_vendors_username", joinColumns = @JoinColumn(name = "project_id"))
    @Column(name = "vendor_username")
    private List<String> vendorsUsername;

    private String loi;
    private String ir;

    @Lob
    @Column(length = 100000)
    private String quota;

    private Long counts;

    private String cpi;

    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
