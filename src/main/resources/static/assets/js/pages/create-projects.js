// Create Projects Page JavaScript

// Dynamic field addition
$(document).ready(function(){
    $(".add").click(function () {
        let options = $("#countryOptionsTemplate").html();

        let fieldHTML = `
            <div class="row fieldGroup">
                <div class="col-lg-3 mb-3">
                    <label for="country" class="form-label">Country Name</label>
                    <select name="country[]" class="form-select" required>
                        ${options}
                    </select>
                </div>
                <div class="col-lg-4 mb-3">
                    <label for="links" class="form-label">Links</label>
                    <input type="text" class="form-control" name="links[]" required>
                </div>
                <div class="col-lg-2 mb-3">
                    <label for="cpi" class="form-label">CPI</label>
                    <input type="text" class="form-control" name="cpi[]" placeholder="e.g., 5.00" required>
                </div>
                <div class="col-lg-2 mb-3 d-flex align-items-end">
                    <button type="button" class="btn btn-danger remove">Remove</button>
                </div>
            </div>
        `;
        $("#dynamicFields").append(fieldHTML);
    });

    $(document).on("click", ".remove", function(){
        $(this).closest(".fieldGroup").remove();
    });
});

// Form submission
const token = localStorage.getItem("jwtToken");
if (!token) {
    window.location.href = "/login";  // Redirect if not logged in
} else {
    document.getElementById("addForm").addEventListener("submit", function(event) {
        event.preventDefault(); // Prevent default form submission

        // Select all country, link, and CPI input fields
        let countryInputs = document.querySelectorAll("select[name='country[]']");
        let linkInputs = document.querySelectorAll("input[name='links[]']");

        let countryValues = Array.from(countryInputs).map(input => input.value);
        console.log("Countries:", countryValues);
        let linkValues = Array.from(linkInputs).map(input => input.value);
        console.log("Links:", linkValues);

        // Construct an array of objects containing country-link-CPI triplets
        let countryLinks = Array.from(countryInputs).map((input, index) => ({
            country: input.value,
            originalLink: linkInputs[index]?.value || ""
        }));

        let formData = {
            projectIdentifier: document.getElementById("pid").value,
            clientUsername: document.getElementById("client").value,
            ir: document.getElementById("ir").value,
            loi: document.getElementById("loi").value,
            quota: document.getElementById("quota").value,
            counts: document.getElementById("counts").value,
            cpi: document.getElementById("cpi").value,
            countryLinks: countryLinks
        };

        document.getElementById("loader").style.display = "block"; // Show loader

        fetch("/projects/create/project", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + localStorage.getItem("jwtToken")
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (response.status === 401) { // If unauthorized, redirect to login
                alert("Session expired. Please log in again.");
                localStorage.removeItem('jwtToken'); // Clear stored token
                window.location.href = "/login"; // Redirect to login page
            }
            return response.json();
        })
        .then(data => {
            console.log("Success:", data);
            document.getElementById("loader").style.display = "none"; // Hide loader
            alert(data.message);
            document.getElementById("addForm").reset(); // Reset form
        })
        .catch(error => {
            document.getElementById("loader").style.display = "none"; // Hide loader
            alert("Error creating project");
            console.error("Error:", error);
        });
    });
}

// Load clients
document.addEventListener("DOMContentLoaded", function () {
    fetch("/admin/clients/get/", {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + token,  // Ensure you have a valid token
            "Content-Type": "application/json"
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Failed to fetch clients");
        }
        return response.json();
    })
    .then(data => {
        let clientSelect = document.getElementById("client");
        clientSelect.innerHTML = '<option value="">Select a Client</option>'; // Reset options

        data.forEach(client => {
            let option = document.createElement("option");
            option.value = client.username;  // Use the client ID as value
            option.textContent = client.username;  // Show the client name
            clientSelect.appendChild(option);
        });
    })
    .catch(error => console.error("Error fetching clients:", error));
});

