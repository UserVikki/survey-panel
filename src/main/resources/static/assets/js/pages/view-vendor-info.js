document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("jwtToken");

    if (!token) {
        window.location.href = "/login";  // Redirect if not logged in
        return;
    }

    const usernameInput = document.getElementById("username");
    if (!usernameInput) {
        console.error("Username input field not found.");
        return;
    }

    const username = usernameInput.value.trim();
    if (!username) {
        console.error("Username is missing. Cannot fetch vendor projects.");
        return;
    }

    fetchVendorProjects(username, token);
});

function fetchVendorProjects(username, token) {
    fetch(`/admin/get/vendor/projects?userName=${encodeURIComponent(username)}`, {
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
        populateTable(data);
    })
    .catch(error => console.error("Error fetching vendor projects:", error));
}

function populateTable(projects) {
    const tableBody = document.querySelector("#example tbody");
    tableBody.innerHTML = ""; // Clear existing rows

    let totalComplete = 0, totalTerminate = 0, totalQuotafull = 0, totalSecurityTerminate = 0;

    projects.forEach(project => {
        totalComplete += parseInt(project.complete, 10) || 0;
        totalTerminate += parseInt(project.terminate, 10) || 0;
        totalQuotafull += parseInt(project.quotafull, 10) || 0;
        totalSecurityTerminate += parseInt(project.securityTerminate, 10) || 0;

        let rowHTML = `
            <tr data-country-links='${JSON.stringify(project.links)}'>
                <td>${project.projectId}</td>
                <td><span class="badge bg-success">${project.complete || 0}</span></td>
                <td><span class="badge bg-danger">${project.terminate || 0}</span></td>
                <td><span class="badge bg-primary">${project.quotafull || 0}</span></td>
                <td><span class="badge bg-warning">${project.securityTerminate || 0}</span></td>
                <td>
                    <button type="button" class="btn btn-success view-links"
                        data-bs-toggle="modal" data-bs-target="#linksModal">View Links</button>
                </td>
            </tr>`;

        tableBody.insertAdjacentHTML("beforeend", rowHTML);
    });

    // Update totals only if elements exist
    const completedInput = document.getElementById("completed");
    const terminatedInput = document.getElementById("terminated");
    const quotaInput = document.getElementById("quota");
    const securityTerminateInput = document.getElementById("securityTerminate");

    if (completedInput) completedInput.value = totalComplete;
    if (terminatedInput) terminatedInput.value = totalTerminate;
    if (quotaInput) quotaInput.value = totalQuotafull;
    if (securityTerminateInput) securityTerminateInput.value = totalSecurityTerminate;
}

// Event delegation for dynamically created "View Links" buttons
document.addEventListener("click", function (event) {
    if (event.target.classList.contains("view-links")) {
        let row = event.target.closest("tr");
        let countryLinks = JSON.parse(row.getAttribute("data-country-links"));

        let countryList = document.getElementById("countryList");
        countryList.innerHTML = ""; // Clear previous entries

        countryLinks.forEach(linkObj => {
            let li = document.createElement("li");
            let linkElement = document.createElement("a");
            linkElement.href = linkObj.originalLink;
            linkElement.textContent = linkObj.originalLink;
            linkElement.target = "_blank";

            li.innerHTML = `<strong>${linkObj.country}:</strong> `;
            li.appendChild(linkElement);
            countryList.appendChild(li);
        });

        console.log("Updated country list:", countryList);
    }
});