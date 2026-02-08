// Register custom sorting plugin for date format "dd/mm/yyyy, hh:mm:ss"
$.fn.dataTable.ext.type.order['custom-date-pre'] = function(data) {
    // Remove HTML tags if present (for status badges, etc.)
    var cleanData = data.replace(/<.*?>/g, '');

    if (!cleanData || cleanData === 'N/A' || cleanData.trim() === '') {
        return 0; // Return 0 for empty/N/A values so they sort to the beginning
    }

    try {
        // Expected format: "31/01/2026, 22:21:13"
        var parts = cleanData.split(',');
        if (parts.length !== 2) return 0;

        var datePart = parts[0].trim();
        var timePart = parts[1].trim();

        var dateParts = datePart.split('/');
        var timeParts = timePart.split(':');

        if (dateParts.length !== 3 || timeParts.length !== 3) return 0;

        var day = parseInt(dateParts[0], 10);
        var month = parseInt(dateParts[1], 10);
        var year = parseInt(dateParts[2], 10);
        var hour = parseInt(timeParts[0], 10);
        var minute = parseInt(timeParts[1], 10);
        var second = parseInt(timeParts[2], 10);

        // Validate parsed values
        if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hour) || isNaN(minute) || isNaN(second)) {
            return 0;
        }

        // Return timestamp in milliseconds for sorting
        var dateObj = new Date(year, month - 1, day, hour, minute, second, 0);
        return dateObj.getTime();
    } catch (e) {
        console.error('Error parsing date for sorting:', cleanData, e);
        return 0;
    }
};

