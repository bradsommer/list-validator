<?php
/**
 * Custom Post Type for storing yurt estimates in WordPress.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class YE_Post_Type {

    public static function init() {
        add_action( 'init', array( __CLASS__, 'register' ) );
        add_filter( 'manage_yurt_estimate_posts_columns', array( __CLASS__, 'admin_columns' ) );
        add_action( 'manage_yurt_estimate_posts_custom_column', array( __CLASS__, 'admin_column_content' ), 10, 2 );
    }

    /**
     * Register the yurt_estimate custom post type.
     */
    public static function register() {
        register_post_type( 'yurt_estimate', array(
            'labels' => array(
                'name'               => 'Yurt Estimates',
                'singular_name'      => 'Yurt Estimate',
                'menu_name'          => 'Yurt Estimates',
                'all_items'          => 'All Estimates',
                'view_item'          => 'View Estimate',
                'search_items'       => 'Search Estimates',
                'not_found'          => 'No estimates found',
                'not_found_in_trash' => 'No estimates found in Trash',
            ),
            'public'       => false,
            'show_ui'      => true,
            'show_in_menu' => true,
            'menu_icon'    => 'dashicons-calculator',
            'supports'     => array( 'title' ),
            'capability_type' => 'post',
        ) );
    }

    /**
     * Add custom columns to the admin list table.
     */
    public static function admin_columns( $columns ) {
        $new = array();
        $new['cb']              = $columns['cb'];
        $new['title']           = 'Customer';
        $new['ye_yurt_type']    = 'Yurt Type';
        $new['ye_total']        = 'Total Price';
        $new['ye_email']        = 'Email';
        $new['ye_phone']        = 'Phone';
        $new['ye_source']       = 'How Found Us';
        $new['date']            = $columns['date'];
        return $new;
    }

    /**
     * Render custom column content.
     */
    public static function admin_column_content( $column, $post_id ) {
        $meta = get_post_meta( $post_id );
        switch ( $column ) {
            case 'ye_yurt_type':
                echo esc_html( get_post_meta( $post_id, '_ye_yurt_type', true ) );
                break;
            case 'ye_total':
                $total = get_post_meta( $post_id, '_ye_total_price', true );
                echo $total ? '$' . esc_html( number_format( (float) $total, 2 ) ) : '—';
                break;
            case 'ye_email':
                echo esc_html( get_post_meta( $post_id, '_ye_email', true ) );
                break;
            case 'ye_phone':
                echo esc_html( get_post_meta( $post_id, '_ye_phone', true ) );
                break;
            case 'ye_source':
                echo esc_html( get_post_meta( $post_id, '_ye_how_found', true ) );
                break;
        }
    }
}
