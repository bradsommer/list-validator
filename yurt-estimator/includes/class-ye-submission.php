<?php
/**
 * Handles form submission: validates, stores as CPT, emails, and redirects.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class YE_Submission {

    public static function init() {
        add_action( 'admin_post_ye_submit_estimate', array( __CLASS__, 'handle' ) );
        add_action( 'admin_post_nopriv_ye_submit_estimate', array( __CLASS__, 'handle' ) );
    }

    /**
     * Process the estimate submission.
     */
    public static function handle() {
        // Verify nonce
        if ( ! isset( $_POST['ye_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['ye_nonce'] ) ), 'ye_submit_estimate' ) ) {
            wp_die( 'Security check failed.', 'Error', array( 'back_link' => true ) );
        }

        $product_id = isset( $_POST['ye_product'] ) ? sanitize_key( $_POST['ye_product'] ) : '';
        $products   = YE_Settings::get_products();

        if ( ! isset( $products[ $product_id ] ) ) {
            wp_die( 'Invalid product.', 'Error', array( 'back_link' => true ) );
        }

        $product = $products[ $product_id ];

        // Collect contact info
        $first_name = isset( $_POST['ye_first_name'] ) ? sanitize_text_field( wp_unslash( $_POST['ye_first_name'] ) ) : '';
        $last_name  = isset( $_POST['ye_last_name'] ) ? sanitize_text_field( wp_unslash( $_POST['ye_last_name'] ) ) : '';
        $email      = isset( $_POST['ye_email'] ) ? sanitize_email( wp_unslash( $_POST['ye_email'] ) ) : '';
        $phone      = isset( $_POST['ye_phone'] ) ? sanitize_text_field( wp_unslash( $_POST['ye_phone'] ) ) : '';
        $how_found  = isset( $_POST['ye_how_found'] ) ? sanitize_text_field( wp_unslash( $_POST['ye_how_found'] ) ) : '';
        $comments   = isset( $_POST['ye_comments'] ) ? sanitize_textarea_field( wp_unslash( $_POST['ye_comments'] ) ) : '';

        // Validate required contact fields
        if ( empty( $first_name ) || empty( $last_name ) || empty( $email ) ) {
            wp_die( 'Please fill in all required fields.', 'Error', array( 'back_link' => true ) );
        }

        // Collect selected options and calculate price
        $options_total = 0;
        $selections    = array();

        foreach ( $product['fields'] as $field_key => $field ) {
            $posted_key = 'ye_field_' . $field_key;
            $value      = isset( $_POST[ $posted_key ] ) ? sanitize_text_field( wp_unslash( $_POST[ $posted_key ] ) ) : '';

            if ( ! empty( $field['required'] ) && empty( $value ) ) {
                wp_die( 'Please fill in all required fields.', 'Error', array( 'back_link' => true ) );
            }

            $price = 0;
            $label = '';
            if ( isset( $field['options'][ $value ] ) ) {
                $price = (float) $field['options'][ $value ]['price'];
                $label = $field['options'][ $value ]['label'];
            }

            $options_total += $price;
            $selections[ $field_key ] = array(
                'field_label' => $field['label'],
                'value'       => $value,
                'value_label' => $label,
                'price'       => $price,
            );
        }

        $total_price = $product['base_price'] + $options_total;

        // Store as custom post type
        $post_id = wp_insert_post( array(
            'post_type'   => 'yurt_estimate',
            'post_title'  => $first_name . ' ' . $last_name . ' — ' . $product['label'],
            'post_status' => 'publish',
        ) );

        if ( is_wp_error( $post_id ) ) {
            wp_die( 'Failed to save estimate.', 'Error', array( 'back_link' => true ) );
        }

        // Save all meta
        update_post_meta( $post_id, '_ye_product_id', $product_id );
        update_post_meta( $post_id, '_ye_yurt_type', $product['label'] );
        update_post_meta( $post_id, '_ye_first_name', $first_name );
        update_post_meta( $post_id, '_ye_last_name', $last_name );
        update_post_meta( $post_id, '_ye_email', $email );
        update_post_meta( $post_id, '_ye_phone', $phone );
        update_post_meta( $post_id, '_ye_how_found', $how_found );
        update_post_meta( $post_id, '_ye_comments', $comments );
        update_post_meta( $post_id, '_ye_base_price', $product['base_price'] );
        update_post_meta( $post_id, '_ye_options_total', $options_total );
        update_post_meta( $post_id, '_ye_total_price', $total_price );
        update_post_meta( $post_id, '_ye_selections', $selections );

        // Send email notification
        self::send_notification( $post_id, $product, $selections, array(
            'first_name'  => $first_name,
            'last_name'   => $last_name,
            'email'       => $email,
            'phone'       => $phone,
            'how_found'   => $how_found,
            'comments'    => $comments,
            'base_price'  => $product['base_price'],
            'options_total' => $options_total,
            'total_price' => $total_price,
        ) );

        // Redirect to consistent thank-you page URL (for Google Ads tracking)
        $thank_you_url = home_url( '/yurt-estimate-thank-you/' );
        $thank_you_url = add_query_arg( 'estimate_id', $post_id, $thank_you_url );
        wp_safe_redirect( $thank_you_url );
        exit;
    }

    /**
     * Send email notification to the configured recipient.
     */
    private static function send_notification( $post_id, $product, $selections, $data ) {
        $to      = get_option( 'ye_notification_email', get_option( 'admin_email' ) );
        $subject = get_option( 'ye_email_subject', 'New Yurt Estimate Request' );

        $body  = "New Yurt Estimate Submitted\n";
        $body .= "===========================\n\n";
        $body .= "Product: {$product['label']}\n";
        $body .= "Date: " . current_time( 'F j, Y g:i A' ) . "\n\n";

        $body .= "CONTACT INFORMATION\n";
        $body .= "-------------------\n";
        $body .= "Name: {$data['first_name']} {$data['last_name']}\n";
        $body .= "Email: {$data['email']}\n";
        $body .= "Phone: {$data['phone']}\n";
        $body .= "How Found Us: {$data['how_found']}\n\n";

        $body .= "SELECTED OPTIONS\n";
        $body .= "----------------\n";
        foreach ( $selections as $sel ) {
            $price_str = $sel['price'] > 0 ? ' (+$' . number_format( $sel['price'], 2 ) . ')' : '';
            $body .= "{$sel['field_label']}: {$sel['value_label']}{$price_str}\n";
        }

        $body .= "\nPRICING\n";
        $body .= "-------\n";
        $body .= "Base Price: $" . number_format( $data['base_price'], 2 ) . "\n";
        $body .= "Options Total: $" . number_format( $data['options_total'], 2 ) . "\n";
        $body .= "TOTAL PRICE: $" . number_format( $data['total_price'], 2 ) . "\n\n";

        if ( ! empty( $data['comments'] ) ) {
            $body .= "COMMENTS\n";
            $body .= "--------\n";
            $body .= $data['comments'] . "\n\n";
        }

        $body .= "View in WordPress: " . admin_url( "post.php?post={$post_id}&action=edit" ) . "\n";

        $from_name  = get_option( 'ye_email_from_name', 'Mongolian Yurts / FIRE' );
        $from_email = get_option( 'ye_notification_email', get_option( 'admin_email' ) );
        $headers    = array(
            'Content-Type: text/plain; charset=UTF-8',
            'From: ' . $from_name . ' <' . $from_email . '>',
        );

        // Send admin notification
        wp_mail( $to, $subject, $body, $headers );

        // Send customer confirmation
        $customer_subject = 'Your Yurt Estimate — ' . $product['label'];
        $customer_body  = "Thank you for your interest, {$data['first_name']}!\n\n";
        $customer_body .= "Here is a summary of your yurt estimate:\n\n";
        $customer_body .= "Product: {$product['label']}\n";
        $customer_body .= "Base Price: $" . number_format( $data['base_price'], 2 ) . "\n\n";
        foreach ( $selections as $sel ) {
            $price_str = $sel['price'] > 0 ? ' (+$' . number_format( $sel['price'], 2 ) . ')' : ' (included)';
            $customer_body .= "{$sel['field_label']}: {$sel['value_label']}{$price_str}\n";
        }
        $customer_body .= "\nOptions Total: $" . number_format( $data['options_total'], 2 ) . "\n";
        $customer_body .= "Estimated Total: $" . number_format( $data['total_price'], 2 ) . "\n\n";
        $customer_body .= "We will be in touch soon!\n";

        wp_mail( $data['email'], $customer_subject, $customer_body, $headers );
    }
}
