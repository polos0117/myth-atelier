/* 프롬프트 조립 — 표(lib/prompt-spec.js)와 카드 자료를 받아 영어 프롬프트 한 덩이를 만든다.
   화면 없이 node 로도 부른다(tests/prompt-engine.cjs).

   설정(st): {card, style, output(portrait|awaken|cursed|casual|skin), skin(스킨 열쇠), skinState(base|awaken|cursed), design('mecha'|'cloth'), extras:{embodiment,silhouette,myth}, action(''=없음),
             casualIndex, scene, params:{ethnicity, age, …, *_custom}, casual:{era, place, act, ofam, item, frame, lens, pose, orient, expr, outfit, scene, axes, preset}}
   자료(data): {cards:[…], group:{myth:{name,en}, kind:{name,en}}, skills:{…}, tree(일상컷 트리 data/casual-tree.json)}

   기본은 짧다: 무기 → 시각 언어 → 화풍 → 뼈대 한 문단 → 규격 → 금지. 150낱말 언저리.
   켠 선택 문단과 고른 외형만 그 사이에 끼어든다. 다 켜고 다 채워도 700낱말 안(검사가 본다).

   2026-11-11 칸 꼴: 일상컷이 아닌 지시문(액션 · 각성 · 저주 · 스킨)은 같은 글을 「머리말 + 다섯 칸」(STYLE · CHARACTER · ARMOR — 갈래 · SCENE · CONSTRAINTS)에 나눠 싣는다 —
   buildSections, 스위치 AtelierSpec.SECTIONS.on(끄면, 또는 설정에 _long 을 주면 위의 문단 꼴 그대로). 일상컷은 그대로다. */
