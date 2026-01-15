package com.dashboard.v1.controller;

import com.dashboard.v1.AppProperties;
import com.dashboard.v1.entity.*;
import com.dashboard.v1.model.request.ChangePasswordRequest;
import com.dashboard.v1.model.request.ClientRequest;
import com.dashboard.v1.model.request.VendorRequest;
import com.dashboard.v1.model.response.GetClientResponse;
import com.dashboard.v1.model.response.GetVendorResponse;
import com.dashboard.v1.model.response.VendorResponse;
import com.dashboard.v1.repository.*;
import com.dashboard.v1.service.VendorService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import javax.transaction.Transactional;
import java.security.Principal;
import java.util.*;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@CrossOrigin
public class AdminController {

    private static final Logger logger = LoggerFactory.getLogger(AdminController.class);

    private final UserRepository userRepository;
    private final ClientRepository clientRepository;

    private final PasswordEncoder passwordEncoder;

    private final ProjectRepository projectRepository;
    private final VendorProjectLinkRepository vendorProjectLinkRepository;
    private final VendorService vendorService;
    private final SurveyResponseRepository surveyResponseRepository;
    private final ProjectVendorCountsRepository projectVendorCountsRepository;

    //    private final String domain = "localhost:8080";
    private final AppProperties appProperties;

    @PostMapping("/vendors/create")
    public ResponseEntity<?> createVendor(@RequestBody VendorRequest request) {
        logger.info("inside  /admin/vendors request : {}",request);
        if (userRepository.existsByUsername(request.getUsername())) {
            logger.warn("Username '{}' already exists!", request.getUsername());
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Vendor username already exists");
        }
        if (request.getUsername() == null || request.getUsername().isEmpty()) {
            return ResponseEntity.badRequest().body("Username is required");
        }
        if (request.getEmail() == null || request.getEmail().isEmpty()) {
            return ResponseEntity.badRequest().body("Email is required");
        }
        if (request.getCompany() == null || request.getCompany().isEmpty()) {
            return ResponseEntity.badRequest().body("Company name is required");
        }
        String generatedPassword = UUID.randomUUID().toString().substring(0, 8); // Generate random 8-char password
        String hashedPassword = passwordEncoder.encode(generatedPassword);

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(hashedPassword);
        user.setRole(Role.VENDOR);
        user.setEmail(request.getEmail());
        user.setCompanyName(request.getCompany());
        user.setComplete(request.getComplete());
        user.setTerminate(request.getTerminate());
        user.setQuotafull(request.getQuotafull());
        user.setSecurityTerminate(request.getSecurityTerminate());

        userRepository.save(user);
        logger.info("inside  /admin/vendors vendor created with username : {}",request.getUsername());

        return ResponseEntity.ok(new VendorResponse(request.getUsername(), generatedPassword));
    }

    @GetMapping("/vendors/get/")
    public List<User> getVendors() {
        return userRepository.findAllVendors();
    }

    @GetMapping("/get/vendors-project-link")
    public List<VendorProjectLink> getVendorsProjectLink(@RequestParam String vendorId) {
        return vendorProjectLinkRepository.findByVendorUsername(vendorId);
    }

    @GetMapping("/generate-link")
    public ResponseEntity<String> generateVendorClickLink(
            @RequestParam("vendorUsername") String vendorUsername,
            @RequestParam("pid") String pid) {

        Optional<User> vendor = userRepository.findByUsername(vendorUsername);
        if(!vendor.isPresent()) return ResponseEntity.ok("vendor not found for the given username");

        // Construct the survey link dynamically
        String BASE_URL = "https://yourdomain.com/survey/";
        String generatedLink = BASE_URL + vendor.get().getUserToken() + "?uid=" + "111" + "&pid=" + pid;

        return ResponseEntity.ok(generatedLink);
    }

    @PostMapping("/create/client")
    public ResponseEntity<?> createClient(@RequestBody ClientRequest request){

        logger.info("inside  /create/client request : {}",request);
        if (clientRepository.existsByUsername(request.getUsername())) {
            logger.warn("Username '{}' already exists!", request.getUsername());
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Vendor username already exists");
        }
        if (request.getUsername() == null || request.getUsername().isEmpty()) {
            return ResponseEntity.badRequest().body("Username is required");
        }
        if (request.getEmail() == null || request.getEmail().isEmpty()) {
            return ResponseEntity.badRequest().body("Email is required");
        }
        if (request.getCompany() == null || request.getCompany().isEmpty()) {
            return ResponseEntity.badRequest().body("Company name is required");
        }
        String generatedPassword = UUID.randomUUID().toString().substring(0, 8); // Generate random 8-char password
        String hashedPassword = passwordEncoder.encode(generatedPassword);

        Client client  = new Client();
        client.setUsername(request.getUsername());
        client.setEmail(request.getEmail());
        client.setCompanyName(request.getCompany());
        client.setToken(client.getToken());

        clientRepository.save(client);
        logger.info("inside  /admin/vendors vendor created with username : {}",request.getUsername());

        return ResponseEntity.ok(new VendorResponse(request.getUsername(), generatedPassword));
    }