// Initialize DataTable with custom configuration for dashboard
function initializeDashboardTable() {
    var allText = window.allText || 'All';

    // Destroy existing table if it exists
    if ($.fn.DataTable.isDataTable('#example')) {
        $('#example').DataTable().destroy();
    }

    // Initialize with dashboard-specific configuration
    var table = $('#example').DataTable({
        responsive: true,
        lengthMenu: [
            [10, 20, 50, 100, -1],
            [10, 20, 50, 100, allText]
        ],
        pageLength: -1,
        dom: 'lBrtip', // l=length, B=buttons, r=processing, t=table, i=info, p=pagination (removed 'f' for search)
        buttons: [
            {
                extend: 'excel',
                text: 'Export Excel',
                className: 'btn btn-success btn-sm'
            }
        ],
        columnDefs: [
            {
                orderable: false,
                targets: 0
            },
            {
                type: 'custom-date', // Apply custom date sorting to start time column
                targets: 4
            },
            {
                type: 'custom-date', // Apply custom date sorting to end time column
                targets: 5
            }
        ],
        order: [[4, 'desc']], // Sort by start time column (index 4) in descending order
        drawCallback: function(settings) {
            var api = this.api();
            var startIndex = api.page.info().start;

            // Update serial numbers based on current display order
            api.column(0, {page: 'current'}).nodes().each(function(cell, i) {
                cell.innerHTML = startIndex + i + 1;
            });
        }
    });

    // Add status filter dropdown and date range filter inputs to the button bar
    var filterHTML = `
        <div class="custom-dropdown" style="margin-left: 10px; position: relative; display: inline-block;">
            <button type="button" class="btn btn-primary btn-sm" id="statusDropdownBtn">
                <span id="filterLabel">Filter by Status: ALL</span>
                <span style="margin-left: 5px;">▼</span>
            </button>
            <ul class="dropdown-menu-custom" id="statusDropdownMenu" style="display: none; position: absolute; background: white; border: 1px solid #ddd; list-style: none; padding: 0; margin: 5px 0 0 0; min-width: 180px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 1000; border-radius: 4px;">
                <li><a class="dropdown-item status-filter-option" href="#" data-status="" style="display: block; padding: 8px 16px; text-decoration: none; color: #333;">ALL</a></li>
                <li><a class="dropdown-item status-filter-option" href="#" data-status="TERMINATE" style="display: block; padding: 8px 16px; text-decoration: none; color: #333;">TERMINATE</a></li>
                <li><a class="dropdown-item status-filter-option" href="#" data-status="QUOTAFULL" style="display: block; padding: 8px 16px; text-decoration: none; color: #333;">QUOTAFULL</a></li>
                <li><a class="dropdown-item status-filter-option" href="#" data-status="COMPLETE" style="display: block; padding: 8px 16px; text-decoration: none; color: #333;">COMPLETE</a></li>
                <li><a class="dropdown-item status-filter-option" href="#" data-status="SECURITYTERMINATE" style="display: block; padding: 8px 16px; text-decoration: none; color: #333;">SECURITYTERMINATE</a></li>
            </ul>
        </div>
        <div class="date-filter-container">
            <label>From:</label>
            <input type="date" id="startDateFilter" />
            <label>To:</label>
            <input type="date" id="endDateFilter" />
            <button id="clearDateFilter" class="btn btn-sm btn-secondary">Clear</button>
        </div>
    `;
    $('.dt-buttons').append(filterHTML);

    // Toggle dropdown menu on button click
    $(document).on('click', '#statusDropdownBtn', function(e) {
        e.stopPropagation();
        $('#statusDropdownMenu').toggle();
    });

    // Close dropdown when clicking outside
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.custom-dropdown').length) {
            $('#statusDropdownMenu').hide();
        }
    });

    // Handle status filter dropdown selection using event delegation
    $(document).on('click', '.status-filter-option', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var status = $(this).data('status');
        var statusText = $(this).text();

        // Update dropdown label
        $('#filterLabel').text('Filter by Status: ' + statusText);

        // Hide dropdown
        $('#statusDropdownMenu').hide();

        // Apply filter
        if (status === '') {
            table.column(3).search('').draw();
        } else {
            table.column(3).search(status, true, false).draw();
        }
    });

    // Add hover effect to dropdown items
    $(document).on('mouseenter', '.status-filter-option', function() {
        $(this).css('background-color', '#556ee6').css('color', 'white');
    }).on('mouseleave', '.status-filter-option', function() {
        $(this).css('background-color', 'white').css('color', '#333');
    });

    // Helper function: Parse date string "dd/mm/yyyy, hh:mm:ss" to milliseconds (cross-platform)
    function parseDateStringToMilliseconds(dateStr) {
        if (!dateStr || dateStr === 'N/A') {
            return null;
        }
        try {
            // Expected format: "31/01/2026, 22:21:13"
            var parts = dateStr.split(',');
            if (parts.length !== 2) return null;

            var datePart = parts[0].trim();
            var timePart = parts[1].trim();

            var dateParts = datePart.split('/');
            var timeParts = timePart.split(':');

            if (dateParts.length !== 3 || timeParts.length !== 3) return null;

            var day = parseInt(dateParts[0], 10);
            var month = parseInt(dateParts[1], 10);
            var year = parseInt(dateParts[2], 10);
            var hour = parseInt(timeParts[0], 10);
            var minute = parseInt(timeParts[1], 10);
            var second = parseInt(timeParts[2], 10);

            // Validate parsed values
            if (isNaN(day) || isNaN(month) || isNaN(year) || isNaN(hour) || isNaN(minute) || isNaN(second)) {
                return null;
            }

            // Create date using UTC to avoid timezone issues, then convert to milliseconds
            // Month is 0-indexed in JavaScript Date
            var dateObj = new Date(year, month - 1, day, hour, minute, second, 0);
            return dateObj.getTime();
        } catch (e) {
            console.error('Error parsing date:', dateStr, e);
            return null;
        }
    }

    // Helper function: Parse input date "yyyy-mm-dd" to milliseconds (start/end of day)
    function parseInputDateToMilliseconds(dateStr, isStartOfDay) {
        if (!dateStr) return null;
        try {
            // Expected format: "2026-01-31"
            var parts = dateStr.split('-');
            if (parts.length !== 3) return null;

            var year = parseInt(parts[0], 10);
            var month = parseInt(parts[1], 10);
            var day = parseInt(parts[2], 10);

            if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

            if (isStartOfDay) {
                // Start of day: 00:00:00.000
                var dateObj = new Date(year, month - 1, day, 0, 0, 0, 0);
                return dateObj.getTime();
            } else {
                // End of day: 23:59:59.999
                var dateObj = new Date(year, month - 1, day, 23, 59, 59, 999);
                return dateObj.getTime();
            }
        } catch (e) {
            console.error('Error parsing input date:', dateStr, e);
            return null;
        }
    }

    // Add custom date range filter with consistent cross-platform date parsing
    $.fn.dataTable.ext.search.push(
        function(settings, data, dataIndex) {
            var startDate = $('#startDateFilter').val();
            var endDate = $('#endDateFilter').val();

            if (!startDate && !endDate) {
                return true; // No filter applied
            }

            var rowStartTime = data[4]; // Start time column (index 4)
            if (!rowStartTime || rowStartTime === 'N/A') {
                return false;
            }

            // Parse the row date consistently across all platforms
            var rowDateMs = parseDateStringToMilliseconds(rowStartTime);
            if (rowDateMs === null) {
                return false;
            }

            // Parse filter dates - start of day for start date, end of day for end date
            var filterStartMs = startDate ? parseInputDateToMilliseconds(startDate, true) : null;
            var filterEndMs = endDate ? parseInputDateToMilliseconds(endDate, false) : null;

            // Apply date range filter
            if (filterStartMs !== null && filterEndMs !== null) {
                return rowDateMs >= filterStartMs && rowDateMs <= filterEndMs;
            } else if (filterStartMs !== null) {
                return rowDateMs >= filterStartMs;
            } else if (filterEndMs !== null) {
                return rowDateMs <= filterEndMs;
            }

            return true;
        }
    );

    // Attach date filter event handlers using event delegation
    $(document).on('change', '#startDateFilter, #endDateFilter', function() {
        table.draw();
    });

    // Clear date filter button using event delegation
    $(document).on('click', '#clearDateFilter', function() {
        $('#startDateFilter').val('');
        $('#endDateFilter').val('');
        table.draw();
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

    surveyResponses.forEach((response) => {
        const row = [
            '', // Serial number will be auto-generated by drawCallback
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

    // Redraw with true parameter to reset to page 1 and apply the default ordering
    table.draw(true); // Redraws the table to reflect the changes with the sort order defined in initialization
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

