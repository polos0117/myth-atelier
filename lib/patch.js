/* 패치 기록을 읽는 한 곳 — 화면과 검사가 같은 해석을 쓴다.
   ES 모듈도 빌드도 쓰지 않는다. window.AtelierPatch 하나만 붙인다.

   docs/PATCH.md 의 모양(이 두 줄이 전부다):
     "## 날짜 · 누가 · 무엇을 바꿨나"  로 한 칸이 시작하고
     "- 파일 — 왜/무엇"              이 그 칸의 줄이 된다.
   첫 "## " 앞의 글은 사람에게 주는 안내라 화면이 읽지 않는다.

   왜 마크다운인가: 두 세션(claude·codex)이 손으로 적는 자리다. JSON 이면
   쉼표 하나로 화면이 통째로 빈다. 줄 단위라 충돌도 한 줄에서 끝난다. */
(function (root) {
  'use strict';

  var PATH = 'docs/PATCH.md';
  var HEAD = '## ', ITEM = '- ', SEP = ' · ';

  function parse(text) {
    var out = [], cur = null, lines = String(text || '').split(/\r?\n/), i, line, part;
    for (i = 0; i < lines.length; i++) {
      line = lines[i];
      if (line.indexOf(HEAD) === 0) {
        part = line.slice(HEAD.length).split(SEP);
        /* 제목에 가운뎃점이 들어가도 잃지 않는다 — 앞의 둘만 떼고 나머지는 붙여 둔다 */
        cur = { date: (part[0] || '').trim(), who: (part[1] || '').trim(),
                title: part.slice(2).join(SEP).trim(), items: [] };
        out.push(cur);
      } else if (cur && line.indexOf(ITEM) === 0) {
        cur.items.push(line.slice(ITEM.length).trim());
      }
    }
    return out;
  }

  var api = { PATH: PATH, parse: parse };
  root.AtelierPatch = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
