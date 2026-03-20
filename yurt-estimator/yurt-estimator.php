<?php
/**
 * Plugin Name: Yurt Estimator
 * Plugin URI:  https://mongolianyurts.org
 * Description: A yurt estimation tool with dynamic pricing, email notifications, data storage, and Google Ads tracking support.
 * Version:     1.0.0
 * Author:      Mongolian Yurts
 * License:     GPL-2.0+
 * Text Domain: yurt-estimator
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'YE_VERSION', '1.0.0' );
define( 'YE_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'YE_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Core includes
require_once YE_PLUGIN_DIR . 'includes/class-ye-post-type.php';
require_once YE_PLUGIN_DIR . 'includes/class-ye-settings.php';
require_once YE_PLUGIN_DIR . 'includes/class-ye-form.php';
require_once YE_PLUGIN_DIR . 'includes/class-ye-submission.php';
require_once YE_PLUGIN_DIR . 'includes/class-ye-thank-you.php';

/**
 * Initialize the plugin.
 */
function ye_init() {
    YE_Post_Type::init();
    YE_Settings::init();
    YE_Form::init();
    YE_Submission::init();
    YE_Thank_You::init();
}
add_action( 'plugins_loaded', 'ye_init' );

/**
 * Activation: flush rewrite rules for the thank-you endpoint.
 */
function ye_activate() {
    YE_Post_Type::register();
    YE_Thank_You::add_rewrite_rules();
    flush_rewrite_rules();
}
register_activation_hook( __FILE__, 'ye_activate' );

/**
 * Deactivation: flush rewrite rules.
 */
function ye_deactivate() {
    flush_rewrite_rules();
}
register_deactivation_hook( __FILE__, 'ye_deactivate' );
