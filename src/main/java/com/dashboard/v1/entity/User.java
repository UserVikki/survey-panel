package com.dashboard.v1.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

import javax.persistence.*;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @JsonIgnore  // Don't serialize password in JSON responses
    @Column(nullable = false)
    private String password;  // Hashed password

    @Enumerated(EnumType.STRING)
    private Role role;  // ADMIN or VENDOR

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String companyName;

    @Column(nullable = false)
    private String complete;

    @Column(nullable = false)
    private String terminate;

    @Column(nullable = false)
    private String quotafull;

    @Column(nullable = false)
    private String securityTerminate;

    @Column(nullable = false, unique = true)
    private String userToken;  // will be attached to link given to a vendor

    @PrePersist
    public void generateToken() {
        if (userToken == null || userToken.isEmpty()) {
            this.userToken = UUID.randomUUID().toString(); // Generates a unique token
        }
    }

    @ElementCollection
    @CollectionTable(name = "user_projects", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "project_id")
    private List<String> projectsId;

    @Enumerated(EnumType.STRING)
    private IsRemoved isShown = IsRemoved.show;

}
