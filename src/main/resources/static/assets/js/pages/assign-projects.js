// Assign Projects Page JavaScript

// Initialize Select2
$(document).ready(function() {
    // Enable multi-select for projects
    $('#projects').select2({
        placeholder: "Select Projects",
        allowClear: true
    });

    // Enable Select2 for vendors (Single Select)
    $('#vendors').select2({
        placeholder: "Select Vendor",
        allowClear: true
    });
});

// Main page logic
document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("jwtToken");

    if (!token) {
        window.location.href = "/login";
        return;
    }

    fetch('/vendors-projects', {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        }
    })
    .then(response => {
        if (response.status === 401) {
            alert("Session expired. Please log in again.");
            localStorage.removeItem('jwtToken');
            window.location.href = "/login";
            return;
        }
        return response.json();
    })
    .then(data => {
        console.log("Fetched Data:", data);
        populateVendors(data.vendors);
        populateProjects(data.projects, data.vendors);
    })
    .catch(error => console.error('Error fetching vendors and projects:', error));

    function populateVendors(vendors) {
        let vendorSelect = document.getElementById("vendors");
        vendorSelect.innerHTML = ''; // No default option since it's multiselect
        vendors.forEach(vendor => {
            let option = document.createElement("option");
            option.value = vendor.id;
            option.textContent = vendor.username;
            vendorSelect.appendChild(option);
        });
    }

    function populateProjects(projects) {
        let projectSelect = document.getElementById("projects");
        projectSelect.innerHTML = ''; // Clear existing options

        projects.forEach(project => {
            let option = document.createElement("option");
            option.value = project.projectIdentifier;
            option.textContent = project.projectIdentifier;
            projectSelect.appendChild(option);
        });

        $(".select2").select2(); // Reinitialize Select2 for better UI
    }

    document.getElementById("submitForm").addEventListener("click", function (e) {
        e.preventDefault(); // prevent actual form submission

        let selectedVendors = $("#vendors").val();   // <-- now multiple
        let selectedProjects = $("#projects").val(); // <-- already multiple

        if (!selectedVendors || selectedVendors.length === 0 || !selectedProjects || selectedProjects.length === 0) {
            alert("Please select at least one vendor and one project.");
            return;
        }

        let requestBody = {
            vendorIds: selectedVendors,
            projectIds: selectedProjects
        };

        document.getElementById("loader").style.display = "block";

        fetch('/assign-projects', {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        })
        .then(response => {
            // Handle authentication errors
            if (response.status === 401) {
                document.getElementById("loader").style.display = "none";
                alert("Session expired. Please log in again.");
                localStorage.removeItem('jwtToken');
                window.location.href = "/login";
                return null; // Stop further processing
            }

            // Handle forbidden/permission errors
            if (response.status === 403) {
                document.getElementById("loader").style.display = "none";
                alert("You don't have permission to assign projects.");
                throw new Error("Permission denied");
            }

            // Handle not found errors
            if (response.status === 404) {
                document.getElementById("loader").style.display = "none";
                alert("Endpoint not found. Please contact support.");
                throw new Error("API endpoint not found");
            }

            // Handle server errors
            if (response.status >= 500) {
                document.getElementById("loader").style.display = "none";
                alert("Server error occurred. Please try again later.");
                throw new Error(`Server error: ${response.status}`);
            }

            // Handle bad request
            if (response.status === 400) {
                return response.text().then(text => {
                    document.getElementById("loader").style.display = "none";
                    alert(`Invalid request: ${text}`);
                    throw new Error("Bad request");
                });
            }

            // Handle other non-OK responses
            if (!response.ok) {
                return response.text().then(text => {
                    document.getElementById("loader").style.display = "none";
                    alert(`Error: ${text || 'Unknown error occurred'}`);
                    throw new Error(`HTTP ${response.status}: ${text}`);
                });
            }

            // Success - parse response
            return response.text();
        })
        .then(message => {
            if (message === null) {
                // Handled redirect (e.g., 401), do nothing
                return;
            }

            // Success response
            document.getElementById("loader").style.display = "none";
            alert(message || "Projects assigned successfully!");

            // Reset form
            $('#vendors').val(null).trigger('change');
            $('#projects').val(null).trigger('change');

            // Reload to refresh project list
            setTimeout(() => {
                location.reload();
            }, 500); // Small delay to ensure user sees the success message
        })
        .catch(error => {
            // Handle network errors and any other exceptions
            console.error('Error assigning projects:', error);
            document.getElementById("loader").style.display = "none";

            // Check if it's a network error
            if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
                alert("Network error. Please check your internet connection and try again.");
            } else if (!error.message.includes('Permission denied') &&
                       !error.message.includes('Bad request') &&
                       !error.message.includes('Server error')) {
                // Only show generic error if we haven't already shown a specific one
                alert("An unexpected error occurred. Please try again.");
            }
        });
    });
});

