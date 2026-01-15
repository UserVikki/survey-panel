// Project Table Page JavaScript

document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("jwtToken");

    if (!token) {
        window.location.href = "/login"; // Redirect if not logged in
        return;
    }

    fetch('/projects/table-data', {
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

            // Store vendorsUsername and project details as data attributes for later use
            if (project.vendorsUsername && Array.isArray(project.vendorsUsername)) {
                row.setAttribute('data-vendors', JSON.stringify(project.vendorsUsername));
            } else {
                row.setAttribute('data-vendors', '[]');
            }

            // Store LOI, IR, Quota for the details modal
            row.setAttribute('data-loi', project.loi || 'N/A');
            row.setAttribute('data-ir', project.ir || 'N/A');
            row.setAttribute('data-quota', project.quota || 'N/A');
            row.setAttribute('data-cpi', project.cpi || 'N/A');

            row.innerHTML = `
                <td>${project.projectIdentifier}</td>
                <td>
                    <select class="form-select status-select ${getStatusSelectClass(project.status)}"
                            data-project-id="${project.projectIdentifier}"
                            data-current-status="${project.status}">
                        <option value="ACTIVE" ${project.status === 'ACTIVE' ? 'selected' : ''}>ACTIVE</option>
                        <option value="INACTIVE" ${project.status === 'INACTIVE' ? 'selected' : ''}>INACTIVE</option>
                        <option value="CLOSED" ${project.status === 'CLOSED' ? 'selected' : ''}>CLOSED</option>
                        <option value="INVOICED" ${project.status === 'INVOICED' ? 'selected' : ''}>INVOICED</option>
                    </select>
                </td>
                <td>${project.complete}</td>
                <td>${project.terminate}</td>
                <td>${project.quotafull}</td>
                <td>${project.securityTerminate}</td>
                <td>${project.counts}</td>
                <td>
                    <button type="button" class="btn btn-success view-vendors">View Vendors</button>
                </td>
                <td>
                    <button type="button" class="btn btn-info view-details">View Details</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        initializeDataTable();
    })
    .catch(error => console.error('Error fetching projects:', error));
});

// Handle status change from dropdown
document.addEventListener('change', function (event) {
    if (event.target.classList.contains('status-select')) {
        const selectElement = event.target;
        const projectId = selectElement.getAttribute('data-project-id');
        const currentStatus = selectElement.getAttribute('data-current-status');
        const newStatus = selectElement.value;

        // If status hasn't actually changed, do nothing
        if (newStatus === currentStatus) {
            return;
        }

        // Confirm status change
        if (!confirm(`Change project ${projectId} status from ${currentStatus} to ${newStatus}?`)) {
            // User cancelled, revert to current status
            selectElement.value = currentStatus;
            return;
        }

        const token = localStorage.getItem("jwtToken");

        // Call API to update status
        fetch(`/projects/status/update/${projectId}?status=${newStatus}`, {
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
            if (data && data.success) {
                // Update was successful
                const updatedStatus = data.status;

                // Update the data attribute with new status
                selectElement.setAttribute('data-current-status', updatedStatus);

                // Update the select element styling based on new status
                selectElement.className = `form-select status-select ${getStatusSelectClass(updatedStatus)}`;

                // Show success message
                alert(`Project ${projectId} status updated to ${updatedStatus}`);

            } else if (data && data.error) {
                alert("Failed to update status: " + data.error);
                // Revert to previous status
                selectElement.value = currentStatus;
            } else {
                alert("Failed to update status.");
                // Revert to previous status
                selectElement.value = currentStatus;
            }
        })
        .catch(error => {
            console.error("Error updating status:", error);
            alert("Error updating status. Please try again.");
            // Revert to previous status
            selectElement.value = currentStatus;
        });
    }
});

function getStatusSelectClass(status) {
    // Return CSS class based on status
    const statusStr = String(status).trim().toUpperCase();
    switch(statusStr) {
        case 'ACTIVE':
            return 'status-active';
        case 'INACTIVE':
            return 'status-inactive';
        case 'CLOSED':
            return 'status-closed';
        case 'INVOICED':
            return 'status-invoiced';
        default:
            return '';
    }
}

// Modal handlers
document.addEventListener('click', function (event) {
    // Handle View Details button
    if (event.target.classList.contains('view-details')) {
        const row = event.target.closest('tr');
        const projectId = row.children[0].innerText;
        const loi = row.getAttribute('data-loi');
        const ir = row.getAttribute('data-ir');
        const quota = row.getAttribute('data-quota');
        const cpi = row.getAttribute('data-cpi');

        // Populate the details modal
        document.getElementById('detailsProjectId').textContent = projectId;
        document.getElementById('detailsLOI').textContent = loi;
        document.getElementById('detailsIR').textContent = ir;
        document.getElementById('detailsQuota').textContent = quota;
        document.getElementById('detailsCpi').textContent = cpi;

        // Show the modal using Bootstrap's API
        const detailsModal = new bootstrap.Modal(document.getElementById('detailsModal'));
        detailsModal.show();
    }

    // Handle View Vendors button
    if (event.target.classList.contains('view-vendors')) {
        const token = localStorage.getItem("jwtToken");
        const row = event.target.closest('tr');
        const projectId = row.children[0].innerText;

        // Get vendorsUsername from the data attribute
        const vendorsUsername = JSON.parse(row.getAttribute('data-vendors') || '[]');

        // Fetch vendor list for the project
        fetch('/projects/vendor-list', {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                projectId: projectId,
                vendorIds: vendorsUsername
            })
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
            if (!data) {
                console.error("No data received from vendor-list API");
                return;
            }

            const vendorList = document.getElementById('vendorList');
            vendorList.innerHTML = ""; // Clear previous content

            // Check if data is an array and has items
            if (Array.isArray(data) && data.length > 0) {
                // Display vendors with their links
                data.forEach(vendorLink => {
                    const li = document.createElement('li');
                    li.className = 'mb-2';

                    // Create vendor name and link display
                    li.innerHTML = `
                        <strong>${vendorLink.vendorName}:</strong><br>
                        <a href="${vendorLink.link}" target="_blank" class="text-primary">
                            ${vendorLink.link}
                        </a>
                    `;

                    vendorList.appendChild(li);
                });
            } else {
                // No vendors found for this project
                const li = document.createElement('li');
                li.textContent = 'No vendors assigned to this project.';
                li.className = 'text-muted';
                vendorList.appendChild(li);
            }

            // Show the modal using Bootstrap's API
            const vendorsModal = new bootstrap.Modal(document.getElementById('vendorsModal'));
            vendorsModal.show();
        })
        .catch(error => {
            console.error('Error fetching vendor list:', error);
            alert('Error loading vendor list. Please try again.');
        });
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