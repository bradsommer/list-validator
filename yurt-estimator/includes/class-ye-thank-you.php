<?php
/**
 * Thank You page with a consistent URL (/yurt-estimate-thank-you/)
 * for Google Ads conversion tracking.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class YE_Thank_You {

    const SLUG = 'yurt-estimate-thank-you';

    public static function init() {
        add_action( 'init', array( __CLASS__, 'add_rewrite_rules' ) );
        add_filter( 'query_vars', array( __CLASS__, 'query_vars' ) );
        add_action( 'template_redirect', array( __CLASS__, 'render' ) );
    }

    /**
     * Register rewrite rule for /yurt-estimate-thank-you/
     */
    public static function add_rewrite_rules() {
        add_rewrite_rule(
            '^' . self::SLUG . '/?$',
            'index.php?ye_thank_you=1',
            'top'
        );
    }

    public static function query_vars( $vars ) {
        $vars[] = 'ye_thank_you';
        $vars[] = 'estimate_id';
        return $vars;
    }

    /**
     * Intercept the request and render the thank-you page.
     */
    public static function render() {
        if ( ! get_query_var( 'ye_thank_you' ) ) {
            return;
        }

        $estimate_id = isset( $_GET['estimate_id'] ) ? absint( $_GET['estimate_id'] ) : 0;

        // Get Google Ads config
        $conversion_id    = get_option( 'ye_google_ads_conversion_id', '' );
        $conversion_label = get_option( 'ye_google_ads_conversion_label', '' );

        // Load estimate data if available
        $total_price = 0;
        $product_label = '';
        if ( $estimate_id && get_post_type( $estimate_id ) === 'yurt_estimate' ) {
            $total_price   = (float) get_post_meta( $estimate_id, '_ye_total_price', true );
            $product_label = get_post_meta( $estimate_id, '_ye_yurt_type', true );
        }

        // Render the page using the theme's header/footer
        get_header();
        ?>
        <div class="ye-thank-you" style="max-width:700px;margin:60px auto;padding:0 20px;text-align:center;">
            <h1>Thank You!</h1>
            <p>Your yurt estimate has been submitted successfully.</p>

            <?php if ( $product_label ) : ?>
                <p><strong>Product:</strong> <?php echo esc_html( $product_label ); ?></p>
            <?php endif; ?>

            <?php if ( $total_price > 0 ) : ?>
                <p><strong>Estimated Total:</strong> $<?php echo esc_html( number_format( $total_price, 2 ) ); ?></p>
            <?php endif; ?>

            <p>We will review your request and get back to you shortly. A confirmation email has been sent to your inbox.</p>

            <p><a href="<?php echo esc_url( home_url( '/' ) ); ?>">Return to Home</a></p>
        </div>

        <?php if ( ! empty( $conversion_id ) ) : ?>
            <!-- Google Ads Conversion Tracking -->
            <script async src="https://www.googletagmanager.com/gtag/js?id=<?php echo esc_attr( $conversion_id ); ?>"></script>
            <script>
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '<?php echo esc_js( $conversion_id ); ?>');
                gtag('event', 'conversion', {
                    'send_to': '<?php echo esc_js( $conversion_id ); ?>/<?php echo esc_js( $conversion_label ); ?>',
                    <?php if ( $total_price > 0 ) : ?>
                    'value': <?php echo esc_js( $total_price ); ?>,
                    'currency': 'USD',
                    <?php endif; ?>
                    'transaction_id': '<?php echo esc_js( $estimate_id ); ?>'
                });
            </script>
        <?php endif; ?>

        <?php
        get_footer();
        exit;
    }
}
