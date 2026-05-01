<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WPMF_Autoloader {
	public static function init() {
		require_once WPMF_PLUGIN_DIR . 'includes/class-wpmf-taxonomy.php';
		require_once WPMF_PLUGIN_DIR . 'includes/class-wpmf-api.php';
		require_once WPMF_PLUGIN_DIR . 'includes/class-wpmf-tag-mapper.php';
		require_once WPMF_PLUGIN_DIR . 'includes/class-wpmf-admin-page.php';

		WPMF_Taxonomy::init();
		WPMF_API::init();
		WPMF_Tag_Mapper::init();
		WPMF_Admin_Page::init();
	}
}
