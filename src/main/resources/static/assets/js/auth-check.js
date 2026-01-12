// Authentication Check - Run before page loads
(function() {
    const token = localStorage.getItem("jwtToken");
    if (!token) {
        window.location.replace("/login"); // faster redirect than href
    }
})();

