// Dashboard Page JavaScript

document.addEventListener("DOMContentLoaded", function () {
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

    table.draw(); // Redraws the table to reflect the changes
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

