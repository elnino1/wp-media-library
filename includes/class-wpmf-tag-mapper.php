<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WPMF_Tag_Mapper {
	public static function init() {
        // Register term meta for storing mapped taxonomy strings
        add_action('init', array(__CLASS__, 'register_meta'));
	}

    public static function register_meta() {
        register_term_meta( 'wp_virtual_folder', 'wpmf_mapped_product_cats', array(
            'type'         => 'array',
            'description'  => 'Mapped WooCommerce product categories',
            'single'       => true,
            'show_in_rest' => array(
                'schema' => array(
                    'type'  => 'array',
                    'items' => array(
                        'type' => 'integer'
                    ),
                ),
            ),
        ) );

        register_term_meta( 'wp_virtual_folder', 'wpmf_mapped_post_tags', array(
            'type'         => 'array',
            'description'  => 'Mapped WordPress post tags',
            'single'       => true,
            'show_in_rest' => array(
                'schema' => array(
                    'type'  => 'array',
                    'items' => array(
                        'type' => 'integer'
                    ),
                ),
            ),
        ) );
    }

    public static function apply_tags_for_folder( int $item_id, int $folder_id ): void {
        $tag_ids = get_term_meta( $folder_id, 'wpmf_mapped_post_tags', true );
        if ( ! is_array( $tag_ids ) || empty( $tag_ids ) ) {
            return;
        }
        // append=false replaces existing tags (MOVE-02 requires replacement, not append)
        wp_set_object_terms( $item_id, $tag_ids, 'post_tag', false );
    }
}
