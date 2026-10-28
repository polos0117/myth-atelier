/* 길 지도 — lib/shelf-gen.wasm 싣개. 씨앗 하나와 규칙 표로 몇 층짜리 평면도를 받는다(규칙·생성은 rust/shelf-gen, 다시 짓는 법은 rust/README.md).
   책 공방의 서고 탐험이 첫 손님이고(plan — 책 규칙 표가 wasm 안에 있다), 같은 wasm 을 신화 공방 던전이 다른 규칙 표로 쓴다(planSpec).
   wasm-bindgen 같은 붙임 생성기는 쓰지 않는다 — 내보내기는 숫자와 포인터·길이뿐이라 여기 손으로 잇는다.
   브라우저에서는 window.AtelierShelf, node 에서는 require 로 같은 것을 받는다. 말(한글)은 여기 없다 — 화면 말은 lib/words.js.
   원본은 book-atelier(rust/shelf-gen · lib/shelf-gen.js · lib/shelf-gen.wasm) — 다른 공방엔 같은 둘을 복사해 둔다.

     load(src)                    → Promise. src 는 wasm 주소(브라우저) 또는 바이트(node). 한 번 실으면 다시 안 싣는다
     plan(seedLo, seedHi, n)      → 책 규칙 표의 지도(JSON 을 푼 것) — n 은 책 수(설계표 차례가 번호). 책이 모자라면 null
     planSpec(seedLo, seedHi, spec) → 아무 규칙 표(JSON 글 또는 객체)의 지도. 표가 틀리면 null(lastError() 에 까닭)
     bookSpec()                   → wasm 안의 책 규칙 표(객체)
     seedOf(글)                   → [아래 32비트, 위 32비트] — 같은 글이면 같은 지도 */
(function (root) {
  'use strict';
  var API = 2, inst = null, loading = null, lastErr = null;

  function bind(module) {
    var ex = module.exports;
    if (ex.api_version() !== API) throw new Error('shelf-gen api ' + ex.api_version() + ' != ' + API);
    inst = ex;
    return api;
  }
  function load(src) {
    if (inst) return Promise.resolve(api);
    if (loading) return loading;
    var p;
    if (typeof src === 'string' && typeof fetch === 'function') p = fetch(src).then(function (r) { if (!r.ok) throw new Error('shelf-gen.wasm ' + r.status); return r.arrayBuffer(); });
    else p = Promise.resolve(src);
    loading = p.then(function (bytes) { return WebAssembly.instantiate(bytes, {}); }).then(function (r) { return bind(r.instance); });
    return loading;
  }
  function text(ptr, len) { return new TextDecoder().decode(new Uint8Array(inst.memory.buffer, ptr, len)); }
  function out(n) {
    if (!n) { try { lastErr = JSON.parse(text(inst.plan_ptr(), inst.plan_len())).error || null; } catch (e) { lastErr = 'unknown'; } return null; }
    lastErr = null; return JSON.parse(text(inst.plan_ptr(), n));
  }
  function plan(seedLo, seedHi, books) {
    if (!inst) throw new Error('shelf-gen not loaded');
    return out(inst.plan(seedLo >>> 0, seedHi >>> 0, books >>> 0));
  }
  /* 규칙 표를 wasm 자리에 써 넣고 짠다 */
  function planSpec(seedLo, seedHi, spec) {
    if (!inst) throw new Error('shelf-gen not loaded');
    var bytes = new TextEncoder().encode(typeof spec === 'string' ? spec : JSON.stringify(spec)), ptr = inst.alloc(bytes.length);
    new Uint8Array(inst.memory.buffer, ptr, bytes.length).set(bytes);
    var n = inst.plan_spec(seedLo >>> 0, seedHi >>> 0, ptr, bytes.length);
    var r = out(n); inst.dealloc(ptr, bytes.length); return r;
  }
  function bookSpec() { return JSON.parse(text(inst.book_spec_ptr(), inst.book_spec_len())); }
  function lastError() { return lastErr; }
  function sourceHash() { return inst ? text(inst.source_hash_ptr(), inst.source_hash_len()) : null; }
  /* 씨앗 — 글자열에서 FNV-1a 두 벌(모자이크와 같은 식) */
  function seedOf(s) {
    var a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995, i, c;
    s = String(s);
    for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); a = Math.imul(a ^ c, 0x01000193) >>> 0; b = Math.imul(b ^ c ^ (i & 255), 0x01000193) >>> 0; }
    return [a >>> 0, b >>> 0];
  }
  /* 방 사이의 길 — from → to 목록으로 */
  function nextOf(floor, roomId) { return floor.edges.filter(function (e) { return e[0] === roomId; }).map(function (e) { return e[1]; }); }
  function roomOf(floor, id) { return floor.rooms[id]; }

  var api = { API: API, load: load, plan: plan, planSpec: planSpec, bookSpec: bookSpec, lastError: lastError, seedOf: seedOf, sourceHash: sourceHash, nextOf: nextOf, roomOf: roomOf, loaded: function () { return !!inst; } };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.AtelierShelf = api;
})(typeof window !== 'undefined' ? window : this);
