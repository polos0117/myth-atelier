/* 칸 꼴 지시문 — 일상컷이 아닌 지시문(액션 · 각성 · 저주 · 스킨 · 스킨의 각성 · 저주)이 core 칸 틀(AtelierSpec.CORE_FRAME, 화풍공방 core v4~)의 「머리말 + 다섯 칸」 으로 나온다
   (사용자 2026-11-11 「초안 없이 다 진행해줘」 3단계 — 칸 꼴 통일). 글은 옛 꼴(문단 꼴, 스위치를 끈 판 = st._long) 그대로이고 자리만 옮긴다 — 아래 「달라진 마디」 목록 밖의 글이 달라지면 여기서 걸린다.
   보는 것: 여섯 덩어리 · 칸 머리 = CORE_FRAME · 2칸 끝 해부 줄 · 빛 줄 하나 이하 · Avoid 는 5칸 맨 끝 · Avoid 밖 「No …」 나열 없음 · 옛 줄 이름 · 찌꺼기 없음 · 잃은 지시 없음 · 낱말 수 · 스위치 · 일상컷 그대로.
   Run: node tests/prompt-sections.cjs */
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const ctx = { window: {}, console }; vm.createContext(ctx);
for (const f of ['lib/prompt-spec.js', 'lib/casual-tree.js', 'lib/casual-tree-v2.js', 'lib/prompt-myth.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
const S = ctx.window.AtelierSpec, P = ctx.window.AtelierPrompt, CF = S.CORE_FRAME, SE = S.SECTIONS;
const d = f => JSON.parse(fs.readFileSync('data/' + f + '.json', 'utf8'));
const data = { cards: d('card').cards, group: d('group'), skills: d('skill').skills, tree: d('casual-tree'), tree2: d('casual-tree-v2') };
assert(CF && CF.s1 && CF.s2 && CF.s3 && CF.s4 && CF.s5 && CF.anatomy && CF.avoid, 'core 칸 틀(CORE_FRAME) — lib/prompt-spec.js 끝 core 블록');
assert(SE && SE.on === true && P.sectionsOn({}), '스위치(S.SECTIONS.on)가 켜져 있다');

/* ── 달라진 마디(R4~R8) — 이 목록 밖의 글은 옛 꼴과 글자 그대로 같아야 한다 ──
   R4 줄 머리: 대문자 머리는 첫 글자만 대문자로, 뜻이 같은 줄은 삼국지 머리로. [옛 머리, 칸 꼴 머리, 칸(0 = 머리말)] */
const HEADS = [
  ['WEAPON: ', 'Weapon: ', 0], ['SUBJECT: ', 'Subject: ', 0], ['OUTPUT: ', 'Output: ', 0],
  ['STYLE: ', '', 1],                                                   /* 1칸 머리(1. STYLE) 밑에 머리 없이 */
  ['IDENTITY (chosen details override the automatic look)', 'Identity (chosen details override the automatic look)', 2],
  ['WEAPON LOOK (', 'Weapon look (', 3], ['SKIN LOOK (', 'Skin look (', 3], ['SKIN NOTE: ', 'Skin note: ', 3],
  ['EMBODIMENT: ', 'Embodiment: ', 3], ['SILHOUETTE: ', 'Silhouette: ', 3],
  ['POSTURE: ', 'Posture: ', 4], ['SCENE NOTE: ', 'Scene note: ', 4],
  ['ANATOMY: ', 'Anatomy: ', 2], ['BODY: ', 'Body: ', 2], ['HANDS: ', 'Hands: ', 5]
];
/* 외형 묶음 머리(BASE — · BUILD — · FACE — · HAIR — · SHOT —) → 삼국지 줄: Age · Face — · Body and hair · Expression(2칸) · Outfit direction(3칸) · Shot —(4칸).
   값 문장(「Body type: slender.」)은 그대로, 나이만 줄 머리가 된다 */
const GROUP_HEADS = /^(?:BASE|BUILD|FACE|HAIR|SHOT) — /;
/* R4 · R6 로 글자가 달라진 마디 — [옛 글, 칸 꼴 글, 까닭] */
const CHANGED = [
  ['Apparent age: ', 'Age: ', 'R4 — 나이 줄 머리는 삼국지와 같은 Age:'],
  ['(see WEAPON LOOK)', '(see the weapon look above)', 'R6 — 옛 줄 이름 WEAPON LOOK 은 3칸 바로 위 줄'],
  ['with the SKIN LOOK above', 'with the skin look above', 'R6 — 옛 줄 이름 SKIN LOOK 은 3칸 바로 위 줄']
];
/* R5 금지: 「No a, no b.」 · 「No a, b or c.」 문장은 통째로 5칸 Avoid 로. 겹치는 낱말은 한 번(text 두 번, logos = logo).
   규칙 줄은 글 그대로: ONE FIGURE ONLY. · She does NOT hold …(5칸) · HANDS: …(5칸) · 방어구의 「입는다」 줄(3칸 — 「; no shield, no other gear, nothing in her hands」 꼬리까지 한 줄로)
   R7 겹침: BODY 줄의 「— one head, two arms and two legs, each joined at its natural joint」 는 해부 줄(CF.anatomy)이 말하니 뺀다. 나머지(a normal human body; elbows … · Hands and feet may be …)는 남는다 */
const BODY_REST = 'Body: a normal human body; elbows, knees and wrists bend the human way. Hands and feet may be partly hidden by the pose, what she holds or the frame.';
const OVERLAP = 'one head, two arms and two legs, each joined at its natural joint';
assert(S.BODY_LINE.includes(' — ' + OVERLAP + ';') && CF.anatomy.includes(OVERLAP), '겹치는 마디가 BODY 줄과 해부 줄에 글자 그대로 있다');
assert.deepEqual(JSON.parse(JSON.stringify(SE.refs)), CHANGED.slice(1).map(r => [r[0], r[1]]), 'R6 로 바꾸는 말은 이 목록과 같다(S.SECTIONS.refs)');
const WEAR = [S.ARMOR_WORN, ...Object.values(S.ARMOR_WEAR)];
const OLD_NAMES = /\b(?:WEAPON LOOK|SKIN LOOK|SKIN NOTE|SCENE NOTE|WEAPON|STYLE|SUBJECT|OUTPUT|EMBODIMENT|SILHOUETTE|POSTURE|IDENTITY|ANATOMY|BODY|HANDS|BASE|BUILD|FACE|HAIR|SHOT)\b/;

const sing = x => x.toLowerCase().replace(/s$/, '');
const sentences = t => t.split(/\.\s+(?=[A-Z])/).map(x => x.replace(/\.$/, '').trim()).filter(Boolean);
/* 「No …」 문장의 낱말 — 조립부(splitNo)와 따로 센다 */
const noItems = sen => { const b = sen.replace(/^No\s+/, ''); return (/,\s*no\s/i.test(b) ? b.split(/,\s*no\s+/i) : b.split(/,\s*|\s+or\s+/)).map(x => x.trim()).filter(Boolean); };
const genreOf = st => {
  const design = S.CORE[st.design] ? st.design : 'mecha', state = P.skinState(st);
  if (st.output === 'skin') return state === 'base' ? 'SKIN' : 'SKIN, ' + (state === 'awaken' ? 'AWAKENED' : 'CURSED');
  return st.output === 'awaken' ? 'AWAKENED' : st.output === 'cursed' ? 'CURSED' : design === 'cloth' ? 'PERSONIFICATION' : 'MECHA PERSONIFICATION';
};

let n = 0, maxW = 0, minW = 1e9, lostChecked = 0;
function check(st, id) {
  const card = P.cardOf(data, st.card), t = P.build(st, data), old = P.build({ ...st, _long: true }, data);
  const B = t.split('\n\n'), lines = t.split('\n'), attached = st.output !== 'portrait';
  const design = S.CORE[st.design] ? st.design : 'mecha';
  n++;
  /* 여섯 덩어리 · 칸 머리 */
  assert.equal(B.length, 6, id + ' 머리말 + 다섯 칸');
  assert.deepEqual(B.slice(1).map(b => b.split('\n')[0]), [CF.s1, CF.s2, CF.s3.replace('{costume}', design === 'cloth' ? 'COSTUME' : 'ARMOR').replace('{genre}', genreOf(st)), CF.s4, CF.s5], id + ' 칸 머리 차례');
  B.slice(1).forEach((b, i) => assert(b.split('\n').length >= 2, id + ' ' + (i + 1) + '칸이 비었다'));
  /* 머리말 — 무기 · (새 인물이면) 뼈대 · 출력 */
  assert(B[0].startsWith('Weapon: ' + card.en + ' (' + card.name + '), the ') && /^Output: /m.test(B[0]) && !B[0].includes('Legend: '), id + ' 머리말(전설은 2칸)');
  assert.equal(/^Subject: A female /m.test(B[0]), !attached, id + ' 뼈대 줄은 새 인물만');
  assert.equal(/attached/.test(B[0]), attached, id + ' 첨부 그림 말(입력 · 출력)은 이어가기 머리말에');
  /* 1칸 — 화풍 문장 그대로 */
  const style = (P.styleRow(st.style) || P.styleRow(S.DEFAULT_STYLE))[2];
  assert.equal(B[1], CF.s1 + '\n' + style, id + ' 1칸 — 화풍');
  /* 2칸 — 전설 · 몸 줄 · 해부 줄로 끝 */
  assert(B[2].includes('\nLegend: ' + card.text + '\n') && B[2].endsWith('\n' + BODY_REST + '\n' + CF.anatomy), id + ' 2칸 — 전설 · 몸 · 해부 줄로 끝');
  assert.equal(lines.filter(l => l === CF.anatomy).length, 1, id + ' 해부 줄 한 번');
  assert(!t.includes(' — ' + OVERLAP), id + ' 해부 줄과 겹치는 마디는 BODY 줄에서 뺐다(R7)');
  /* 3칸 — 무기 모양 맨 위 */
  if (card.look) assert(B[3].split('\n')[1] === 'Weapon look (materials and colors; shape; motifs): ' + card.look + '.', id + ' 3칸 — 무기 모양');
  /* 4칸 · 5칸 */
  assert(lines.filter(l => /^Light: /.test(l)).length <= 1, id + ' 빛 줄 하나 이하');
  assert.equal(B[5].split('\n')[1], 'ONE FIGURE ONLY.', id + ' 5칸 — 한 사람');
  const av = lines.filter(l => /^Avoid: /.test(l));
  assert(av.length === 1 && B[5].endsWith('\n' + av[0]) && av[0] === CF.avoid.replace('{list}', av[0].slice(7, -1)), id + ' Avoid 는 한 줄 · 5칸 맨 끝 · core 꼴');
  const avoid = av[0].slice(7, -1).split(', ');
  assert.equal(new Set(avoid.map(sing)).size, avoid.length, id + ' Avoid 낱말은 한 번씩');
  /* Avoid 밖에 「No …」 나열이 없다 — 조건(unless) 마디와 방어구 「입는다」 줄(규칙 줄 통째)만 남는다 */
  for (const l of lines) {
    if (/^Avoid: /.test(l) || WEAR.includes(l) || /^(?:Weapon look|Skin look|Legend|Scene note)[ :(]/.test(l)) continue;
    const m = l.match(/(?:^|[.;:]\s)no\s+[a-z][^.;]*/gi) || [];
    assert(m.every(x => /\bunless\b/.test(x)), id + ' Avoid 밖 「No …」: ' + l);
  }
  /* 옛 줄 이름 · 찌꺼기 */
  const body = lines.filter(l => !B.slice(1).some(b => b.split('\n')[0] === l) && !/^(?:Weapon look|Skin look|Legend|Scene note)[ :(]/.test(l)).join('\n').replace(card.en, '');
  assert(!OLD_NAMES.test(body), id + ' 옛 줄 이름이 남았다: ' + (body.match(OLD_NAMES) || [])[0]);
  assert(!/\.\./.test(t) && !/: \./.test(t) && !/\{[^}]*\}/.test(t) && !/undefined|null|NaN|\[object/.test(t) && !/ {2,}/.test(t) && !/\n\n\n/.test(t), id + ' 찌꺼기(.. · 빈 머리 · {…} · undefined · 겹친 빈칸)');
  assert(lines.every(l => l === l.trim()), id + ' 줄 앞뒤 빈칸');
  /* 잃은 지시가 없다 — 옛 꼴을 문단 → 줄 → 문장 → 마디(; · —)로 쪼개 칸 꼴에 그대로 있는지 */
  const where = x => B.findIndex(b => b.includes(x));
  for (const para of old.split('\n\n')) for (let line of para.split('\n')) {
    const h = HEADS.find(r => line.startsWith(r[0]));
    if (h) {
      if (h[1]) assert(B[h[2]].split('\n').some(l => l.startsWith(h[1])), id + ' 줄 머리 ' + h[0] + ' → ' + (h[2] || '머리말') + '칸 ' + h[1]);
      line = line.slice(h[0].replace(/[ (]+$/, '').length);
    } else line = line.replace(GROUP_HEADS, '');
    assert(!/^[A-Z]{3,}[A-Z ]*[:(]/.test(line), id + ' 모르는 옛 줄 머리: ' + line.slice(0, 40));
    for (const sen of sentences(line)) {
      if (/^No\s/.test(sen)) {   /* R5 — 낱말마다 Avoid 에 */
        for (const x of noItems(sen)) assert(avoid.map(sing).includes(sing(x)), id + ' 금지 낱말이 Avoid 에 없다: ' + x);
        lostChecked++; continue;
      }
      for (let cl of sen.split(/;\s+|\s—\s/)) {
        cl = cl.replace(/^[:(\s]+/, '').trim(); if (!cl) continue;
        for (const r of CHANGED) cl = cl.split(r[0]).join(r[1]);
        assert(t.includes(cl), id + ' 잃은 마디: ' + cl);
        lostChecked++;
      }
    }
  }
  /* 규칙 줄은 글 그대로 제 칸에 */
  if (!attached) {
    const wear = card.kind === 'armor' ? (S.ARMOR_WEAR[card.wear] || S.ARMOR_WORN) : '', hands = (card.kind === 'armor' && S.ARMOR_HANDS[card.wear]) || S.HANDS_LINE;
    if (wear) assert(B[3].split('\n')[2] === wear && !t.includes(S.HOLD_LINE), id + ' 방어구 「입는다」 줄은 무기 모양 바로 밑(3칸)');
    else assert(B[5].split('\n')[2] === S.HOLD_LINE, id + ' 「들지 않는다」 줄은 글 그대로 5칸');
    assert(B[5].split('\n').includes(hands), id + ' 손 줄은 5칸');
    assert(/^Pose: Default stance /m.test(B[4]) && /^Composition: Vertical 2:3 frame/m.test(B[4]), id + ' 4칸 — Pose · Composition');
    assert(B[2].split('\n')[1] === 'Identity (chosen details override the automatic look)' && /^Face — Facial ethnicity: /m.test(B[2]) && /^Body and hair: [^\n]*Hair color: /m.test(B[2]), id + ' 2칸 — 외형 줄');
    assert(B[2].includes('\nAnatomy: natural adult proportions, both hands drawn correctly as hands.\n'), id + ' 2칸 — 비율 줄');
  } else {
    assert(B[5].split('\n').includes('Hands: ' + S.KEEP_HANDS.slice(7)), id + ' 빈손 줄(KEEP_HANDS)은 글 그대로 5칸');
    assert(B[4].split('\n')[1].startsWith('Keep the attached image’s camera, pose, framing, subject scale, '), id + ' 4칸 — 첨부 그림 그대로');
    assert(/\n(?:Change only this: |Replace her armor )/.test(B[3]), id + ' 3칸 — 바뀌는 것');
    assert(!/Identity|^Age: |^Face — /m.test(t), id + ' 이어가기는 외형을 다시 말하지 않는다');
  }
  const w = P.words(t); maxW = Math.max(maxW, w); minW = Math.min(minW, w);
  assert(w >= 200 && w <= 760, id + ' 낱말 ' + w);
  return t;
}

/* 범위 — 전 카드 × (액션 기본 · 천 설계 · 다 켠 것(자세마다) · 각성 · 저주 · 스킨마다 세 상태) × 살아 있는 화풍, 첫 카드는 화풍 전부 */
const all = {}; for (const p of S.PARAMS) { const o = p.options.find(x => x[0] && x[0] !== '__custom__'); if (o) all[p.key] = o[0]; }
const extras = { embodiment: true, silhouette: true, myth: true };
for (const card of data.cards) for (const style of (card === data.cards[0] ? S.STYLES : S.LIVE_STYLES).map(s => s[0])) {
  const base = { card: card.name, style, params: {} }, id = card.name + ' ' + style + ' ';
  check({ ...base, output: 'portrait' }, id + '액션');
  check({ ...base, output: 'portrait', design: 'cloth' }, id + '액션(천)');
  for (const a of S.ACTIONS[card.kind]) check({ ...base, output: 'portrait', action: a[0], extras, params: all, scene: 'stormy cliff at dusk' }, id + '액션 다 켬 ' + a[0]);
  check({ ...base, output: 'awaken' }, id + '각성');
  check({ ...base, output: 'cursed', scene: 'ash falling in a ruined hall' }, id + '저주');
  for (const sk of card.skins || []) for (const skinState of ['base', 'awaken', 'cursed']) check({ ...base, output: 'skin', skin: sk.key, skinState }, id + '스킨 ' + sk.key + ' ' + skinState);
}

/* 꼴마다 한 장씩 자리 대조 */
{
  const full = check({ card: '묠니르', style: 'game_keyart', output: 'portrait', action: 'shoulder', extras, scene: 'stormy cliff at dusk',
    params: { age: '20s', body: 'slender', expression: 'calm', outfit: 'battle dress', frame: 'full body with head and feet inside the frame', hairStyle: 'bob' } }, '묠니르 고른 것'), B = full.split('\n\n');
  assert.deepEqual(B[2].split('\n').slice(1, 6), ['Identity (chosen details override the automatic look)', 'Age: 20s.', 'Face — Facial ethnicity: Nordic. Eye color: ' + P.autoEye(P.cardOf(data, '묠니르')) + '.',
    'Body and hair: Body type: slender. Hair color: ' + P.autoHair(P.cardOf(data, '묠니르')) + ', independent of ethnicity. Hairstyle: bob.', 'Expression: calm.'], '2칸 — Identity · Age · Face · Body and hair · Expression');
  assert.deepEqual(B[3].split('\n').slice(2), ['Embodiment: ' + S.EMBODIMENT.slice(12).replace('(see WEAPON LOOK)', '(see the weapon look above)'), 'Silhouette: ' + S.KIND_SILHOUETTE.blunt.slice(12), S.MYTH_FLAVOR.norse, 'Outfit direction: battle dress.'], '3칸 — 선택 문단 · 옷 방향');
  assert.deepEqual(B[4].split('\n').slice(1), ['Pose: Default stance is a standing, regal, card-ready pose; motion, effects and environment may be dramatic while her design stays fully readable.', 'Posture: ' + S.ACTIONS.blunt[1][2],
    'Composition: Vertical 2:3 frame, full body with head and feet inside the frame with clear margins, no foreground occlusion, face turned toward the camera (front or three-quarter, never a back view).',
    'Shot — Framing: full body with head and feet inside the frame.', 'Scene note: stormy cliff at dusk'], '4칸 — Pose · Posture · Composition · Shot · Scene note');
  assert.deepEqual(B[5].split('\n').slice(1), ['ONE FIGURE ONLY.', S.HOLD_LINE, S.HANDS_LINE,
    'Avoid: second character, creature, text, lettering on banners or walls, logo, watermark, speech bubble, frame border, body-part enlargement, extra limbs, limb replaced by a weapon or a blade.'], '5칸 — 규칙 줄 · Avoid');
  const sk = P.build({ card: '티르핑', style: 'game_keyart', output: 'skin', params: {} }, data).split('\n\n'), skin = P.cardOf(data, '티르핑').skins[0];
  assert.deepEqual(sk[3].split('\n').slice(2), ['Skin look (replaces the weapon look on her armor; materials and colors; shape; motifs): ' + skin.look + '.',
    'Replace her armor materials, palette and motifs with the skin look above, keeping the same armor layout and silhouette logic, so the pair reads as the same character in a different outfit.'], '스킨 3칸 — 스킨 모양 바로 밑에 「the skin look above」(R6)');
  assert(sk[5].includes('\nHands stay human hands and hold nothing.\n') && sk[5].endsWith('frame border, emblems, names.'), '스킨 5칸 — 손 줄 · 「No text, logos, emblems or names.」 는 Avoid(text · logo 는 한 번)');
  const skc = P.build({ card: '티르핑', style: 'game_keyart', output: 'skin', skinState: 'cursed', params: {} }, data);
  assert(skc.indexOf('Skin note: ') > 0 && skc.includes('her armor keeps its own base colors') && !/silver plates|says silver/.test(skc), '스킨 저주 — 은색 말 없이 「갑옷은 자기 원래 색」(2026-11-11 감사 M2), 스킨 노트에 은색 풀이 괄호 없음');
  const shield = P.build({ card: '아이기스', style: 'game_keyart', output: 'portrait', params: {} }, data);
  assert(shield.includes('\n' + S.ARMOR_WEAR.shield + '\n') && shield.includes('\n' + S.ARMOR_HANDS.shield + '\n') && !shield.includes(S.HANDS_LINE), '방패 — 「no helm unless the look says so」 는 제자리(조건 마디), 손 줄은 방패 몫');
}

/* 스위치 — 끄면(또는 core 칸 틀이 없으면) 옛 꼴 그대로. 일상컷은 스위치와 상관없이 같다 */
{
  const st = { card: '묠니르', style: 'game_keyart', output: 'portrait', params: {} }, on = P.build(st, data), long = P.build({ ...st, _long: true }, data);
  const casual = { card: '묠니르', style: 'game_keyart', output: 'casual', params: {}, casual: { era: 'now', place: 'street_alley', act: 'stroll', ofam: 'everyday' } }, c1 = P.build(casual, data);
  const v2 = { ...casual, casual: { treeV: 2, era: 'now' } }, c2 = P.build(v2, data);
  assert(long.startsWith('WEAPON: Mjolnir (묠니르)') && long.includes('\n\nSUBJECT: ') && long.includes(S.BODY_LINE) && !long.includes(CF.s1 + '\n'), '옛 꼴(st._long)');
  SE.on = false;
  assert.equal(P.build(st, data), long, '스위치를 끄면 옛 꼴');
  assert.equal(P.build(casual, data), c1, '일상컷(버전1)은 스위치와 상관없다'); assert.equal(P.build(v2, data), c2, '일상컷(버전2)은 스위치와 상관없다');
  SE.on = true;
  const keep = S.CORE_FRAME; delete S.CORE_FRAME;
  assert.equal(P.build(st, data), long, 'core 칸 틀이 없으면 옛 꼴');
  S.CORE_FRAME = keep;
  assert.equal(P.build(st, data), on, '다시 켜면 칸 꼴');
  assert(c1.startsWith('CHARACTER: ') && !c1.includes(CF.s1 + '\n') && !c2.includes(CF.s1 + '\n') && c1.includes(S.BODY_LINE), '일상컷은 칸 꼴이 아니다(그대로)');
  /* 기록의 지시문도 같은 꼴 — 생성기 · 지시문 묶음 · 계획기가 같은 조립부를 쓴다 */
  const rec = P.record({ style: 'game_keyart', output: 'awaken', params: {} }, P.cardOf(data, '묠니르'), data, '2026-11-11T00:00:00.000Z');
  assert.equal(rec.prompt, P.build({ card: '묠니르', style: 'game_keyart', output: 'awaken', params: {} }, data), '기록의 지시문 = 조립부');
  assert(rec.prompt.split('\n\n')[3].startsWith('3. ARMOR — AWAKENED\n'), '기록의 각성 지시문도 칸 꼴');
}
console.log('PASS 칸 꼴 지시문: ' + n + '장(전 카드 · 액션 · 천 · 다 켬 · 각성 · 저주 · 스킨 세 상태) · 칸 머리 = core 칸 틀 · 잃은 마디 0(' + lostChecked + '마디 대조) · 옛 줄 이름 없음 · 낱말 ' + minW + '~' + maxW + ' · 스위치 · 일상컷 그대로');
