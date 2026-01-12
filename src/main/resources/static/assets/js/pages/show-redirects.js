// Show Redirects Page JavaScript

document.addEventListener("DOMContentLoaded", function () {
    fetchSurveyResponses();
});

function fetchSurveyResponses() {
    fetch("/redirects")
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

function populateTable(response) {
    const table = $('#example').DataTable();
    table.clear(); // Clears the existing table data
    const row = [
        response.complete,
        response.terminate,
        response.quotafull,
        response.securityTerminate
    ];
    table.row.add(row);
    table.draw(); // Redraws the table to reflect the changes
}

function copyToClipboard() {
    let tableData = [];

    // Get all rows from the DataTable
    const table = $('#example').DataTable();
    table.rows().every(function () {
        const data = this.data();
        tableData.push(data.join("\n")); // Join each row's values with a tab space
    });

    const textToCopy = tableData.join("\n"); // Join all rows with a newline

    navigator.clipboard.writeText(textToCopy).then(() => {
        alert("Copied to clipboard!");
    }).catch(err => console.error("Error copying:", err));
}

