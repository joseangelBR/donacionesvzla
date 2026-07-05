/*!
 * Donaciones Venezuela — widget universal de donaciones
 * Muestra una franja / botón / popup con canales verificados para donar.
 * NO recibe dinero: solo redirige a las páginas oficiales de cada organización.
 *
 * Uso básico (cualquier web):
 *   <script src="https://donacionesvzla.vzla.workers.dev/widget.js"
 *           data-lang="es" data-mode="bar" async></script>
 *
 * data-* soportados:
 *   data-mode      bar | button | popup | inline | manual   (def: bar)
 *   data-lang      es | en                                   (def: config.ui.defaultLang)
 *   data-position  left | right   (para mode=button)         (def: right)
 *   data-primary   color hex del botón principal             (def: config.ui.theme.primary)
 *   data-config    URL alternativa del config.json           (def: junto a widget.js)
 *   data-target    #id donde montar (para mode=inline)
 *   data-categories  lista separada por comas para filtrar   (def: todas)
 *
 * Licencia: MIT. Contenido servido desde config.json (actualizable sin tocar este archivo).
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'donaciones_vzla_dismissed_at';
  var NS = 'dvzla';
  var HOSTS = []; // instancias montadas, para poder destruirlas (usado en vista previa)

  /* ---------- localizar el <script> propio y leer opciones ---------- */
  var self =
    document.currentScript ||
    (function () {
      var s = document.getElementsByTagName('script');
      for (var i = s.length - 1; i >= 0; i--) {
        if (s[i].src && s[i].src.indexOf('widget.js') !== -1) return s[i];
      }
      return null;
    })();

  var ds = (self && self.dataset) || {};

  function deriveConfigUrl() {
    if (ds.config) return ds.config;
    if (self && self.src) return self.src.replace(/widget\.js(\?.*)?$/, 'config.json');
    return 'config.json';
  }

  var opts = {
    mode: (ds.mode || 'bar').toLowerCase(),
    lang: (ds.lang || '').toLowerCase(),
    position: (ds.position || 'right').toLowerCase(),
    primary: ds.primary || '',
    configUrl: deriveConfigUrl(),
    target: ds.target || '',
    categories: (ds.categories || '')
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(Boolean),
    // Allowlist: si se indican IDs, solo se muestran esas organizaciones.
    // Vacío = mostrar todas (sigue actualizándose desde config.json).
    orgs: (ds.orgs || '')
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(Boolean)
  };

  /* ---------- helpers ---------- */
  function t(obj, lang) {
    if (!obj) return '';
    return obj[lang] || obj.es || obj.en || '';
  }
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') {
          node.addEventListener(k.slice(2), attrs[k]);
        } else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }
  // Bandera de Venezuela como SVG (los emojis de bandera no se renderizan en Windows).
  var VE_FLAG_SVG =
    '<svg class="ve-flag" viewBox="0 0 30 20" role="img" aria-label="Venezuela" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="30" height="20" fill="#00247d"/>' +
    '<rect width="30" height="6.67" fill="#ffcc00"/>' +
    '<rect y="13.33" width="30" height="6.67" fill="#cf142b"/>' +
    '<g fill="#fff">' +
    '<circle cx="19.08" cy="10.1" r=".75"/><circle cx="18.26" cy="8.9" r=".75"/>' +
    '<circle cx="17.11" cy="8.02" r=".75"/><circle cx="15.72" cy="7.56" r=".75"/>' +
    '<circle cx="14.28" cy="7.56" r=".75"/><circle cx="12.89" cy="8.02" r=".75"/>' +
    '<circle cx="11.74" cy="8.9" r=".75"/><circle cx="10.92" cy="10.1" r=".75"/>' +
    '</g></svg>';
  function flagNode() { return el('span', { class: 've-flag-wrap', html: VE_FLAG_SVG }); }

  function isDismissed(days) {
    try {
      var at = parseInt(localStorage.getItem(STORAGE_KEY), 10);
      if (!at) return false;
      var ageDays = (Date.now() - at) / 86400000;
      return ageDays < (days || 14);
    } catch (e) { return false; }
  }
  function markDismissed() {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch (e) {}
  }

  /* ---------- CSS (inyectado en el Shadow DOM: no colisiona con el sitio) ---------- */
  function styles(primary, primaryText, accent) {
    return (
      ':host{all:initial}' +
      '*{box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}' +
      '.wrap{--p:' + primary + ';--pt:' + primaryText + ';--a:' + accent + ';color:#1f2937;line-height:1.45}' +
      /* bandera de Venezuela (SVG: se ve igual en todos los sistemas, incl. Windows) */
      '.ve-flag{width:22px;height:15px;border-radius:3px;display:block;box-shadow:0 0 0 1px rgba(0,0,0,.12)}' +
      '.ve-flag-wrap{display:inline-flex;align-items:center;margin-right:8px;flex:none;vertical-align:middle}' +
      '.fab .ve-flag-wrap{margin-right:0}' +
      /* animaciones (desvanecimiento entrada/salida) */
      '@keyframes dvzla-fade-in{from{opacity:0}to{opacity:1}}' +
      '@keyframes dvzla-fade-out{from{opacity:1}to{opacity:0}}' +
      '@keyframes dvzla-sheet-in{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}' +
      '@keyframes dvzla-sheet-out{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(24px)}}' +
      '@keyframes dvzla-bar-in{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}' +
      '@keyframes dvzla-bar-out{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(100%)}}' +
      /* franja inferior */
      '.bar{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:var(--p);color:var(--pt);' +
      'display:flex;gap:12px;align-items:center;justify-content:center;padding:12px 46px 12px 18px;' +
      'box-shadow:0 -2px 14px rgba(0,0,0,.18);font-size:14px;flex-wrap:wrap;' +
      'animation:dvzla-bar-in .35s ease both}' +
      '.bar.closing{animation:dvzla-bar-out .28s ease forwards}' +
      '.bar b{font-weight:700}' +
      '.bar .msg{max-width:70ch}' +
      /* botón flotante lateral */
      '.fab{position:fixed;bottom:18px;z-index:2147483000;background:var(--p);color:var(--pt);border:0;' +
      'border-radius:999px;padding:12px 18px;font-size:14px;font-weight:700;cursor:pointer;' +
      'box-shadow:0 6px 20px rgba(0,0,0,.28);display:flex;gap:8px;align-items:center;' +
      'max-width:calc(100vw - 24px);animation:dvzla-fade-in .35s ease both}' +
      '.fab.right{right:18px}.fab.left{left:18px}' +
      /* botón CTA / cierre */
      '.cta{background:var(--pt);color:var(--p);border:0;border-radius:8px;padding:9px 16px;font-size:14px;' +
      'font-weight:700;cursor:pointer;white-space:nowrap}' +
      '.x{position:absolute;top:6px;right:8px;background:transparent;border:0;color:inherit;font-size:22px;' +
      'line-height:1;cursor:pointer;opacity:.85;padding:6px}' +
      '.x:hover{opacity:1}' +
      /* overlay + modal */
      '.overlay{position:fixed;inset:0;z-index:2147483001;background:rgba(15,23,42,.55);' +
      'display:flex;align-items:flex-end;justify-content:center;padding:0;animation:dvzla-fade-in .2s ease both}' +
      '.overlay.closing{animation:dvzla-fade-out .22s ease forwards}' +
      '@media(min-width:640px){.overlay{align-items:center;padding:24px}}' +
      '.modal{background:#fff;width:100%;max-width:620px;max-height:90vh;overflow:auto;border-radius:18px 18px 0 0;' +
      'position:relative;box-shadow:0 20px 60px rgba(0,0,0,.35);-webkit-overflow-scrolling:touch;' +
      'animation:dvzla-sheet-in .3s cubic-bezier(.2,.8,.2,1) both}' +
      '.overlay.closing .modal{animation:dvzla-sheet-out .22s ease forwards}' +
      '@media(min-width:640px){.modal{border-radius:16px}}' +
      '.hd{background:var(--p);color:var(--pt);padding:20px 46px 18px 20px}' +
      '.hd h2{margin:0;font-size:20px;line-height:1.25;display:flex;align-items:center}' +
      '.hd p{margin:6px 0 0;font-size:14px;opacity:.95}' +
      '.body{padding:16px 20px 8px}' +
      '.disc{font-size:12px;color:#6b7280;background:#f9fafb;border:1px solid #eef0f3;border-radius:10px;' +
      'padding:10px 12px;margin:0 0 14px}' +
      '.cat{margin:0 0 18px}' +
      '.cat h3{font-size:13px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280;margin:0 0 8px}' +
      '.org{border:1px solid #e5e7eb;border-radius:12px;padding:12px 14px;margin:0 0 10px;display:flex;' +
      'gap:12px;align-items:flex-start;justify-content:space-between}' +
      '.org .info{min-width:0}' +
      '.org .name{font-weight:700;font-size:15px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
      '.org .desc{font-size:13px;color:#4b5563;margin:4px 0 0}' +
      '.org .meta{font-size:11px;color:#9ca3af;margin:6px 0 0;display:flex;gap:10px;flex-wrap:wrap}' +
      '.org .meta a{color:#9ca3af}' +
      '.badge{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;padding:2px 7px;' +
      'border-radius:999px;background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;white-space:nowrap}' +
      '.badge.warn{background:#fffbeb;color:#b45309;border-color:#fcd34d}' +
      '.go{background:var(--p);color:var(--pt);border:0;border-radius:8px;padding:10px 16px;font-size:13px;' +
      'font-weight:700;cursor:pointer;text-decoration:none;white-space:nowrap;display:inline-block;text-align:center}' +
      '.more{display:block;text-align:center;background:transparent;color:var(--p);border:1.5px solid var(--p);' +
      'border-radius:10px;padding:12px 16px;font-size:14px;font-weight:700;text-decoration:none;margin:2px 0 14px}' +
      '.more:hover{background:var(--p);color:var(--pt)}' +
      '.ft{padding:6px 20px 20px;font-size:12px;color:#6b7280;display:flex;gap:14px;flex-wrap:wrap;' +
      'align-items:center;justify-content:space-between}' +
      '.ft a{color:var(--p);text-decoration:none;font-weight:600}' +
      '.err{padding:16px 20px;font-size:14px;color:#4b5563}' +
      /* responsive móvil */
      '@media(max-width:480px){' +
      '.bar{flex-direction:column;gap:10px;padding:14px 42px 16px 16px;text-align:center}' +
      '.bar .msg{font-size:13px;max-width:none}' +
      '.cta{width:100%;max-width:320px}' +
      '.fab{padding:11px 16px;font-size:13px}' +
      '.hd{padding:18px 44px 16px 18px}.hd h2{font-size:18px}.hd p{font-size:13px}' +
      '.body{padding:14px 16px 6px}' +
      '.org{flex-direction:column;align-items:stretch;gap:10px}' +
      '.go{width:100%}' +
      '.ft{flex-direction:column;align-items:flex-start;gap:8px;padding:6px 16px 18px}' +
      '}' +
      /* accesibilidad: reduce el movimiento si el usuario lo pide */
      '@media(prefers-reduced-motion:reduce){' +
      '.bar,.fab,.overlay,.modal,.bar.closing,.overlay.closing,.overlay.closing .modal{animation-duration:.001s}' +
      '}' +
      /* modo inline: sin overlay ni animación */
      '.inline .overlay{position:static;background:none;padding:0;display:block;animation:none}' +
      '.inline .modal{box-shadow:none;max-height:none;border-radius:14px;border:1px solid #e5e7eb;animation:none}'
    );
  }

  /* ---------- construcción de la lista (compartida por todos los modos) ---------- */
  function buildPanel(cfg, lang, onClose, inline) {
    var meta = cfg.meta || {};
    var cats = (cfg.categories || []).filter(function (c) {
      return !opts.categories.length || opts.categories.indexOf(c.id) !== -1;
    });

    var head = el('div', { class: 'hd' }, [
      inline ? null : el('button', { class: 'x', 'aria-label': lang === 'en' ? 'Close' : 'Cerrar', text: '×', onclick: onClose }),
      el('h2', {}, [flagNode(), document.createTextNode(t(meta.eventTitle, lang) || 'Ayuda para Venezuela')]),
      meta.eventSubtitle ? el('p', { text: t(meta.eventSubtitle, lang) }) : null
    ]);

    var body = el('div', { class: 'body' }, [
      meta.disclaimer ? el('p', { class: 'disc', text: t(meta.disclaimer, lang) }) : null
    ]);

    cats.forEach(function (cat) {
      var orgs = (cfg.organizations || []).filter(function (o) {
        return o.categoryId === cat.id &&
          (!opts.orgs.length || opts.orgs.indexOf(o.id) !== -1); // allowlist opcional
      });
      if (!orgs.length) return;
      var section = el('div', { class: 'cat' }, [
        el('h3', { text: (cat.icon ? cat.icon + ' ' : '') + t(cat.label, lang) })
      ]);
      orgs.forEach(function (o) {
        var meta2 = [];
        if (o.region) meta2.push(el('span', { text: o.region }));
        if (o.verifiedSource) {
          meta2.push(el('a', { href: o.verifiedSource, target: '_blank', rel: 'noopener noreferrer',
            text: lang === 'en' ? 'source' : 'fuente' }));
        }
        var badge = o.verified
          ? el('span', { class: 'badge', text: lang === 'en' ? 'Verified' : 'Verificado' })
          : el('span', { class: 'badge warn', text: lang === 'en' ? 'Unverified' : 'Sin verificar' });

        section.appendChild(el('div', { class: 'org' }, [
          el('div', { class: 'info' }, [
            el('div', { class: 'name' }, [document.createTextNode(o.name || ''), badge]),
            o.description ? el('div', { class: 'desc', text: t(o.description, lang) }) : null,
            meta2.length ? el('div', { class: 'meta' }, meta2) : null
          ]),
          el('a', {
            class: 'go', href: o.url || '#', target: '_blank', rel: 'noopener noreferrer',
            text: lang === 'en' ? 'Donate' : 'Donar'
          })
        ]));
      });
      body.appendChild(section);
    });

    // Botón "Ver más": lleva a la landing con el listado completo.
    // Solo en popup/franja; en modo inline ya se ve la lista completa.
    if (!inline && meta.fullPageUrl) {
      body.appendChild(el('a', {
        class: 'more', href: meta.fullPageUrl, target: '_blank', rel: 'noopener',
        text: lang === 'en' ? 'See more organizations →' : 'Ver más organizaciones →'
      }));
    }

    var ftLinks = [];
    if (meta.reportUrl) {
      ftLinks.push(el('a', { href: meta.reportUrl,
        text: lang === 'en' ? 'Report a problem' : 'Reportar un problema' }));
    }
    var ft = el('div', { class: 'ft' }, [
      el('span', { text: (lang === 'en' ? 'Updated: ' : 'Actualizado: ') + (cfg.lastUpdated || '') }),
      el('span', {}, ftLinks)
    ]);

    return el('div', { class: 'modal' + (inline ? ' inline-modal' : ''), role: inline ? null : 'dialog',
      'aria-modal': inline ? null : 'true', 'aria-label': t(meta.eventTitle, lang) }, [head, body, ft]);
  }

  /* ---------- overlay modal con focus-trap ---------- */
  function openModal(root, cfg, lang, preview) {
    if (root.querySelector('.overlay')) return;
    var lastFocus = document.activeElement;
    var overlay = el('div', { class: 'overlay' });
    var modal;

    var closing = false;
    function close() {
      if (closing) return;
      closing = true;
      document.removeEventListener('keydown', onKey, true);
      if (!preview) markDismissed();
      overlay.classList.add('closing');
      setTimeout(function () { overlay.remove(); }, 240);
      try { lastFocus && lastFocus.focus && lastFocus.focus(); } catch (e) {}
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') {
        var f = modal.querySelectorAll('a[href],button,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    modal = buildPanel(cfg, lang, close, false);
    overlay.appendChild(modal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey, true);
    root.appendChild(overlay);
    var focusable = modal.querySelector('a[href],button');
    if (focusable) focusable.focus();
    return close;
  }

  /* ---------- render principal ---------- */
  function render(cfg) {
    var ui = cfg.ui || {};
    var theme = ui.theme || {};
    var lang = opts.lang || ui.defaultLang || 'es';
    var mode = opts.mode || ui.defaultMode || 'bar';
    var primary = opts.primary || theme.primary || '#7c3aed';
    var primaryText = theme.primaryText || '#ffffff';
    var accent = theme.accent || '#f59e0b';
    var meta = cfg.meta || {};
    var preview = !!opts.preview; // vista previa: ignora y no persiste el "descartado"

    // Ubicación de montaje (inline: dentro del target; resto: en body).
    var target = mode === 'inline'
      ? ((opts.target ? document.querySelector(opts.target) : null) || document.body)
      : document.body;

    // Evita instancias apiladas: elimina las anteriores que chocarían con esta.
    //  - inline: solo las que ya están dentro de este mismo contenedor.
    //  - franja/botón/popup: son únicas (singleton global).
    // Así un re-montaje (p. ej. cambiar idioma) reemplaza en lugar de acumular,
    // y no toca otro contenido de la página.
    for (var i = HOSTS.length - 1; i >= 0; i--) {
      var h = HOSTS[i];
      var conflict = (mode === 'inline') ? (h.parentNode === target) : (h.__dvzlaMode !== 'inline');
      if (conflict) { try { h.remove(); } catch (e) {} HOSTS.splice(i, 1); }
    }

    // Montamos sobre un <div> fresco (attachShadow solo puede llamarse una vez por elemento).
    var host = el('div');
    host.setAttribute('data-dvzla-host', '');
    host.__dvzlaMode = mode;
    target.appendChild(host);
    HOSTS.push(host);

    var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
    root.appendChild(el('style', { text: styles(primary, primaryText, accent) }));
    var wrap = el('div', { class: 'wrap' + (mode === 'inline' ? ' inline' : '') });
    root.appendChild(wrap);

    // API pública para abrir/cerrar desde fuera (usado por el plugin WP o botones propios)
    window.DonacionesVzla = window.DonacionesVzla || {};
    window.DonacionesVzla.open = function () { openModal(wrap, cfg, lang, preview); };
    window.DonacionesVzla.close = function () {
      var o = wrap.querySelector('.overlay'); if (o) o.remove();
    };
    window.DonacionesVzla.destroy = function () {
      HOSTS.forEach(function (h) { try { h.remove(); } catch (e) {} });
      HOSTS.length = 0;
    };

    if (mode === 'inline') {
      wrap.appendChild(el('div', { class: 'overlay' }, [buildPanel(cfg, lang, null, true)]));
      return;
    }

    if (mode === 'popup') {
      if (preview || !isDismissed(ui.reshowAfterDays)) openModal(wrap, cfg, lang, preview);
      return;
    }

    if (!preview && isDismissed(ui.reshowAfterDays)) return;

    if (mode === 'button') {
      wrap.appendChild(el('button', {
        class: 'fab ' + (opts.position === 'left' ? 'left' : 'right'),
        onclick: function () { openModal(wrap, cfg, lang, preview); }
      }, [flagNode(), document.createTextNode(t(meta.ctaLabel, lang) || (lang === 'en' ? 'Help' : 'Ayudar'))]));
      return;
    }

    // mode === 'bar' (por defecto)
    var bar = el('div', { class: 'bar', role: 'region', 'aria-label': t(meta.eventTitle, lang) }, [
      el('span', { class: 'msg' }, [
        flagNode(),
        el('b', { text: t(meta.eventTitle, lang) + ' ' }),
        document.createTextNode(t(meta.eventSubtitle, lang))
      ]),
      el('button', { class: 'cta',
        text: t(meta.ctaLabel, lang) || (lang === 'en' ? 'See how to help' : 'Ver cómo ayudar'),
        onclick: function () { openModal(wrap, cfg, lang, preview); } }),
      el('button', { class: 'x', 'aria-label': lang === 'en' ? 'Close' : 'Cerrar', text: '×',
        onclick: function () {
          bar.classList.add('closing');
          setTimeout(function () { bar.remove(); }, 260);
          if (!preview) markDismissed();
        } })
    ]);
    wrap.appendChild(bar);
  }

  /* ---------- fallback si falla la carga del contenido ---------- *
   * Reutiliza render() con un config mínimo: así respeta el modo (franja/inline/…)
   * y la limpieza de instancias, y nunca se apila.                              */
  var FALLBACK_CONFIG = {
    lastUpdated: '',
    meta: {
      eventTitle: { es: 'Cada aporte suma', en: 'Every bit counts' },
      eventSubtitle: {
        es: 'No pudimos cargar la lista ahora. Abre la página completa para ver cómo apoyar a Venezuela.',
        en: 'We could not load the list right now. Open the full page to see how to support Venezuela.'
      },
      ctaLabel: { es: 'Ver cómo ayudar', en: 'See how to help' },
      fullPageUrl: 'https://donacionesvzla.vzla.workers.dev/donar.html'
    },
    categories: [],
    organizations: [],
    ui: { defaultMode: 'bar', reshowAfterDays: 0 }
  };
  function renderFallback() {
    try { render(FALLBACK_CONFIG); } catch (e) { if (window.console) console.warn('[DonacionesVzla]', e); }
  }

  /* ---------- arranque ---------- */
  function boot() {
    if (opts.mode === 'manual') {
      window.DonacionesVzla = window.DonacionesVzla || {};
      window.DonacionesVzla.mount = function (o) { Object.assign(opts, o || {}); start(); };
      return;
    }
    start();
  }
  function start() {
    // Datos en línea (p. ej. vista previa): renderiza sin red.
    if (opts.data && typeof opts.data === 'object') {
      try { render(opts.data); } catch (e) { if (window.console) console.warn('[DonacionesVzla]', e); renderFallback(); }
      return;
    }
    fetch(opts.configUrl, { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(render)
      .catch(function (e) { if (window.console) console.warn('[DonacionesVzla]', e); renderFallback(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
