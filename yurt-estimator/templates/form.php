<?php
/**
 * Estimation form template.
 *
 * Variables available: $product (array), $product_id (string)
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div class="ye-estimator" id="ye-estimator">
    <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" id="ye-form">
        <?php wp_nonce_field( 'ye_submit_estimate', 'ye_nonce' ); ?>
        <input type="hidden" name="action" value="ye_submit_estimate" />
        <input type="hidden" name="ye_product" value="<?php echo esc_attr( $product_id ); ?>" />

        <div class="ye-options-header">
            <h3>Options Total: <span id="ye-options-total">$0.00</span></h3>
            <hr />
        </div>

        <?php foreach ( $product['fields'] as $field_key => $field ) : ?>
            <div class="ye-field" data-field="<?php echo esc_attr( $field_key ); ?>">
                <label class="ye-label">
                    <?php echo esc_html( $field['label'] ); ?>
                    <?php if ( ! empty( $field['required'] ) ) : ?>
                        <span class="ye-required">*</span>
                    <?php endif; ?>
                </label>

                <?php if ( $field['type'] === 'radio' ) : ?>
                    <div class="ye-radio-group">
                        <?php foreach ( $field['options'] as $opt_key => $opt ) : ?>
                            <label class="ye-radio-label">
                                <input type="radio"
                                       name="ye_field_<?php echo esc_attr( $field_key ); ?>"
                                       value="<?php echo esc_attr( $opt_key ); ?>"
                                       data-price="<?php echo esc_attr( $opt['price'] ); ?>"
                                       <?php echo $opt_key === array_key_first( $field['options'] ) ? 'checked' : ''; ?>
                                       <?php echo ! empty( $field['required'] ) ? 'required' : ''; ?> />
                                <?php echo esc_html( $opt['label'] ); ?>
                                <?php if ( $opt['price'] > 0 ) : ?>
                                    <span class="ye-price-tag">($<?php echo esc_html( number_format( $opt['price'], 2 ) ); ?>)</span>
                                <?php endif; ?>
                            </label>
                        <?php endforeach; ?>
                    </div>

                <?php elseif ( $field['type'] === 'select' ) : ?>
                    <select name="ye_field_<?php echo esc_attr( $field_key ); ?>"
                            <?php echo ! empty( $field['required'] ) ? 'required' : ''; ?>>
                        <?php foreach ( $field['options'] as $opt_key => $opt ) : ?>
                            <option value="<?php echo esc_attr( $opt_key ); ?>"
                                    data-price="<?php echo esc_attr( $opt['price'] ); ?>">
                                <?php echo esc_html( $opt['label'] ); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                <?php endif; ?>
            </div>
        <?php endforeach; ?>

        <!-- Non-priced fields -->
        <div class="ye-field">
            <label class="ye-label" for="ye_how_found">
                How did you find us? <span class="ye-required">*</span>
            </label>
            <select name="ye_how_found" id="ye_how_found" required>
                <option value="">Select</option>
                <option value="google">Google Search</option>
                <option value="social-media">Social Media</option>
                <option value="friend">Friend / Referral</option>
                <option value="youtube">YouTube</option>
                <option value="event">Event / Trade Show</option>
                <option value="other">Other</option>
            </select>
        </div>

        <div class="ye-field">
            <label class="ye-label" for="ye_comments">Comments / Additional Information</label>
            <textarea name="ye_comments" id="ye_comments" rows="4"
                      placeholder="Comments / Additional Information"></textarea>
        </div>

        <hr />

        <!-- Contact info -->
        <h3>Contact Information</h3>

        <div class="ye-field-row">
            <div class="ye-field ye-half">
                <label class="ye-label" for="ye_first_name">First Name <span class="ye-required">*</span></label>
                <input type="text" name="ye_first_name" id="ye_first_name" required />
            </div>
            <div class="ye-field ye-half">
                <label class="ye-label" for="ye_last_name">Last Name <span class="ye-required">*</span></label>
                <input type="text" name="ye_last_name" id="ye_last_name" required />
            </div>
        </div>

        <div class="ye-field">
            <label class="ye-label" for="ye_email">Email <span class="ye-required">*</span></label>
            <input type="email" name="ye_email" id="ye_email" required />
        </div>

        <div class="ye-field">
            <label class="ye-label" for="ye_phone">Phone</label>
            <input type="tel" name="ye_phone" id="ye_phone" />
        </div>

        <hr />

        <div class="ye-total-bar">
            <strong>Total Price: <span id="ye-total-price">$<?php echo esc_html( number_format( $product['base_price'], 2 ) ); ?></span></strong>
        </div>

        <button type="submit" class="ye-submit-btn">Request Estimate</button>
    </form>
</div>
