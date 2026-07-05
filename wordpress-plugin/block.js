/* global wp */
( function ( blocks, element, blockEditor, components, i18n ) {
	'use strict';
	var el = element.createElement;
	var __ = i18n.__;
	var InspectorControls = blockEditor.InspectorControls;
	var PanelBody = components.PanelBody;
	var SelectControl = components.SelectControl;
	var TextControl = components.TextControl;

	blocks.registerBlockType( 'donaciones-vzla/listado', {
		title: __( 'Ayuda Venezuela', 'donaciones-vzla' ),
		description: __( 'Listado de canales verificados para donar a Venezuela.', 'donaciones-vzla' ),
		icon: 'heart',
		category: 'widgets',
		attributes: {
			lang: { type: 'string', default: '' },
			categories: { type: 'string', default: '' },
			orgs: { type: 'string', default: '' }
		},
		edit: function ( props ) {
			var a = props.attributes;
			return el(
				element.Fragment,
				{},
				el(
					InspectorControls,
					{},
					el(
						PanelBody,
						{ title: __( 'Ajustes', 'donaciones-vzla' ), initialOpen: true },
						el( SelectControl, {
							label: __( 'Idioma', 'donaciones-vzla' ),
							value: a.lang,
							options: [
								{ label: __( 'Según ajustes', 'donaciones-vzla' ), value: '' },
								{ label: 'Español', value: 'es' },
								{ label: 'English', value: 'en' }
							],
							onChange: function ( v ) { props.setAttributes( { lang: v } ); }
						} ),
						el( TextControl, {
							label: __( 'Categorías (opcional, separadas por coma)', 'donaciones-vzla' ),
							help: 'monetary, inkind, crowdfunding, volunteer',
							value: a.categories,
							onChange: function ( v ) { props.setAttributes( { categories: v } ); }
						} ),
						el( TextControl, {
							label: __( 'Organizaciones (opcional, IDs separados por coma)', 'donaciones-vzla' ),
							help: __( 'Vacío = todas. Los IDs están en config.json.', 'donaciones-vzla' ),
							value: a.orgs,
							onChange: function ( v ) { props.setAttributes( { orgs: v } ); }
						} )
					)
				),
				el(
					'div',
					{ style: { border: '1px dashed #7c3aed', borderRadius: '10px', padding: '16px', textAlign: 'center', color: '#5b21b6', background: '#faf5ff' } },
					'💜 ' + __( 'Ayuda Venezuela — el listado se mostrará aquí en el sitio publicado.', 'donaciones-vzla' )
				)
			);
		},
		save: function () { return null; } // render dinámico en PHP (render_callback)
	} );
} )( wp.blocks, wp.element, wp.blockEditor, wp.components, wp.i18n );
