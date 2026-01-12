// Show All Client Page JavaScript

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
        window.location.href = "/login"; // Redirect if not logged in
        return;
    }

    fetchClients();
});

function fetchClients() {
    const token = localStorage.getItem("jwtToken");

    if (!token) {
        window.location.href = "/login"; // Redirect if not logged in
        return;
    }

    fetch("/admin/clients/get/", {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        }
    })
    .then(response => {
        if (response.status === 401) {
            displayErrorMessage("Unauthorized access. Redirecting to login...");
            setTimeout(() => {
                window.location.href = "/login";
            }, 3000);
            throw new Error("401 Unauthorized - Redirecting to login.");
        }
        return response.json();
    })
    .then(data => {
        populateClientTable(data);
    })
    .catch(error => console.error("Error fetching clients:", error));
}

function displayErrorMessage(message) {
    const errorContainer = document.getElementById("error-message");
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = "block";
    }
}

function populateClientTable(clients) {
    let table = $("#example").DataTable();

    // ✅ Clear and Destroy DataTable before populating
    table.clear().destroy();

    let tableBody = document.querySelector("#example tbody");
    tableBody.innerHTML = ""; // Clear existing rows

    clients.forEach(client => {
        let clientUrl = `/show/client/info?username=${encodeURIComponent(client.username)}&email=${encodeURIComponent(client.email)}&company=${encodeURIComponent(client.companyName)}`;

        let row = `<tr>
            <td>${client.username}</td>
            <td>${client.email}</td>
            <td>${client.companyName}</td>
            <td><a href="${clientUrl}"><button type="button" class="btn btn-success view-links">View Client</button></a></td>
            <td>
                  <button class="btn ${getStatusClass(client.isShown)}" onclick="toggleStatus(this, '${client.username}')">
                      ${client.isShown}
                  </button>
            </td>
        </tr>`;

        // ✅ Use insertAdjacentHTML to avoid re-parsing the entire innerHTML
        tableBody.insertAdjacentHTML("beforeend", row);
    });

    // ✅ Reinitialize DataTable after adding new rows
    initializeDataTable();
}

function toggleStatus(button, username) {
    let currentStatus = button.innerText.trim();
    let newStatus = currentStatus.toLowerCase() === "show" ? "hide" : "show";

    fetch(`/client/status/update/${username}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update button text and class
                button.innerText = newStatus;
                button.className = `btn ${getStatusClass(newStatus)}`;
            } else {
                alert("Failed to update status.");
            }
        })
    .catch(error => console.error("Error updating status:", error));
}

function getStatusClass(status) {
    return status.toLowerCase() === "show" ? "btn-success" : "btn-danger";
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

