<?php
/**
 * Plugin Name:       WP Media Folders
 * Plugin URI:        https://example.com/
 * Description:       A desktop-class visual drag-and-drop workspace for WordPress Media and WooCommerce Products using non-destructive virtual folders.
 * Version:           VERSION
 * Author:            David Lenir
 * License:           GPL-2.0+
 * Text Domain:       wp-media-folders
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

define( 'WPMF_VERSION', 'VERSION' );
define( 'WPMF_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'WPMF_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Require the autoloader or main initializer
require_once WPMF_PLUGIN_DIR . 'includes/class-wpmf-autoloader.php';

// Initialize the plugin
add_action( 'plugins_loaded', function() {
    WPMF_Autoloader::init();
} );
