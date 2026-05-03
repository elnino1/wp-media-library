<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WPMF_Taxonomy {
	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_virtual_folder_taxonomy' ) );
		add_action( 'rest_api_init', array( __CLASS__, 'register_rest_fields' ) );
	}

	public static function register_rest_fields() {
		add_filter( 'rest_attachment_query', array( __CLASS__, 'filter_media_by_folder' ), 10, 2 );
	}

	public static function filter_media_by_folder( $args, $request ) {
		$wpmf_folder = $request->get_param( 'wpmf_folder' );

		if ( null === $wpmf_folder ) {
			return $args;
		}

		if ( 'inbox' === $wpmf_folder ) {
			$args['tax_query'] = array(
				array(
					'taxonomy' => 'wp_virtual_folder',
					'operator' => 'NOT EXISTS',
				),
			);
		} elseif ( is_numeric( $wpmf_folder ) ) {
			$args['tax_query'] = array(
				array(
					'taxonomy' => 'wp_virtual_folder',
					'field'    => 'term_id',
					'terms'    => array( absint( $wpmf_folder ) ),
				),
			);
		}

		return $args;
	}

	public static function register_virtual_folder_taxonomy() {
		$labels = array(
			'name'              => _x( 'Virtual Folders', 'taxonomy general name', 'wp-media-library' ),
			'singular_name'     => _x( 'Virtual Folder', 'taxonomy singular name', 'wp-media-library' ),
			'search_items'      => __( 'Search Folders', 'wp-media-library' ),
			'all_items'         => __( 'All Folders', 'wp-media-library' ),
			'parent_item'       => __( 'Parent Folder', 'wp-media-library' ),
			'parent_item_colon' => __( 'Parent Folder:', 'wp-media-library' ),
			'edit_item'         => __( 'Edit Folder', 'wp-media-library' ),
			'update_item'       => __( 'Update Folder', 'wp-media-library' ),
			'add_new_item'      => __( 'Add New Folder', 'wp-media-library' ),
			'new_item_name'     => __( 'New Folder Name', 'wp-media-library' ),
			'menu_name'         => __( 'Virtual Folders', 'wp-media-library' ),
		);

		$args = array(
			'hierarchical'      => true,
			'labels'            => $labels,
			'show_ui'           => false, // Handled by our custom React UI mostly, but might need true for API wrapper
			'show_admin_column' => false,
			'query_var'         => true,
			'public'            => false, // Internal use only, doesn't need public querying URLs
			'rewrite'           => false, // Prevent URL breakage
			'show_in_rest'      => true,  // Needed for our REST API/React App
			'rest_base'         => 'wpmf_folders',
		);

		// Register to attachment and product post types
		register_taxonomy( 'wp_virtual_folder', array( 'attachment', 'product' ), $args );
	}
}
