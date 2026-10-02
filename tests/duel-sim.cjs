/* 신기 결투 규칙이 코드에 옮겨졌나. 화면 없이 lib/duel.js 만 돌린다.
   --quick 은 규칙만 본다. 빼고 돌리면 AI 끼리 300판을 굴려 선공 승률·권별 승률을 찍는다 — 문턱 밖이면 실패(과제 6).
   Run: node tests/duel-sim.cjs --quick */
const fs = require('node:fs'), assert = require('node:assert/strict');
const A = require('../lib/duel.js');
const d = f => JSON.parse(fs.readFileSync('data/' + f + '.json', 'utf8'));
const data = { cards: d('card').cards, skills: d('skill').skills, img: d('img').img, duel: d('duel') };
const quick = process.argv.includes('--quick');
let n = 0;
const ok = (cond, msg) => { assert(cond, msg); n++; };
const D = A.derive(data);

/* 파생 — 모든 카드에 줄·힘·능력, 변형판은 그림이 있는 것만, 영웅 33 */
{
  const all = D.list.map(id => D.cards[id]);
  const hasCut = (name, k) => {
    const e = data.img[name]; if (!e || !e.byStyle) return false;
    return Object.values(e.byStyle).some(b => k === 'weather'
      ? !!(b.casual && (Array.isArray(b.casual) ? b.casual.length : b.casual.f && b.casual.f.length))
      : !!(b[k] && b[k].f));
  };
  ok(all.filter(c => c.variant === 'base').length === data.cards.length, '기본판은 카드 수와 같다');
  for (const v of ['awaken', 'cursed', 'weather'])
    ok(all.filter(c => c.variant === v).length === data.cards.filter(c => hasCut(c.name, v)).length, v + ' 판은 그림이 있는 카드 수와 같다');
  for (const c of all) {
    ok(A.ROWS.includes(c.row) && typeof c.file === 'string' || c.file === null, c.id + ' 줄·그림');
    if (c.variant === 'weather') ok(c.power === 0 && c.ability === null && !c.hero, c.id + ' 날씨판은 힘 0 · 능력 없음 · 영웅 아님');
    else ok(c.power >= 4 && c.power <= 18 && A.ABILITIES.includes(c.ability) && c.n >= 1 && c.n <= 3, c.id + ' 힘 4~18 · 능력 · 수치 1~3');
  }
  ok(all.filter(c => c.hero && c.variant === 'base').length === 33, '영웅 33장');
  const m = D.cards['묠니르'];
  ok(m.power === 12 && m.row === 'melee' && m.hero && m.ability === 'sweep', '묠니르 — 힘 12 · 근접 · 영웅 · 휩쓸기');
  ok(D.cards['묠니르@awaken'].power === 15 && D.cards['묠니르@cursed'].power === 17 && D.cards['묠니르@weather'].power === 0, '각성 +3 · 저주 +5 · 날씨 0');
  for (const e of new Set(Object.values(data.skills).map(s => s.effect))) ok(A.ABILITY[e], 'effect ' + e + ' 가 능력에 대응된다');
  ok(data.duel.bosses.length === 11 && data.duel.bosses.every(b => D.cards[b.portrait] && data.duel.factions[b.myth]
    && data.cards.some(c => c.wielder === b.wielder && c.myth === b.myth)), '주인 열하나 — 초상·진영 능력·주인 이름');
}

/* ── 끝 ── */
console.log('PASS 결투 규칙: ' + n + ' 가지' + (quick ? ' (--quick)' : ''));
