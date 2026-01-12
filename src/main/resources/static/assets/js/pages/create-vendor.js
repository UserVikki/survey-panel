// Create Vendor Page JavaScript

const token = localStorage.getItem("jwtToken");
if (!token) {
    window.location.href = "/login";  // Redirect if not logged in
} else {
    document.addEventListener("DOMContentLoaded", function () {
        document.getElementById("addForm").addEventListener("submit", function (event) {
            event.preventDefault(); // Prevent default form submission

            // Show loader
            document.getElementById("loader").style.display = "block";

            // Collect form data
            const formData = {
                username: document.getElementById("username").value,
                email: document.getElementById("email").value,
                company: document.getElementById("company").value,
                complete: document.getElementById("completed").value,
                terminate: document.getElementById("terminated").value,
                quotafull: document.getElementById("quota").value,
                securityTerminate: document.getElementById("securityTerminate").value
            };

            // Call backend API
            fetch("/admin/vendors/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token,  // Add JWT token
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
                console.log("Success:", data);
                alert("Vendor added successfully!");
                document.getElementById("addForm").reset(); // Reset form
            })
            .catch(error => {
                console.error("Error:", error);
                alert("vendor already exist. Please try again with a different vendor username.");
            })
            .finally(() => {
                // Hide loader
                document.getElementById("loader").style.display = "none";
            });
        });
    });
}

