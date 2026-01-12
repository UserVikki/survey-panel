package com.dashboard.v1.controller;

import com.dashboard.v1.entity.Client;
import com.dashboard.v1.entity.Project;
import com.dashboard.v1.entity.ProjectStatus;
import com.dashboard.v1.model.request.CreateProjectRequest;
import com.dashboard.v1.model.response.VendorProjectDetailsResponse;
import com.dashboard.v1.repository.ClientRepository;
import com.dashboard.v1.repository.ProjectRepository;
import com.dashboard.v1.service.VendorProjectDetailsService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.transaction.Transactional;
import java.util.*;

@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
public class ProjectController {

    private static final Logger logger = LoggerFactory.getLogger(ProjectController.class);

    private final ProjectRepository projectRepository;

    private final VendorProjectDetailsService vendorProjectDetailsService;

    private final ClientRepository clientRepository;

    @PostMapping("/create/project")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> createProject(@RequestBody CreateProjectRequest request) {
        logger.info("inside ProjectController /create/project ");
        Map<String, Object> response = new HashMap<>();
        try {
            // Validate project identifier is unique
            if (request.getProjectIdentifier() == null || request.getProjectIdentifier().trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Project identifier is required");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }

            // Check if project identifier already exists (must be unique)
            Optional<Project> existingProject = projectRepository.findByProjectIdentifier(request.getProjectIdentifier());
            if (existingProject.isPresent()) {
                response.put("success", false);
                response.put("message", "Project identifier already exists. Please use a unique identifier.");
                return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
            }

            // Find the client by username
            Optional<Client> clientOpt = clientRepository.findByUsername(request.getClientUsername());
            if (!clientOpt.isPresent()) {
                response.put("success", false);
                response.put("message", "Client does not exist");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }

            Client client = clientOpt.get();

            // Create new project
            Project project = new Project();
            project.setProjectIdentifier(request.getProjectIdentifier());
            project.setCountryLinks(request.getCountryLinks());
            project.setClient(client);  // Set the owning side of the relationship

            // Save the project first (this will set the client_id foreign key)
            Project savedProject = projectRepository.save(project);

            // Update the client's projects list (inverse side of relationship)
            if (client.getProjects() == null) {
                client.setProjects(new ArrayList<>());
            }
            client.getProjects().add(savedProject);
            clientRepository.save(client);  // Update client to maintain bidirectional consistency

            logger.info("Project created successfully: {} for client: {}",
                       savedProject.getProjectIdentifier(), client.getUsername());

            response.put("success", true);
            response.put("message", "Project created successfully!");
            response.put("projectId", savedProject.getId());
            response.put("projectIdentifier", savedProject.getProjectIdentifier());
            response.put("clientUsername", client.getUsername());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error creating project: ", e);
            response.put("success", false);
            response.put("message", "Something went wrong! " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> getAllProjects(
            @RequestParam(required = false, defaultValue = "ACTIVE") ProjectStatus projectStatus) {
        logger.info("inside ProjectController /projects/all with status: {}", projectStatus);
        try {
            // Use JOIN FETCH to eagerly load client within transaction
            List<Project> projects = projectRepository.findAllWithClient(projectStatus);

            logger.info("Fetched {} projects with status {}", projects.size(), projectStatus);

            // Return the projects - @JsonIgnoreProperties will handle serialization
            return ResponseEntity.ok(projects);
        } catch (Exception e) {
            logger.error("Error fetching projects: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Collections.singletonMap("error", "Failed to fetch projects: " + e.getMessage()));
        }
    }

    // ✅ Fetch projects assigned to vendor (Vendor only)
    @GetMapping("/vendor")
    public List<VendorProjectDetailsResponse> getVendorProjects(@RequestParam String username) {
        logger.info("inside ProjectController /projects/vendor ");
        return vendorProjectDetailsService.getProjectsDetails(username);
    }

    // ✅ Fetch full project details (Admin can view any project)
    @GetMapping("/{projectId}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> getProjectDetails(@PathVariable Long projectId) {
        logger.info("inside ProjectController /projects/{projectId} projectId : {} ", projectId);
        try {
            Optional<Project> projectOpt = projectRepository.findById(projectId);

            if (projectOpt.isPresent()) {
                Project project = projectOpt.get();
                // Force initialization of client within transaction if lazy loaded
                if (project.getClient() != null) {
                    project.getClient().getUsername(); // Touch to initialize
                }
                return ResponseEntity.ok(project);
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Collections.singletonMap("error", "Project not found"));
            }
        } catch (Exception e) {
            logger.error("Error fetching project details for projectId: {}", projectId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Collections.singletonMap("error", "Failed to fetch project: " + e.getMessage()));
        }
    }

    // ✅ Fetch current project status by projectId and update it
    @GetMapping("/status/update/{projectId}")
    @Transactional
    public ResponseEntity<?> getAndUpdateProjectStatus(@PathVariable String projectId) {
        logger.info("inside ProjectController /status/update/{projectId} projectId : {} ", projectId);

        try {
            // Use query without client to avoid lazy loading issues
            Optional<Project> optionalProject = projectRepository.findByProjectIdentifierWithoutClient(projectId);

            if (optionalProject.isPresent()) {
                Project project = optionalProject.get();

                // Toggle status
                ProjectStatus newStatus = (project.getStatus() == ProjectStatus.ACTIVE)
                    ? ProjectStatus.INACTIVE
                    : ProjectStatus.ACTIVE;

                project.setStatus(newStatus);
                projectRepository.save(project);

                logger.info("Project status updated: {} - New status: {}", projectId, newStatus);

                return ResponseEntity.ok(Collections.singletonMap("success", newStatus.toString()));
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Collections.singletonMap("error", "Project not found"));
            }
        } catch (Exception e) {
            logger.error("Error updating project status for projectId: {}", projectId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Collections.singletonMap("error", "Failed to update project status: " + e.getMessage()));
        }

    }

}