(function (root) {
  'use strict';

  function spec() { return root.AtelierSpec; }

  function styleRow(key) {
    var S = spec().STYLES, i;
    for (i = 0; i < S.length; i++) if (S[i][0] === key) return S[i];
    return null;
  }
  function cardOf(data, name) {
    for (var i = 0; i < data.cards.length; i++) if (data.cards[i].name === name) return data.cards[i];
    return null;
  }
  /* 비면 null — 자세는 선택이다 */
  function actionRow(kind, key) {
    var list = spec().ACTIONS[kind] || [], i;
    for (i = 0; i < list.length; i++) if (list[i][0] === key) return list[i];
    return null;
  }

  /* RGB 로 고른 색(#rrggbb) — 그림 모델은 코드만으론 흐리게 읽으니 색 이름을 같이 붙인다. "#3A7BD5 (vivid medium blue)" */
  var HUES = [[15, 'red'], [35, 'orange'], [48, 'amber'], [62, 'yellow'], [80, 'yellow-green'], [150, 'green'], [186, 'teal'],
    [195, 'cyan'], [220, 'azure blue'], [250, 'blue'], [280, 'violet'], [310, 'purple'], [335, 'magenta'], [350, 'rose'], [361, 'red']];
  function isHex(v) { return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v); }
  function hexName(hex) {
    var r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, h = 0, sat, i, hue;
    sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d) h = mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
    if (sat < 0.12 || d < 0.06) return l > 0.9 ? 'white' : l > 0.72 ? 'silver' : l > 0.4 ? 'gray' : l > 0.15 ? 'charcoal gray' : 'black';
    for (i = 0; i < HUES.length; i++) if (h < HUES[i][0]) { hue = HUES[i][1]; break; }
    if ((hue === 'orange' || hue === 'amber') && l < 0.42 && sat < 0.75) hue = l < 0.22 ? 'dark brown' : 'brown';
    else if ((hue === 'yellow' || hue === 'yellow-green') && l < 0.35) hue = 'olive';
    else if (hue === 'red' && l < 0.4) hue = 'crimson';
    else if ((hue === 'violet' || hue === 'purple') && l > 0.68) hue = 'lavender';
    else if ((hue === 'magenta' || hue === 'rose') && l > 0.6) hue = 'pink';
    if ((hue === 'amber' || hue === 'yellow') && l >= 0.42 && l < 0.7 && sat > 0.45) hue = 'golden ' + hue;
    var tone = l < 0.18 ? 'very dark' : l < 0.35 ? 'dark' : l < 0.62 ? 'medium' : l < 0.8 ? 'light' : 'pale';
    if (/brown|olive|crimson|lavender/.test(hue) && tone !== 'very dark') tone = '';
    var chroma = sat > 0.7 ? 'vivid' : sat < 0.35 ? 'muted' : '';
    return [chroma, tone, hue].filter(Boolean).join(' ');
  }
  function hexPhrase(hex) { return hex.toUpperCase() + ' (' + hexName(hex) + ')'; }

  /* 머리색 자동 — 비워 두면 모델이 얼굴 계통에서 머리색을 짐작해 권마다 같아진다(북유럽 금발, 일본 흑발 …).
     그래서 카드마다 정해 준다: 카드의 hair 가 있으면 그것, 없으면 무기 색(look 의 첫 토막)에서 머리에 어울리는 색을 뽑고,
     이름으로 정한 몫(셋 중 하나)은 넓은 팔레트에서. 이름이 같으면 늘 같은 색 — 기본·각성·일상이 한 사람으로 남는다 */
  var HAIR_FROM = [
    [/platinum|pearl|moon/, 'platinum'], [/white|ivory|snow|bone|frost|foam|linen/, 'white'], [/silver|steel|tin|mist|ghost/, 'silver'],
    [/gold|golden|sun|amber|honey|maize/, 'gold'], [/bronze|copper|rust|tawny/, 'copper'], [/flame|fire|orange|ember|saffron|marigold/, 'orange'],
    [/crimson|blood|scarlet|garnet|carnelian|ruby|oxblood/, 'crimson'], [/red|vermilion|cinnabar|lacquer/, 'red'], [/rose|pink|cherry|coral/, 'pink'],
    [/violet|purple|amethyst|plum|wine/, 'purple'], [/lavender|lilac|twilight/, 'lavender'], [/navy|midnight|indigo|night/, 'navy'],
    [/azure|sapphire|lapis|cobalt|blue|sky|storm/, 'blue'], [/teal|turquoise|sea|cyan|aqua/, 'teal'], [/mint|jade|celadon/, 'mint'],
    [/green|emerald|leaf|forest|moss|olive/, 'green'], [/ebony|obsidian|ink|black|iron|charcoal|smoke|shadow/, 'black'], [/wood|oak|earth|leather|brown|sand|ochre/, 'brown']
  ];
  var HAIR_WIDE = ['white', 'platinum', 'silver', 'ash blonde', 'blonde', 'gold', 'copper', 'auburn', 'orange', 'red', 'crimson', 'pink',
    'purple', 'lavender', 'navy', 'blue', 'teal', 'mint', 'green', 'chestnut brown', 'brown', 'black', 'blue-black'];
  function nameHash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function autoHair(card) {
    if (!card || !card.name) return '';
    if (card.hair) return card.hair;
    var colors = String(card.look || '').split(';')[0].toLowerCase(), got = [], h = nameHash(card.name), i;
    for (i = 0; i < HAIR_FROM.length; i++) if (HAIR_FROM[i][0].test(colors) && got.indexOf(HAIR_FROM[i][1]) < 0) got.push(HAIR_FROM[i][1]);
    if (!got.length || h % 3 === 0) return HAIR_WIDE[(h >>> 3) % HAIR_WIDE.length];
    return got[(h >>> 5) % got.length];
  }
  /* 눈색 자동 — 머리색과 같은 까닭. 카드의 eye, 없으면 무기 색에서 눈에 어울리는 색(머리색과 겹치면 다음 것),
     셋 중 하나는 넓은 팔레트에서. 해시의 다른 자리를 써서 머리색과 따로 굴러간다. 오드아이(왼쪽)는 자동으로 안 넣는다 */
  var EYE_FROM = [
    [/gold|golden|sun|honey|maize/, 'gold'], [/amber|bronze|copper|tawny|saffron|marigold/, 'amber'], [/flame|fire|orange|ember/, 'orange'],
    [/crimson|blood|scarlet|garnet|carnelian|ruby|oxblood/, 'crimson'], [/red|vermilion|cinnabar|lacquer/, 'red'], [/rose|pink|cherry|coral/, 'pink'],
    [/violet|purple|amethyst|plum|wine/, 'purple'], [/lavender|lilac|twilight/, 'lavender'], [/navy|midnight|indigo|night/, 'navy'],
    [/azure|sapphire|lapis|cobalt|blue|storm/, 'blue'], [/sky|frost|ice|mist|pale/, 'pale blue'], [/teal|turquoise|sea|cyan|aqua/, 'teal'],
    [/green|emerald|jade|leaf|forest|moss|olive|celadon/, 'green'], [/silver|steel|tin|moon|pearl|ghost/, 'silver'],
    [/grey|gray|ash|iron|smoke|stone/, 'gray'], [/wood|oak|earth|leather|brown|ochre/, 'brown'], [/ebony|obsidian|ink|black|shadow/, 'black']
  ];
  var EYE_WIDE = ['red', 'crimson', 'amber', 'gold', 'orange', 'green', 'teal', 'pale blue', 'blue', 'navy', 'purple', 'lavender', 'pink',
    'gray', 'silver', 'hazel', 'brown', 'dark brown'];
  function autoEye(card) {
    if (!card || !card.name) return '';
    if (card.eye) return card.eye;
    var colors = String(card.look || '').split(';')[0].toLowerCase(), hair = autoHair(card), got = [], h = nameHash(card.name + '#eye'), i, pick;
    for (i = 0; i < EYE_FROM.length; i++) if (EYE_FROM[i][0].test(colors) && got.indexOf(EYE_FROM[i][1]) < 0 && EYE_FROM[i][1] !== hair) got.push(EYE_FROM[i][1]);
    if (!got.length || h % 3 === 0) { pick = EYE_WIDE[(h >>> 3) % EYE_WIDE.length]; return pick === hair ? EYE_WIDE[((h >>> 3) + 1) % EYE_WIDE.length] : pick; }
    return got[(h >>> 5) % got.length];
  }
  /* 값이 __custom__ 이면 직접 입력을, #rrggbb 면 코드와 색 이름을, 비면 자동(카드의 ethnicity, 없으면 신화권 기본)을 */
  function paramValue(def, params, card) {
    var v = params && params[def.key];
    if (v === '__custom__') v = (params[def.key + '_custom'] || '').trim();
    if (isHex(v)) return hexPhrase(v);
    if (!v && def.key === 'eyeColor') return autoEye(card);
    if (!v && def.key === 'hairColor') { v = autoHair(card); return v ? v + ', independent of ethnicity' : ''; }
    if (!v && def.auto) v = (def.key === 'ethnicity' && card.ethnicity) || def.auto[card.myth] || '';
    return (v || '').trim();
  }
  /* 묶음별로 "이름: 값." 을 모은다. 빈 묶음은 줄이 없다 */
  function identity(st, card) {
    return identityGroups(st, card).map(function (g) {
      return g[0].toUpperCase() + ' — ' + g[1].map(function (r) { return r[0].label + ': ' + r[1] + '.'; }).join(' ');
    });
  }
  /* 묶음마다 [묶음 열쇠, [[칸(PARAMS 행), 값], …]] — 옛 꼴(identity)과 칸 꼴(buildSections)이 같은 값을 쓴다 */
  function identityGroups(st, card) {
    var S = spec(), out = [], g, i, v, rows;
    for (g = 0; g < S.PARAM_GROUPS.length; g++) {
      rows = [];
      for (i = 0; i < S.PARAMS.length; i++) {
        if (S.PARAMS[i].group !== S.PARAM_GROUPS[g][0]) continue;
        v = paramValue(S.PARAMS[i], st.params, card);
        if (v) rows.push([S.PARAMS[i], v]);
      }
      if (rows.length) out.push([S.PARAM_GROUPS[g][0], rows]);
    }
    return out;
  }

  function fileName(st, card) {
    var tpl = spec().OUTPUTS[st.output || 'portrait'].file;
    var sk = skinOf(st, card);
    return tpl.replace('{name}', card.name.replace(/ /g, '_')).replace('{style}', st.style || spec().DEFAULT_STYLE)
      .replace('{n}', String(st.casualIndex || 1)).replace('{skin}', (sk ? sk.key : 'key') + (skinState(st) === 'base' ? '' : '_' + skinState(st)));
  }
  function skinState(st) { return st.skinState === 'awaken' || st.skinState === 'cursed' ? st.skinState : 'base'; }
  /* 고른 스킨 — 없거나 틀리면 그 카드의 첫 스킨 */
  function skinOf(st, card) {
    var list = card.skins || [], i;
    for (i = 0; i < list.length; i++) if (list[i].key === st.skin) return list[i];
    return list[0] || null;
  }
  function figureURL(key, value) {
    var S = spec();
    if ((S.FIGURE_VALUES[key] || []).indexOf(value) < 0) return '';
    if (((S.FIGURE_NOPIC || {})[key] || []).indexOf(value) >= 0) return '';   /* 견본 그림이 아직 없다 — 글자만(2026-11-12) */
    return S.FIGURE_BASE + (key === 'body' ? 'body' : 'hair') + '-female-' + value.replace(/ /g, '-') + '.png';
  }

  /* 일상컷 — 첨부 그림의 같은 사람. 일상컷 트리(lib/casual-tree.js, 2026-10-29 game-atelier 에서 옮김)의 시대 → 장소 → 하는 일 → 의상 → 구도로 짓는다.
     예전 갈래·예시는 변환표로 옮긴다. 차례: 입력 → 출력 → 무기 몫 → CROP → 시대·장소 줄 → 수련 도구·세시 → 고른 장면 → 옷 → 우선 → 뒤돌아보기 → 재질·카메라 → 몸·손 → 금지·점검 */
  function casualLines(st, card, data) {
    var S = spec(), CT = root.AtelierCasualTree, tree = data.tree, out = [], details = [];
    if (!CT || !tree) throw new Error('Casual tree is required (data/casual-tree.json)');
    var sc = CT.repair(tree, CT.fromLegacy(tree, st.casual || {}), card, S.CLOSE_FRAMES);
    var g = data.group || {}, mythEn = (g.myth && g.myth.en && g.myth.en[card.myth]) || card.myth;
    var p = CT.place(tree, sc.place), a = CT.act(tree, sc.act), f = CT.family(tree, sc.ofam), it = CT.item(tree, sc.ofam, sc.item);
    var close = S.CLOSE_FRAMES.indexOf(sc.frame) >= 0;
    out.push(S.CASUAL_RULES.input);
    out.push(S.OUTPUTS.casual.text);
    out.push(S.CASUAL_RULES.project);
    /* 가까운 컷 — 잘리는 선을 장면 앞에. 시대·장소 줄과 고른 장면도 위쪽(game 2026-10-29: 맨 아래면 첨부 그림의 구도에 졌다) */
    if (close) out.push(S.CASUAL_RULES.crop.replace('{edge}', S.CROP_EDGE[sc.frame]));
    if (sc.era === 'heritage') out.push(eraLine(card, mythEn));
    if (sc.era === 'in_myth') out.push(S.CASUAL_RULES.world.replace('{myth}', mythEn));
    if (sc.era === 'fantasy') out.push(S.CASUAL_RULES.fantasy);
    if (CT.screens(tree, sc.place)) out.push(S.CASUAL_RULES.screens);
    /* 수련장·세시 — 무기 종류·신화 지역에 맞춘 한 줄(2026-10-26). 트리의 하는 일에 practice·rite 가 붙은 것만 */
    if (a && a.practice && S.CASUAL_PRACTICE[card.kind]) out.push(S.CASUAL_RULES.practice.replace('{tool}', S.CASUAL_PRACTICE[card.kind]));
    if (a && a.rite && S.CASUAL_RITES[card.myth]) out.push(S.CASUAL_RULES.rites.replace('{rites}', S.CASUAL_RITES[card.myth]));
    if (p) details.push('Place: ' + (sc.era === 'in_myth' && p.key === 'myth_place' ? 'the place named in WORLD' : p.en));
    if (a) details.push('Activity: ' + a.en);
    if ((sc.outfit || '').trim()) details.push('Outfit: ' + sc.outfit.trim());
    else if (it) details.push('Outfit: ' + it.en);
    else if (f) details.push('Outfit: ' + f.en);
    /* 전통 의상 — 고른 전통이 신화 지역을 이긴다(예전 갈래 문구의 몫). 신화의 옛 땅 판은 ERA 줄이 그 시대로 옮긴다 */
    if (f && f.guide && sc.era !== 'heritage') details.push('Outfit note: ' + f.guide);
    if (sc.pose && S.CASUAL_POSE_EN[sc.pose]) details.push('Pose: ' + S.CASUAL_POSE_EN[sc.pose]);
    if (sc.orient && S.CASUAL_ORIENT_EN[sc.orient]) details.push('Orientation: ' + S.CASUAL_ORIENT_EN[sc.orient]);
    /* 프레이밍·렌즈는 장면 칸 — 비어 있으면 예전처럼 외형 칸(shot)의 영어 문장 */
    var frame = S.CASUAL_FRAME_EN[sc.frame] || paramValue(paramDef('frame'), st.params, card);
    var lens = S.CASUAL_LENS_EN[sc.lens] || paramValue(paramDef('lens'), st.params, card);
    if (frame) details.push('Framing: ' + frame);
    if (lens) details.push('Lens / perspective: ' + lens);
    if (sc.expr && S.CASUAL_EXPRESSION_EN[sc.expr]) details.push('Expression: ' + S.CASUAL_EXPRESSION_EN[sc.expr]);
    if ((sc.scene || '').trim()) details.push('Scene note: ' + sc.scene.trim());
    S.CASUAL_AXES.forEach(function (ax) {
      var v = sc.axes && sc.axes[ax];
      if (!v || v === 'AUTO' || !S.CASUAL_AXIS_GUIDES[ax] || !S.CASUAL_AXIS_GUIDES[ax][v]) return;
      var closeGuide = close && S.CLOSE_AXIS_GUIDES[ax] && S.CLOSE_AXIS_GUIDES[ax][v];
      details.push(ax.replace(/_/g, ' ') + ': ' + v + ' — ' + (closeGuide || S.CASUAL_AXIS_GUIDES[ax][v][1]));
    });
    out.push('SCENE (chosen):\n' + details.join('\n'));
    out.push(close ? S.CASUAL_RULES.wardrobeClose : S.CASUAL_RULES.wardrobe);
    if (sc.pose || sc.orient || frame || lens) out.push(S.CASUAL_RULES.priority);
    if (S.LOOK_BACK.orient.indexOf(sc.orient) >= 0 || S.LOOK_BACK.pose.indexOf(sc.pose) >= 0) out.push(S.CASUAL_RULES.lookBack);
    out.push(S.CASUAL_RULES.material);
    out.push(S.CASUAL_RULES.camera);
    out.push(S.BODY_LINE, S.CASUAL_RULES.hands);
    out.push(S.CASUAL_RULES.negative);
    out.push(S.CASUAL_RULES.final);
    return out;
  }
  /* 일상컷 버전2(신화 공방 2026-11-01, book 의 buildCasualV2 를 신화 꼴로 — lib/casual-tree-v2.js) — 하는 일 없이 몸 자세 · 받침 · 구도 · 두 손 · 소품 · 다리 · 시선을 한 줄씩.
     시대 · 화면 · 세시 줄은 버전1 과 같은 자리. 도장 · 제례 장소면 수련 도구 · 세시 줄(버전1 은 하는 일에 달렸다). 무기는 들지 않으니 알아볼 거리 소품은 없다 */
  var EXPR_GAZE = [[/,?\s*gaze slightly to the side/, ''], [/\bdirect (\w+) gaze\b/, '$1 eyes'], [/\bhard forward gaze\b/, 'hard eyes'],
    [/\bsoft distant gaze past the camera\b/, 'soft distant eyes'], [/\bgaze softened and directed slightly upward or away\b/, 'softened eyes'],
    [/\bgaze direct and unwarm\b/, 'eyes unwarm'], [/ fixed on one point/, ''], [/ looking away/, ''], [/,?\s*eyes off camera/, ''], [/\bgaze angled down and away,\s*/, '']];
  function exprNoGaze(text) { return EXPR_GAZE.reduce(function (t, r) { return t.replace(r[0], r[1]); }, String(text || '')); }
  function clean(v) { return String(v || '').trim(); }
  function fill(tpl, o) { return tpl.replace(/\{(\w+)\}/g, function (_, k) { return o[k] == null ? '' : o[k]; }); }
  /* 버전2 장면 칸만 — 생성기의 일상 칸(st.casual)에는 잠금 · 번호도 같이 있다 */
  var SCENE_V2 = ['treeV', 'era', 'place', 'ofam', 'item', 'posture', 'support', 'frame', 'body', 'head', 'camera', 'right', 'left', 'use', 'kind', 'legs', 'gaze',
    'weather', 'expr', 'preset', 'prop', 'outfit', 'ofeat', 'scene', 'custom', 'axes', 'unlocked', 'unlockedAuto'];
  function sceneV2(c) { var o = {}; SCENE_V2.forEach(function (k) { if (c && c[k] !== undefined) o[k] = c[k]; }); return o; }
  function isV2(st, data) { return !!(st && st.casual && st.casual.treeV === 2 && data && data.tree2 && root.AtelierCasualTreeV2); }
  function treeV2(data) { return root.AtelierCasualTreeV2.make(data.tree2, data.tree); }
  /* 버전2 장면 → 줄. 손 · 소품 · 받침의 관계는 PROP 한 줄에서만, 오른손 · 왼손은 인물 본인 기준 */
  function casualDetailsV2(sc, t) {
    var S = spec(), R = S.CASUAL_RULES, C = root.AtelierCasualTreeV2, out = [], f = C.frame(t, sc.frame);
    var p = C.place(t, sc.place), fam = C.family(t, sc.ofam), it = C.item(t, sc.ofam, sc.item);
    var po = C.posture(t, sc.posture), su = C.support(t, sc.support), u = C.use(t, sc.use), pr = u && C.prop(t, u.prop);
    var by = function (list, k) { return list.find(function (r) { return r.key === k; }); };
    var body = by(t.v2.body, sc.body), head = by(t.v2.head, sc.head), cam = by(t.v2.camera, sc.camera);
    var bl = C.backLook(t, sc);   /* 뒷모습 돌아보기 — 돌아보는 어깨 · 손의 화면 쪽 · 얼굴 손의 팔 */
    var gaze = by(t.v2.gaze, sc.gaze || (u && u.gaze) || '');
    if (p) out.push('Place: ' + (sc.era === 'in_myth' && p.key === 'myth_place' ? 'the place named in WORLD' : p.en));
    var wt = (t.v2.weather || []).find(function (r) { return r.key === sc.weather; });
    if (wt) out.push('Weather / season: ' + wt.en + '.');
    var specs = (sc.ofeat || []).indexOf('glasses') >= 0 ? '; she wears thin-framed glasses' : '';
    if (clean(sc.outfit)) out.push('Outfit: ' + clean(sc.outfit) + specs);
    else if (it) out.push('Outfit: ' + it.en + specs);
    else if (fam) out.push('Outfit: ' + fam.en + specs);
    /* 전통 의상 — 고른 전통이 신화 지역을 이긴다(버전1 과 같다). 신화의 옛 땅 판은 ERA 줄이 그 시대로 옮긴다 */
    if (fam && fam.guide && sc.era !== 'heritage') out.push('Outfit note: ' + fam.guide);
    if (po) out.push('POSTURE: ' + po.en + '.');
    if (su && su.en) out.push('SUPPORT: ' + su.en + '.');
    /* 몸이 옆모습 · 뒤 3/4 면 얼굴도 그쪽(game MGS 일상) — 몸 표의 profile_face · turned_face */
    var bodyText = body && body.en + (body.profile_face && head && head.key === 'with_body' ? (gaze && gaze.key === 'camera' ? ', her face in profile too — only her eyes turn toward the camera' : ', her face in profile too, not turned toward the camera') : '')
      + (body.turned_face && head && head.key === 'with_body' ? ', ' + body.turned_face : '');
    out.push('COMPOSITION: ' + [(f && f.en) || sc.frame, bodyText, head && head.key !== 'with_body' && (bl ? bl.head : head.en), cam && cam.en].filter(Boolean).join('; ') + '.');
    var lens = C.lens(t, sc.frame);
    if (lens) out.push('Lens / perspective: ' + (S.CASUAL_LENS_EN[lens] || lens));
    var r = C.hand(t, sc.right), both = r && r.both && sc.right === sc.left;
    if (both) out.push('BOTH HANDS: ' + r.en + '.');
    else ['right', 'left'].forEach(function (side) {
      var k = sc[side], h = C.hand(t, k), text;
      if (k === 'prop') text = fill(R.handBusyV2, { side: side });
      else if (h) text = h.en.replace('{side}', side) + (h.elbow ? ', her elbow ' + h.elbow : '');
      if (text) out.push(side.toUpperCase() + ' HAND: ' + text + (bl ? ' — ' + bl.where(side) : '') + '.');
    });
    if (bl && bl.arm && !both) out.push(bl.arm);
    if (u && pr && !pr.signature) {
      var action = u.en.replace('{prop}', pr.en), side = sc.right === 'prop' ? 'right' : 'left';
      out.push('PROP: ' + (u.hands === 'both' ? fill(R.propBothV2, { action: action, right: u.grip.right, left: u.grip.left }) : fill(R.propOneV2, { side: side, action: action })) + '.');
    }
    var lg = C.leg(t, sc.legs);
    if (lg && f && f.legs) out.push('LEGS: ' + lg.en + '.');
    if (gaze) out.push('GAZE: ' + gaze.en + '.');
    /* 표정은 버전2 표(눈썹 · 눈꺼풀 · 입만), 없으면 버전1 문장에서 시선 말을 뗀 것. 몸이 「뒤」 이고 고개를 안 돌리면 싣지 않는다 */
    var faceHidden = body && body.face_hidden && !(head && head.look_back);
    if (clean(sc.expr) && !faceHidden) out.push('EXPRESSION: ' + ((t.v2.expressions || {})[sc.expr] || exprNoGaze(S.CASUAL_EXPRESSION_EN[sc.expr] || sc.expr)) + '.');
    if (clean(sc.scene)) out.push('Scene note: ' + clean(sc.scene));
    if (clean(sc.custom)) out.push('Note: ' + clean(sc.custom));
    S.CASUAL_AXES_V2.forEach(function (ax) {
      var v = sc.axes && sc.axes[ax];
      if (!v || v === 'AUTO' || !S.CASUAL_AXIS_GUIDES[ax] || !S.CASUAL_AXIS_GUIDES[ax][v]) return;
      var closeGuide = f && f.close && S.CLOSE_AXIS_GUIDES[ax] && S.CLOSE_AXIS_GUIDES[ax][v];
      out.push(ax.replace(/_/g, ' ') + ': ' + v + ' — ' + (closeGuide || S.CASUAL_AXIS_GUIDES[ax][v][1]));
    });
    return out;
  }
  /* 차례: 입력 → 출력 → 무기 몫 → FRAME → CROP → 시대 · 화면 · 수련 도구 · 세시 → 고른 장면 → 옷 → 돌아보기 → 재질 → 몸 · 손 → 금지 · 점검 */
  function casualLinesV2(st, card, data) {
    var S = spec(), R = S.CASUAL_RULES, C = root.AtelierCasualTreeV2, t = treeV2(data), out = [];
    var sc = C.repair(t, sceneV2(st.casual), card);
    var g = data.group || {}, mythEn = (g.myth && g.myth.en && g.myth.en[card.myth]) || card.myth;
    var body = t.v2.body.find(function (r) { return r.key === sc.body; }) || {}, head = t.v2.head.find(function (r) { return r.key === sc.head; }) || {};
    var p = C.place(t, sc.place) || {}, close = S.CLOSE_FRAMES.indexOf(clean(sc.frame)) >= 0;
    out.push(R.input, R.outputV2, R.project, R.frameV2);
    if (close) out.push(fill(R.cropV2, { edge: S.CROP_EDGE[clean(sc.frame)] }));
    if (sc.era === 'heritage') out.push(eraLine(card, mythEn));
    if (sc.era === 'in_myth') out.push(R.world.replace('{myth}', mythEn));
    if (sc.era === 'fantasy') out.push(R.fantasy);
    if (root.AtelierCasualTree.screens(t.v1, sc.place)) out.push(R.screens);
    if (p.group === 'dojo' && S.CASUAL_PRACTICE[card.kind]) out.push(fill(R.practiceV2, { tool: S.CASUAL_PRACTICE[card.kind] }));
    if (p.group === 'rite' && S.CASUAL_RITES[card.myth]) out.push(fill(R.ritesV2, { rites: S.CASUAL_RITES[card.myth] }));
    out.push('SCENE (chosen):\n' + casualDetailsV2(sc, t).join('\n'));
    out.push(close ? R.wardrobeClose : R.wardrobe);
    if (body.far && head.look_back) out.push(R.lookBackV2);
    /* 카메라 줄(버전1)은 뺀다 — 구도는 COMPOSITION, 카드 그림의 구도를 따르지 말라는 말은 FRAME 줄에 */
    out.push(R.material, R.bodyV2, R.handsV2, R.negative, R.final);
    return out;
  }

  /* 신화의 옛 땅 — 카드의 시대(era)가 있으면 그것, 없으면 그 신화권의 신화 시대(2026-11-02 — 신화권 단위였던 것을 무기마다로) */
  function eraLine(card, mythEn) {
    var when = String(card.era || '').trim() || ('the ' + mythEn + ' world in the age of its myths');
    return spec().CASUAL_RULES.era.replace('{when}', when);
  }
  function paramDef(key) {
    var P = spec().PARAMS;
    for (var i = 0; i < P.length; i++) if (P[i].key === key) return P[i];
    return { key: key, options: [] };
  }

  /* 일상컷 — 얼굴 · 화풍은 첨부 그림에 맡긴다(2026-11-03). 화풍 문장 · 얼굴 문장을 새로 주면 GPT 세션이 첨부 그림의 얼굴을 그 말대로 다시 그렸다
     (헬륨 메카 일상 — 사용자 「일상컷 저거 너무 이상해」 → 이 세 줄로 「이제 좀 낫네」). STYLE 은 「첨부 그림 그대로」, FACE 줄을 넣고, 표정은 얼굴 안에서 살짝만 */
  var REF_STYLE = "STYLE: keep the attached image's rendering exactly — the same finish, skin rendering, line weight, colour palette, saturation and lighting quality. Do not restyle her: no more realistic, no more painterly, no more 2D than the attached image. Only the outfit, pose, expression, framing and place change.";
  var REF_FACE = "FACE: exactly the face of the attached image — the same face shape, jawline, eye shape and size, nose, lips and their proportions, and the same skin rendering. Do not add skin texture, pores, harder nose or lip modelling, or any facial definition the attached image does not have.";
  var REF_EXPR = ' Show it mildly, only with her brows, eyelids and mouth corners; her face shape and features stay exactly as in the attached image.';
  function refLock(text) {
    var out = [], faced = false;
    String(text).split('\n\n').forEach(function (p) {
      if (/^STYLE: /.test(p)) { out.push(REF_STYLE); return; }
      if (/^FINAL CHECK: /.test(p)) return;
      if (/^AGE: the same adult woman as in the attached image/.test(p)) { out.push(REF_FACE); faced = true; return; }
      out.push(p.replace(/^EXPRESSION: .*$/m, function (l) { return l.replace(/\s+$/, '') + REF_EXPR; }));
    });
    if (!faced) { var i = out.findIndex(function (p) { return /^CHARACTER: /.test(p); }); out.splice(i >= 0 ? i + 1 : 1, 0, REF_FACE); }
    return out.join('\n\n');
  }
  function build(st, data) {
    var S = spec(), card = cardOf(data, st.card);
    if (!card) return '';
    if (st.output === 'casual') {
      var style0 = styleRow(st.style) || styleRow(S.DEFAULT_STYLE), head = [];
      head.push('CHARACTER: ' + card.en + ' (' + card.name + ') personified \u2014 the same woman as the attached image. She is the human form of the ' + ((data.group && data.group.kind && data.group.kind.en && data.group.kind.en[card.kind]) || card.kind).toLowerCase() + ' of ' + ((data.group && data.group.myth && data.group.myth.en && data.group.myth.en[card.myth]) || card.myth) + ' myth.');
      head.push('STYLE: ' + style0[2]);
      /* 버전2 장면(treeV 2)이고 버전2 표가 오면 버전2 줄로(2026-11-01). 버전1 기록은 버전1 그대로 조립한다 */
      return refLock(head.concat(isV2(st, data) ? casualLinesV2(st, card, data) : casualLines(st, card, data), [S.RULES[0]]).filter(Boolean).join('\n\n'));
    }
    var style = styleRow(st.style) || styleRow(S.DEFAULT_STYLE);
    var output = S.OUTPUTS[st.output] || S.OUTPUTS.portrait;
    /* 스킨의 각성·저주 — 첨부는 스킨 기본 그림, 문장은 각성·저주 그대로. 저주의 "은색 장갑은 은색으로"는 스킨 색으로 읽게 한 줄 */
    if (st.output === 'skin' && skinState(st) !== 'base') output = S.OUTPUTS[skinState(st)];
    var g = data.group || {}, mythEn = (g.myth && g.myth.en && g.myth.en[card.myth]) || card.myth;
    var kindEn = (g.kind && g.kind.en && g.kind.en[card.kind]) || card.kind;
    var awaken = st.output === 'awaken' || st.output === 'cursed' || st.output === 'skin', extras = st.extras || {}, lines = [];
    var skin = st.output === 'skin' ? skinOf(st, card) : null;
    if (st.output === 'skin' && !skin) return '';
    var core = S.CORE[st.design] || S.CORE.mecha;
    if (card.kind === 'armor' && S.ARMOR_WORN) core = core.replace(S.HOLD_LINE, (S.ARMOR_WEAR && S.ARMOR_WEAR[card.wear]) || S.ARMOR_WORN);
    if (card.kind === 'armor' && S.ARMOR_HANDS && S.ARMOR_HANDS[card.wear]) core = core.replace(S.HANDS_LINE, S.ARMOR_HANDS[card.wear]);

    /* 문단마다 이름표를 붙여 모은다 — 옛 꼴은 그대로 이어 붙이고, 칸 꼴(buildSections)은 이름표로 자리를 찾는다. 글 · 차례는 예전과 같다 */
    var add = function (k, t) { if (t) lines.push([k, t]); };
    add('weapon', 'WEAPON: ' + card.en + ' (' + card.name + '), the ' + kindEn.toLowerCase() + ' of ' + mythEn + ' myth' +
      (card.wielder ? ', wielded in legend by ' + card.wielder : '') + '. Legend: ' + card.text);
    if (card.look) add('look', 'WEAPON LOOK (materials and colors; shape; motifs): ' + card.look + '.');
    if (skin) add('skinLook', 'SKIN LOOK (replaces the weapon look on her armor; materials and colors; shape; motifs): ' + skin.look + '.');
    if (skin && skinState(st) !== 'base') add('skinNote', 'SKIN NOTE: the attached image already wears this skin. Keep the skin\u2019s own armor colors and materials exactly as attached.');   /* 「은색 판은 은색」 을 「갑옷은 자기 원래 색」 으로 바꿔(2026-11-11 감사 M2) 괄호의 은색 풀이는 뺐다 */
    add('style', 'STYLE: ' + style[2]);
    if (!awaken) add('subject', 'SUBJECT: ' + core.replace('{weapon}', card.en));
    add('output', output.text);
    if (!awaken) {
      if (extras.embodiment) add('embodiment', S.EMBODIMENT);
      if (extras.silhouette) add('silhouette', S.KIND_SILHOUETTE[card.kind] || '');
      if (extras.myth) add('myth', S.MYTH_FLAVOR[card.myth] || '');
    }
    if (st.output === 'portrait' || !st.output) {
      var act = actionRow(card.kind, st.action);
      if (act) add('posture', 'POSTURE: ' + act[2]);
    }
    var id = identity(st, card);
    if (id.length && !awaken) add('identity', 'IDENTITY (chosen details override the automatic look)\n' + id.join('\n'));
    if (st.scene && st.scene.trim()) add('scene', 'SCENE NOTE: ' + st.scene.trim());
    add('one', S.RULES[0]);
    if (!awaken) add('anatomy', S.RULES[1]);
    if (awaken && S.KEEP_HANDS) add('hands', S.KEEP_HANDS);
    add('body', S.BODY_LINE);
    if (sectionsOn(st)) return buildSections(st, card, lines);   /* 칸 꼴(2026-11-11 3단계) — 스위치 S.SECTIONS.on, 옛 꼴은 st._long */
    return lines.map(function (p) { return p[1]; }).join('\n\n');
  }

  /* ── 칸 꼴(2026-11-11 3단계 — 사용자 「초안 없이 다 진행해줘」) — 일상컷이 아닌 지시문(액션 · 각성 · 저주 · 스킨 · 스킨의 각성 · 저주)을 삼국지와 같은 「머리말 + 다섯 칸」 으로.
     글은 옛 꼴 문단 그대로이고 자리만 옮긴다: 머리말(Weapon · Subject · Output 첫 문장) → 1 STYLE(화풍) → 2 CHARACTER(고른 외형 Age · Face · Body and hair · Expression · 전설 Legend · 비율 · 몸 · 해부)
     → 3 ARMOR|COSTUME — 갈래(무기 모양 · 방어구 입는 줄 · 스킨 모양 · 바뀌는 것 Change only this · 선택 문단 · 옷 방향) → 4 SCENE(첨부 그림 그대로 Keep · 같은 그림 · Pose · Posture · Composition · Shot · 장면)
     → 5 CONSTRAINTS(ONE FIGURE ONLY · 들지 않는다 · 손 · Avoid). 칸 머리 · 해부 줄 · Avoid 줄은 core 칸 틀(AtelierSpec.CORE_FRAME — 화풍공방 core v4~), 줄 머리 · 자리 표는 S.SECTIONS.
     「No a, no b.」 금지 문장만 Avoid 로(조건 unless 마디는 제자리), 규칙 줄(She does NOT hold … · HANDS: …)은 글 그대로 5칸, 방어구의 「입는다」 줄은 무기 모양 바로 밑 3칸(it 이 가리키는 것이 바로 위에 있게).
     BODY 줄은 해부 줄과 글자 그대로 겹치는 마디(one head … natural joint)만 뺀다. 옛 줄 이름(WEAPON LOOK · SKIN LOOK)을 가리키던 말은 S.SECTIONS.refs 로 자리 말로 */
  function sectionsOn(st) {
    var S = spec();
    return !!(S.CORE_FRAME && S.CORE_FRAME.s1 && S.SECTIONS && S.SECTIONS.on === true && !(st && st._long));
  }
  /* 대문자 줄 머리 → 첫 글자만 대문자(「WEAPON LOOK (…): 」 → 「Weapon look (…): 」). 머리 뒤 글은 그대로 */
  function headCase(t) { return String(t || '').replace(/^([A-Z])([A-Z ]*[A-Z])(?=[ :(])/, function (_, a, b) { return a + b.toLowerCase(); }); }
  function sentences(text) {
    var parts = clean(text).split(/\.\s+(?=[A-Z])/);
    return parts.map(function (p, i) { return i < parts.length - 1 ? p + '.' : p; }).filter(Boolean);
  }
  /* 「No a, no b, no c.」 · 「No a, b or c.」 문장 → 금지 낱말 목록. 나머지 문장은 그대로. 「no x unless …」 마디는 문장에 남긴다.
     「, no 」 로 나열한 문장은 그 자리에서만 끊는다 — 「no limb replaced by a weapon or a blade」 의 or 는 한 낱말 안이다 */
  function splitNo(text) {
    var keep = [], avoid = [];
    sentences(text).forEach(function (sen) {
      if (!/^No\s/.test(sen)) { keep.push(sen); return; }
      var body = sen.replace(/^No\s+/, '').replace(/\.$/, ''), left = [];
      (/,\s*no\s/i.test(body) ? body.split(/,\s*no\s+/i) : body.split(/,\s*|\s+or\s+/)).map(clean).filter(Boolean).forEach(function (x) {
        if (/\bunless\b/.test(x)) left.push(x); else avoid.push(x);
      });
      if (left.length) keep.push('No ' + left.join(', no ') + '.');
    });
    return { text: keep.join(' '), avoid: avoid };
  }
  /* 해부 줄(core)과 글자 그대로 겹치는 마디만 뺀다 — 앞의 줄표(—)도 같이. 더 말하는 내용은 남는다 */
  function dropOverlap(line, core) {
    String(core || '').replace(/^[A-Za-z ]+:\s*/, '').replace(/\.$/, '').split(/;\s*/).forEach(function (cl) {
      var i = cl ? line.indexOf(cl) : -1;
      if (i >= 0) line = line.slice(0, i).replace(/\s*\u2014\s*$/, '') + line.slice(i + cl.length);
    });
    return line;
  }
  function buildSections(st, card, parts) {
    var S = spec(), CF = S.CORE_FRAME, SE = S.SECTIONS, H = SE.heads;
    var get = function (k) { var p = parts.filter(function (x) { return x[0] === k; })[0]; return p ? p[1] : ''; };
    var ref = function (t) { return (SE.refs || []).reduce(function (x, r) { return x.split(r[0]).join(r[1]); }, t); };
    var vals = function (o) { return Object.keys(o || {}).map(function (k) { return o[k]; }); };
    var kind = st.output === 'skin' ? 'skin' : (st.output === 'awaken' || st.output === 'cursed') ? st.output : 'portrait';
    var design = S.CORE[st.design] ? st.design : 'mecha', state = skinState(st);
    var genre = kind === 'portrait' ? SE.genre.portrait[design] : kind === 'skin' && state !== 'base' ? fill(SE.genre.skinState, { state: SE.genre[state] }) : SE.genre[kind];
    var avoid = [], no;
    /* 머리말 — 무기(전설은 2칸) · 뼈대 첫 문장 · 출력 첫 문장 */
    var weapon = get('weapon'), li = weapon.indexOf('. Legend: '), legend = li >= 0 ? weapon.slice(li + 2) : '';
    var subject = get('subject'), hold = '', wear = '', hands = '';
    [S.HOLD_LINE].forEach(function (l) { if (l && !hold && subject.indexOf(l) >= 0) { hold = l; subject = subject.replace(l, ''); } });
    [S.ARMOR_WORN].concat(vals(S.ARMOR_WEAR)).forEach(function (l) { if (l && !hold && !wear && subject.indexOf(l) >= 0) { wear = l; subject = subject.replace(l, ''); } });
    [S.HANDS_LINE].concat(vals(S.ARMOR_HANDS)).forEach(function (l) { if (l && !hands && subject.indexOf(l) >= 0) { hands = l; subject = subject.replace(l, ''); } });
    var o = { head: [], composition: [], pose: [], keep: [], change: [], pair: [], hands: [] };
    sentences(get('output')).forEach(function (sen) {
      if (/^No\s/.test(sen)) { no = splitNo(sen); avoid = avoid.concat(no.avoid); if (no.text) o.hands.push(no.text); return; }
      var row = (SE.output || []).filter(function (r) { return new RegExp(r[1]).test(sen); })[0];
      o[row && o[row[0]] ? row[0] : 'head'].push(ref(sen));
    });
    var head = [headCase(li >= 0 ? weapon.slice(0, li + 1) : weapon), headCase(clean(subject.replace(/\s{2,}/g, ' '))), headCase(o.head.join(' '))];
    /* 1칸 — 화풍 */
    no = splitNo(get('style').replace(/^STYLE:\s*/, '')); avoid = avoid.concat(no.avoid);
    var p1 = [CF.s1, no.text];
    /* 2칸 — 고른 외형(Age · Face · Body and hair · Expression) · 전설 · 비율 · 몸 · 해부 */
    var idHead = get('identity').split('\n')[0], age = '', expr = '', outfit = '', face = [], body = [], shot = [], other = [];
    var inRow = function (name, g, key) { var r = (SE.identity || {})[name] || []; return r.indexOf(key) >= 0 || r.indexOf(g) >= 0; };
    (get('identity') ? identityGroups(st, card) : []).forEach(function (g) {
      var rest = [];
      g[1].forEach(function (r) {
        var key = r[0].key, t = r[0].label + ': ' + r[1] + '.';
        if (inRow('age', '', key)) age = H.age + r[1] + '.';
        else if (inRow('expression', '', key)) expr = t;
        else if (inRow('outfit', '', key)) outfit = t;
        else if (inRow('face', g[0], key)) face.push(t);
        else if (inRow('body', g[0], key)) body.push(t);
        else if (inRow('shot', g[0], key)) shot.push(t);
        else rest.push(t);
      });
      if (rest.length) other.push(g[0].charAt(0).toUpperCase() + g[0].slice(1) + ' \u2014 ' + rest.join(' '));
    });
    no = splitNo(dropOverlap(get('anatomy'), CF.anatomy)); avoid = avoid.concat(no.avoid);
    var p2 = [CF.s2, headCase(idHead), age, face.length ? H.face + face.join(' ') : '', body.length ? H.body + body.join(' ') : '', expr].concat(other,
      [legend, headCase(no.text), headCase(dropOverlap(get('body'), CF.anatomy)), CF.anatomy]);
    /* 3칸 — 무기 모양 · (방어구) 입는 줄 · 스킨 · 바뀌는 것 · 선택 문단 · 옷 방향 */
    var p3 = [fill(CF.s3, { costume: SE.costume[design], genre: genre }), headCase(get('look')), wear, headCase(get('skinLook')), headCase(get('skinNote'))].concat(o.change,
      [headCase(ref(get('embodiment'))), headCase(get('silhouette')), get('myth'), outfit]);
    /* 4칸 — 첨부 그림 그대로 · 자세 · 구도 · 장면 */
    var p4 = [CF.s4].concat(o.keep, o.pair, [o.pose.length ? H.pose + o.pose.join(' ') : '', headCase(get('posture')), o.composition.length ? H.composition + o.composition.join(' ') : '',
      shot.length ? H.shot + shot.join(' ') : '', headCase(get('scene')).replace(/\s*\n+\s*/g, ' ')]);
    /* 5칸 — 한 사람 · 들지 않는다 · 손 · Avoid(겹치는 낱말은 한 번 — logo · logos 는 같은 낱말) */
    no = splitNo(get('one')); avoid = no.avoid.concat(avoid);
    var seen = {}; avoid = avoid.filter(function (x) { var k = x.toLowerCase().replace(/s$/, ''); if (seen[k]) return false; seen[k] = 1; return true; });
    var p5 = [CF.s5, no.text, hold, hands].concat(o.hands, [headCase(get('hands')), avoid.length ? fill(CF.avoid, { list: avoid.join(', ') }) : '']);
    return [head].concat([p1, p2, p3, p4, p5]).map(function (p) { return p.filter(Boolean).join('\n'); }).join('\n\n');
  }

  /* 기록(2026-11-01) — 생성기 「기록 내보내기」 · 계획기(tools/casual-plan.cjs) · 지시문 묶음(tools/prompt-pack.cjs)이 같은 꼴로 쓴다.
     storage 는 생성기 저장 상태(localStorage myth_prompt_v1 — {__card, __myth, [카드]: 설정}) 그대로라, 생성기에 넣으면 같은 지시문이 나온다.
     자리(slot): 액션 base · awaken · cursed · casualN · skin_<열쇠>[_awaken|_cursed] — 그림 저장소 records/<카드>/<자리>-ui.json */
  function slotName(st, card) {
    var out = st.output || 'portrait', sk = skinOf(st, card);
    if (out === 'casual') return 'casual' + (st.casualIndex || 1);
    if (out === 'skin') return 'skin_' + (sk ? sk.key : 'key') + (skinState(st) === 'base' ? '' : '_' + skinState(st));
    return out === 'portrait' ? 'base' : out;
  }
  function record(st, card, data, at) {
    var keep = {}, k;
    for (k in st) if (k !== 'card' && Object.prototype.hasOwnProperty.call(st, k)) keep[k] = st[k];
    var storage = { __card: card.name, __myth: card.myth };
    storage[card.name] = keep;
    var full = {}; for (k in keep) full[k] = keep[k]; full.card = card.name;
    return { version: 1, card: card.name, mode: st.output || 'portrait', slot: slotName(st, card), style: st.style || spec().DEFAULT_STYLE,
      file: fileName(st, card), record: 'records/' + card.name.replace(/ /g, '_') + '/' + slotName(st, card) + '-ui.json',
      at: at || new Date().toISOString(), storage: storage, prompt: build(full, data) };
  }

  function words(text) { return (text.match(/\S+/g) || []).length; }

  var api = { build: build, eraLine: eraLine, record: record, slotName: slotName, casualLines: casualLines, casualLinesV2: casualLinesV2, casualDetailsV2: casualDetailsV2, exprNoGaze: exprNoGaze, isV2: isV2, sceneV2: sceneV2, fileName: fileName, skinOf: skinOf, skinState: skinState, figureURL: figureURL, styleRow: styleRow, actionRow: actionRow,
              paramValue: paramValue, autoHair: autoHair, autoEye: autoEye, hexName: hexName, isHex: isHex, identity: identity, identityGroups: identityGroups, sectionsOn: sectionsOn, splitNo: splitNo, headCase: headCase, words: words, cardOf: cardOf };
  root.AtelierPrompt = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
