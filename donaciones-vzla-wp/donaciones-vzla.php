<?php
/**
 * Plugin Name:       Ayuda Venezuela — Widget de donaciones
 * Plugin URI:        https://donaciones-vzla.pages.dev/
 * Description:       Muestra una franja, botón o popup con canales verificados para donar a Venezuela. El listado se actualiza solo desde la nube — no hace falta reinstalar el plugin.
 * Version:           1.0.0
 * Requires at least: 5.8
 * Requires PHP:      7.2
 * Author:            Ayuda Venezuela
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       donaciones-vzla
 *
 * El widget NO recibe dinero: solo redirige a las páginas oficiales de cada organización.
 * El contenido vive en config.json (remoto). Este plugin es solo el "cascarón".
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DVZLA_VERSION', '1.0.0' );
define( 'DVZLA_DEFAULT_HOST', 'https://donaciones-vzla.pages.dev' );

/**
 * Opciones por defecto.
 */
function dvzla_defaults() {
	return array(
		'enabled'  => 1,
		'host'     => DVZLA_DEFAULT_HOST,
		'mode'     => 'bar',      // bar | button | popup
		'lang'     => 'es',       // es | en
		'position' => 'right',    // left | right (mode=button)
		'primary'  => '#7c3aed',
		'orgs'     => '',         // allowlist opcional: IDs separados por coma (vacío = todas)
	);
}

function dvzla_get_options() {
	$o = get_option( 'dvzla_options', array() );
	return wp_parse_args( is_array( $o ) ? $o : array(), dvzla_defaults() );
}

/* ------------------------------------------------------------------ *
 *  Frontend: encolar widget.js remoto con atributos data-*
 * ------------------------------------------------------------------ */

function dvzla_enqueue() {
	$o = dvzla_get_options();
	if ( empty( $o['enabled'] ) ) { return; }
	$src = trailingslashit( esc_url_raw( $o['host'] ) ) . 'widget.js';
	wp_enqueue_script( 'dvzla-widget', $src, array(), DVZLA_VERSION, true );
}
add_action( 'wp_enqueue_scripts', 'dvzla_enqueue' );

/**
 * Inyecta los data-* y async en la etiqueta <script> del widget.
 */
function dvzla_script_tag( $tag, $handle ) {
	if ( 'dvzla-widget' !== $handle ) { return $tag; }
	$o    = dvzla_get_options();
	$data = sprintf(
		' data-mode="%s" data-lang="%s" data-position="%s" data-primary="%s"',
		esc_attr( $o['mode'] ),
		esc_attr( $o['lang'] ),
		esc_attr( $o['position'] ),
		esc_attr( $o['primary'] )
	);
	if ( ! empty( $o['orgs'] ) ) {
		$data .= sprintf( ' data-orgs="%s"', esc_attr( $o['orgs'] ) );
	}
	$data .= ' async';
	return str_replace( ' src=', $data . ' src=', $tag );
}
add_filter( 'script_loader_tag', 'dvzla_script_tag', 10, 2 );

/* ------------------------------------------------------------------ *
 *  Shortcode + Bloque: render inline del listado dentro del contenido
 * ------------------------------------------------------------------ */

function dvzla_render_inline( $atts ) {
	$o    = dvzla_get_options();
	$atts = shortcode_atts(
		array( 'lang' => $o['lang'], 'categories' => '', 'orgs' => $o['orgs'] ),
		$atts,
		'donaciones_vzla'
	);

	static $n = 0;
	$n++;
	$id  = 'dvzla-inline-' . $n;
	$src = trailingslashit( esc_url_raw( $o['host'] ) ) . 'widget.js';

	$cats = wp_json_encode(
		array_filter( array_map( 'trim', explode( ',', (string) $atts['categories'] ) ) )
	);
	$orgs = wp_json_encode(
		array_filter( array_map( 'sanitize_key', array_map( 'trim', explode( ',', (string) $atts['orgs'] ) ) ) )
	);

	ob_start();
	?>
	<div id="<?php echo esc_attr( $id ); ?>" class="dvzla-inline"></div>
	<script>
	(function(){
		function mount(){
			window.DonacionesVzla.mount({
				mode:'inline',
				target:'#<?php echo esc_js( $id ); ?>',
				lang:'<?php echo esc_js( $atts['lang'] ); ?>',
				categories:<?php echo $cats; // ya es JSON escapado ?>,
				orgs:<?php echo $orgs; // ya es JSON escapado ?>
			});
		}
		if (window.DonacionesVzla && window.DonacionesVzla.mount) { mount(); return; }
		var s=document.createElement('script');
		s.src='<?php echo esc_url( $src ); ?>';
		s.setAttribute('data-mode','manual');
		s.onload=mount;
		document.body.appendChild(s);
	})();
	</script>
	<?php
	return ob_get_clean();
}
add_shortcode( 'donaciones_vzla', 'dvzla_render_inline' );

