// Auto-hide alerts after 5 seconds
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        var alerts = document.querySelectorAll('.alert');
        alerts.forEach(function(alert) {
            var bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        });
    }, 5000);

    // Quick date range buttons
    document.querySelectorAll('.quick-range').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var days = parseInt(this.getAttribute('data-days'));
            var form = this.closest('form');
            var startInput = form.querySelector('.date-start');
            var endInput = form.querySelector('.date-end');

            var end = new Date();
            var start = new Date();
            start.setDate(start.getDate() - days);

            if (startInput) startInput.value = formatDate(start);
            if (endInput) endInput.value = formatDate(end);

            form.submit();
        });
    });
});

function formatDate(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
}
