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
        .then(response => response.text())
        .then(message => {
            alert(message);
            document.getElementById("loader").style.display = "none";
            location.reload(); // Reload to refresh project list
        })
        .catch(error => {
            console.error('Error assigning projects:', error);
            document.getElementById("loader").style.display = "none";
        });
    });
});

