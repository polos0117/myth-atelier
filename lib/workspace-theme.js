/* Shared appearance only. Character settings and prompt generation stay independent. */
(function () {
  'use strict';
  var root = document.documentElement;
  /* 테마는 공방마다 따로 — 다섯 공방이 한 주소(polos0117.github.io) 아래라 localStorage 를 같이 쓴다.
     예전엔 모두 atelier_theme_v1 하나라 한 공방에서 고르면 다른 공방 테마가 바뀌거나(이름이 다르면) 기본으로 되돌아갔다(2026-10-21).
     처음 한 번만 옛 열쇠의 값이 이 공방 테마이면 옮겨 온다. 옛 열쇠는 지우지 않는다(다른 공방도 한 번씩 옮겨 간다). 밀도는 함께 쓴다 */
  var keys = { theme: 'myth_theme_v1', density: 'atelier_density_v1' };
  var LEGACY_THEME = 'atelier_theme_v1';
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
    var value, old;
    try {
      value = localStorage.getItem(keys[key]);
      if (value === null && key === 'theme') {
        old = localStorage.getItem(LEGACY_THEME);
        if (old && themeColors[old]) { value = old; localStorage.setItem(keys[key], old); }
      }
    } catch (e) {}
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
