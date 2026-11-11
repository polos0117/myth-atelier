/* core 블록 — lib/prompt-spec.js 끝의 「core:vN」 블록이 화풍공방(style-atelier) core/vN/vocab.json 과 같은지(사용자 2026-11-11 「프롬포트 … 문구관리를 하나의 공방에서」 → 3단계 칸 꼴 통일).
   이 공방엔 표정 표(EXPRESSION_DETAIL) · 얼굴 표(FACE_DESIGN) · 외형 풀이(VOCAB_EN)가 없어 블록의 낱말 몫은 아무것도 덮지 않는다 — 블록이 주는 것은 칸 틀(CORE_FRAME: 칸 머리 · 해부 줄 · Avoid 줄)뿐이다.
   보는 것: 블록이 있고, 실으면 CORE_VERSION · CORE_FRAME 이 선다. 옆에 ../style-atelier 가 있으면 그 sync.cjs --check 로 원본과 글자까지 견준다(없으면 건너뜀).
   Run: node tests/core-sync.cjs */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), cp = require('node:child_process'), assert = require('node:assert/strict');
const ROOT = path.join(__dirname, '..'), CORE = path.join(ROOT, '..', 'style-atelier', 'core', 'sync.cjs'), F = path.join(ROOT, 'lib/prompt-spec.js');
const src = fs.readFileSync(F, 'utf8');
assert(/\/\* ── core:v\d+ begin/.test(src) && /\/\* ── core:v\d+ end ── \*\//.test(src), 'lib/prompt-spec.js 에 core 블록이 없다');
assert.equal((src.match(/\/\* ── core:v\d+ begin/g) || []).length, 1, 'core 블록은 하나');
const ctx = { window: {}, console }; vm.createContext(ctx); vm.runInContext(src, ctx);
const T = ctx.window.AtelierSpec;
assert(/^v\d+$/.test(T.CORE_VERSION || ''), 'CORE_VERSION');
assert.equal((src.match(/\/\* ── core:(v\d+) begin/) || [])[1], T.CORE_VERSION, '블록 머리의 판 = CORE_VERSION');
const CF = T.CORE_FRAME;
assert(CF && ['s1', 's2', 's3', 's4', 's5', 'anatomy', 'avoid'].every(k => typeof CF[k] === 'string' && CF[k]), 'CORE_FRAME — 칸 머리 다섯 · 해부 줄 · Avoid 줄');
assert(/^1\. /.test(CF.s1) && /^2\. /.test(CF.s2) && /^3\. /.test(CF.s3) && CF.s3.includes('{costume}') && CF.s3.includes('{genre}') && /^4\. /.test(CF.s4) && /^5\. /.test(CF.s5), '칸 머리는 번호 차례, 3칸은 {costume} · {genre} 자리');
assert(/^Anatomy: /.test(CF.anatomy) && /^Avoid: /.test(CF.avoid) && CF.avoid.includes('{list}'), '해부 줄 · Avoid 줄의 꼴');
/* 이 공방 표는 블록이 덮지 않는다 — 낱말 표가 생기면 이 검사를 책 공방 것처럼 넓힌다 */
assert(!T.FACE_DESIGN && !T.EXPRESSION_DETAIL && !T.VOCAB_EN, '이 공방엔 core 낱말 표(FACE_DESIGN · EXPRESSION_DETAIL · VOCAB_EN)가 없다');
if (fs.existsSync(CORE)) {
  const r = cp.spawnSync('node', [CORE, ROOT, '--check', '--ver', T.CORE_VERSION], { encoding: 'utf8' });
  assert.equal(r.status, 0, 'core 블록이 원본과 다르다 — node ../style-atelier/core/sync.cjs . 로 다시 옮긴다\n' + r.stdout + r.stderr);
  console.log('PASS core 블록: ' + T.CORE_VERSION + ' = style-atelier core 원본 · 칸 틀(CORE_FRAME) 섬');
} else console.log('PASS core 블록: ' + T.CORE_VERSION + ' 있음 · 칸 틀(CORE_FRAME) 섬(옆에 style-atelier 가 없어 원본 대조는 건너뜀)');
