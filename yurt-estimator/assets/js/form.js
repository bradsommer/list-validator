/**
 * Yurt Estimator — live price calculation.
 *
 * Reads the pricing config passed via wp_localize_script (yeConfig)
 * and recalculates totals whenever any form input changes.
 */
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        var form = document.getElementById('ye-form');
        if (!form || typeof yeConfig === 'undefined') return;

        var basePrice = parseFloat(yeConfig.basePrice) || 0;
        var fields = yeConfig.fields || {};

        function recalculate() {
            var optionsTotal = 0;

            Object.keys(fields).forEach(function (key) {
                var input;
                var field = fields[key];

                if (field.type === 'radio') {
                    input = form.querySelector('input[name="ye_field_' + key + '"]:checked');
                } else {
                    input = form.querySelector('select[name="ye_field_' + key + '"]');
                }

                if (input) {
                    var price = 0;
                    if (field.type === 'select') {
                        var selected = input.options[input.selectedIndex];
                        price = parseFloat(selected.getAttribute('data-price')) || 0;
                    } else {
                        price = parseFloat(input.getAttribute('data-price')) || 0;
                    }
                    optionsTotal += price;
                }
            });

            var total = basePrice + optionsTotal;

            var optionsEl = document.getElementById('ye-options-total');
            var totalEl = document.getElementById('ye-total-price');

            if (optionsEl) optionsEl.textContent = '$' + optionsTotal.toFixed(2);
            if (totalEl) totalEl.textContent = '$' + total.toFixed(2);
        }

        // Bind change events
        form.addEventListener('change', recalculate);

        // Initial calculation
        recalculate();
    });
})();
