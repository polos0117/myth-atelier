/* 새 판 살피기 — 홈 화면 앱에는 주소창도 새로고침 단추도 없어 스스로 살핀다.
   본문을 통째로 다시 받으면 아까우니 머리(HEAD)만 물어 견준다.
   판이 한창일 수 있으니 제멋대로 갈아타지 않고, 띠를 띄워 누를 때 갈아탄다.

   견줄 자리를 "이 창이 처음 본 표"로 잡으면 안 된다. 화면에 떠 있는 쪽이 캐시에서
   온 옛 판이면 첫 살핌이 서버의 새 판을 "이미 본 것"으로 적어 버려 영영 알리지
   못한다. 그래서 이 문서가 서버를 떠난 때(document.lastModified)를 기준 삼는다.
   표(etag)는 CDN 마디마다 다르게 붙어 같은 판도 바뀐 듯 보이니 뒷받침으로만 쓴다. */
(function (root) {
  'use strict';
  /* 화면에 뜨는 말은 lib/words.js 한 곳에서 온다 */
  var W = root.W || function (k) { return k; };

  var GAP = 18e4, SLACK = 2e3;   /* 삼 분에 한 번, 앞뒤 이 초는 봐준다 */

  function watch(opt) {
    opt = opt || {};
    /* 열쇠를 화면마다 따로 두면, 도감에서 닫은 판을 툴킷에서 또 묻는다.
       홈 화면 앱 하나로 여러 화면을 오가므로 저장소 단위로 묶는다 */
    var KEY = 'skip_build_v2';
    var SILENT_KEY = 'silent_reload_v1';
    var MINE = Date.parse(document.lastModified);
    if (!isFinite(MINE)) MINE = 0;
    var TAG = null, busy = false, shown = false, last = 0;
    var OPENED = Date.now();

    function skipped() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
    function noMore(t) { try { localStorage.setItem(KEY, t); } catch (e) {} }

    /* 캐시에서 온 옛 사본을 들고 있는 경우가 잦다 — 화면을 옮길 때마다 새 페이지가
       열리는데, 본문은 캐시에서 오고 확인용 물음은 캐시를 건너뛰기 때문이다.
       그러면 갈아타도 또 옛 사본을 받아 같은 띠가 계속 뜬다.
       열자마자 드러난 차이는 사람을 부르지 말고 조용히 한 번만 다시 받는다.
       한 번으로 끝내지 않으면 새로고침이 끝없이 돌 수 있어 빗장을 걸어 둔다. */
    var FRESH_WINDOW = 8e3;
    function silentReload(t) {
      var mark;
      try { mark = sessionStorage.getItem(SILENT_KEY); } catch (e) { return false; }
      if (mark === t) return false;              /* 이 판으로는 이미 한 번 털었다 */
      try { sessionStorage.setItem(SILENT_KEY, t); } catch (e) { return false; }
      location.replace(location.pathname + location.search +
        (location.search ? '&' : '?') + '_v=' + Date.now());
      return true;
    }

    /* 지금 판이 언제 것인지 알려 준다. 눈으로 견줄 데가 있어야 한다 */
    function stamp() {
      if (!MINE) return '';
      var d = new Date(MINE), p = function (n) { return (n < 10 ? '0' : '') + n; };
      return W('fresh.stamp') + ' ' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
             p(d.getHours()) + ':' + p(d.getMinutes());
    }

    function look(force) {
      if (busy || shown || !window.fetch) return;
      var now = Date.now();
      if (!force && now - last < GAP) return;
      last = now; busy = true;
      fetch(location.pathname + '?_=' + now, { method: 'HEAD', cache: 'no-store' })
        .then(function (r) {
          busy = false;
          if (!r.ok) return;
          var lm = r.headers.get('last-modified'), et = r.headers.get('etag');
          var t = lm || et;
          if (!t || t === skipped()) return;
          var srv = lm ? Date.parse(lm) : NaN;
          if (MINE && isFinite(srv)) {
            if (srv > MINE + SLACK) {
              /* 연 지 얼마 안 됐으면 캐시 탓일 가능성이 크다 — 조용히 털고,
                 그래도 남으면(또는 쓰던 중에 새 판이 올라오면) 그때 띠를 띄운다 */
              if (Date.now() - OPENED < FRESH_WINDOW && silentReload(t)) return;
              band(t);
            }
            return;
          }
          /* 날짜를 못 얻는 자리에서만 표를 견준다 */
          if (TAG === null) { TAG = t; return; }
          if (t !== TAG) band(t);
        })
        .catch(function () { busy = false; });
    }

    function band(t) {
      if (shown) return;
      shown = true;
      var d = document.createElement('div');
      d.setAttribute('role', 'status');
      d.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));' +
        'z-index:99999;background:#1b1f27;color:#f0ead8;border:1px solid #C9A227;border-radius:10px;' +
        "padding:12px 14px;font:600 14px/1.5 -apple-system,BlinkMacSystemFont,'Noto Sans KR',sans-serif;" +
        'box-shadow:0 6px 22px rgba(0,0,0,.45);display:flex;gap:10px;align-items:center';
      d.innerHTML = '<span style="flex:1">' + W('fresh.notice') + '</span>' +
        '<button type="button" style="flex:none;background:#C9A227;color:#17130F;border:0;border-radius:7px;' +
        'padding:8px 12px;font:700 14px/1 inherit">' + W('fresh.reload') + '</button>' +
        '<button type="button" aria-label="' + W('fresh.close') + '" style="flex:none;background:none;color:#8b8578;border:0;' +
        'font:700 18px/1 inherit;padding:4px 6px">×</button>';
      var b = d.querySelectorAll('button');
      b[0].onclick = function () {
        var u = location.pathname + location.search;
        location.replace(u + (location.search ? '&' : '?') + '_v=' + Date.now());
      };
      /* 닫기를 눌렀으면 이 판으로는 다시 묻지 않는다. 그다음 판은 또 알린다 */
      b[1].onclick = function () { d.remove(); shown = false; noMore(t); };
      document.body.appendChild(d);
    }

    if (opt.stampId) {
      var el = document.getElementById(opt.stampId);
      if (el) el.textContent = stamp();
    }
    look(true);
    /* 앱을 다시 열 때만 본다. focus 까지 걸면 한 번 오갈 때 두 번 물어본다 */
    document.addEventListener('visibilitychange', function () { if (!document.hidden) look(); });
    return { look: look, stamp: stamp };
  }

  root.AtelierFresh = { watch: watch };
})(window);
