<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WPMF_Taxonomy {
	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_virtual_folder_taxonomy' ) );
	}

	public static function register_virtual_folder_taxonomy() {
		$labels = array(
			'name'              => _x( 'Virtual Folders', 'taxonomy general name', 'wp-media-folders' ),
			'singular_name'     => _x( 'Virtual Folder', 'taxonomy singular name', 'wp-media-folders' ),
			'search_items'      => __( 'Search Folders', 'wp-media-folders' ),
			'all_items'         => __( 'All Folders', 'wp-media-folders' ),
			'parent_item'       => __( 'Parent Folder', 'wp-media-folders' ),
			'parent_item_colon' => __( 'Parent Folder:', 'wp-media-folders' ),
			'edit_item'         => __( 'Edit Folder', 'wp-media-folders' ),
			'update_item'       => __( 'Update Folder', 'wp-media-folders' ),
			'add_new_item'      => __( 'Add New Folder', 'wp-media-folders' ),
			'new_item_name'     => __( 'New Folder Name', 'wp-media-folders' ),
			'menu_name'         => __( 'Virtual Folders', 'wp-media-folders' ),
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
