/*!
 * i18n de páginas — sin build, sin dependencias.
 * Estrategia de velocidad: el español va INLINE en el HTML (cero parpadeo y
 * funciona aunque falle el JS). Solo se descarga el idioma activo cuando NO es
 * español, desde i18n/<lang>.json (un archivo pequeño, cacheado por el CDN).
 *
 * Uso en el HTML:
 *   <html lang="es"> ... <script src="i18n.js" defer></script>
 *   <h1 data-i18n="hero.h1">Texto en español</h1>            (reemplaza textContent)
 *   <p  data-i18n-html="hero.p">Texto con <b>negritas</b></p> (reemplaza innerHTML)
 *   <meta data-i18n-attr="content:meta.desc" ...>            (reemplaza atributos)
 *   <div data-lang-switcher></div>                            (selector de idioma auto)
 *
 * Cambiar de idioma:   window.DVI18n.set('pt')
 * Evento al cambiar:   document.addEventListener('dv-langchange', e => e.detail.lang)
 */
(function () {
  'use strict';

  var SUPPORTED = ['es', 'en', 'pt', 'fr', 'it', 'de'];
  var DEFAULT = 'es';               // idioma base ya incrustado en el HTML
  var STORE = 'dvzla_lang';
  var NAMES = { es: 'Español', en: 'English', pt: 'Português', fr: 'Français', it: 'Italiano', de: 'Deutsch' };
  var current = DEFAULT;

  function normalize(code) {
    code = (code || '').slice(0, 2).toLowerCase();
    return SUPPORTED.indexOf(code) !== -1 ? code : null;
  }

  function detect() {
    var q = new URLSearchParams(location.search).get('lang');
    var saved = null;
    try { saved = localStorage.getItem(STORE); } catch (e) {}
    return normalize(q) || normalize(saved) || normalize(navigator.language) || DEFAULT;
  }

  function applyDict(dict) {
    document.querySelectorAll('[data-i18n]').forEach(function (n) {
      var v = dict[n.getAttribute('data-i18n')];
      if (v != null) n.textContent = v;
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (n) {
      var v = dict[n.getAttribute('data-i18n-html')];
      if (v != null) n.innerHTML = v;
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(function (n) {
      n.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var kv = pair.split(':');
        var attr = (kv[0] || '').trim(), key = (kv[1] || '').trim();
        if (attr && key && dict[key] != null) n.setAttribute(attr, dict[key]);
      });
    });
  }

  function renderSwitchers() {
    document.querySelectorAll('[data-lang-switcher]').forEach(function (box) {
      box.innerHTML = '';
      SUPPORTED.forEach(function (code) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'dv-lang-btn' + (code === current ? ' on' : '');
        b.setAttribute('data-lang-code', code);
        b.setAttribute('aria-pressed', code === current ? 'true' : 'false');
        b.textContent = NAMES[code];
        b.addEventListener('click', function () { set(code); });
        box.appendChild(b);
      });
    });
  }

  function markSwitchers() {
    document.querySelectorAll('.dv-lang-btn').forEach(function (b) {
      var on = b.getAttribute('data-lang-code') === current;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  var dicts = {};   // caché de diccionarios por idioma (incluye el español capturado del HTML)

  // Guarda el contenido español original del HTML para poder RESTAURARLO al volver a "es".
  function captureBase() {
    var d = {};
    document.querySelectorAll('[data-i18n]').forEach(function (n) { d[n.getAttribute('data-i18n')] = n.textContent; });
    document.querySelectorAll('[data-i18n-html]').forEach(function (n) { d[n.getAttribute('data-i18n-html')] = n.innerHTML; });
    document.querySelectorAll('[data-i18n-attr]').forEach(function (n) {
      n.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var kv = pair.split(':'), attr = (kv[0] || '').trim(), key = (kv[1] || '').trim();
        if (attr && key) d[key] = n.getAttribute(attr);
      });
    });
    dicts[DEFAULT] = d;
  }

  function set(lang, opts) {
    lang = normalize(lang) || DEFAULT;
    current = lang;
    if (!(opts && opts.silent)) { try { localStorage.setItem(STORE, lang); } catch (e) {} }
    document.documentElement.setAttribute('lang', lang);
    markSwitchers();

    function finish(dict) {
      if (dict) applyDict(dict);
      document.dispatchEvent(new CustomEvent('dv-langchange', { detail: { lang: lang } }));
    }

    // El español (y cualquier idioma ya cargado) se aplica desde la caché → restaura al volver.
    if (dicts[lang]) { finish(dicts[lang]); return; }
    fetch('i18n/' + lang + '.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (dict) { dicts[lang] = dict; finish(dict); })
      .catch(function () { finish(null); /* si falla, se queda el idioma actual */ });
  }

  window.DVI18n = {
    supported: SUPPORTED,
    names: NAMES,
    current: function () { return current; },
    set: set
  };

  function boot() {
    captureBase();          // snapshot del español ANTES de traducir
    renderSwitchers();
    set(detect(), { silent: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
