// Project Table Page JavaScript

document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("jwtToken");

    if (!token) {
        window.location.href = "/login"; // Redirect if not logged in
        return;
    }

    fetch('/projects/all?projectStatus=ACTIVE', {
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
        if (!Array.isArray(data)) {
            console.error("Invalid data format:", data);
            return;
        }
        let tableBody = document.querySelector("#example tbody");

        if (!tableBody) {
            console.error("Table body not found!");
            return;
        }

        tableBody.innerHTML = ""; // Clear table before adding new data

        data.forEach(project => {
            let row = document.createElement("tr");

            row.innerHTML = `
                <td>${project.projectIdentifier}</td>
                <td>
                    <button class="btn ${getStatusClass(project.status)}" onclick="toggleStatus(this, '${project.projectIdentifier}')">
                        ${project.status}
                    </button>
                </td>
                <td>${project.counts}</td>
                <td>${project.client.username}</td>
                <td>
                    <button type="button" class="btn btn-success view-links" >View Links</button>
                </td>
                <td>
                    <button type="button" class="btn btn-success view-vendors" >View Vendors</button>
                </td>
            `;
            row.setAttribute("data-country-links", JSON.stringify(project.countryLinks));
            row.setAttribute("data-project-vendors", JSON.stringify(project.vendorsUsername));
            tableBody.appendChild(row);
        });

        initializeDataTable();
    })
    .catch(error => console.error('Error fetching projects:', error));
});

// Toggle status function
function toggleStatus(button, projectId) {
    const token = localStorage.getItem("jwtToken");

    fetch(`/projects/status/update/${projectId}`, {
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
            if (data.success) {
                // The backend returns the NEW status in data.success
                const newStatus = data.success;

                if (newStatus.toUpperCase() === "INACTIVE") {
                    // Remove the row since we're only showing ACTIVE projects
                    const row = button.closest('tr');
                    const table = $('#example').DataTable();
                    table.row(row).remove().draw();
                    alert(`Project ${projectId} has been set to INACTIVE and removed from the active projects view.`);
                } else {
                    // Update button if status is ACTIVE
                    button.innerText = newStatus;
                    button.className = `btn ${getStatusClass(newStatus)}`;
                }
            } else if (data.error) {
                alert("Failed to update status: " + data.error);
            } else {
                alert("Failed to update status.");
            }
        })
        .catch(error => {
            console.error("Error updating status:", error);
            alert("Error updating status. Please try again.");
        });
}

function getStatusClass(status) {
    // Ensure status is a string and trim any whitespace
    const statusStr = String(status).trim().toUpperCase();
    return statusStr === "ACTIVE" ? "btn-success" : "btn-danger";
}

// Modal handlers
document.addEventListener('click', function (event) {
    if (event.target.classList.contains('view-vendors')) {
        const row = event.target.closest('tr');
        const vendors = JSON.parse(row.getAttribute('data-project-vendors') || '[]');
        const vendorList = document.getElementById('vendorList');

        vendorList.innerHTML = ""; // Clear old vendors
        vendors.forEach(vendor => {
            const li = document.createElement('li');
            li.textContent = vendor;
            vendorList.appendChild(li);
        });

        // Show the modal using Bootstrap's API
        const vendorsModal = new bootstrap.Modal(document.getElementById('vendorsModal'));
        vendorsModal.show();
    }

    if (event.target.classList.contains('view-links')) {
        const row = event.target.closest('tr');
        const countryLinks = JSON.parse(row.getAttribute('data-country-links'));
        const countryList = document.getElementById('countryList');
        countryList.innerHTML = ""; // Clear old links

        countryLinks.forEach(linkObj => {
            const li = document.createElement('li');
            const linkElement = document.createElement('a');
            linkElement.href = linkObj.originalLink;
            linkElement.textContent = linkObj.originalLink;
            linkElement.target = "_blank";

            li.innerHTML = `<strong>${linkObj.country}:</strong> `;
            li.appendChild(linkElement);
            countryList.appendChild(li);
        });

        // Show the modal using Bootstrap's API
        const linksModal = new bootstrap.Modal(document.getElementById('linksModal'));
        linksModal.show();
    }
});

function initializeDataTable() {
    var allText = window.allText || 'All';
    $("#example").DataTable({
        responsive: true,
        lengthMenu: [
            [10, 20, 50, 100, -1],
            [10, 20, 50, 100, allText]
        ],
        pageLength: 10,
        dom: 'lBfrtip',
        buttons: ['copy', 'csv', 'excel', 'pdf', 'print'],
        language: {
            search: "Search Table:",
            lengthMenu: "Show _MENU_ entries",
        }
    });
}

