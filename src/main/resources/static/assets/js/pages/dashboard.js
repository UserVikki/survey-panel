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
            'excel',
            {
                text: 'ALL',
                className: 'btn-filter-status',
                action: function (e, dt, node, config) {
                    dt.column(3).search('').draw();
                    $('.btn-filter-status').removeClass('active');
                    $(node).addClass('active');
                }
            },
            {
                text: 'TERMINATE',
                className: 'btn-filter-status',
                action: function (e, dt, node, config) {
                    dt.column(3).search('TERMINATE', true, false).draw();
                    $('.btn-filter-status').removeClass('active');
                    $(node).addClass('active');
                }
            },
            {
                text: 'QUOTAFULL',
                className: 'btn-filter-status',
                action: function (e, dt, node, config) {
                    dt.column(3).search('QUOTAFULL', true, false).draw();
                    $('.btn-filter-status').removeClass('active');
                    $(node).addClass('active');
                }
            },
            {
                text: 'COMPLETE',
                className: 'btn-filter-status',
                action: function (e, dt, node, config) {
                    dt.column(3).search('COMPLETE', true, false).draw();
                    $('.btn-filter-status').removeClass('active');
                    $(node).addClass('active');
                }
            },
            {
                text: 'SECURITYTERMINATE',
                className: 'btn-filter-status',
                action: function (e, dt, node, config) {
                    dt.column(3).search('SECURITYTERMINATE', true, false).draw();
                    $('.btn-filter-status').removeClass('active');
                    $(node).addClass('active');
                }
            }
        ],
        columnDefs: [
            {
                orderable: false,
                targets: 0
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

    // Add date range filter inputs to the button bar
    var dateFilterHTML = `
        <div class="date-filter-container">
            <label>From:</label>
            <input type="date" id="startDateFilter" />
            <label>To:</label>
            <input type="date" id="endDateFilter" />
            <button id="clearDateFilter" class="btn btn-sm btn-secondary">Clear</button>
        </div>
    `;
    $('.dt-buttons').append(dateFilterHTML);

    // Add custom date range filter
    $.fn.dataTable.ext.search.push(
        function(settings, data, dataIndex) {
            var startDate = $('#startDateFilter').val();
            var endDate = $('#endDateFilter').val();

            if (!startDate && !endDate) {
                return true; // No filter applied
            }

            var rowStartTime = data[4]; // Start time column (index 4)
            if (rowStartTime === 'N/A') {
                return false;
            }

            // Parse the date from the format "dd/mm/yyyy, hh:mm:ss"
            var dateParts = rowStartTime.split(',')[0].split('/');
            var timeParts = rowStartTime.split(',')[1].trim().split(':');
            var rowDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0], timeParts[1], timeParts[2]);

            var filterStartDate = startDate ? new Date(startDate) : null;
            var filterEndDate = endDate ? new Date(endDate) : null;

            if (filterEndDate) {
                filterEndDate.setHours(23, 59, 59, 999); // Include entire end date
            }

            if (filterStartDate && filterEndDate) {
                return rowDate >= filterStartDate && rowDate <= filterEndDate;
            } else if (filterStartDate) {
                return rowDate >= filterStartDate;
            } else if (filterEndDate) {
                return rowDate <= filterEndDate;
            }

            return true;
        }
    );

    // Attach date filter event handlers
    $('#startDateFilter, #endDateFilter').on('change', function() {
        table.draw();
    });

    // Clear date filter button
    $('#clearDateFilter').on('click', function() {
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

