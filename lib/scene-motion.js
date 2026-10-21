/* scene-motion.js — version 1 (2026-10-21)
   Cinematic motion built from still images: Ken Burns, particle overlays, the form -> open "reveal" and plain page turns.
   Shared by the four ateliers. COPY THIS FILE AND lib/scene-motion.css VERBATIM — never edit one copy alone.
   Change the version line above (and in the css) when you change either file, then copy both everywhere.
   No dependencies, no build. Attaches window.AtelierMotion. Nothing here knows about books, monsters or robots:
   callers pass the element, the image source, the seed and the particle kind.
   Contract and kind list: docs/SCENE_MOTION.md.

   Rules this file keeps:
   - prefers-reduced-motion wins: no Ken Burns, no ambient particles, transitions become a fast fade.
   - Per-browser switch in localStorage "atelier_motion_v1" = "on" | "off" (shared by every atelier, default on).
   - DOM animation is transform/opacity (plus a composited clip-path iris on reveal). Particles: one canvas,
     one requestAnimationFrame loop per canvas, sizes cached by ResizeObserver — no layout reads inside the loop.
   - A new transition on the same key cancels the running one (its promise resolves with {cancelled: true}). */
(function (root) {
  'use strict';
  var VERSION = 1, KEY = 'atelier_motion_v1';
  var doc = root.document;
  var live = [];            /* controllers that follow the switch (Ken Burns, ambient particles) */
  var listeners = [];
  var runs = {};            /* key -> running transition */
  var kbOf = typeof WeakMap === 'function' ? new WeakMap() : null;

  /* ---------- switch ---------- */
  function reduced() {
    try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  function stored() {
    try { var v = root.localStorage.getItem(KEY); return v === 'on' || v === 'off' ? v : null; } catch (e) { return null; }
  }
  function enabled() { return !reduced() && stored() !== 'off'; }
  function notify() {
    var on = enabled();
    if (!on) cancel();      /* switching off mid-transition shows the new picture at once */
    live = live.filter(function (c) { return !c.dead; });
    live.slice().forEach(function (c) { c.sync(); });
    listeners.slice().forEach(function (fn) { try { fn(on); } catch (e) {} });
  }
  function setEnabled(on) {
    try { root.localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {}
    notify();
  }
  function subscribe(fn) {
    listeners.push(fn);
    return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
  }
  if (doc && root.addEventListener) {
    root.addEventListener('storage', function (e) { if (!e || e.key === KEY || e.key === null) notify(); });
    try {
      var mq = root.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq.addEventListener) mq.addEventListener('change', notify); else if (mq.addListener) mq.addListener(notify);
    } catch (e) {}
  }

  /* ---------- small helpers ---------- */
  function hash(s) {
    var h = 2166136261; s = String(s == null ? '' : s);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = seed >>> 0 || 1;
    return function () { a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function between(r, pair) { return pair[0] + r() * (pair[1] - pair[0]); }
  function imgIn(el) { return !el ? null : el.tagName === 'IMG' ? el : el.querySelector && el.querySelector('img'); }
  function cssURL(src) { return 'url("' + String(src).replace(/["\\\n\r]/g, function (c) { return encodeURIComponent(c); }) + '")'; }
  function noop() {}
  /* Absolute box over `ref`, inside `parent` (default: ref's parent). Placed against the box's real containing block */
  function cover(div, ref, parent, before) {
    var host = parent || ref.parentNode;
    div.style.position = 'absolute';
    div.style.left = '0px'; div.style.top = '0px';
    if (before && host === ref.parentNode) host.insertBefore(div, ref); else host.appendChild(div);
    var cb = div.offsetParent || doc.body, a = ref.getBoundingClientRect(), b = cb.getBoundingClientRect();
    div.style.left = (a.left - b.left - (cb.clientLeft || 0) + (cb.scrollLeft || 0)) + 'px';
    div.style.top = (a.top - b.top - (cb.clientTop || 0) + (cb.scrollTop || 0)) + 'px';
    div.style.width = a.width + 'px'; div.style.height = a.height + 'px';
    return div;
  }
  /* Half-diagonal of the picture as drawn inside el (object-fit contain/cover/fill), so an iris of this radius shows it whole */
  function drawnRadius(el, box) {
    var img = imgIn(el), w = box.width, h = box.height;
    if (img && img.naturalWidth && img.naturalHeight) {
      var fit = 'fill'; try { fit = root.getComputedStyle(img).objectFit; } catch (e) {}
      var ib = img === el ? box : img.getBoundingClientRect(), iw = ib.width || w, ih = ib.height || h;
      if (fit === 'contain' || fit === 'scale-down') { var s = Math.min(iw / img.naturalWidth, ih / img.naturalHeight); w = Math.min(w, img.naturalWidth * s); h = Math.min(h, img.naturalHeight * s); }
    }
    return Math.max(4, Math.sqrt(w * w + h * h) / 2 + 2);
  }
  function ready(el, ms) {
    var img = imgIn(el);
    if (!img || !img.getAttribute('src')) return Promise.resolve();
    return new Promise(function (ok) {
      var done = false, finish = function () { if (done) return; done = true; clearTimeout(t); ok(); };
      var t = setTimeout(finish, ms);
      if (img.complete && img.naturalWidth) { (img.decode ? img.decode() : Promise.resolve()).then(finish, finish); return; }
      img.addEventListener('load', function () { (img.decode ? img.decode() : Promise.resolve()).then(finish, finish); }, { once: true });
      img.addEventListener('error', finish, { once: true });
    });
  }

  /* ---------- Ken Burns ---------- */
  /* kenBurns(el, {seed, duration, zoom, pan, startScale}) — a very slow push/pan. The seed (usually the image file)
     fixes direction and pace, so the same picture always drifts the same way. Returns {pause, resume, stop, running} */
  function kenBurns(el, opts) {
    opts = opts || {};
    if (!el) return { pause: noop, resume: noop, stop: noop, running: false };
    stop(el);
    var r = rng(hash(opts.seed != null ? opts.seed : (el.currentSrc || el.src || el.className || '')));
    var dur = opts.duration || Math.round(12000 + r() * 8000);
    var ang = Math.floor(r() * 8) * Math.PI / 4 + (r() - 0.5) * 0.5;
    var pan = opts.pan != null ? opts.pan : 2.2, zoom = opts.zoom != null ? opts.zoom : 0.07;
    var s0 = opts.startScale || 1, s1 = s0 + zoom;
    var a = 'scale(' + s0 + ') translate(0%, 0%)';
    var b = 'scale(' + s1.toFixed(3) + ') translate(' + (Math.cos(ang) * pan).toFixed(2) + '%, ' + (Math.sin(ang) * pan).toFixed(2) + '%)';
    if (!opts.startScale && r() < 0.35) { var t = a; a = b; b = t; }      /* some pictures pull back instead */
    var c = { kind: 'kenburns', el: el, anim: null, paused: false, dead: false };
    c.sync = function () {
      if (c.dead) return;
      if (!el.isConnected && c.started) { c.stop(); return; }
      if (enabled()) {
        if (!c.anim && el.animate) {
          c.anim = el.animate([{ transform: a }, { transform: b }], { duration: dur, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
          if (c.paused) c.anim.pause();
        }
      } else if (c.anim) { c.anim.cancel(); c.anim = null; }
      c.started = true;
    };
    c.pause = function () { c.paused = true; if (c.anim) c.anim.pause(); };
    c.resume = function () { c.paused = false; if (c.anim) c.anim.play(); };
    c.stop = function () { c.dead = true; if (c.anim) c.anim.cancel(); c.anim = null; if (kbOf && kbOf.get(el) === c) kbOf.delete(el); };
    Object.defineProperty(c, 'running', { get: function () { return !!c.anim && !c.paused; } });
    if (kbOf) kbOf.set(el, c);
    live.push(c); c.sync();
    return c;
  }
  function stop(el) { var c = el && kbOf && kbOf.get(el); if (c) c.stop(); }

  /* ---------- particles ---------- */
  /* Sprite for glowing dots — drawn once per colour, then stamped with drawImage */
  var sprites = {};
  function glow(color) {
    if (sprites[color]) return sprites[color];
    var s = doc.createElement('canvas'); s.width = s.height = 32;
    var g = s.getContext('2d'), grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    /* fade to the same colour at zero alpha — fading to transparent black leaves a dark ring */
    var n = parseInt(color.slice(1), 16), clear = 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',0)';
    grd.addColorStop(0, color); grd.addColorStop(0.3, color); grd.addColorStop(1, clear);
    g.globalAlpha = 1; g.fillStyle = grd; g.fillRect(0, 0, 32, 32);
    /* soften the core so it reads as light, not a disc */
    var c2 = g.createRadialGradient(16, 16, 0, 16, 16, 16); c2.addColorStop(0, 'rgba(255,255,255,0.9)'); c2.addColorStop(0.25, 'rgba(255,255,255,0)');
    g.fillStyle = c2; g.fillRect(0, 0, 32, 32);
    return (sprites[color] = s);
  }
  var softWhite = null;
  function mistSprite() {
    if (softWhite) return softWhite;
    var s = doc.createElement('canvas'); s.width = s.height = 128;
    var g = s.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(236,240,246,0.9)'); grd.addColorStop(0.5, 'rgba(226,232,240,0.45)'); grd.addColorStop(1, 'rgba(220,226,236,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    return (softWhite = s);
  }
  /* Shapes. ctx already holds the canvas scale k (css px -> backing px). Each sets its own transform */
  function at(ctx, k, p, sx, sy) {
    var c = Math.cos(p.r), s = Math.sin(p.r);
    ctx.setTransform(k * c * sx, k * s * sx, -k * s * sy, k * c * sy, k * p.x, k * p.y);
  }
  function dot(ctx, k, p, spec, scale) {
    var spr = glow(spec.colors[p.c]), r = p.s * (scale || 3);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.drawImage(spr, p.x - r, p.y - r, r * 2, r * 2);
  }
  function sparkle(ctx, k, p, color, len) {
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.strokeStyle = color; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(p.x - len, p.y); ctx.lineTo(p.x + len, p.y); ctx.moveTo(p.x, p.y - len); ctx.lineTo(p.x, p.y + len); ctx.stroke();
  }
  var D = {
    petal: function (ctx, k, p, spec) {
      at(ctx, k, p, 1, 0.45 + 0.55 * Math.abs(Math.sin(p.ph)));
      ctx.fillStyle = spec.colors[p.c];
      ctx.beginPath(); ctx.moveTo(-p.s, 0); ctx.quadraticCurveTo(0, -p.s * 0.75, p.s, 0); ctx.quadraticCurveTo(0, p.s * 0.75, -p.s, 0); ctx.fill();
    },
    leaf: function (ctx, k, p, spec) {
      at(ctx, k, p, 0.35 + 0.65 * Math.abs(Math.cos(p.ph)), 1);
      ctx.fillStyle = spec.colors[p.c];
      ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.quadraticCurveTo(p.s * 0.7, 0, 0, p.s); ctx.quadraticCurveTo(-p.s * 0.7, 0, 0, -p.s); ctx.fill();
      ctx.strokeStyle = 'rgba(40,30,10,0.35)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.lineTo(0, p.s * 1.25); ctx.stroke();
    },
    flake: function (ctx, k, p, spec) {
      at(ctx, k, p, 1, 0.5 + 0.5 * Math.abs(Math.sin(p.ph)));
      ctx.fillStyle = spec.colors[p.c];
      ctx.fillRect(-p.s / 2, -p.s * 0.3, p.s, p.s * 0.6);
    },
    paper: function (ctx, k, p, spec) {
      at(ctx, k, p, 0.15 + 0.85 * Math.abs(Math.cos(p.ph)), 1);
      ctx.fillStyle = spec.colors[p.c]; ctx.fillRect(-p.s / 2, -p.s * 0.65, p.s, p.s * 1.3);
      ctx.strokeStyle = 'rgba(60,45,25,0.35)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(-p.s * 0.3, -p.s * 0.3); ctx.lineTo(p.s * 0.3, -p.s * 0.3); ctx.moveTo(-p.s * 0.3, 0); ctx.lineTo(p.s * 0.25, 0); ctx.moveTo(-p.s * 0.3, p.s * 0.3); ctx.lineTo(p.s * 0.2, p.s * 0.3); ctx.stroke();
    },
    card: function (ctx, k, p, spec) {
      at(ctx, k, p, 0.15 + 0.85 * Math.abs(Math.cos(p.ph)), 1);
      ctx.fillStyle = '#fbf8f1'; ctx.fillRect(-p.s / 2, -p.s * 0.7, p.s, p.s * 1.4);
      ctx.strokeStyle = 'rgba(30,20,20,0.45)'; ctx.lineWidth = 0.6; ctx.strokeRect(-p.s / 2, -p.s * 0.7, p.s, p.s * 1.4);
      ctx.fillStyle = spec.colors[p.c];
      ctx.beginPath(); ctx.moveTo(0, -p.s * 0.28); ctx.lineTo(p.s * 0.22, 0); ctx.lineTo(0, p.s * 0.28); ctx.lineTo(-p.s * 0.22, 0); ctx.fill();
    },
    bubble: function (ctx, k, p, spec) {
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.strokeStyle = spec.colors[p.c]; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.arc(p.x - p.s * 0.35, p.y - p.s * 0.35, p.s * 0.22, 0, Math.PI * 2); ctx.fill();
    },
    streak: function (ctx, k, p, spec) {
      ctx.setTransform(k, 0, 0, k, 0, 0);
      var v = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1, l = p.s;
      ctx.strokeStyle = spec.colors[p.c]; ctx.lineWidth = spec.width || 1;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx / v * l, p.y - p.vy / v * l); ctx.stroke();
    },
    bat: function (ctx, k, p, spec) {
      var f = Math.sin(p.ph), dir = p.vx < 0 ? -1 : 1;
      at(ctx, k, p, dir, 1);
      ctx.fillStyle = spec.colors[p.c];
      var s = p.s, wy = -f * s * 0.7;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.12);
      ctx.quadraticCurveTo(-s * 0.5, wy - s * 0.2, -s, wy);
      ctx.quadraticCurveTo(-s * 0.75, wy * 0.3 + s * 0.15, -s * 0.5, s * 0.1);
      ctx.quadraticCurveTo(-s * 0.25, s * 0.05, 0, s * 0.25);
      ctx.quadraticCurveTo(s * 0.25, s * 0.05, s * 0.5, s * 0.1);
      ctx.quadraticCurveTo(s * 0.75, wy * 0.3 + s * 0.15, s, wy);
      ctx.quadraticCurveTo(s * 0.5, wy - s * 0.2, 0, -s * 0.12);
      ctx.fill();
      ctx.beginPath(); ctx.arc(0, -s * 0.05, s * 0.16, 0, Math.PI * 2); ctx.fill();
    },
    mist: function (ctx, k, p) {
      ctx.setTransform(k, 0, 0, k, 0, 0);
      var w = p.s * 2.4, h = p.s * 1.1;
      ctx.drawImage(mistSprite(), p.x - w / 2, p.y - h / 2, w, h);
    },
    glow: function (ctx, k, p, spec) { dot(ctx, k, p, spec, spec.halo || 3); },
    star: function (ctx, k, p, spec) {
      dot(ctx, k, p, spec, 2.6);
      if (p.s > 1.6 && p.tw > 0.75) sparkle(ctx, k, p, spec.colors[p.c], p.s * 3.2);
    },
    gold: function (ctx, k, p, spec) {
      dot(ctx, k, p, spec, 2.4);
      if (p.tw > 0.85) sparkle(ctx, k, p, 'rgba(255,240,190,0.9)', p.s * 3);
    }
  };
  /* Kinds. n = density (1 ~ one particle per 4 000 css px²), from = where ambient ones enter,
     life = twinkling kinds live and fade (others wrap around), g = gravity in a burst, add = light blending */
  var KINDS = {
    petals:    { n: 0.7,  size: [4, 8],     vx: [8, 30],    vy: [22, 55],   sway: 18, spin: 2.2, from: 'top',    colors: ['#f6c3cf', '#f0a3b6', '#fde3ea', '#e5859d'], draw: 'petal', g: 60, alpha: [0.75, 0.95] },
    snow:      { n: 1.3,  size: [1.1, 3],   vx: [-8, 8],    vy: [16, 42],   sway: 12, spin: 0,   from: 'top',    colors: ['#ffffff', '#eef4ff'], draw: 'glow', halo: 2.2, g: 40, alpha: [0.6, 0.95] },
    embers:    { n: 0.65, size: [1.1, 2.6], vx: [-10, 10],  vy: [-55, -20], sway: 14, spin: 0,   from: 'bottom', colors: ['#ffb347', '#ff7a2e', '#ffd27a'], draw: 'glow', halo: 3, life: [2, 5], add: true, g: -50, alpha: [0.7, 1] },
    ash:       { n: 0.9,  size: [3, 6.5],   vx: [-6, 14],   vy: [-10, 18],  sway: 10, spin: 1.2, from: 'any',    colors: ['#b8b1a6', '#e2dcd2', '#57524d'], draw: 'flake', g: 25, alpha: [0.6, 0.9] },
    bats:      { n: 0.12, size: [7, 13],    vx: [38, 85],   vy: [-12, 12],  sway: 20, spin: 0,   from: 'side',   colors: ['#17131b', '#241c27'], draw: 'bat', flap: 14, min: 3, max: 9, burstMax: 12, g: -20, alpha: [0.8, 0.95] },
    dust:      { n: 1.0,  size: [0.8, 2],   vx: [-5, 5],    vy: [-6, 3],    sway: 6,  spin: 0,   from: 'any',    colors: ['#fff4d6', '#ffe7b8'], draw: 'glow', halo: 3, life: [3, 7], add: true, g: 10, alpha: [0.25, 0.6] },
    sparks:    { n: 0.55, size: [6, 14],    vx: [-140, 140], vy: [-160, 40], sway: 0, spin: 0,   from: 'spark',  colors: ['#fff3b0', '#ffd25e', '#ffffff'], draw: 'streak', width: 1.4, life: [0.35, 0.9], add: true, g: 320, alpha: [0.8, 1] },
    bubbles:   { n: 0.45, size: [1.8, 5.5], vx: [-4, 4],    vy: [-34, -14], sway: 10, spin: 0,   from: 'bottom', colors: ['rgba(214,242,255,0.75)', 'rgba(190,230,250,0.6)'], draw: 'bubble', g: -70, alpha: [0.6, 0.9] },
    leaves:    { n: 0.32, size: [5, 9],     vx: [14, 42],   vy: [18, 48],   sway: 26, spin: 2.6, from: 'top',    colors: ['#7a9a3a', '#c0832e', '#9b5a23', '#d6a93f'], draw: 'leaf', g: 55, alpha: [0.8, 0.95] },
    pages:     { n: 0.4,  size: [6, 10],    vx: [18, 48],   vy: [-6, 24],   sway: 20, spin: 1.8, from: 'side',   colors: ['#f3ead6', '#e8dcc0', '#fffaf0'], draw: 'paper', g: 45, alpha: [0.8, 0.95] },
    cards:     { n: 0.35, size: [7, 10],    vx: [20, 55],   vy: [-8, 26],   sway: 22, spin: 2.2, from: 'side',   colors: ['#c8303a', '#222222'], draw: 'card', g: 45, alpha: [0.85, 1] },
    stars:     { n: 0.9,  size: [0.7, 2.3], vx: [-1, 1],    vy: [-1, 1],    sway: 0,  spin: 0,   from: 'any',    colors: ['#ffffff', '#dfe8ff', '#fff1c9'], draw: 'star', life: [2, 5], add: true, g: 0, alpha: [0.55, 1] },
    rain:      { n: 2.0,  size: [9, 17],    vx: [50, 90],   vy: [520, 760], sway: 0,  spin: 0,   from: 'top',    colors: ['rgba(200,220,255,0.5)', 'rgba(170,195,235,0.4)'], draw: 'streak', width: 1, g: 600, alpha: [0.6, 0.9] },
    mist:      { n: 0.05, size: [70, 160],  vx: [6, 16],    vy: [-2, 2],    sway: 3,  spin: 0,   from: 'side',   colors: ['#e8edf4'], draw: 'mist', min: 3, max: 8, burstMax: 8, g: 0, alpha: [0.12, 0.26], scaleBy: true },
    gold:      { n: 0.7,  size: [1, 2.5],   vx: [-6, 6],    vy: [-12, -2],  sway: 8,  spin: 0,   from: 'any',    colors: ['#ffd76a', '#ffe9a8', '#f2b93b'], draw: 'gold', life: [2, 5], add: true, g: 30, alpha: [0.6, 1] },
    fireflies: { n: 0.32, size: [1.5, 2.8], vx: [-14, 14],  vy: [-10, 10],  sway: 0,  spin: 0,   from: 'any',    colors: ['#d9ff7a', '#f4ff9e'], draw: 'glow', halo: 3.2, life: [3, 7], add: true, wander: 30, g: 0, alpha: [0.6, 1] }
  };

  /* particles(container, kind, {density, max, burst, count, origin:{x,y}, alpha})
     Ambient: a canvas that fills the container (made positioned if static), paused when off screen or the tab is hidden.
     Burst (opts.burst): one shot from the origin (default centre), removes itself; controller.done resolves when finished.
     Returns {canvas, kind, running, frames, pause, resume, destroy, done} */
  function particles(container, kind, opts) {
    opts = opts || {};
    var spec = KINDS[kind];
    var burst = !!opts.burst;
    var c = { kind: kind, canvas: null, frames: 0, dead: false, paused: false, done: null };
    var resolveDone; c.done = new Promise(function (ok) { resolveDone = ok; });
    if (!container || !spec || !doc) { c.dead = true; resolveDone(); c.pause = c.resume = c.destroy = c.sync = noop; c.running = false; return c; }
    var r = rng(hash(opts.seed != null ? opts.seed : kind + ':' + Math.random()));
    var cv = null, ctx = null, ro = null, io = null, raf = 0, last = 0, w = 0, h = 0, k = 1, list = [], visible = true, madePositioned = false;
    var dpr = Math.min(root.devicePixelRatio || 1, 3);

    function target() {
      if (burst) return 0;
      var area = w * h, dprCut = dpr >= 3 ? 0.7 : dpr >= 2 ? 0.85 : 1;
      var n = Math.round(area / 4000 * spec.n * (opts.density || 1) * dprCut);
      return Math.max(spec.min || 3, Math.min(opts.max || spec.max || 70, n));
    }
    function make(initial) {
      var p = { x: 0, y: 0, vx: between(r, spec.vx), vy: between(r, spec.vy), s: between(r, spec.size), r: r() * Math.PI * 2,
        vr: (r() - 0.5) * 2 * spec.spin, ph: r() * Math.PI * 2, c: Math.floor(r() * spec.colors.length), a: between(r, spec.alpha),
        age: 0, life: spec.life ? between(r, spec.life) : 0, tw: 0, sw: r() * Math.PI * 2 };
      if (spec.scaleBy) p.s *= Math.max(0.6, Math.min(2, Math.sqrt(w * h) / 420));
      if (spec.from === 'side' && r() < 0.5) p.vx = -p.vx;
      var m = p.s * 2 + 4;
      switch (spec.from) {
        case 'top': p.x = r() * (w + 40) - 20; p.y = initial ? r() * h : -m; break;
        case 'bottom': p.x = r() * w; p.y = initial ? r() * h : h + m; break;
        case 'side': p.x = p.vx > 0 ? (initial ? r() * w : -m) : (initial ? r() * w : w + m); p.y = r() * h * 0.8; break;
        case 'spark': p.x = r() * w; p.y = r() * h * 0.7; break;
        default: p.x = r() * w; p.y = r() * h;
      }
      if (spec.life && initial) p.age = r() * p.life;
      return p;
    }
    function burstOne() {
      var o = opts.origin || { x: 0.5, y: 0.5 }, ang = r() * Math.PI * 2, sp = between(r, [90, 340]) * (opts.speed || 1) * Math.min(1.6, Math.max(0.6, Math.sqrt(w * h) / 420));
      var p = make(false);
      p.x = o.x * w + Math.cos(ang) * 6; p.y = o.y * h + Math.sin(ang) * 6;
      p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp;
      if (kind === 'mist') { p.vx *= 0.25; p.vy *= 0.25; }
      if (kind === 'rain') { p.vx *= 0.6; }
      p.life = between(r, [0.9, 1.6]); p.age = 0;
      return p;
    }
    function fill() {
      if (burst) return;
      var want = target();
      while (list.length < want) list.push(make(true));
      if (list.length > want) list.length = want;
    }
    function step(dt) {
      var g = spec.g || 0;
      for (var i = list.length - 1; i >= 0; i--) {
        var p = list[i];
        p.age += dt; p.ph += dt * (spec.flap || 3); p.r += p.vr * dt;
        if (burst) {
          var drag = Math.exp(-2.2 * dt);
          p.vx *= drag; p.vy = p.vy * drag + g * dt;
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.age >= p.life) list.splice(i, 1);
          continue;
        }
        if (spec.wander) { p.vx += (r() - 0.5) * spec.wander * dt * 4; p.vy += (r() - 0.5) * spec.wander * dt * 4; p.vx = Math.max(-20, Math.min(20, p.vx)); p.vy = Math.max(-16, Math.min(16, p.vy)); }
        if (kind === 'sparks') p.vy += g * dt;
        p.x += (p.vx + Math.sin(p.ph * 0.35 + p.sw) * spec.sway) * dt;
        p.y += p.vy * dt;
        var m = p.s * 2.6 + 8, out = p.x < -m - 30 || p.x > w + m + 30 || p.y < -m - 30 || p.y > h + m + 30;
        if ((spec.life && p.age >= p.life) || out) list[i] = make(false);
      }
    }
    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.globalCompositeOperation = spec.add ? 'lighter' : 'source-over';
      var fn = D[spec.draw], base = opts.alpha != null ? opts.alpha : 1;
      for (var i = 0; i < list.length; i++) {
        var p = list[i], a = p.a;
        if (burst) a *= 1 - p.age / p.life;
        else if (spec.life) { p.tw = Math.sin(Math.PI * Math.min(1, p.age / p.life)); a *= p.tw; }
        else a *= Math.min(1, p.age / 0.8 + 0.2);
        if (a <= 0.01) continue;
        ctx.globalAlpha = a * base;
        fn(ctx, k, p, spec);
      }
      ctx.globalAlpha = 1;
    }
    function frame(t) {
      raf = 0;
      if (!want()) return;
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016; last = t;
      step(dt); draw(); c.frames++;
      if (burst && !list.length) { c.destroy(); return; }
      raf = root.requestAnimationFrame(frame);
    }
    function want() { return !!cv && !c.dead && !c.paused && visible && !doc.hidden && w > 0 && h > 0 && (burst || enabled()); }
    function update() {
      if (want()) { if (!raf) { last = 0; raf = root.requestAnimationFrame(frame); } }
      else if (raf) { root.cancelAnimationFrame(raf); raf = 0; }
    }
    function measure(cw, ch) {
      w = cw; h = ch; k = Math.min(dpr, 2);
      if (!cv) return;
      cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
      fill(); update();
    }
    function mount() {
      if (cv || c.dead) return;
      cv = doc.createElement('canvas');
      cv.className = 'am-particles' + (burst ? ' am-burst' : '');
      cv.setAttribute('aria-hidden', 'true');
      cv.dataset.kind = kind;
      try { if (root.getComputedStyle(container).position === 'static') { container.style.position = 'relative'; madePositioned = true; } } catch (e) {}
      container.appendChild(cv);
      ctx = cv.getContext('2d');
      c.canvas = cv;
      var box = container.getBoundingClientRect();
      measure(box.width, box.height);
      if (burst) { var n = opts.count || Math.round(Math.max(24, Math.min(90, w * h / 3000))); n = Math.min(n, spec.burstMax || 90); for (var i = 0; i < n; i++) list.push(burstOne()); }
      if (root.ResizeObserver) { ro = new root.ResizeObserver(function (es) { var b = es[0] && es[0].contentRect; if (b) measure(b.width, b.height); }); ro.observe(container); }
      if (root.IntersectionObserver && !burst) { io = new root.IntersectionObserver(function (es) { visible = es[es.length - 1].isIntersecting; update(); }); io.observe(container); }
      if (!burst) root.requestAnimationFrame(function () { if (cv) cv.classList.add('am-on'); });
      update();
    }
    function unmount() {
      if (raf) root.cancelAnimationFrame(raf); raf = 0;
      if (ro) ro.disconnect(); if (io) io.disconnect(); ro = io = null;
      if (cv && cv.parentNode) cv.parentNode.removeChild(cv);
      cv = ctx = null; c.canvas = null; list = []; visible = true;
      if (madePositioned) { container.style.position = ''; madePositioned = false; }
    }
    var onVis = function () { update(); };
    doc.addEventListener('visibilitychange', onVis);
    c.sync = function () {
      if (c.dead) return;
      if (!container.isConnected) { c.destroy(); return; }
      if (burst && !enabled()) { c.destroy(); return; }
      if (burst || enabled()) mount(); else unmount();
      update();
    };
    c.pause = function () { c.paused = true; update(); };
    c.resume = function () { c.paused = false; update(); };
    c.destroy = function () {
      if (c.dead) return;
      c.dead = true; unmount(); doc.removeEventListener('visibilitychange', onVis); resolveDone();
    };
    Object.defineProperty(c, 'running', { get: function () { return !!raf || (want() && !!cv); } });
    live.push(c);
    if (burst && !enabled()) { c.dead = true; doc.removeEventListener('visibilitychange', onVis); resolveDone(); return c; }
    c.sync();
    return c;
  }

  /* ---------- transitions ---------- */
  function begin(key) {
    var old = runs[key]; if (old) old.cancel();
    var run = { key: key, anims: [], nodes: [], undo: [], bursts: [], done: false, resolve: noop };
    run.finish = function (cancelled) {
      if (run.done) return; run.done = true;
      run.anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
      run.bursts.forEach(function (b) { b.destroy(); });
      run.nodes.forEach(function (n) { if (n && n.parentNode) n.parentNode.removeChild(n); });
      run.undo.forEach(function (f) { f(); });
      if (cancelled && run.after) run.after();     /* the picture still gets its (possibly dormant) Ken Burns */
      if (runs[key] === run) delete runs[key];
      run.resolve({ cancelled: !!cancelled });
    };
    run.cancel = function () { run.finish(true); };
    runs[key] = run;
    return run;
  }
  function keyOf(toEl, opts) { return opts.key || (toEl && toEl.parentNode && (toEl.parentNode.dataset ? (toEl.parentNode.dataset.amKey || (toEl.parentNode.dataset.amKey = 'k' + (++keyOf.n))) : 'default')) || 'default'; }
  keyOf.n = 0;
  function keep(run, el, prop, value) {
    var before = el.style[prop]; el.style[prop] = value;
    run.undo.push(function () { el.style[prop] = before; });
  }
  function followKB(opts, startScale) {
    var kb = opts.kenBurns;
    if (!kb || !kb.el) return null;
    return kenBurns(kb.el, { seed: kb.seed, duration: kb.duration, zoom: kb.zoom, pan: kb.pan, startScale: enabled() ? startScale : undefined });
  }
  /* Without motion: a fast fade of the new picture, the old one goes at once */
  function quick(run, fromEl, toEl, opts) {
    if (fromEl && opts.removeFrom) run.nodes.push(fromEl);
    if (fromEl && opts.removeFrom && fromEl.parentNode) fromEl.parentNode.removeChild(fromEl);
    var ms = reduced() ? 70 : 160;
    if (!toEl.animate) { followKB(opts, 1); run.finish(false); return; }
    var a = toEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: 'linear' });
    run.anims.push(a);
    a.onfinish = function () { followKB(opts, 1); run.finish(false); };
  }
  function prepare(toEl, run) {
    try { if (root.getComputedStyle(toEl).position === 'static') keep(run, toEl, 'position', 'relative'); } catch (e) {}
  }

  /* reveal(fromEl, toEl, {kind, duration, removeFrom, kenBurns:{el, seed}, key, wait})
     The open scene grows out of the figure's centre: iris (clip-path circle) + light bloom + one-shot particle burst
     of `kind`, then a gentle push-in that hands over to Ken Burns when kenBurns is given. Resolves when toEl is fully shown */
  function reveal(fromEl, toEl, opts) {
    opts = opts || {};
    if (!toEl) return Promise.resolve({ cancelled: false });
    var run = begin(keyOf(toEl, opts));
    var p = new Promise(function (ok) { run.resolve = ok; });
    run.after = function () { followKB(opts, 1); };
    if (!enabled() || !toEl.animate) { quick(run, fromEl, toEl, opts); return p; }
    if (fromEl && opts.removeFrom) run.nodes.push(fromEl);
    prepare(toEl, run);
    keep(run, toEl, 'clipPath', 'circle(0px at 50% 50%)');
    var dur = opts.duration || 1100, push = opts.kenBurns && opts.kenBurns.el ? 1.04 : 1;
    ready(toEl, opts.wait || 1500).then(function () {
      if (run.done) return;
      var flash = cover(doc.createElement('div'), toEl, null, false); flash.className = 'am-flash'; flash.setAttribute('aria-hidden', 'true'); run.nodes.push(flash);
      /* The iris is sized to the picture actually drawn (object-fit contain leaves empty bands), read once here */
      var box = toEl.getBoundingClientRect(), R = drawnRadius(toEl, box), E1 = 'cubic-bezier(.45,.05,.3,1)', E2 = 'cubic-bezier(.2,.6,.3,1)';
      var ring = doc.createElement('div'), glowIn = doc.createElement('i');
      ring.className = 'am-ring'; ring.setAttribute('aria-hidden', 'true'); ring.appendChild(glowIn);
      cover(ring, toEl, null, false); run.nodes.push(ring);
      ring.style.left = (parseFloat(ring.style.left) + box.width / 2 - R) + 'px'; ring.style.top = (parseFloat(ring.style.top) + box.height / 2 - R) + 'px';
      ring.style.width = ring.style.height = (R * 2) + 'px';
      /* linear clock, eased per segment: the iris opens over the first 55 %, then the push-in settles */
      var circle = function (r) { return 'circle(' + r.toFixed(1) + 'px at 50% 50%)'; };
      var a = toEl.animate([
        { clipPath: circle(0), transform: 'scale(0.9)', opacity: 0.35, offset: 0, easing: E1 },
        { clipPath: circle(R), transform: 'scale(1)', opacity: 1, offset: 0.55, easing: E2 },
        { clipPath: circle(R), transform: 'scale(' + push + ')', opacity: 1, offset: 1 }
      ], { duration: dur, easing: 'linear', fill: 'both' });
      /* soft luminous edge riding on the iris — transform on the ring, opacity on its glow */
      run.anims.push(ring.animate([
        { transform: 'scale(0)', offset: 0, easing: E1 }, { transform: 'scale(1)', offset: 0.55, easing: E2 }, { transform: 'scale(' + push + ')', offset: 1 }
      ], { duration: dur, easing: 'linear', fill: 'both' }));
      run.anims.push(glowIn.animate([{ opacity: 0 }, { opacity: 0.95, offset: 0.1 }, { opacity: 0.8, offset: 0.42 }, { opacity: 0, offset: 0.62 }, { opacity: 0 }],
        { duration: dur, easing: 'linear', fill: 'both' }));
      run.anims.push(a);
      run.anims.push(flash.animate([
        { opacity: 0, transform: 'scale(0.12)' }, { opacity: 0.9, transform: 'scale(0.7)', offset: 0.3 }, { opacity: 0, transform: 'scale(1.5)' }
      ], { duration: dur * 0.85, easing: 'ease-out', fill: 'both' }));
      if (fromEl && fromEl.animate) {
        var base = fromEl.style.transform && fromEl.style.transform !== 'none' ? fromEl.style.transform : '';
        run.anims.push(fromEl.animate([
          { opacity: 1, transform: (base + ' scale(1)').trim() }, { opacity: 1, transform: (base + ' scale(1.02)').trim(), offset: 0.25 }, { opacity: 0, transform: (base + ' scale(1.08)').trim() }
        ], { duration: dur * 0.8, easing: 'ease-in', fill: 'both' }));
      }
      if (opts.kind && KINDS[opts.kind]) {
        var holder = cover(doc.createElement('div'), toEl, null, false); holder.className = 'am-overlay'; holder.setAttribute('aria-hidden', 'true'); run.nodes.push(holder);
        setTimeout(function () { if (!run.done) run.bursts.push(particles(holder, opts.kind, { burst: true, seed: opts.seed })); }, dur * 0.16);
      }
      a.onfinish = function () {
        if (run.done) return;
        /* hand over without a jump: the push-in ends where Ken Burns starts */
        followKB(opts, push);
        /* the burst may still be settling — let it finish on its own, then drop its holder */
        var left = run.bursts.filter(function (b) { return !b.dead; }), holder = run.nodes.filter(function (n) { return n.className === 'am-overlay'; })[0];
        if (holder && left.length) {
          run.bursts = []; run.nodes = run.nodes.filter(function (n) { return n !== holder; });
          left[0].done.then(function () { if (holder.parentNode) holder.parentNode.removeChild(holder); });
        }
        run.finish(false);
      };
    });
    return p;
  }

  /* turn(fromEl, toEl, {direction:'next'|'previous', duration, removeFrom, kenBurns, key}) — page to page:
     a short cross-dissolve that slides a little in the reading direction */
  function turn(fromEl, toEl, opts) {
    opts = opts || {};
    if (!toEl) return Promise.resolve({ cancelled: false });
    var run = begin(keyOf(toEl, opts));
    var p = new Promise(function (ok) { run.resolve = ok; });
    run.after = function () { followKB(opts, 1); };
    if (!enabled() || !toEl.animate) { quick(run, fromEl, toEl, opts); return p; }
    if (fromEl && opts.removeFrom) run.nodes.push(fromEl);
    prepare(toEl, run);
    keep(run, toEl, 'opacity', '0');
    var dir = opts.direction === 'previous' ? -1 : 1, shift = opts.shift || 18, dur = opts.duration || 420;
    ready(toEl, opts.wait || 900).then(function () {
      if (run.done) return;
      var a = toEl.animate([{ opacity: 0, transform: 'translateX(' + dir * shift + 'px)' }, { opacity: 1, transform: 'translateX(0px)' }],
        { duration: dur, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' });
      run.anims.push(a);
      if (fromEl && fromEl.animate) {
        var base = fromEl.style.transform && fromEl.style.transform !== 'none' ? fromEl.style.transform + ' ' : '';
        run.anims.push(fromEl.animate([{ opacity: 1, transform: base + 'translateX(0px)' }, { opacity: 0, transform: base + 'translateX(' + (-dir * shift * 0.6) + 'px)' }],
          { duration: dur * 0.85, easing: 'ease-in', fill: 'both' }));
      }
      a.onfinish = function () { if (run.done) return; followKB(opts, 1); run.finish(false); };
    });
    return p;
  }

  /* ghost(toEl, src, {fit, transform, parent}) — a still copy of the outgoing picture laid exactly over toEl's box,
     so the old image can fade while the new element is already in place. `parent` must be positioned or sit in the
     same containing block (default: toEl's parent, inserted before toEl so the new picture paints above it) */
  function ghost(toEl, src, opts) {
    opts = opts || {};
    if (!toEl || !src || !doc) return null;
    var g = doc.createElement('div');
    g.className = 'am-ghost'; g.setAttribute('aria-hidden', 'true');
    g.style.backgroundImage = cssURL(src);
    g.style.backgroundSize = opts.fit || 'contain';
    if (opts.position) g.style.backgroundPosition = opts.position;
    if (opts.transform && opts.transform !== 'none') g.style.transform = opts.transform;
    cover(g, toEl, opts.parent || null, !opts.parent);
    return g;
  }
  /* snapshot(el) — what ghost() needs from the outgoing picture, read before the page swaps it out */
  function snapshot(el) {
    var img = imgIn(el);
    if (!img || !(img.currentSrc || img.src)) return null;
    var t = 'none'; try { t = root.getComputedStyle(img).transform; } catch (e) {}
    return { src: img.currentSrc || img.src, transform: t };
  }
  function cancel(key) { if (key) { if (runs[key]) runs[key].cancel(); return; } Object.keys(runs).forEach(function (k) { runs[k].cancel(); }); }

  root.AtelierMotion = {
    VERSION: VERSION, KEY: KEY, KINDS: Object.keys(KINDS),
    enabled: enabled, reduced: reduced, setEnabled: setEnabled, subscribe: subscribe,
    kenBurns: kenBurns, stop: stop, particles: particles, reveal: reveal, turn: turn,
    ghost: ghost, snapshot: snapshot, cancel: cancel, seed: hash
  };
})(typeof window !== 'undefined' ? window : this);
