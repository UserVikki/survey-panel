// Login Page JavaScript

$(document).ready(function () {
    $("#loginForm").submit(function (event) {
        event.preventDefault(); // Prevent default form submission

        var email = $("#email").val().trim();
        var password = $("#password").val().trim();

        if (email === "" || password === "") {
            $("#errorMessage").html('<div class="alert alert-danger">Both fields are required!</div>');
            return;
        }

        $("#loader").show(); // Show loader

        $.ajax({
            url: "/auth/login", // Change to your actual Spring Boot login endpoint
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify({
                username: email,
                password: password
            }),
            success: function (response) {
                $("#loader").hide();

                if (response.token) { // ✅ Store JWT token
                    localStorage.setItem("jwtToken", response.token);  // ✅ Save token in localStorage

                    $("#successMessage").html('<div class="alert alert-success">Login successful! Redirecting...</div>');

                    setTimeout(function () {
                        window.location.href = "/dashboard"; // Change to your actual dashboard route
                    }, 1500);
                } else {
                    $("#errorMessage").html('<div class="alert alert-danger">Login failed. No token received.</div>');
                }
            },
            error: function (xhr) {
                $("#loader").hide();
                $("#errorMessage").html('<div class="alert alert-danger">Invalid credentials. Please try again.</div>');
            }
        });
    });
});

// Change Password Form Handler
document.getElementById("changePasswordForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    const errorDiv = document.getElementById("changePasswordError");
    const successDiv = document.getElementById("changePasswordSuccess");

    errorDiv.innerText = "";
    successDiv.innerText = "";

    if (newPassword !== confirmPassword) {
        errorDiv.innerText = "New password and confirm password do not match.";
        return;
    }

    // Call API
    fetch("/change-password", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            currentPassword: currentPassword,
            newPassword: newPassword
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(text) });
        }
        return response.text();
    })
    .then(data => {
        successDiv.innerText = data;
        // Optionally, close modal after delay
        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
            modal.hide();
            document.getElementById("changePasswordForm").reset();
        }, 1500);
    })
    .catch(error => {
        errorDiv.innerText = error.message || "An error occurred.";
    });
});

