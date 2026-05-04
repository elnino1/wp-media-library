<?php
/**
 * PHPUnit bootstrap file.
 */

// wp-env sets WP_TESTS_DIR when it spins up the isolated testing container
$_tests_dir = getenv( 'WP_TESTS_DIR' );

if ( ! $_tests_dir ) {
	$_tests_dir = rtrim( sys_get_temp_dir(), '/\\' ) . '/wordpress-tests-lib';
}

if ( ! file_exists( $_tests_dir . '/includes/functions.php' ) ) {
	echo "Could not find $_tests_dir/includes/functions.php, have you run bin/install-wp-tests.sh ?" . PHP_EOL; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	exit( 1 );
}

// Required for WP 5.9+ testing: Point to the Polyfills library provided by our local composer install
define( 'WP_TESTS_PHPUNIT_POLYFILLS_PATH', dirname( dirname( __FILE__ ) ) . '/vendor/yoast/phpunit-polyfills' );

require_once $_tests_dir . '/includes/functions.php';

function _manually_load_plugin() {
	require dirname( dirname( __FILE__ ) ) . '/wp-media-library.php';
}
tests_add_filter( 'muplugins_loaded', '_manually_load_plugin' );

require $_tests_dir . '/includes/bootstrap.php';

// Fire the init action once after WordPress and the plugin are fully loaded
do_action( 'init' );
