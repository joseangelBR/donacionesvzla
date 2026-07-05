# 🌍 Guía de traducción — Ayuda Venezuela

¡Gracias por ayudar a que este proyecto llegue a más gente! Todo el texto vive en
archivos separados por idioma; **no hace falta tocar código**.

Idiomas objetivo actuales: **es** (base) · **en** · **pt** · **fr** · **it** · **de**.
Puedes proponer uno nuevo abriendo un issue.

---

## ¿Qué se traduce y dónde vive?

| Superficie | Archivos | Formato |
|---|---|---|
| **Contenido del widget** (descripciones de orgs, textos) | [`config.json`](config.json) | claves `{ "es": "...", "en": "..." }` |
| **Textos de la interfaz del widget** ("Donar", "Cerrar"…) | [`widget.js`](widget.js) → objeto `UI` | diccionario JS |
| **Páginas** (landing y página de donar) | [`i18n/<idioma>.json`](i18n/) | JSON plano `clave → texto` |
| **Panel del plugin WordPress** | `donaciones-vzla-wp/languages/*.po` | gettext (.po/.mo) |

> Regla de oro: si falta una traducción, **se muestra el español** automáticamente.
> Nunca se rompe nada por traducir "a medias".

---

## Opción A — Con Weblate (recomendada, sin Git)

Weblate es una plataforma web gratuita para proyectos libres. Traduces desde el navegador
y Weblate abre el Pull Request por ti.

1. Entra al proyecto en Weblate (enlace en el README).
2. Elige tu idioma → traduce las cadenas pendientes (verás el % completado).
3. Guarda. Weblate agrupa los cambios y los envía a GitHub solo.

No necesitas saber Git ni JSON. Ideal para traductores no técnicos.

---

## Opción B — Manualmente por Pull Request

### Páginas (`i18n/`)
1. Copia [`i18n/es.json`](i18n/es.json) (es la **fuente de verdad**).
2. Renómbralo con tu código de idioma: `pt.json`, `fr.json`, etc.
3. Traduce **solo los valores**, nunca las claves.
4. Respeta las etiquetas HTML dentro del texto (`<b>`, `<code>`, `<a href="…">`).
   Traduce el texto visible; deja las etiquetas y URLs igual.
5. No borres ni añadas claves: deben coincidir 1:1 con `es.json`
   (una GitHub Action lo verifica automáticamente).

### Contenido del widget (`config.json`)
Añade tu idioma a cada objeto de texto. Ejemplo:
```json
"eventTitle": { "es": "Cada aporte suma", "en": "Every bit counts", "pt": "Cada contribuição conta" }
```

### Plugin WordPress (`languages/`)
1. Parte de `donaciones-vzla-wp/languages/donaciones-vzla.pot`.
2. Crea tu `.po` con el locale de WordPress, p. ej. `donaciones-vzla-pt_BR.po`,
   `donaciones-vzla-fr_FR.po` (usa Poedit o Weblate).
3. Poedit genera el `.mo` compilado al guardar; súbelo junto al `.po`.

Luego abre un **Pull Request**. ¡Eso es todo! 🙌

---

## Configurar Weblate (para el mantenedor, una sola vez)

En [hosted.weblate.org](https://hosted.weblate.org) (gratis para proyectos libres),
añade el repo y crea **dos componentes**:

**Componente 1 — Páginas**
- Formato: `JSON file`
- Filemask: `i18n/*.json`
- Archivo base monolingüe: `i18n/es.json`
- Idioma base: `es`

**Componente 2 — Plugin WordPress**
- Formato: `gettext PO`
- Filemask: `donaciones-vzla-wp/languages/donaciones-vzla-*.po`
- Plantilla: `donaciones-vzla-wp/languages/donaciones-vzla.pot`

> El `config.json` (contenido del widget) se traduce mejor por PR directo, porque su
> estructura es anidada por idioma, no un archivo por idioma.