/**
 * Registra el bloque de Gutenberg (usa el mismo render inline en PHP).
 */
function dvzla_register_block() {
	if ( ! function_exists( 'register_block_type' ) ) { return; }

	wp_register_script(
		'dvzla-block',
		plugins_url( 'block.js', __FILE__ ),
		array( 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-i18n' ),
		DVZLA_VERSION,
		true
	);

	register_block_type(
		'donaciones-vzla/listado',
		array(
			'editor_script'   => 'dvzla-block',
			'render_callback' => function ( $attrs ) {
				return dvzla_render_inline(
					array(
						'lang'       => isset( $attrs['lang'] ) ? $attrs['lang'] : '',
						'categories' => isset( $attrs['categories'] ) ? $attrs['categories'] : '',
						'orgs'       => isset( $attrs['orgs'] ) ? $attrs['orgs'] : '',
					)
				);
			},
			'attributes'      => array(
				'lang'       => array( 'type' => 'string', 'default' => '' ),
				'categories' => array( 'type' => 'string', 'default' => '' ),
				'orgs'       => array( 'type' => 'string', 'default' => '' ),
			),
		)
	);
}
add_action( 'init', 'dvzla_register_block' );

/* ------------------------------------------------------------------ *
 *  Administración: página de ajustes
 * ------------------------------------------------------------------ */

function dvzla_admin_menu() {
	add_options_page(
		__( 'Ayuda Venezuela', 'donaciones-vzla' ),
		__( 'Ayuda Venezuela', 'donaciones-vzla' ),
		'manage_options',
		'donaciones-vzla',
		'dvzla_settings_page'
	);
}
add_action( 'admin_menu', 'dvzla_admin_menu' );

function dvzla_register_settings() {
	register_setting( 'dvzla_group', 'dvzla_options', 'dvzla_sanitize' );
}
add_action( 'admin_init', 'dvzla_register_settings' );

function dvzla_sanitize( $in ) {
	$d   = dvzla_defaults();
	$out = array();
	$out['enabled']  = empty( $in['enabled'] ) ? 0 : 1;
	$out['host']     = ! empty( $in['host'] ) ? esc_url_raw( trim( $in['host'] ) ) : $d['host'];
	$out['mode']     = in_array( $in['mode'] ?? '', array( 'bar', 'button', 'popup' ), true ) ? $in['mode'] : $d['mode'];
	$out['lang']     = in_array( $in['lang'] ?? '', array( 'es', 'en' ), true ) ? $in['lang'] : $d['lang'];
	$out['position'] = in_array( $in['position'] ?? '', array( 'left', 'right' ), true ) ? $in['position'] : $d['position'];
	$color           = sanitize_hex_color( $in['primary'] ?? '' );
	$out['primary']  = $color ? $color : $d['primary'];
	// Allowlist: solo IDs válidos (letras, números, guiones), separados por coma.
	$ids             = array_filter( array_map( 'sanitize_key', array_map( 'trim', explode( ',', (string) ( $in['orgs'] ?? '' ) ) ) ) );
	$out['orgs']     = implode( ',', $ids );
	return $out;
}

function dvzla_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) { return; }
	$o = dvzla_get_options();
	?>
	<div class="wrap">
		<h1>💜 <?php esc_html_e( 'Ayuda Venezuela', 'donaciones-vzla' ); ?></h1>
		<p><?php esc_html_e( 'Muestra canales verificados para donar a Venezuela. El listado se actualiza solo desde la nube: no necesitas actualizar este plugin cuando cambien las organizaciones.', 'donaciones-vzla' ); ?></p>
		<form method="post" action="options.php">
			<?php settings_fields( 'dvzla_group' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><?php esc_html_e( 'Mostrar en el sitio', 'donaciones-vzla' ); ?></th>
					<td><label><input type="checkbox" name="dvzla_options[enabled]" value="1" <?php checked( $o['enabled'], 1 ); ?>>
						<?php esc_html_e( 'Activar el widget en todas las páginas', 'donaciones-vzla' ); ?></label></td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Cómo se muestra', 'donaciones-vzla' ); ?></th>
					<td>
						<select name="dvzla_options[mode]">
							<option value="bar" <?php selected( $o['mode'], 'bar' ); ?>><?php esc_html_e( 'Franja fija abajo (recomendado)', 'donaciones-vzla' ); ?></option>
							<option value="button" <?php selected( $o['mode'], 'button' ); ?>><?php esc_html_e( 'Botón flotante lateral', 'donaciones-vzla' ); ?></option>
							<option value="popup" <?php selected( $o['mode'], 'popup' ); ?>><?php esc_html_e( 'Popup al entrar', 'donaciones-vzla' ); ?></option>
						</select>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Idioma', 'donaciones-vzla' ); ?></th>
					<td>
						<select name="dvzla_options[lang]">
							<option value="es" <?php selected( $o['lang'], 'es' ); ?>>Español</option>
							<option value="en" <?php selected( $o['lang'], 'en' ); ?>>English</option>
						</select>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Posición del botón', 'donaciones-vzla' ); ?></th>
					<td>
						<select name="dvzla_options[position]">
							<option value="right" <?php selected( $o['position'], 'right' ); ?>><?php esc_html_e( 'Derecha', 'donaciones-vzla' ); ?></option>
							<option value="left" <?php selected( $o['position'], 'left' ); ?>><?php esc_html_e( 'Izquierda', 'donaciones-vzla' ); ?></option>
						</select>
						<p class="description"><?php esc_html_e( 'Solo aplica al modo “botón flotante”.', 'donaciones-vzla' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Color principal', 'donaciones-vzla' ); ?></th>
					<td><input type="text" name="dvzla_options[primary]" value="<?php echo esc_attr( $o['primary'] ); ?>" class="regular-text" placeholder="#7c3aed"></td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Organizaciones a mostrar', 'donaciones-vzla' ); ?></th>
					<td>
						<input type="text" name="dvzla_options[orgs]" value="<?php echo esc_attr( $o['orgs'] ); ?>" class="regular-text" placeholder="<?php esc_attr_e( 'vacío = todas', 'donaciones-vzla' ); ?>">
						<p class="description"><?php esc_html_e( 'Opcional. IDs separados por coma para mostrar solo esas organizaciones. Vacío = mostrar todas (se mantiene actualizado). Los IDs están en el archivo config.json.', 'donaciones-vzla' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><?php esc_html_e( 'Origen del contenido', 'donaciones-vzla' ); ?></th>
					<td>
						<input type="url" name="dvzla_options[host]" value="<?php echo esc_attr( $o['host'] ); ?>" class="regular-text">
						<p class="description"><?php esc_html_e( 'URL base donde están widget.js y config.json. Déjalo por defecto salvo que alojes tu propia copia.', 'donaciones-vzla' ); ?></p>
					</td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>

		<hr>
		<h2><?php esc_html_e( 'Insertar en una entrada o página', 'donaciones-vzla' ); ?></h2>
		<p><?php esc_html_e( 'Usa el bloque “Ayuda Venezuela” o el shortcode:', 'donaciones-vzla' ); ?>
			<code>[donaciones_vzla]</code></p>
		<p class="description"><?php esc_html_e( 'Transparencia: este plugin no recibe ni gestiona dinero. Cada botón enlaza directo a la organización oficial.', 'donaciones-vzla' ); ?></p>
	</div>
	<?php
}
