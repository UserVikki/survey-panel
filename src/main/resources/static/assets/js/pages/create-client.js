// Create Client Page JavaScript

const token = localStorage.getItem("jwtToken");
if (!token) {
    window.location.href = "/login";  // Redirect if not logged in
} else {
    document.addEventListener("DOMContentLoaded", function () {
        document.getElementById("addForm").addEventListener("submit", function (event) {
            event.preventDefault(); // Prevent form from reloading the page

            // Collect form data
            let formData = {
                username: document.getElementById("username").value,
                email: document.getElementById("details").value,
                company: document.getElementById("company").value
            };

            // Make API request
            fetch("/admin/create/client", {  // Replace with your actual API endpoint
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token  // Add JWT token
                },
                body: JSON.stringify(formData)
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
                alert("User added successfully!");  // Success message
                document.getElementById("addForm").reset();  // Clear form
            })
            .catch(error => {
                console.error("Error:", error);
                alert("Failed to add user. Maybe userName already exist , try with a different userName");
            });
        });
    });
}

