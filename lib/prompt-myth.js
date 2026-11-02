/* 프롬프트 조립 — 표(lib/prompt-spec.js)와 카드 자료를 받아 영어 프롬프트 한 덩이를 만든다.
   화면 없이 node 로도 부른다(tests/prompt-engine.cjs).

   설정(st): {card, style, output(portrait|awaken|cursed|casual|skin), skin(스킨 열쇠), skinState(base|awaken|cursed), design('mecha'|'cloth'), extras:{embodiment,silhouette,myth}, action(''=없음),
             casualIndex, scene, params:{ethnicity, age, …, *_custom}, casual:{era, place, act, ofam, item, frame, lens, pose, orient, expr, outfit, scene, axes, preset}}
   자료(data): {cards:[…], group:{myth:{name,en}, kind:{name,en}}, skills:{…}, tree(일상컷 트리 data/casual-tree.json)}

   기본은 짧다: 무기 → 시각 언어 → 화풍 → 뼈대 한 문단 → 규격 → 금지. 150낱말 언저리.
   켠 선택 문단과 고른 외형만 그 사이에 끼어든다. 다 켜고 다 채워도 700낱말 안(검사가 본다). */
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
    var S = spec(), out = [], g, i, v, parts;
    for (g = 0; g < S.PARAM_GROUPS.length; g++) {
      parts = [];
      for (i = 0; i < S.PARAMS.length; i++) {
        if (S.PARAMS[i].group !== S.PARAM_GROUPS[g][0]) continue;
        v = paramValue(S.PARAMS[i], st.params, card);
        if (v) parts.push(S.PARAMS[i].label + ': ' + v + '.');
      }
      if (parts.length) out.push(S.PARAM_GROUPS[g][0].toUpperCase() + ' — ' + parts.join(' '));
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

  function build(st, data) {
    var S = spec(), card = cardOf(data, st.card);
    if (!card) return '';
    if (st.output === 'casual') {
      var style0 = styleRow(st.style) || styleRow(S.DEFAULT_STYLE), head = [];
      head.push('CHARACTER: ' + card.en + ' (' + card.name + ') personified \u2014 the same woman as the attached image. She is the human form of the ' + ((data.group && data.group.kind && data.group.kind.en && data.group.kind.en[card.kind]) || card.kind).toLowerCase() + ' of ' + ((data.group && data.group.myth && data.group.myth.en && data.group.myth.en[card.myth]) || card.myth) + ' myth.');
      head.push('STYLE: ' + style0[2]);
      /* 버전2 장면(treeV 2)이고 버전2 표가 오면 버전2 줄로(2026-11-01). 버전1 기록은 버전1 그대로 조립한다 */
      return head.concat(isV2(st, data) ? casualLinesV2(st, card, data) : casualLines(st, card, data), [S.RULES[0]]).filter(Boolean).join('\n\n');
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

    lines.push('WEAPON: ' + card.en + ' (' + card.name + '), the ' + kindEn.toLowerCase() + ' of ' + mythEn + ' myth' +
      (card.wielder ? ', wielded in legend by ' + card.wielder : '') + '. Legend: ' + card.text);
    if (card.look) lines.push('WEAPON LOOK (materials and colors; shape; motifs): ' + card.look + '.');
    if (skin) lines.push('SKIN LOOK (replaces the weapon look on her armor; materials and colors; shape; motifs): ' + skin.look + '.');
    if (skin && skinState(st) !== 'base') lines.push('SKIN NOTE: the attached image already wears this skin. Keep the skin\u2019s own armor colors and materials exactly as attached (where the text below says silver, read it as the skin\u2019s base armor color).');
    lines.push('STYLE: ' + style[2]);
    if (!awaken) lines.push('SUBJECT: ' + core.replace('{weapon}', card.en));
    lines.push(output.text);
    if (!awaken) {
      if (extras.embodiment) lines.push(S.EMBODIMENT);
      if (extras.silhouette) lines.push(S.KIND_SILHOUETTE[card.kind] || '');
      if (extras.myth) lines.push(S.MYTH_FLAVOR[card.myth] || '');
    }
    if (st.output === 'portrait' || !st.output) {
      var act = actionRow(card.kind, st.action);
      if (act) lines.push('POSTURE: ' + act[2]);
    }
    var id = identity(st, card);
    if (id.length && !awaken) lines.push('IDENTITY (chosen details override the automatic look)\n' + id.join('\n'));
    if (st.scene && st.scene.trim()) lines.push('SCENE NOTE: ' + st.scene.trim());
    lines.push(S.RULES[0]);
    if (!awaken) lines.push(S.RULES[1]);
    if (awaken && S.KEEP_HANDS) lines.push(S.KEEP_HANDS);
    lines.push(S.BODY_LINE);
    return lines.filter(Boolean).join('\n\n');
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
              paramValue: paramValue, autoHair: autoHair, autoEye: autoEye, hexName: hexName, isHex: isHex, identity: identity, words: words, cardOf: cardOf };
  root.AtelierPrompt = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
