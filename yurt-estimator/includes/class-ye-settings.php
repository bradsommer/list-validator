<?php
/**
 * Admin settings page for configuring the yurt estimator.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class YE_Settings {

    public static function init() {
        add_action( 'admin_menu', array( __CLASS__, 'add_menu' ) );
        add_action( 'admin_init', array( __CLASS__, 'register_settings' ) );
    }

    public static function add_menu() {
        add_submenu_page(
            'edit.php?post_type=yurt_estimate',
            'Estimator Settings',
            'Settings',
            'manage_options',
            'ye-settings',
            array( __CLASS__, 'render_page' )
        );
    }

    public static function register_settings() {
        register_setting( 'ye_settings', 'ye_notification_email' );
        register_setting( 'ye_settings', 'ye_email_from_name' );
        register_setting( 'ye_settings', 'ye_email_subject' );
        register_setting( 'ye_settings', 'ye_google_ads_conversion_id' );
        register_setting( 'ye_settings', 'ye_google_ads_conversion_label' );
        register_setting( 'ye_settings', 'ye_products', array(
            'type'              => 'string',
            'sanitize_callback' => array( __CLASS__, 'sanitize_products' ),
            'default'           => wp_json_encode( self::default_products() ),
        ) );
    }

    public static function sanitize_products( $value ) {
        // Accept raw JSON string from the textarea
        $decoded = json_decode( $value, true );
        if ( json_last_error() !== JSON_ERROR_NONE ) {
            add_settings_error( 'ye_products', 'invalid_json', 'Products JSON is invalid. Changes were not saved.' );
            return get_option( 'ye_products', wp_json_encode( self::default_products() ) );
        }
        return wp_json_encode( $decoded );
    }

    /**
     * Default product configurations — editable from admin.
     */
    public static function default_products() {
        return array(
            '4-wall-yurt' => array(
                'label'      => '4-Wall Yurt',
                'base_price' => 7800.00,
                'fields'     => array(
                    'walls' => array(
                        'label'    => 'Walls',
                        'type'     => 'radio',
                        'required' => true,
                        'options'  => array(
                            'regular' => array( 'label' => 'Regular Walls (included)', 'price' => 0 ),
                            'tall'    => array( 'label' => 'Add Tall Walls', 'price' => 450.00 ),
                        ),
                    ),
                    'color' => array(
                        'label'    => 'Color',
                        'type'     => 'select',
                        'required' => true,
                        'options'  => array(
                            ''           => array( 'label' => 'Select', 'price' => 0 ),
                            'white'      => array( 'label' => 'White', 'price' => 0 ),
                            'off-white'  => array( 'label' => 'Off-White', 'price' => 0 ),
                            'tan'        => array( 'label' => 'Tan', 'price' => 0 ),
                            'green'      => array( 'label' => 'Green', 'price' => 150.00 ),
                            'blue'       => array( 'label' => 'Blue', 'price' => 150.00 ),
                            'red'        => array( 'label' => 'Red', 'price' => 150.00 ),
                        ),
                    ),
                    'side_windows' => array(
                        'label'    => 'Add Side Windows (two)',
                        'type'     => 'select',
                        'required' => false,
                        'options'  => array(
                            ''    => array( 'label' => 'Select', 'price' => 0 ),
                            'no'  => array( 'label' => 'No', 'price' => 0 ),
                            'yes' => array( 'label' => 'Yes', 'price' => 350.00 ),
                        ),
                    ),
                    'inner_wall_cover' => array(
                        'label'    => 'Inner Wall Cover',
                        'type'     => 'select',
                        'required' => false,
                        'options'  => array(
                            ''    => array( 'label' => 'Select', 'price' => 0 ),
                            'no'  => array( 'label' => 'No', 'price' => 0 ),
                            'yes' => array( 'label' => 'Yes', 'price' => 400.00 ),
                        ),
                    ),
                    'extra_felt_layer' => array(
                        'label'    => 'Extra Felt Layer',
                        'type'     => 'select',
                        'required' => false,
                        'options'  => array(
                            ''    => array( 'label' => 'Select', 'price' => 0 ),
                            'no'  => array( 'label' => 'No', 'price' => 0 ),
                            'yes' => array( 'label' => 'Yes', 'price' => 500.00 ),
                        ),
                    ),
                    'extra_single_window' => array(
                        'label'    => 'Extra / Single Window',
                        'type'     => 'select',
                        'required' => false,
                        'options'  => array(
                            ''    => array( 'label' => 'Select', 'price' => 0 ),
                            'no'  => array( 'label' => 'No', 'price' => 0 ),
                            'yes' => array( 'label' => 'Yes', 'price' => 200.00 ),
                        ),
                    ),
                    'extra_door' => array(
                        'label'    => 'Extra Door',
                        'type'     => 'select',
                        'required' => false,
                        'options'  => array(
                            ''    => array( 'label' => 'Select', 'price' => 0 ),
                            'no'  => array( 'label' => 'No', 'price' => 0 ),
                            'yes' => array( 'label' => 'Yes', 'price' => 600.00 ),
                        ),
                    ),
                ),
            ),
            '5-wall-yurt' => array(
                'label'      => '5-Wall Yurt',
                'base_price' => 9800.00,
                'fields'     => array(
                    'walls' => array(
                        'label'    => 'Walls',
                        'type'     => 'radio',
                        'required' => true,
                        'options'  => array(
                            'regular' => array( 'label' => 'Regular Walls (included)', 'price' => 0 ),
                            'tall'    => array( 'label' => 'Add Tall Walls', 'price' => 550.00 ),
                        ),
                    ),
                    'color' => array(
                        'label'    => 'Color',
                        'type'     => 'select',
                        'required' => true,
                        'options'  => array(
                            ''           => array( 'label' => 'Select', 'price' => 0 ),
                            'white'      => array( 'label' => 'White', 'price' => 0 ),
                            'off-white'  => array( 'label' => 'Off-White', 'price' => 0 ),
                            'tan'        => array( 'label' => 'Tan', 'price' => 0 ),
                            'green'      => array( 'label' => 'Green', 'price' => 200.00 ),
                            'blue'       => array( 'label' => 'Blue', 'price' => 200.00 ),
                            'red'        => array( 'label' => 'Red', 'price' => 200.00 ),
                        ),
                    ),
                    'side_windows' => array(
                        'label'    => 'Add Side Windows (two)',
                        'type'     => 'select',
                        'required' => false,
                        'options'  => array(
                            ''    => array( 'label' => 'Select', 'price' => 0 ),
                            'no'  => array( 'label' => 'No', 'price' => 0 ),
                            'yes' => array( 'label' => 'Yes', 'price' => 350.00 ),
                        ),
                    ),
                    'inner_wall_cover' => array(
                        'label'    => 'Inner Wall Cover',
                        'type'     => 'select',
                        'required' => false,
                        'options'  => array(
                            ''    => array( 'label' => 'Select', 'price' => 0 ),
                            'no'  => array( 'label' => 'No', 'price' => 0 ),
                            'yes' => array( 'label' => 'Yes', 'price' => 500.00 ),
                        ),
                    ),
                    'extra_felt_layer' => array(
                        'label'    => 'Extra Felt Layer',
                        'type'     => 'select',
                        'required' => false,
                        'options'  => array(
                            ''    => array( 'label' => 'Select', 'price' => 0 ),
                            'no'  => array( 'label' => 'No', 'price' => 0 ),
                            'yes' => array( 'label' => 'Yes', 'price' => 600.00 ),
                        ),
                    ),
                    'extra_single_window' => array(
                        'label'    => 'Extra / Single Window',
                        'type'     => 'select',
                        'required' => false,
                        'options'  => array(
                            ''    => array( 'label' => 'Select', 'price' => 0 ),
                            'no'  => array( 'label' => 'No', 'price' => 0 ),
                            'yes' => array( 'label' => 'Yes', 'price' => 200.00 ),
                        ),
                    ),
                    'extra_door' => array(
                        'label'    => 'Extra Door',
                        'type'     => 'select',
                        'required' => false,
                        'options'  => array(
                            ''    => array( 'label' => 'Select', 'price' => 0 ),
                            'no'  => array( 'label' => 'No', 'price' => 0 ),
                            'yes' => array( 'label' => 'Yes', 'price' => 700.00 ),
                        ),
                    ),
                ),
            ),
        );
    }

    /**
     * Get current products config.
     */
    public static function get_products() {
        $raw = get_option( 'ye_products', '' );
        if ( empty( $raw ) ) {
            return self::default_products();
        }
        $decoded = json_decode( $raw, true );
        return is_array( $decoded ) ? $decoded : self::default_products();
    }

    /**
     * Render the settings page.
     */
    public static function render_page() {
        $products = self::get_products();
        ?>
        <div class="wrap">
            <h1>Yurt Estimator Settings</h1>
            <form method="post" action="options.php" id="ye-settings-form">
                <?php settings_fields( 'ye_settings' ); ?>

                <h2>Email Settings</h2>
                <table class="form-table">
                    <tr>
                        <th><label for="ye_notification_email">Notification Email</label></th>
                        <td>
                            <input type="email" id="ye_notification_email" name="ye_notification_email"
                                   value="<?php echo esc_attr( get_option( 'ye_notification_email', get_option( 'admin_email' ) ) ); ?>"
                                   class="regular-text" />
                            <p class="description">Estimate submissions will be emailed to this address.</p>
                        </td>
                    </tr>
                    <tr>
                        <th><label for="ye_email_from_name">Email "From" Name</label></th>
                        <td>
                            <input type="text" id="ye_email_from_name" name="ye_email_from_name"
                                   value="<?php echo esc_attr( get_option( 'ye_email_from_name', 'Mongolian Yurts / FIRE' ) ); ?>"
                                   class="regular-text" />
                            <p class="description">Displayed as the sender name in emails.</p>
                        </td>
                    </tr>
                    <tr>
                        <th><label for="ye_email_subject">Email Subject</label></th>
                        <td>
                            <input type="text" id="ye_email_subject" name="ye_email_subject"
                                   value="<?php echo esc_attr( get_option( 'ye_email_subject', 'New Yurt Estimate Request' ) ); ?>"
                                   class="regular-text" />
                        </td>
                    </tr>
                </table>

                <h2>Google Ads Tracking</h2>
                <table class="form-table">
                    <tr>
                        <th><label for="ye_google_ads_conversion_id">Conversion ID</label></th>
                        <td>
                            <input type="text" id="ye_google_ads_conversion_id" name="ye_google_ads_conversion_id"
                                   value="<?php echo esc_attr( get_option( 'ye_google_ads_conversion_id', '' ) ); ?>"
                                   class="regular-text" placeholder="AW-XXXXXXXXX" />
                        </td>
                    </tr>
                    <tr>
                        <th><label for="ye_google_ads_conversion_label">Conversion Label</label></th>
                        <td>
                            <input type="text" id="ye_google_ads_conversion_label" name="ye_google_ads_conversion_label"
                                   value="<?php echo esc_attr( get_option( 'ye_google_ads_conversion_label', '' ) ); ?>"
                                   class="regular-text" placeholder="AbCdEfGhIjKlMn" />
                        </td>
                    </tr>
                </table>

                <h2>Products</h2>
                <p class="description">Configure your products and their options. Use the shortcode <code>[yurt_estimator product="product-slug"]</code> to display a configurator on any page.</p>

                <div id="ye-products-container">
                <?php foreach ( $products as $slug => $product ) : ?>
                    <div class="ye-admin-product" data-slug="<?php echo esc_attr( $slug ); ?>">
                        <div class="ye-admin-product-header">
                            <h3 class="ye-admin-product-title"><?php echo esc_html( $product['label'] ); ?></h3>
                            <span class="ye-admin-shortcode"><code>[yurt_estimator product="<?php echo esc_attr( $slug ); ?>"]</code></span>
                            <button type="button" class="ye-admin-toggle button-link" aria-expanded="true">&#9660;</button>
                            <button type="button" class="ye-admin-remove-product button-link ye-admin-danger" title="Remove product">&times;</button>
                        </div>
                        <div class="ye-admin-product-body">
                            <table class="form-table">
                                <tr>
                                    <th>Product Slug</th>
                                    <td><input type="text" class="regular-text ye-prod-slug" value="<?php echo esc_attr( $slug ); ?>" /></td>
                                </tr>
                                <tr>
                                    <th>Product Name</th>
                                    <td><input type="text" class="regular-text ye-prod-label" value="<?php echo esc_attr( $product['label'] ); ?>" /></td>
                                </tr>
                                <tr>
                                    <th>Base Price ($)</th>
                                    <td><input type="number" step="0.01" min="0" class="regular-text ye-prod-base-price" value="<?php echo esc_attr( $product['base_price'] ); ?>" /></td>
                                </tr>
                            </table>

                            <h4>Options / Fields</h4>
                            <div class="ye-admin-fields">
                                <?php foreach ( $product['fields'] as $field_key => $field ) : ?>
                                <div class="ye-admin-field">
                                    <div class="ye-admin-field-header">
                                        <strong class="ye-admin-field-name"><?php echo esc_html( $field['label'] ); ?></strong>
                                        <button type="button" class="ye-admin-remove-field button-link ye-admin-danger" title="Remove field">&times;</button>
                                    </div>
                                    <table class="form-table ye-admin-field-table">
                                        <tr>
                                            <th>Field Key</th>
                                            <td><input type="text" class="regular-text ye-field-key" value="<?php echo esc_attr( $field_key ); ?>" /></td>
                                        </tr>
                                        <tr>
                                            <th>Label</th>
                                            <td><input type="text" class="regular-text ye-field-label" value="<?php echo esc_attr( $field['label'] ); ?>" /></td>
                                        </tr>
                                        <tr>
                                            <th>Type</th>
                                            <td>
                                                <select class="ye-field-type">
                                                    <option value="select" <?php selected( $field['type'], 'select' ); ?>>Dropdown</option>
                                                    <option value="radio" <?php selected( $field['type'], 'radio' ); ?>>Radio Buttons</option>
                                                </select>
                                            </td>
                                        </tr>
                                        <tr>
                                            <th>Required</th>
                                            <td><input type="checkbox" class="ye-field-required" <?php checked( ! empty( $field['required'] ) ); ?> /></td>
                                        </tr>
                                    </table>
                                    <h5>Choices</h5>
                                    <table class="widefat ye-admin-options-table">
                                        <thead>
                                            <tr>
                                                <th>Value Key</th>
                                                <th>Display Label</th>
                                                <th>Price ($)</th>
                                                <th style="width:40px;"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach ( $field['options'] as $opt_key => $opt ) : ?>
                                            <tr>
                                                <td><input type="text" class="ye-opt-key" value="<?php echo esc_attr( $opt_key ); ?>" style="width:100%;" /></td>
                                                <td><input type="text" class="ye-opt-label" value="<?php echo esc_attr( $opt['label'] ); ?>" style="width:100%;" /></td>
                                                <td><input type="number" step="0.01" min="0" class="ye-opt-price" value="<?php echo esc_attr( $opt['price'] ); ?>" style="width:100%;" /></td>
                                                <td><button type="button" class="button-link ye-admin-danger ye-admin-remove-option" title="Remove">&times;</button></td>
                                            </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                    <p><button type="button" class="button ye-admin-add-option">+ Add Choice</button></p>
                                </div>
                                <?php endforeach; ?>
                            </div>
                            <p><button type="button" class="button ye-admin-add-field">+ Add Field</button></p>
                        </div>
                    </div>
                <?php endforeach; ?>
                </div>

                <p><button type="button" class="button button-secondary" id="ye-add-product">+ Add Product</button></p>

                <!-- Hidden field that holds the serialized JSON -->
                <input type="hidden" name="ye_products" id="ye-products-json" value="" />

                <?php submit_button(); ?>
            </form>
        </div>

        <style>
            .ye-admin-product {
                background: #fff;
                border: 1px solid #ccd0d4;
                margin-bottom: 20px;
                border-radius: 4px;
            }
            .ye-admin-product-header {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                background: #f0f0f1;
                border-bottom: 1px solid #ccd0d4;
                cursor: pointer;
            }
            .ye-admin-product-title {
                margin: 0;
                flex: 1;
            }
            .ye-admin-shortcode code {
                font-size: 12px;
                background: #e0e0e0;
                padding: 2px 6px;
                border-radius: 3px;
            }
            .ye-admin-product-body {
                padding: 0 16px 16px;
            }
            .ye-admin-product-body.ye-collapsed {
                display: none;
            }
            .ye-admin-field {
                background: #f9f9f9;
                border: 1px solid #ddd;
                padding: 12px 16px;
                margin-bottom: 12px;
                border-radius: 3px;
            }
            .ye-admin-field-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }
            .ye-admin-field-table th {
                width: 120px;
                padding: 6px 10px 6px 0;
            }
            .ye-admin-field-table td {
                padding: 6px 0;
            }
            .ye-admin-options-table {
                margin-bottom: 8px;
            }
            .ye-admin-options-table input {
                width: 100%;
            }
            .ye-admin-danger {
                color: #b32d2e;
                font-size: 18px;
                font-weight: bold;
                text-decoration: none;
            }
            .ye-admin-danger:hover {
                color: #a00;
            }
        </style>

        <script>
        (function() {
            'use strict';

            var container = document.getElementById('ye-products-container');
            var form = document.getElementById('ye-settings-form');

            // Serialize all product data into the hidden JSON field before submit
            form.addEventListener('submit', function() {
                var products = {};
                var productEls = container.querySelectorAll('.ye-admin-product');

                productEls.forEach(function(productEl) {
                    var slug = productEl.querySelector('.ye-prod-slug').value.trim();
                    if (!slug) return;

                    var label = productEl.querySelector('.ye-prod-label').value.trim();
                    var basePrice = parseFloat(productEl.querySelector('.ye-prod-base-price').value) || 0;
                    var fields = {};

                    productEl.querySelectorAll('.ye-admin-field').forEach(function(fieldEl) {
                        var fieldKey = fieldEl.querySelector('.ye-field-key').value.trim();
                        if (!fieldKey) return;

                        var options = {};
                        fieldEl.querySelectorAll('.ye-admin-options-table tbody tr').forEach(function(row) {
                            var optKey = row.querySelector('.ye-opt-key').value.trim();
                            var optLabel = row.querySelector('.ye-opt-label').value.trim();
                            var optPrice = parseFloat(row.querySelector('.ye-opt-price').value) || 0;
                            options[optKey] = { label: optLabel, price: optPrice };
                        });

                        fields[fieldKey] = {
                            label: fieldEl.querySelector('.ye-field-label').value.trim(),
                            type: fieldEl.querySelector('.ye-field-type').value,
                            required: fieldEl.querySelector('.ye-field-required').checked,
                            options: options
                        };
                    });

                    products[slug] = {
                        label: label,
                        base_price: basePrice,
                        fields: fields
                    };
                });

                document.getElementById('ye-products-json').value = JSON.stringify(products);
            });

            // Toggle product body
            container.addEventListener('click', function(e) {
                if (e.target.classList.contains('ye-admin-toggle')) {
                    var body = e.target.closest('.ye-admin-product').querySelector('.ye-admin-product-body');
                    body.classList.toggle('ye-collapsed');
                    e.target.textContent = body.classList.contains('ye-collapsed') ? '\u25B6' : '\u25BC';
                }
            });

            // Remove product
            container.addEventListener('click', function(e) {
                if (e.target.classList.contains('ye-admin-remove-product')) {
                    if (confirm('Remove this product?')) {
                        e.target.closest('.ye-admin-product').remove();
                    }
                }
            });

            // Remove field
            container.addEventListener('click', function(e) {
                if (e.target.classList.contains('ye-admin-remove-field')) {
                    if (confirm('Remove this field?')) {
                        e.target.closest('.ye-admin-field').remove();
                    }
                }
            });

            // Remove option row
            container.addEventListener('click', function(e) {
                if (e.target.classList.contains('ye-admin-remove-option')) {
                    e.target.closest('tr').remove();
                }
            });

            // Add option row
            container.addEventListener('click', function(e) {
                if (e.target.classList.contains('ye-admin-add-option')) {
                    var tbody = e.target.closest('.ye-admin-field').querySelector('.ye-admin-options-table tbody');
                    var tr = document.createElement('tr');
                    tr.innerHTML = '<td><input type="text" class="ye-opt-key" value="" style="width:100%;" /></td>' +
                        '<td><input type="text" class="ye-opt-label" value="" style="width:100%;" /></td>' +
                        '<td><input type="number" step="0.01" min="0" class="ye-opt-price" value="0" style="width:100%;" /></td>' +
                        '<td><button type="button" class="button-link ye-admin-danger ye-admin-remove-option" title="Remove">&times;</button></td>';
                    tbody.appendChild(tr);
                }
            });

            // Add field
            container.addEventListener('click', function(e) {
                if (e.target.classList.contains('ye-admin-add-field')) {
                    var fieldsContainer = e.target.closest('.ye-admin-product-body').querySelector('.ye-admin-fields');
                    var html = '<div class="ye-admin-field">' +
                        '<div class="ye-admin-field-header">' +
                            '<strong class="ye-admin-field-name">New Field</strong>' +
                            '<button type="button" class="ye-admin-remove-field button-link ye-admin-danger" title="Remove field">&times;</button>' +
                        '</div>' +
                        '<table class="form-table ye-admin-field-table">' +
                            '<tr><th>Field Key</th><td><input type="text" class="regular-text ye-field-key" value="" placeholder="e.g. custom_option" /></td></tr>' +
                            '<tr><th>Label</th><td><input type="text" class="regular-text ye-field-label" value="" placeholder="e.g. Custom Option" /></td></tr>' +
                            '<tr><th>Type</th><td><select class="ye-field-type"><option value="select">Dropdown</option><option value="radio">Radio Buttons</option></select></td></tr>' +
                            '<tr><th>Required</th><td><input type="checkbox" class="ye-field-required" /></td></tr>' +
                        '</table>' +
                        '<h5>Choices</h5>' +
                        '<table class="widefat ye-admin-options-table">' +
                            '<thead><tr><th>Value Key</th><th>Display Label</th><th>Price ($)</th><th style="width:40px;"></th></tr></thead>' +
                            '<tbody>' +
                                '<tr><td><input type="text" class="ye-opt-key" value="" style="width:100%;" placeholder="e.g. no" /></td>' +
                                    '<td><input type="text" class="ye-opt-label" value="" style="width:100%;" placeholder="e.g. No" /></td>' +
                                    '<td><input type="number" step="0.01" min="0" class="ye-opt-price" value="0" style="width:100%;" /></td>' +
                                    '<td><button type="button" class="button-link ye-admin-danger ye-admin-remove-option" title="Remove">&times;</button></td></tr>' +
                            '</tbody>' +
                        '</table>' +
                        '<p><button type="button" class="button ye-admin-add-option">+ Add Choice</button></p>' +
                    '</div>';
                    fieldsContainer.insertAdjacentHTML('beforeend', html);
                }
            });

            // Add product
            document.getElementById('ye-add-product').addEventListener('click', function() {
                var html = '<div class="ye-admin-product" data-slug="">' +
                    '<div class="ye-admin-product-header">' +
                        '<h3 class="ye-admin-product-title">New Product</h3>' +
                        '<span class="ye-admin-shortcode"></span>' +
                        '<button type="button" class="ye-admin-toggle button-link" aria-expanded="true">&#9660;</button>' +
                        '<button type="button" class="ye-admin-remove-product button-link ye-admin-danger" title="Remove product">&times;</button>' +
                    '</div>' +
                    '<div class="ye-admin-product-body">' +
                        '<table class="form-table">' +
                            '<tr><th>Product Slug</th><td><input type="text" class="regular-text ye-prod-slug" value="" placeholder="e.g. 6-wall-yurt" /></td></tr>' +
                            '<tr><th>Product Name</th><td><input type="text" class="regular-text ye-prod-label" value="" placeholder="e.g. 6-Wall Yurt" /></td></tr>' +
                            '<tr><th>Base Price ($)</th><td><input type="number" step="0.01" min="0" class="regular-text ye-prod-base-price" value="0" /></td></tr>' +
                        '</table>' +
                        '<h4>Options / Fields</h4>' +
                        '<div class="ye-admin-fields"></div>' +
                        '<p><button type="button" class="button ye-admin-add-field">+ Add Field</button></p>' +
                    '</div>' +
                '</div>';
                container.insertAdjacentHTML('beforeend', html);
            });

            // Update product title and shortcode live
            container.addEventListener('input', function(e) {
                if (e.target.classList.contains('ye-prod-label')) {
                    var title = e.target.closest('.ye-admin-product').querySelector('.ye-admin-product-title');
                    title.textContent = e.target.value || 'New Product';
                }
                if (e.target.classList.contains('ye-prod-slug')) {
                    var shortcode = e.target.closest('.ye-admin-product').querySelector('.ye-admin-shortcode');
                    var val = e.target.value.trim();
                    shortcode.innerHTML = val ? '<code>[yurt_estimator product="' + val + '"]</code>' : '';
                }
                if (e.target.classList.contains('ye-field-label')) {
                    var name = e.target.closest('.ye-admin-field').querySelector('.ye-admin-field-name');
                    name.textContent = e.target.value || 'New Field';
                }
            });
        })();
        </script>
        <?php
    }
}
