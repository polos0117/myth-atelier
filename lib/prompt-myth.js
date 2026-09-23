/* 프롬프트 조립 — 표(lib/prompt-spec.js)와 카드 자료를 받아 영어 프롬프트 한 덩이를 만든다.
   화면 없이 node 로도 부른다(tests/prompt-engine.cjs).

   설정(st): {card, style, output(portrait|awaken|cursed|casual|skin), skin(스킨 열쇠), skinState(base|awaken|cursed), design('mecha'|'cloth'), extras:{embodiment,silhouette,myth}, action(''=없음),
             casualIndex, scene, params:{ethnicity, age, …, *_custom}}
   자료(data): {cards:[…], group:{myth:{name,en}, kind:{name,en}}, skills:{…}}

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

  /* 값이 __custom__ 이면 직접 입력을, 비면 자동(있으면 신화권 기본)을 */
  function paramValue(def, params, card) {
    var v = params && params[def.key];
    if (v === '__custom__') v = (params[def.key + '_custom'] || '').trim();
    if (!v && def.auto) v = def.auto[card.myth] || '';
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

  /* 일상컷 — 첨부 그림의 같은 사람. 갈래·예시·자세·방향·표정·의상·장면·강도 축 */
  function casualLines(st, card, data) {
    var S = spec(), sc = st.casual || {}, out = [], details = [], k;
    var catRow = null;
    for (k = 0; k < S.CASUAL_CATS.length; k++) if (S.CASUAL_CATS[k][0] === sc.cat) catRow = S.CASUAL_CATS[k];
    out.push(S.CASUAL_RULES.input);
    out.push(S.OUTPUTS.casual.text);
    out.push(S.CASUAL_RULES.project);
    var guide = sc.cat === '__custom__' ? (sc.catCustom || '').trim() : (catRow ? catRow[2] : '');
    if (guide) out.push('CATEGORY: ' + guide);
    var ex = '';
    if (sc.ex === '__custom__') ex = (sc.exCustom || '').trim();
    else if (sc.ex) { var rows = S.CASUAL_EXAMPLES[sc.cat] || []; for (k = 0; k < rows.length; k++) if (rows[k][0] === sc.ex) ex = rows[k][2] || rows[k][1]; }
    if (ex) out.push('EXAMPLE SCENE: ' + ex);
    if (sc.cat === 'motif_editorial' && card.look) out.push('WEAPON LOOK for the fashion translation: ' + card.look + '.');
    if (sc.pose && S.CASUAL_POSE_EN[sc.pose]) details.push('pose: ' + S.CASUAL_POSE_EN[sc.pose]);
    if (sc.orient && S.CASUAL_ORIENT_EN[sc.orient]) details.push('orientation: ' + S.CASUAL_ORIENT_EN[sc.orient]);
    if (sc.expr && S.CASUAL_EXPRESSION_EN[sc.expr]) details.push('expression: ' + S.CASUAL_EXPRESSION_EN[sc.expr]);
    var frame = paramValue(paramDef('frame'), st.params, card), lens = paramValue(paramDef('lens'), st.params, card);
    if (frame) details.push('framing: ' + frame);
    if (lens) details.push('lens: ' + lens);
    if ((sc.outfit || '').trim()) details.push('outfit and props: ' + sc.outfit.trim());
    if ((sc.scene || '').trim()) details.push('scene: ' + sc.scene.trim());
    S.CASUAL_AXES.forEach(function (ax) {
      var v = sc.axes && sc.axes[ax];
      if (v && v !== 'AUTO' && S.CASUAL_AXIS_GUIDES[ax] && S.CASUAL_AXIS_GUIDES[ax][v]) details.push(ax.replace(/_/g, ' ') + ': ' + v + ' \u2014 ' + S.CASUAL_AXIS_GUIDES[ax][v][1]);
    });
    if (details.length) out.push('SCENE DETAILS (within identity and mode boundaries):\n' + details.join('\n'));
    if (sc.pose || sc.orient || frame || lens) out.push(S.CASUAL_RULES.priority);
    out.push(S.CASUAL_RULES.material);
    out.push(S.CASUAL_RULES.camera);
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
    return lines.filter(Boolean).join('\n\n');
  }

  function words(text) { return (text.match(/\S+/g) || []).length; }

  var api = { build: build, casualLines: casualLines, fileName: fileName, skinOf: skinOf, skinState: skinState, figureURL: figureURL, styleRow: styleRow, actionRow: actionRow,
              paramValue: paramValue, identity: identity, words: words, cardOf: cardOf };
  root.AtelierPrompt = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
