// Show Redirects Page JavaScript

document.addEventListener("DOMContentLoaded", function () {
    fetchSurveyResponses();
});

function fetchSurveyResponses() {
    // Use the robust request handler
    window.requestHandler.fetch("/redirects")
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
            if (data) {
                populateTable(data);
            }
        })
        .catch(error => {
            console.error("Error fetching survey responses:", error);
            alert("Failed to fetch survey responses. The request will be retried automatically.");
        });
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
        tableData.push(data.join("\n")); // Join each row's values with a newline
    });

    const textToCopy = tableData.join("\n"); // Join all rows with a newline

    // Try modern clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            alert("Copied to clipboard!");
        }).catch(err => {
            console.error("Clipboard API failed:", err);
            fallbackCopyToClipboard(textToCopy);
        });
    } else {
        // Use fallback method for older browsers or non-secure contexts
        fallbackCopyToClipboard(textToCopy);
    }
}

function fallbackCopyToClipboard(text) {
    // Create a temporary textarea element
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Make it invisible and non-interactive
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    textArea.style.opacity = "0";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        // For iOS compatibility
        textArea.setSelectionRange(0, 99999);

        const successful = document.execCommand('copy');
        if (successful) {
            alert("Copied to clipboard!");
        } else {
            alert("Failed to copy. Please copy manually.");
        }
    } catch (err) {
        console.error("Fallback copy failed:", err);
        alert("Failed to copy. Please copy manually.");
    }

    document.body.removeChild(textArea);
}

