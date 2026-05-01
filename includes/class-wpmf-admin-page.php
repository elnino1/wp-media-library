<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WPMF_Admin_Page {
	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'add_admin_menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_scripts' ) );
	}

	public static function add_admin_menu() {
		add_menu_page(
			__( 'Media Folders', 'wp-media-folders' ),
			__( 'Media Folders', 'wp-media-folders' ),
			'upload_files',
			'wp-media-folders',
			array( __CLASS__, 'render_app' ),
			'dashicons-portfolio',
			10
		);
	}

	public static function render_app() {
		echo '<div class="wrap"><div id="wpmf-app-root"></div></div>';
	}

	public static function enqueue_scripts( $hook ) {
		if ( 'toplevel_page_wp-media-folders' !== $hook ) {
			return;
		}

		$asset_file = WPMF_PLUGIN_DIR . 'build/index.asset.php';
		if ( file_exists( $asset_file ) ) {
			$assets = require $asset_file;
			$deps = array_merge( $assets['dependencies'], array( 'media-views' ) );
			wp_enqueue_script(
				'wpmf-app-js',
				WPMF_PLUGIN_URL . 'build/index.js',
				$deps,
				$assets['version'],
				true
			);
			
			// Optional: Enqueue CSS if it exists
			$css_file = WPMF_PLUGIN_DIR . 'build/style-index.css';
			if ( file_exists( $css_file ) ) {
				wp_enqueue_style(
					'wpmf-app-css',
					WPMF_PLUGIN_URL . 'build/style-index.css',
					array( 'wp-components' ),
					$assets['version']
				);
			}
		}
	}
}
