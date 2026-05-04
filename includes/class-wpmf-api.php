<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class WPMF_API {
	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	public static function register_routes() {
		register_rest_route( 'wpmf/v1', '/move', array(
			'methods'             => 'POST',
			'callback'            => array( __CLASS__, 'move_items' ),
			'permission_callback' => array( __CLASS__, 'check_permissions' ),
			'args'                => array(
				'item_ids'  => array(
					'required'          => true,
					'validate_callback' => function($param) {
						return is_array($param) || is_numeric($param);
					}
				),
				'folder_id' => array(
					'required'          => true,
					'validate_callback' => 'is_numeric'
				),
			),
		) );

		register_rest_route( 'wpmf/v1', '/folder/(?P<id>\d+)', array(
			'methods'             => 'DELETE',
			'callback'            => array( __CLASS__, 'delete_folder' ),
			'permission_callback' => array( __CLASS__, 'check_permissions' ),
			'args'                => array(
				'id' => array(
					'required'          => true,
					'validate_callback' => function( $param ) {
						return is_numeric( $param );
					},
				),
			),
		) );

		register_rest_route( 'wpmf/v1', '/folder/(?P<id>\d+)/move', array(
			'methods'             => 'POST',
			'callback'            => array( __CLASS__, 'move_folder' ),
			'permission_callback' => array( __CLASS__, 'check_permissions' ),
			'args'                => array(
				'id' => array(
					'required'          => true,
					'validate_callback' => function ( $param ) {
						return is_numeric( $param );
					},
				),
				'parent_id' => array(
					'required'          => true,
					'validate_callback' => function ( $param ) {
						return is_numeric( $param );
					},
				),
				'sibling_ids' => array(
					'required'          => true,
					'validate_callback' => function ( $param ) {
						return is_array( $param );
					},
				),
			),
		) );
	}

	// Make sure the user has basic edit capabilities. The callback logic itself checks capabilities per post.
	public static function check_permissions() {
		return current_user_can( 'upload_files' ) || current_user_can( 'edit_products' );
	}

	public static function delete_folder( WP_REST_Request $request ) {
		$id   = (int) $request->get_param( 'id' );
		$term = get_term( $id, 'wp_virtual_folder' );

		if ( is_wp_error( $term ) || ! $term ) {
			return new WP_Error( 'not_found', 'Folder not found', array( 'status' => 404 ) );
		}

		if ( ! current_user_can( 'manage_categories' ) && ! current_user_can( 'manage_options' ) ) {
			return new WP_Error( 'forbidden', 'You do not have permission to delete folders', array( 'status' => 403 ) );
		}

		$parent_id = (int) $term->parent;

		// Move all media in this folder to the parent (or root)
		$media_ids = get_objects_in_term( $id, 'wp_virtual_folder' );
		if ( ! is_wp_error( $media_ids ) ) {
			foreach ( $media_ids as $media_id ) {
				if ( $parent_id > 0 ) {
					wp_set_object_terms( (int) $media_id, array( $parent_id ), 'wp_virtual_folder' );
				} else {
					wp_set_object_terms( (int) $media_id, array(), 'wp_virtual_folder' );
				}
			}
		}

		// Promote immediate child folders one level up
		$direct_children = get_terms( array(
			'taxonomy'   => 'wp_virtual_folder',
			'parent'     => $id,
			'hide_empty' => false,
			'fields'     => 'ids',
		) );
		if ( ! is_wp_error( $direct_children ) ) {
			foreach ( $direct_children as $child_id ) {
				wp_update_term( (int) $child_id, 'wp_virtual_folder', array( 'parent' => $parent_id ) );
			}
		}

		$deleted = wp_delete_term( $id, 'wp_virtual_folder' );
		if ( is_wp_error( $deleted ) || false === $deleted ) {
			return new WP_Error( 'delete_failed', 'Could not delete folder', array( 'status' => 500 ) );
		}

		return rest_ensure_response( array( 'success' => true, 'parent_id' => $parent_id ) );
	}

	public static function move_items( WP_REST_Request $request ) {
		$item_ids  = $request->get_param( 'item_ids' );
		$folder_id = (int) $request->get_param( 'folder_id' );

        if ( ! is_array( $item_ids ) ) {
            $item_ids = array( $item_ids );
        }

        $results = array();

        foreach ( $item_ids as $item_id ) {
            $item_id = (int) $item_id;
            
            // Check post type to ensure user has permissions for this specific item
            $post_type = get_post_type( $item_id );
            if ( ! current_user_can( 'edit_post', $item_id ) ) {
                $results[] = array( 'id' => $item_id, 'status' => 'error', 'message' => 'Permission denied for this item' );
                continue;
            }

            // Unset current folder if moving to root (folder_id = 0)
            if ( $folder_id === 0 ) {
                $status = wp_set_object_terms( $item_id, array(), 'wp_virtual_folder' );
            } else {
                $status = wp_set_object_terms( $item_id, array( $folder_id ), 'wp_virtual_folder' );
            }

            if ( is_wp_error( $status ) ) {
                $results[] = array( 'id' => $item_id, 'status' => 'error', 'message' => $status->get_error_message() );
            } else {
                // Apply folder's mapped tags after successful move (MOVE-02)
                if ( $folder_id > 0 ) {
                    WPMF_Tag_Mapper::apply_tags_for_folder( $item_id, $folder_id );
                }
                $results[] = array( 'id' => $item_id, 'status' => 'success' );
            }
        }

		return rest_ensure_response( array( 'success' => true, 'results' => $results ) );
	}

	public static function move_folder( WP_REST_Request $request ) {
		$id          = (int) $request->get_param( 'id' );
		$parent_id   = (int) $request->get_param( 'parent_id' );
		$sibling_ids = array_map( 'intval', (array) $request->get_param( 'sibling_ids' ) );

		$term = get_term( $id, 'wp_virtual_folder' );
		if ( is_wp_error( $term ) || ! $term ) {
			return new WP_Error( 'not_found', 'Folder not found', array( 'status' => 404 ) );
		}

		if ( ! current_user_can( 'manage_categories' ) && ! current_user_can( 'manage_options' ) ) {
			return new WP_Error( 'forbidden', 'You do not have permission to move folders', array( 'status' => 403 ) );
		}

		if ( $parent_id === $id ) {
			return new WP_Error( 'invalid_parent', 'A folder cannot be its own parent.', array( 'status' => 400 ) );
		}

		$all_descendants = get_term_children( $id, 'wp_virtual_folder' );
		if ( ! is_wp_error( $all_descendants ) && in_array( $parent_id, $all_descendants, true ) ) {
			return new WP_Error( 'circular_parent', 'Cannot move a folder under one of its own descendants.', array( 'status' => 400 ) );
		}

		$result = wp_update_term( $id, 'wp_virtual_folder', array( 'parent' => $parent_id ) );
		if ( is_wp_error( $result ) ) {
			return new WP_Error( 'update_failed', 'Could not move folder.', array( 'status' => 500 ) );
		}

		foreach ( $sibling_ids as $index => $sibling_id ) {
			update_term_meta( $sibling_id, 'wpmf_folder_order', $index * 10 );
		}

		$updated_term = get_term( $id, 'wp_virtual_folder' );
		return rest_ensure_response( $updated_term );
	}
}
