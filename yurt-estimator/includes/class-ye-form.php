<?php
/**
 * Renders the estimation form via shortcode.
 *
 * Usage: [yurt_estimator product="4-wall-yurt"]
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class YE_Form {

    public static function init() {
        add_shortcode( 'yurt_estimator', array( __CLASS__, 'render_shortcode' ) );
        add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
    }

    /**
     * Enqueue CSS and JS only when the shortcode is present.
     */
    public static function enqueue_assets() {
        global $post;
        if ( is_a( $post, 'WP_Post' ) && has_shortcode( $post->post_content, 'yurt_estimator' ) ) {
            wp_enqueue_style( 'ye-form', YE_PLUGIN_URL . 'assets/css/form.css', array(), YE_VERSION );
            wp_enqueue_script( 'ye-form', YE_PLUGIN_URL . 'assets/js/form.js', array(), YE_VERSION, true );
        }
    }

    /**
     * Render the shortcode.
     */
    public static function render_shortcode( $atts ) {
        $atts = shortcode_atts( array(
            'product' => '4-wall-yurt',
        ), $atts, 'yurt_estimator' );

        $products   = YE_Settings::get_products();
        $product_id = sanitize_key( $atts['product'] );

        if ( ! isset( $products[ $product_id ] ) ) {
            return '<p class="ye-error">Product not found.</p>';
        }

        $product = $products[ $product_id ];

        // Pass pricing data to JS
        wp_localize_script( 'ye-form', 'yeConfig', array(
            'basePrice' => $product['base_price'],
            'fields'    => $product['fields'],
        ) );

        ob_start();
        include YE_PLUGIN_DIR . 'templates/form.php';
        return ob_get_clean();
    }
}