    @GetMapping("/get/client/projects")
    public ResponseEntity<List<GetClientResponse>> getClientProjects(@RequestParam String userName) {
        logger.info("Inside /get/client/projects, client userName: {}", userName);

        Optional<Client> clientOptional = clientRepository.findByUsername(userName);
        if (!clientOptional.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.emptyList());
        }

        Client client = clientOptional.get();

        List<String> projectIds = client.getProjects();

        List<GetClientResponse> responseList = new ArrayList<>();

        projectIds.forEach(projectId ->
        {
            Optional<Project> project = projectRepository.findByProjectIdentifier(projectId);
            if(project.isPresent()) {
                GetClientResponse getClientResponse = new GetClientResponse();
                getClientResponse.setProjectId(projectId);
                getClientResponse.setComplete(String.valueOf(project.get().getComplete()));
                getClientResponse.setTerminate(String.valueOf(project.get().getTerminate()));
                getClientResponse.setQuotafull(String.valueOf(project.get().getQuotafull()));
                getClientResponse.setSecurityTerminate(String.valueOf(project.get().getSecurityTerminate()));
                responseList.add(getClientResponse);
            }
        });

        return ResponseEntity.ok(responseList);
    }

    @GetMapping("/get/vendor/projects")
    public ResponseEntity<List<GetVendorResponse>> getVendorProjects(@RequestParam String userName) {
        logger.info("Inside /get/vendor/projects, vendor userName: {}", userName);

        Optional<User> vendorOptional = userRepository.findByUsername(userName);
        if (!vendorOptional.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.emptyList());
        }

        User vendor = vendorOptional.get();
        List<String> projectIds = vendor.getProjectsId();
        if (projectIds.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        Map<String, GetVendorResponse> projectResponseMap = new HashMap<>();

        projectIds.forEach(projectId ->
        {
            Optional<Project> project = projectRepository.findByProjectIdentifier(projectId);
            if(project.isPresent()) {

                GetVendorResponse getVendorResponse = new GetVendorResponse();
                getVendorResponse.setProjectId(projectId);

                // ✅ Fetch counts from ProjectVendorCounts table
                Optional<ProjectVendorCounts> countsOpt =
                        projectVendorCountsRepository.findByVendorUsernameAndProjectId(userName, projectId);

                ProjectVendorCounts counts = countsOpt.orElseGet(() -> {
                    ProjectVendorCounts emptyCounts = new ProjectVendorCounts();
                    emptyCounts.setCompletedSurveys(0);
                    emptyCounts.setTerminatedSurveys(0);
                    emptyCounts.setQuotaFullSurveys(0);
                    emptyCounts.setSecurityTerminateSurveys(0);
                    return emptyCounts;
                });

                getVendorResponse.setComplete(String.valueOf(counts.getCompletedSurveys()));
                getVendorResponse.setTerminate(String.valueOf(counts.getTerminatedSurveys()));
                getVendorResponse.setQuotafull(String.valueOf(counts.getQuotaFullSurveys()));
                getVendorResponse.setSecurityTerminate(String.valueOf(counts.getSecurityTerminateSurveys()));


                List<CountryLink> links = new ArrayList<>();
                project.get().getCountryLinks().forEach(countrylink ->
                {
                    CountryLink link = new CountryLink();
                    link.setCountry(countrylink.getCountry());
                    link.setOriginalLink(appProperties.getDomain()+"/survey/"+ vendor.getUserToken() +"/"+countrylink.getCountry()+"?PID="+projectId+"&UID=111");
                    links.add(link);
                });
                getVendorResponse.setLinks(links);
                projectResponseMap.put(project.get().getProjectIdentifier(), getVendorResponse);
            }
        });

        List<GetVendorResponse> responseList = new ArrayList<>(projectResponseMap.values());
        return ResponseEntity.ok(responseList);
    }


    @GetMapping("/clients/get/")
    public List<Client> getClient() {
        return clientRepository.findAll(IsRemoved.show);
    }
}