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
    if (sc.era === 'heritage') out.push(S.CASUAL_RULES.era.replace('{myth}', mythEn));
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
      return head.concat(casualLines(st, card, data), [S.RULES[0]]).filter(Boolean).join('\n\n');
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
    lines.push(S.BODY_LINE);
    return lines.filter(Boolean).join('\n\n');
  }

  function words(text) { return (text.match(/\S+/g) || []).length; }

  var api = { build: build, casualLines: casualLines, fileName: fileName, skinOf: skinOf, skinState: skinState, figureURL: figureURL, styleRow: styleRow, actionRow: actionRow,
              paramValue: paramValue, autoHair: autoHair, autoEye: autoEye, hexName: hexName, isHex: isHex, identity: identity, words: words, cardOf: cardOf };
  root.AtelierPrompt = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
