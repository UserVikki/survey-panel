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
        console.error("Username is missing. Cannot fetch client projects.");
        return;
    }

    fetchClientProjects(username, token);
});

function fetchClientProjects(username, token) {
    fetch(`/admin/get/client/projects?userName=${encodeURIComponent(username)}`, {
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
    .catch(error => console.error("Error fetching client projects:", error));
}

function populateTable(projects) {
    let table = $("#example").DataTable();

    // Clear and Destroy DataTable before populating
    table.clear().destroy();

    let tableBody = document.querySelector("#example tbody");
    tableBody.innerHTML = ""; // Clear existing rows

    let totalComplete = 0;
    let totalTerminate = 0;
    let totalQuotafull = 0;
    let totalSecurityTerminate = 0;

    projects.forEach(project => {
        totalComplete += parseInt(project.complete, 10) || 0;
        totalTerminate += parseInt(project.terminate, 10) || 0;
        totalQuotafull += parseInt(project.quotafull, 10) || 0;
        totalSecurityTerminate += parseInt(project.securityTerminate, 10) || 0;

        let row = `
            <tr>
                <td>${project.projectId}</td>
                <td><span class="badge bg-success">${project.complete || 0}</span></td>
                <td><span class="badge bg-danger">${project.terminate || 0}</span></td>
                <td><span class="badge bg-primary">${project.quotafull || 0}</span></td>
                <td><span class="badge bg-warning">${project.securityTerminate || 0}</span></td>
            </tr>`;

        tableBody.insertAdjacentHTML("beforeend", row);
    });

    // Reinitialize DataTable after adding new rows
    initializeDataTable();
}

function initializeDataTable() {
    $("#example").DataTable({
        responsive: true,
        lengthMenu: [
            [10, 20, 50, 100, -1],
            [10, 20, 50, 100, "All"]
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

