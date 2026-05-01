<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WPMF_Tag_Mapper {
	public static function init() {
		// Hook when object terms are set to automatically map tags
		// add_action('set_object_terms', array(__CLASS__, 'map_folder_tags'), 10, 6);
        
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

    // Advanced tagging logic to be implemented here in next step
}
