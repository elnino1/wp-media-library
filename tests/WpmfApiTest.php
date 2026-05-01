<?php
class WpmfApiTest extends WP_UnitTestCase {
	
	public function test_api_class_exists() {
		$this->assertTrue( class_exists( 'WPMF_API' ) );
	}

	public function test_taxonomy_registers_correctly() {
		$this->assertTrue( taxonomy_exists( 'wp_virtual_folder' ), 'Virtual folder taxonomy should be registered.' );
	}

	public function test_taxonomy_attached_to_media() {
		$tax_object = get_taxonomy( 'wp_virtual_folder' );
		$this->assertContains( 'attachment', $tax_object->object_type, 'Virtual folders should connect to attachments.' );
	}
}
