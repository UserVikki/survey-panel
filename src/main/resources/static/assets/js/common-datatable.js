// Common DataTable Initialization

$(document).ready(function () {
    var allText = window.allText || 'All';

    if ($('#example').length && !$.fn.DataTable.isDataTable('#example')) {
        $('#example').DataTable({
            responsive: true,
            lengthMenu: [
                [10, 20, 50, 100, -1],
                [10, 20, 50, 100, allText]
            ],
            pageLength: 10,
            dom: 'lBfrtip',
            buttons: [
                'copy', 'csv', 'excel', 'pdf', 'print'
            ],
            language: {
                search: "Search Table:",
                lengthMenu: "Show _MENU_ entries",
            }
        });
    }
});

