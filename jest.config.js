const path = require( 'path' );

module.exports = {
	preset: '@wordpress/jest-preset-default',
	transform: {
		'\\.[jt]sx?$': path.join(
			require.resolve( '@wordpress/scripts/package.json' ),
			'../config/babel-transform'
		),
	},
	moduleNameMapper: {
		'^@wordpress/element$': '<rootDir>/node_modules/react',
	},
};
