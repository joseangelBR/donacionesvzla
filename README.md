# 💜 Ayuda Venezuela — Widget de donaciones

Widget embebible que muestra, en **cualquier web** (WordPress, Wix, HTML plano), una franja / botón /
popup con canales **verificados** para donar a Venezuela tras el terremoto.

- **No recibe dinero.** Solo redirige a la página oficial de cada organización (sin PCI, sin líos legales).
- **Se actualiza solo.** El listado vive en `config.json`. Editas ese archivo → todos los sitios se
  actualizan a los pocos minutos, **sin reinstalar nada**.
- **Gratis y sin VPS.** Todo son archivos estáticos servidos por un CDN gratuito.

---

## Arquitectura en una frase

Se separa el **cascarón** (un `<script>` / iframe / plugin que se instala una vez) del **contenido**
(`config.json`, en la nube). Ningún formato empaqueta el listado: todos lo leen en vivo.

```
Sitio del usuario  ──carga──►  widget.js (CDN)  ──fetch──►  config.json (CDN)
   (WordPress / Wix / HTML)         (cascarón)              (contenido editable)
```

## Archivos

| Archivo | Qué es |
|---|---|
| `config.json` | **El único archivo que editas** para actualizar el listado (orgs, textos, i18n, tema). |
| `widget.js` | Núcleo universal: Shadow DOM, modos barra/botón/popup/inline, i18n, accesibilidad, fallback. |
| `embed.html` | Versión iframe (para Wix "Embed HTML" o plataformas que bloquean scripts). |
| `index.html` | Landing para dueños de sitios: descarga del plugin, generador de snippets, instrucciones. |
| `donar.html` | Landing pública para donantes (listado completo, compartible en redes). |
| `wordpress-plugin/` | Plugin instalable (`.zip`): ajustes, bloque Gutenberg y shortcode `[donaciones_vzla]`. |

## Cómo se usa (los 4 formatos)

**1. Script universal** (cualquier web):
```html
<script src="https://donacionesvzla.vzla.workers.dev/widget.js" data-lang="es" data-mode="bar" async></script>
```
`data-mode`: `bar` (recomendado) · `button` · `popup` · `inline` · `manual`.
Otros: `data-lang` (es/en), `data-position` (left/right), `data-primary` (#hex), `data-categories`.

**2. iframe** (Wix / restrictivos):
```html
<iframe src="https://donacionesvzla.vzla.workers.dev/embed.html?lang=es"
        style="width:100%;max-width:640px;height:640px;border:0" loading="lazy"
        title="Ayuda para Venezuela"></iframe>
```

**3. WordPress:** instala el `.zip` de `wordpress-plugin/`, ve a **Ajustes → Ayuda Venezuela**.

**4. Wix:** *Añadir → Insertar → Insertar HTML*, pega el script (o el iframe).

---

## Licencia
- `widget.js`, HTML y `config.json`: MIT.
- `wordpress-plugin/`: GPLv2+ (requisito de WordPress.org).
