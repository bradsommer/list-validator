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
                            'yes' => array( 'label' => 'Yes (+$350.00)', 'price' => 350.00 ),
                        ),
                    ),
                    'inner_wall_cover' => array(
                        'label'    => 'Inner Wall Cover',
                        'type'     => 'select',
                        'required' => false,
                        'options'  => array(
                            ''    => array( 'label' => 'Select', 'price' => 0 ),
                            'no'  => array( 'label' => 'No', 'price' => 0 ),
                            'yes' => array( 'label' => 'Yes (+$400.00)', 'price' => 400.00 ),
                        ),
                    ),
                    'extra_felt_layer' => array(
                        'label'    => 'Extra Felt Layer',
                        'type'     => 'select',
                        'required' => false,
                        'options'  => array(
                            ''    => array( 'label' => 'Select', 'price' => 0 ),
                            'no'  => array( 'label' => 'No', 'price' => 0 ),
                            'yes' => array( 'label' => 'Yes (+$500.00)', 'price' => 500.00 ),
                        ),
                    ),
                    'extra_single_window' => array(
                        'label'    => 'Extra / Single Window',
                        'type'     => 'select',
                        'required' => false,
                        'options'  => array(
                            ''    => array( 'label' => 'Select', 'price' => 0 ),
                            'no'  => array( 'label' => 'No', 'price' => 0 ),
                            'yes' => array( 'label' => 'Yes (+$200.00)', 'price' => 200.00 ),
                        ),
                    ),
                    'extra_door' => array(
                        'label'    => 'Extra Door',
                        'type'     => 'select',
                        'required' => false,
                        'options'  => array(
                            ''    => array( 'label' => 'Select', 'price' => 0 ),
                            'no'  => array( 'label' => 'No', 'price' => 0 ),
                            'yes' => array( 'label' => 'Yes (+$600.00)', 'price' => 600.00 ),
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
                            'yes' => array( 'label' => 'Yes (+$350.00)', 'price' => 350.00 ),
                        ),
                    ),
                    'inner_wall_cover' => array(
                        'label'    => 'Inner Wall Cover',
                        'type'     => 'select',
                        'required' => false,
                        'options'  => array(
                            ''    => array( 'label' => 'Select', 'price' => 0 ),
                            'no'  => array( 'label' => 'No', 'price' => 0 ),
                            'yes' => array( 'label' => 'Yes (+$500.00)', 'price' => 500.00 ),
                        ),
                    ),
                    'extra_felt_layer' => array(
                        'label'    => 'Extra Felt Layer',
                        'type'     => 'select',
                        'required' => false,
                        'options'  => array(
                            ''    => array( 'label' => 'Select', 'price' => 0 ),
                            'no'  => array( 'label' => 'No', 'price' => 0 ),
                            'yes' => array( 'label' => 'Yes (+$600.00)', 'price' => 600.00 ),
                        ),
                    ),
                    'extra_single_window' => array(
                        'label'    => 'Extra / Single Window',
                        'type'     => 'select',
                        'required' => false,
                        'options'  => array(
                            ''    => array( 'label' => 'Select', 'price' => 0 ),
                            'no'  => array( 'label' => 'No', 'price' => 0 ),
                            'yes' => array( 'label' => 'Yes (+$200.00)', 'price' => 200.00 ),
                        ),
                    ),
                    'extra_door' => array(
                        'label'    => 'Extra Door',
                        'type'     => 'select',
                        'required' => false,
                        'options'  => array(
                            ''    => array( 'label' => 'Select', 'price' => 0 ),
                            'no'  => array( 'label' => 'No', 'price' => 0 ),
                            'yes' => array( 'label' => 'Yes (+$700.00)', 'price' => 700.00 ),
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
        ?>
        <div class="wrap">
            <h1>Yurt Estimator Settings</h1>
            <form method="post" action="options.php">
                <?php settings_fields( 'ye_settings' ); ?>

                <h2>Notification Settings</h2>
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

                <h2>Product Configuration (JSON)</h2>
                <p class="description">Edit the products, options, and prices below. This must be valid JSON.</p>
                <textarea name="ye_products" rows="30" cols="100" class="large-text code"><?php
                    $products = get_option( 'ye_products', '' );
                    if ( empty( $products ) ) {
                        $products = wp_json_encode( self::default_products(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES );
                    } else {
                        $decoded = json_decode( $products, true );
                        $products = wp_json_encode( $decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES );
                    }
                    echo esc_textarea( $products );
                ?></textarea>

                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
}
