// Show All Vendor Page JavaScript

// Copy button functionality
$(document).ready(function(){
    $(".copy-btn").click(function(){
        let button = $(this);
        let originalHtml = button.html(); // Save original button content
        let linkText = button.text().trim(); // Extract only the text part

        // Copy only the link text (without the icon)
        let tempInput = $("<input>");
        $("body").append(tempInput);
        tempInput.val(linkText).select();
        document.execCommand("copy");
        tempInput.remove();

        // Change button text temporarily to "Copied!"
        button.html(`<i class="bx bx-link label-icon"></i> Copied!`)
            .addClass("btn-success")
            .removeClass("btn-primary");

        // Restore original content after 1.5 seconds
        setTimeout(() => {
            button.html(originalHtml).removeClass("btn-success").addClass("btn-primary");
        }, 1500);
    });
});

document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("jwtToken");

    if (!token) {
        window.location.href = "/login";  // Redirect if not logged in
        return;
    }

    fetchAndPopulateTable();
});

function fetchAndPopulateTable() {
    const token = localStorage.getItem("jwtToken");

    if (!token) {
        window.location.href = "/login";  // Redirect if not logged in
        return;
    }

    fetch("/admin/vendors/get/", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token,
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
    .catch(error => {
        console.error("Error fetching data:", error);
    });
}

function populateTable(users) {
    let table = $("#example").DataTable();

    // ✅ Clear and Destroy DataTable before populating
    table.clear().destroy();

    let tableBody = document.querySelector("#example tbody");
    tableBody.innerHTML = ""; // Clear existing rows

    users.forEach(user => {
        let vendorUrl = `/show/vendor/info?username=${encodeURIComponent(user.username)}&email=${encodeURIComponent(user.email)}&company=${encodeURIComponent(user.companyName)}`;

        let row = `<tr>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.companyName}</td>
            <td><a href="${vendorUrl}"><button type="button" class="btn btn-success view-links">View Vendor</button></a></td>
        </tr>`;

        // ✅ Use insertAdjacentHTML to avoid re-parsing the entire innerHTML
        tableBody.insertAdjacentHTML("beforeend", row);
    });

    // ✅ Reinitialize DataTable after adding new rows
    initializeDataTable();
}

function toggleStatus(button, username) {
    const token = localStorage.getItem("jwtToken");

    fetch(`/status/update/${username}`, {
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

                // Show success alert
                alert(`Vendor status updated successfully to: ${newStatus}`);

                // Refresh the vendor table to show updated data
                fetchAndPopulateTable();
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
    return statusStr === "SHOW" ? "btn-success" : "btn-danger";
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

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => alert("Copied to clipboard: " + text))
        .catch(err => console.error("Failed to copy:", err));
}

