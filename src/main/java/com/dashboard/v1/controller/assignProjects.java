package com.dashboard.v1.controller;

import com.dashboard.v1.entity.*;
import com.dashboard.v1.model.request.AssignProjectRequest;
import com.dashboard.v1.repository.ProjectRepository;
import com.dashboard.v1.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import javax.transaction.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
public class assignProjects {

    private static final Logger logger = LoggerFactory.getLogger(assignProjects.class);

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;

    // Get all vendors and projects
    @GetMapping("/vendors-projects")
    @Transactional
    public ResponseEntity<Map<String, Object>> getVendorsAndProjects() {
        logger.info("Fetching vendors and projects for assignment");
        try {
            Optional<List<User>> vendors = userRepository.findByRole(Role.VENDOR);

            if (!vendors.isPresent()) {
                logger.warn("No vendors found in database");
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "No vendors found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
            }

            // Use findAllWithClient to eagerly load client relationships
            logger.info("Fetching active projects with client relationships");
            List<Project> availableForAssign = projectRepository.findAllWithClient(ProjectStatus.ACTIVE);

            List<User> vendorNotHidden = vendors.get().stream()
                    .filter(v -> v.getIsShown() == IsRemoved.show)
                    .collect(Collectors.toList());

            logger.info("Found {} active projects and {} visible vendors",
                       availableForAssign.size(), vendorNotHidden.size());

            Map<String, Object> response = new HashMap<>();
            response.put("vendors", vendorNotHidden);
            response.put("projects", availableForAssign);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error fetching vendors and projects", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch vendors and projects: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @PostMapping("/assign-projects")
    @Transactional
    public ResponseEntity<String> assignProjectsToVendor(@RequestBody AssignProjectRequest request) {
        try {
            Optional<List<User>> vendorOpt = userRepository.findByIdIn(request.getVendorIds());
            if (!vendorOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Vendor not found");
            }

            List<User> vendors = vendorOpt.get().stream().filter(vendor -> vendor.getIsShown() == IsRemoved.show)
                    .collect(Collectors.toList());

            vendors.forEach(vendor -> {
                // Get vendor's existing projects - initialize if null
                // Must ensure this is effectively final for lambda
                if (vendor.getProjectsId() == null) {
                    vendor.setProjectsId(new ArrayList<>());
                }
                final List<String> existingProjects = vendor.getProjectsId();

                // Track only NEW projects to be added
                List<String> newProjectsToAdd = new ArrayList<>();
                List<String> selectedProjects = request.getProjectIds();

                selectedProjects.forEach(projectId -> {
                    // Use the safe query that doesn't load client (we don't need it here)
                    Optional<Project> optionalProject = projectRepository.findByProjectIdentifierWithoutClient(projectId);

                    // Only add if project exists, is active, and vendor doesn't already have it
                    if (optionalProject.isPresent() && !existingProjects.contains(projectId) && optionalProject.get().getStatus() == ProjectStatus.ACTIVE) {
                        Project project = optionalProject.get();

                        List<String> vendorsOfProject = project.getVendorsUsername();
                        if (vendorsOfProject == null) {
                            vendorsOfProject = new ArrayList<>();
                        }

                        if (!vendorsOfProject.contains(vendor.getUsername())) {
                            vendorsOfProject.add(vendor.getUsername());
                            project.setVendorsUsername(vendorsOfProject);
                            projectRepository.save(project);
                            // Add to NEW projects list only
                            newProjectsToAdd.add(projectId);
                        }
                    }
                });

                // Add only the NEW projects to vendor's existing list
                existingProjects.addAll(newProjectsToAdd);
                userRepository.save(vendor);
            });

            return ResponseEntity.ok("Projects assigned successfully!");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to assign projects: " + e.getMessage());
        }
    }
}
