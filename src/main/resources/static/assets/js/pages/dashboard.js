/******************************************************
 * DASHBOARD TABLE – PURE JS (NO DATATABLES)
 * Features:
 * - Status filter
 * - Date range filter
 * - Custom date parsing (dd/mm/yyyy, hh:mm:ss)
 * - Stable sorting (Start Time DESC)
 * - Auto serial numbers
 * - Cross-device consistent behavior
 ******************************************************/

/* =======================
   GLOBAL STATE
======================= */
let allRows = [];
let activeStatusFilter = '';
let activeStartDate = null;
let activeEndDate = null;
let activeSearchQuery = '';

/* =======================
   DATE UTILITIES
======================= */

// Parse "dd/mm/yyyy, hh:mm:ss" → milliseconds
function parseCustomDate(dateStr) {
    if (!dateStr || dateStr === 'N/A') return null;

    try {
        const parts = dateStr.split(',');
        if (parts.length !== 2) return null;

        const [dd, mm, yyyy] = parts[0].trim().split('/').map(Number);
        const [hh, mi, ss] = parts[1].trim().split(':').map(Number);

        if ([dd, mm, yyyy, hh, mi, ss].some(isNaN)) return null;

        return new Date(yyyy, mm - 1, dd, hh, mi, ss, 0).getTime();
    } catch {
        return null;
    }
}

// Parse input date "yyyy-mm-dd" → start/end of day ms
function parseInputDate(dateStr, isStartOfDay) {
    if (!dateStr) return null;

    const [yyyy, mm, dd] = dateStr.split('-').map(Number);
    if ([yyyy, mm, dd].some(isNaN)) return null;

    return isStartOfDay
        ? new Date(yyyy, mm - 1, dd, 0, 0, 0, 0).getTime()
        : new Date(yyyy, mm - 1, dd, 23, 59, 59, 999).getTime();
}

/* =======================
   FORMATTERS
======================= */

function formatDate(isoDate) {
    if (!isoDate) return 'N/A';

    const d = new Date(isoDate);
    if (isNaN(d)) return 'N/A';

    return (
        String(d.getDate()).padStart(2, '0') + '/' +
        String(d.getMonth() + 1).padStart(2, '0') + '/' +
        d.getFullYear() + ', ' +
        String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0') + ':' +
        String(d.getSeconds()).padStart(2, '0')
    );
}

function getStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'complete': return 'bg-success';
        case 'terminate': return 'bg-danger';
        case 'quotafull': return 'bg-warning';
        default: return 'bg-secondary';
    }
}

/* =======================
   FETCH DATA
======================= */

function fetchSurveyResponses() {
    fetch("/survey/api/survey-responses/all")
        .then(res => {
            if (res.status === 401) {
                alert("Session expired. Please login again.");
                localStorage.removeItem('jwtToken');
                window.location.href = "/login";
                return;
            }
            return res.json();
        })
        .then(data => {
            allRows = data.map(r => {
                const startFormatted = formatDate(r.startTime);
                return {
                    projectId: r.projectId,
                    uid: r.uid,
                    status: r.status,
                    startTime: startFormatted,
                    endTime: formatDate(r.endTime),
                    startMs: parseCustomDate(startFormatted),
                    ip: r.ipAddress,
                    country: r.country
                };
            });

            applyFiltersAndRender();
        })
        .catch(err => console.error("Error fetching data:", err));
}

/* =======================
   FILTER + SORT PIPELINE
======================= */

function applyFiltersAndRender() {
    let rows = [...allRows];

    // Search filter
    if (activeSearchQuery) {
        const query = activeSearchQuery.toLowerCase();
        rows = rows.filter(r => {
            return (
                r.projectId.toString().toLowerCase().includes(query) ||
                r.uid.toString().toLowerCase().includes(query) ||
                r.status.toLowerCase().includes(query) ||
                r.startTime.toLowerCase().includes(query) ||
                r.endTime.toLowerCase().includes(query) ||
                r.ip.toLowerCase().includes(query) ||
                r.country.toLowerCase().includes(query)
            );
        });
    }

    // Status filter
    if (activeStatusFilter) {
        rows = rows.filter(r => r.status === activeStatusFilter);
    }

    // Date range filter (based on start time)
    if (activeStartDate || activeEndDate) {
        rows = rows.filter(r => {
            if (!r.startMs) return false;
            if (activeStartDate && r.startMs < activeStartDate) return false;
            if (activeEndDate && r.startMs > activeEndDate) return false;
            return true;
        });
    }

    // Sort by Start Time DESC
    rows.sort((a, b) => (b.startMs || 0) - (a.startMs || 0));

    renderTable(rows);
}

/* =======================
   RENDER TABLE
======================= */

function renderTable(rows) {
    const tbody = document.querySelector('#example tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    rows.forEach((r, index) => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${r.projectId}</td>
            <td>${r.uid}</td>
            <td><span class="badge ${getStatusClass(r.status)}">${r.status}</span></td>
            <td>${r.startTime}</td>
            <td>${r.endTime}</td>
            <td>${r.ip}</td>
            <td>${r.country}</td>
        `;

        tbody.appendChild(tr);
    });
}

/* =======================
   FILTER EVENTS
======================= */

document.addEventListener('click', e => {
    if (e.target.classList.contains('status-filter-option')) {
        e.preventDefault();
        e.stopPropagation();

        activeStatusFilter = e.target.dataset.status || '';
        document.getElementById('filterLabel').innerText =
            'Filter by Status: ' + e.target.innerText;

        document.getElementById('statusDropdownMenu').style.display = 'none';
        applyFiltersAndRender();
    }
});

// Toggle dropdown when clicking button OR its children
document.addEventListener('click', e => {
    const btn = document.getElementById('statusDropdownBtn');
    const menu = document.getElementById('statusDropdownMenu');

    if (btn.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        return;
    }

    // Close when clicking outside
    if (!e.target.closest('.custom-dropdown')) {
        menu.style.display = 'none';
    }
});

// Date filters
document.addEventListener('change', e => {
    if (e.target.id === 'startDateFilter') {
        activeStartDate = parseInputDate(e.target.value, true);
        applyFiltersAndRender();
    }

    if (e.target.id === 'endDateFilter') {
        activeEndDate = parseInputDate(e.target.value, false);
        applyFiltersAndRender();
    }
});

// Clear date filter
document.addEventListener('click', e => {
    if (e.target.id === 'clearDateFilter') {
        activeStartDate = null;
        activeEndDate = null;
        document.getElementById('startDateFilter').value = '';
        document.getElementById('endDateFilter').value = '';
        applyFiltersAndRender();
    }
});

// Search input
document.addEventListener('input', e => {
    if (e.target.id === 'searchInput') {
        activeSearchQuery = e.target.value.trim();
        applyFiltersAndRender();
    }
});

// Clear search
document.addEventListener('click', e => {
    if (e.target.id === 'clearSearchBtn') {
        activeSearchQuery = '';
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        applyFiltersAndRender();
    }
});

document.getElementById('exportExcelBtn').addEventListener('click', function () {
    const table = document.getElementById('example');
    let csv = [];

    for (let row of table.rows) {
        let cols = Array.from(row.cells).map(cell =>
            `"${cell.innerText.replace(/"/g, '""')}"`
        );
        csv.push(cols.join(','));
    }

    const csvBlob = new Blob([csv.join('\n')], {
        type: 'text/csv;charset=utf-8;'
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(csvBlob);
    link.download = 'dashboard_export.csv';
    link.click();
});

/* =======================
   INIT
======================= */

document.addEventListener('DOMContentLoaded', () => {
    fetchSurveyResponses();
});

