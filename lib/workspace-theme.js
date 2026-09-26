/* Shared appearance only. Character settings and prompt generation stay independent. */
(function () {
  'use strict';
  var root = document.documentElement;
  var keys = { theme: 'atelier_theme_v1', density: 'atelier_density_v1' };
  var themeColors = {"midnight":"#141b2c","daylight":"#f9f6ef","blossom":"#fcf5f5","moss":"#15221b","plum":"#1f1536","sand":"#fbf3e3","deep":"#0b2c36","ember":"#1e1614","stone":"#172226","dancheong":"#161b29","nile":"#1e1829","lapis":"#151a3d","pantheon":"#121016"};
  var viewportFrame = 0;
  function fitVisibleViewport() {
    if (viewportFrame) cancelAnimationFrame(viewportFrame);
    viewportFrame = requestAnimationFrame(function () {
      viewportFrame = 0;
      var viewport = window.visualViewport;
      var height = viewport && viewport.height ? viewport.height : window.innerHeight;
      if (height) root.style.setProperty('--atelier-vh', Math.round(height * 100) / 100 + 'px');
    });
  }
  function normalize(key, value) {
    return key === 'theme' ? (themeColors[value] ? value : 'pantheon')
      : (value === 'relaxed' ? value : 'compact');
  }
  function apply(key, value) {
    root.dataset[key] = normalize(key, value);
    if (key === 'theme') {
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.content = themeColors[root.dataset.theme];
    }
  }
  function read(key) {
    var value;
    try { value = localStorage.getItem(keys[key]); } catch (e) {}
    apply(key, value);
  }
  Object.keys(keys).forEach(read);
  fitVisibleViewport();
  window.addEventListener('resize', fitVisibleViewport, { passive: true });
  window.addEventListener('orientationchange', fitVisibleViewport, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', fitVisibleViewport, { passive: true });
    window.visualViewport.addEventListener('scroll', fitVisibleViewport, { passive: true });
  }
  window.AtelierAppearance = {
    themes: Object.freeze(Object.keys(themeColors)),
    get: function () { return { theme: root.dataset.theme, density: root.dataset.density }; },
    set: function (key, value) {
      if (!keys[key]) return;
      apply(key, value);
      try { localStorage.setItem(keys[key], root.dataset[key]); } catch (e) {}
      window.dispatchEvent(new Event('atelier-appearance'));
    }
  };
  window.addEventListener('storage', function (event) {
    Object.keys(keys).forEach(function (key) {
      if (event.key === keys[key] || event.key === null) read(key);
    });
    window.dispatchEvent(new Event('atelier-appearance'));
  });
})();
