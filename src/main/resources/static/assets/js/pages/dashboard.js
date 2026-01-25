// Dashboard Page JavaScript

// Initialize DataTable with custom configuration for dashboard
function initializeDashboardTable() {
    var allText = window.allText || 'All';

    // Destroy existing table if it exists
    if ($.fn.DataTable.isDataTable('#example')) {
        $('#example').DataTable().destroy();
    }

    // Initialize with dashboard-specific configuration
    $('#example').DataTable({
        responsive: true,
        lengthMenu: [
            [10, 20, 50, 100, -1],
            [10, 20, 50, 100, allText]
        ],
        pageLength: -1,
        dom: 'lBfrtip',
        buttons: [
            'copy', 'csv', 'excel', 'pdf', 'print'
        ],
        language: {
            search: "Search Table:",
            lengthMenu: "Show _MENU_ entries",
        },
        order: [[3, 'desc']] // Sort by start time column (index 3) in descending order
    });
}

document.addEventListener("DOMContentLoaded", function () {
    initializeDashboardTable();
    fetchSurveyResponses();
});

function fetchSurveyResponses() {
    fetch("/survey/api/survey-responses/all")
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
        .catch(error => console.error("Error fetching survey responses:", error));
}

function populateTable(surveyResponses) {
    const table = $('#example').DataTable();
    table.clear(); // Clears the existing table data

    surveyResponses.forEach(response => {
        const row = [
            response.projectId,
            response.uid,
            `<span class="badge ${getStatusClass(response.status)}">${response.status}</span>`,
            formatDate(response.startTime),
            formatDate(response.endTime),
            response.ipAddress,
            response.country
        ];
        table.row.add(row); // Adds the new row to DataTable
    });

    // Redraw with false parameter to maintain current page, but apply the default ordering
    table.draw(false); // Redraws the table to reflect the changes with the sort order defined in initialization
}

function getStatusClass(status) {
    switch (status.toLowerCase()) {
        case "complete":
            return "bg-success"; // Green
        case "terminate":
            return "bg-danger"; // Red
        case "quotafull":
            return "bg-warning"; // Yellow
        default:
            return "bg-secondary"; // Gray
    }
}

function formatDate(isoDate) {
    if (!isoDate) return "N/A";
    const date = new Date(isoDate);
    return date.toLocaleString(); // Converts to local date-time format
}

