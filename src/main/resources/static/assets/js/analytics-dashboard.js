6// Analytics Dashboard JavaScript

let trafficChart = null;
let currentView = 'day';
let currentMarket = 'all';

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

function initializeDashboard() {
    loadMarkets();
    loadMetrics();
    initializeChart();
    setupEventListeners();
}

// Load available markets
function loadMarkets() {
    fetch('/api/analytics/markets', {
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('jwtToken')
        }
    })
    .then(response => {
        if (response.status === 401) {
            redirectToLogin();
            return;
        }
        return response.json();
    })
    .then(markets => {
        const select = document.getElementById('marketSelect');
        select.innerHTML = '';

        markets.forEach(market => {
            const option = document.createElement('option');
            option.value = market.toLowerCase();
            option.textContent = market;
            select.appendChild(option);
        });
    })
    .catch(error => {
        console.error('Error loading markets:', error);
    });
}

// Load metrics data
function loadMetrics() {
    const url = `/api/analytics/metrics?market=${currentMarket}`;

    fetch(url, {
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('jwtToken')
        }
    })
    .then(response => {
        if (response.status === 401) {
            redirectToLogin();
            return;
        }
        return response.json();
    })
    .then(data => {
        updateMetricCard('totalTraffics', data.totalTraffics.value, data.totalTraffics.change, false);
        updateMetricCard('completePercent', data.completePercent.value + '%', data.completePercent.change, true);
        updateMetricCard('terminatePercent', data.terminatePercent.value + '%', data.terminatePercent.change, false);
        updateMetricCard('securityTerminatePercent', data.securityTerminatePercent.value + '%', data.securityTerminatePercent.change, false);
        updateMetricCard('quotaFullPercent', data.quotaFullPercent.value + '%', data.quotaFullPercent.change, false);
        updateMetricCard('totalDropPercent', data.totalDropPercent.value + '%', data.totalDropPercent.change, false);

        // Update progress circles
        updateProgressCircle('reconcileRateCircle', 'reconcileRateValue', data.reconcileRate);
        updateProgressCircle('avgPlatformCircle', 'avgPlatformValue', data.avgPlatformReconciliation);
    })
    .catch(error => {
        console.error('Error loading metrics:', error);
    });
}

// Update metric card
function updateMetricCard(metricName, value, change, isPositiveGood) {
    const valueElement = document.getElementById(metricName + 'Value');
    const trendElement = document.getElementById(metricName + 'Trend');

    if (!valueElement || !trendElement) return;

    // Animate value update
    valueElement.style.animation = 'none';
    setTimeout(() => {
        valueElement.textContent = value;
        valueElement.style.animation = 'countUp 0.8s ease-out';
    }, 10);

    // Update trend
    const absChange = Math.abs(change).toFixed(1);
    const isPositive = change > 0;
    const isNeutral = Math.abs(change) < 0.1;

    let trendClass = 'trend-neutral';
    let trendIcon = 'mdi-minus';

    if (!isNeutral) {
        if ((isPositive && isPositiveGood) || (!isPositive && !isPositiveGood)) {
            trendClass = 'trend-up';
            trendIcon = 'mdi-trending-up';
        } else {
            trendClass = 'trend-down';
            trendIcon = 'mdi-trending-down';
        }
    }

    trendElement.className = 'metric-trend ' + trendClass;
    trendElement.innerHTML = `
        <i class="mdi ${trendIcon}"></i>
        <span>${absChange}%</span> from last month
    `;
}

// Update progress circle
function updateProgressCircle(circleId, valueId, percent) {
    const circle = document.getElementById(circleId);
    const valueElement = document.getElementById(valueId);

    if (!circle || !valueElement) return;

    const progressBar = circle.querySelector('.progress-bar');
    const circumference = 2 * Math.PI * 45; // radius = 45
    const offset = circumference - (percent / 100) * circumference;

    // Animate the circle
    setTimeout(() => {
        progressBar.style.strokeDashoffset = offset;
    }, 100);

    // Animate the value
    animateValue(valueElement, 0, percent, 1000, true);
}

// Animate number value
function animateValue(element, start, end, duration, isPercent = false) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = current.toFixed(1) + (isPercent ? '%' : '');
    }, 16);
}

// Initialize chart
function initializeChart() {
    const ctx = document.getElementById('trafficChart').getContext('2d');

    trafficChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Total Traffic',
                data: [],
                backgroundColor: 'rgba(91, 115, 232, 0.7)',
                borderColor: 'rgba(91, 115, 232, 1)',
                borderWidth: 2,
                borderRadius: 6,
                hoverBackgroundColor: 'rgba(91, 115, 232, 0.9)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    borderColor: 'rgba(91, 115, 232, 0.5)',
                    borderWidth: 1,
                    cornerRadius: 6,
                    callbacks: {
                        label: function(context) {
                            return 'Traffic: ' + context.parsed.y;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 11
                        },
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });

    loadChartData();
}

// Load chart data
function loadChartData(startDate = null, endDate = null) {
    let url = `/api/analytics/traffic-chart?view=${currentView}&market=${currentMarket}`;

    if (currentView === 'custom' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
    }

    fetch(url, {
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('jwtToken')
        }
    })
    .then(response => {
        if (response.status === 401) {
            redirectToLogin();
            return;
        }
        return response.json();
    })
    .then(data => {
        trafficChart.data.labels = data.labels;
        trafficChart.data.datasets[0].data = data.data;
        trafficChart.update();
    })
    .catch(error => {
        console.error('Error loading chart data:', error);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Market selector change
    document.getElementById('marketSelect').addEventListener('change', function(e) {
        currentMarket = e.target.value;
        loadMetrics();
        loadChartData();
    });

    // Chart view toggle
    document.querySelectorAll('.chart-view-toggle .btn').forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            document.querySelectorAll('.chart-view-toggle .btn').forEach(btn => {
                btn.classList.remove('active');
            });

            // Add active class to clicked button
            this.classList.add('active');

            // Update current view
            currentView = this.getAttribute('data-view');

            // Show/hide custom date range
            const customDateRange = document.getElementById('customDateRange');
            if (currentView === 'custom') {
                customDateRange.style.display = 'block';
                // Set default dates
                const today = new Date().toISOString().split('T')[0];
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                document.getElementById('startDate').value = thirtyDaysAgo;
                document.getElementById('endDate').value = today;
            } else {
                customDateRange.style.display = 'none';
                loadChartData();
            }
        });
    });

    // Apply custom date range
    document.getElementById('applyCustomDate').addEventListener('click', function() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        if (!startDate || !endDate) {
            alert('Please select both start and end dates');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            alert('Start date must be before end date');
            return;
        }

        loadChartData(startDate, endDate);
    });
}

// Redirect to login
function redirectToLogin() {
    alert('Session expired. Please log in again.');
    localStorage.removeItem('jwtToken');
    window.location.href = '/login';
}

// Refresh dashboard data every 5 minutes
setInterval(() => {
    loadMetrics();
    loadChartData();
}, 5 * 60 * 1000);

