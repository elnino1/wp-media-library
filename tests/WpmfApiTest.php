<?php
class WpmfApiTest extends WP_UnitTestCase {

	public static function setUpBeforeClass(): void {
		parent::setUpBeforeClass();
		do_action( 'init' );
	}

	public function setUp(): void {
		parent::setUp();
		// Re-register term meta after WP_UnitTestCase::tearDown() wipes all meta keys
		WPMF_Taxonomy::register_folder_order_meta();
	}

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

	public function test_folder_order_meta_is_registered() {
		$registered = get_registered_meta_keys( 'term', 'wp_virtual_folder' );
		$this->assertArrayHasKey( 'wpmf_folder_order', $registered );
	}

	public function test_folder_order_meta_is_integer_type() {
		$registered = get_registered_meta_keys( 'term', 'wp_virtual_folder' );
		$this->assertEquals( 'integer', $registered['wpmf_folder_order']['type'] );
	}

	public function test_delete_folder_moves_media_to_parent() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

		$parent     = wp_insert_term( 'ParentFolder', 'wp_virtual_folder' );
		$child      = wp_insert_term( 'ChildFolder', 'wp_virtual_folder', array( 'parent' => $parent['term_id'] ) );
		$attach_id  = self::factory()->attachment->create();
		wp_set_object_terms( $attach_id, array( $child['term_id'] ), 'wp_virtual_folder' );

		$request = new WP_REST_Request( 'DELETE', '/wpmf/v1/folder/' . $child['term_id'] );
		$request->set_url_params( array( 'id' => $child['term_id'] ) );
		$response = rest_get_server()->dispatch( $request );

		$this->assertEquals( 200, $response->get_status() );
		$this->assertTrue( $response->get_data()['success'] );

		$terms = wp_get_object_terms( $attach_id, 'wp_virtual_folder', array( 'fields' => 'ids' ) );
		$this->assertContains( (int) $parent['term_id'], array_map( 'intval', $terms ) );
		$this->assertNotContains( (int) $child['term_id'], array_map( 'intval', $terms ) );
	}

	public function test_delete_folder_promotes_child_folders_to_parent() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

		$grandparent = wp_insert_term( 'GP', 'wp_virtual_folder' );
		$parent      = wp_insert_term( 'P',  'wp_virtual_folder', array( 'parent' => $grandparent['term_id'] ) );
		$child       = wp_insert_term( 'C',  'wp_virtual_folder', array( 'parent' => $parent['term_id'] ) );

		$request = new WP_REST_Request( 'DELETE', '/wpmf/v1/folder/' . $parent['term_id'] );
		$request->set_url_params( array( 'id' => $parent['term_id'] ) );
		rest_get_server()->dispatch( $request );

		$updated_child = get_term( $child['term_id'], 'wp_virtual_folder' );
		$this->assertEquals( (int) $grandparent['term_id'], (int) $updated_child->parent );
	}

	public function test_delete_folder_does_not_touch_grandchild_folders() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

		$a = wp_insert_term( 'A', 'wp_virtual_folder' );
		$b = wp_insert_term( 'B', 'wp_virtual_folder', array( 'parent' => $a['term_id'] ) );
		$c = wp_insert_term( 'C', 'wp_virtual_folder', array( 'parent' => $b['term_id'] ) );
		$d = wp_insert_term( 'D', 'wp_virtual_folder', array( 'parent' => $c['term_id'] ) );

		$request = new WP_REST_Request( 'DELETE', '/wpmf/v1/folder/' . $b['term_id'] );
		$request->set_url_params( array( 'id' => $b['term_id'] ) );
		rest_get_server()->dispatch( $request );

		// C was the direct child of B — should now be under A
		$updated_c = get_term( $c['term_id'], 'wp_virtual_folder' );
		$this->assertEquals( (int) $a['term_id'], (int) $updated_c->parent, 'C should be promoted to A' );

		// D was a grandchild of B — should still be under C, not touched
		$updated_d = get_term( $d['term_id'], 'wp_virtual_folder' );
		$this->assertEquals( (int) $c['term_id'], (int) $updated_d->parent, 'D should remain under C' );
	}

	public function test_delete_folder_moves_media_to_root_when_no_parent() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

		$folder    = wp_insert_term( 'TopLevel', 'wp_virtual_folder' );
		$attach_id = self::factory()->attachment->create();
		wp_set_object_terms( $attach_id, array( $folder['term_id'] ), 'wp_virtual_folder' );

		$request = new WP_REST_Request( 'DELETE', '/wpmf/v1/folder/' . $folder['term_id'] );
		$request->set_url_params( array( 'id' => $folder['term_id'] ) );
		rest_get_server()->dispatch( $request );

		$terms = wp_get_object_terms( $attach_id, 'wp_virtual_folder', array( 'fields' => 'ids' ) );
		$this->assertEmpty( $terms );
	}

	public function test_delete_nonexistent_folder_returns_404() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

		$request = new WP_REST_Request( 'DELETE', '/wpmf/v1/folder/999999' );
		$request->set_url_params( array( 'id' => 999999 ) );
		$response = rest_get_server()->dispatch( $request );

		$this->assertEquals( 404, $response->get_status() );
	}
}
