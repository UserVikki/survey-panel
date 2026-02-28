package com.dashboard.v1.pages.controller;

import com.dashboard.v1.repository.UserRepository;
import com.dashboard.v1.service.CountryService;
import com.dashboard.v1.service.VendorService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;


@Controller
@RequiredArgsConstructor
public class PageController {

    public final CountryService countryService;

    @Autowired
    private VendorService vendorService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/")
    public String home(Model model) {
        model.addAttribute("message", "Welcome to Spring Boot MVC with Java 8!");
        return "home";
    }

    @GetMapping("/login")
    public String showLoginPage() {
        return "login";
    }

    @GetMapping("/dashboard")
    public String showDashboard() {
        return "dashboard";
    }

    @GetMapping("/assign/projects")
    public String assignProjects() {
        return "assign-projects";
    }

    @GetMapping("/create/projects")
    public String createProject(Model model) {
        List<CountryService.CountryDTO> countries = countryService.getAllCountries();
        model.addAttribute("countries", countries);
        return "create-projects";
    }

    @GetMapping("/create/vendor")
    public String createVendor() {
        return "create-vendor";
    }

    @GetMapping("/project/table")
    public String projectTable() {
        return "project-table";
    }

    @GetMapping("/create/client")
    public String createClient() {
        return "create-client";
    }

    @GetMapping("/show/clients")
    public String showClients() {
        return "show-all-client";
    }

    @GetMapping("/show/vendors")
    public String showVendors() {
        return "show-all-vendor";
    }

    @GetMapping("/show/client/info")
    public String showClientInfo(@RequestParam String username,
                                 @RequestParam String email,
                                 @RequestParam String company,
                                 Model model) {
        model.addAttribute("username", username);
        model.addAttribute("email", email);
        model.addAttribute("company", company);
        return "view-client-info";
    }

    @GetMapping("/show/vendor/info")
    public String showVendorInfo(@RequestParam String username,
                                 @RequestParam String email,
                                 @RequestParam String company,
                                 Model model) {
        model.addAttribute("username", username);
        model.addAttribute("email", email);
        model.addAttribute("company", company);
        return "view-vendor-info"; // Redirects to vendor-info.html or vendor-info.jsp
    }

    @GetMapping("/survey/{vendorToken}/{country}")
    public String redirectPage(@PathVariable String vendorToken,
                               @PathVariable String country,
                               @RequestParam("PID") String pid,
                               @RequestParam("UID") String uid,
                               Model model) {


        model.addAttribute("pid", pid);
        model.addAttribute("country", country);
        model.addAttribute("vendorToken", vendorToken);
        model.addAttribute("uid", uid);

        return "redirect-page"; // Redirects to vendor-info.html or vendor-info.jsp
    }

    @GetMapping("/redirectLinks")
    public String redirects() {
        return "show-redirects";
    }

    @GetMapping("/analytics")
    public String analytics() {
        return "analytics-dashboard";
    }


}
