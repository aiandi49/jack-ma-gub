(function () {
  'use strict';
  var root = document.documentElement;
  var SIZE_NAMES = { sm: 'small', md: 'medium', lg: 'large', xl: 'extra large' };

  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* storage blocked: keep working without saving */ }
  }

  function syncTheme() {
    var dark = root.getAttribute('data-theme') === 'dark';
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      b.setAttribute('aria-pressed', dark ? 'true' : 'false');
      b.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      var label = b.querySelector('.theme-text');
      if (label) label.textContent = dark ? 'Light' : 'Dark';
    }
  }

  function syncSize() {
    var current = root.getAttribute('data-font-size') || 'md';
    var buttons = document.querySelectorAll('[data-font-size-set]');
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      var size = b.getAttribute('data-font-size-set');
      var on = size === current;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('aria-label', 'Text size ' + SIZE_NAMES[size] + (on ? ', selected' : ''));
    }
  }

  document.addEventListener('click', function (event) {
    var themeBtn = event.target.closest('[data-theme-toggle]');
    if (themeBtn) {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      save('pref-theme', next);
      syncTheme();
      return;
    }
    var sizeBtn = event.target.closest('[data-font-size-set]');
    if (sizeBtn) {
      var size = sizeBtn.getAttribute('data-font-size-set');
      if (!SIZE_NAMES[size]) return;
      root.setAttribute('data-font-size', size);
      save('pref-font-size', size);
      syncSize();
    }
  });

  syncTheme();
  syncSize();
})();
