/* 프롬프트 조립 — 표(lib/prompt-spec.js)와 카드 자료를 받아 영어 프롬프트 한 덩이를 만든다.
   화면 없이 node 로도 부른다(tests/prompt-engine.cjs).

   설정(st): {card, style, output, design('mecha'|'cloth'), extras:{embodiment,silhouette,myth}, action(''=없음),
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
    return tpl.replace('{name}', card.name.replace(/ /g, '_')).replace('{style}', st.style || spec().DEFAULT_STYLE)
      .replace('{n}', String(st.casualIndex || 1));
  }
  function figureURL(key, value) {
    var S = spec();
    if ((S.FIGURE_VALUES[key] || []).indexOf(value) < 0) return '';
    return S.FIGURE_BASE + (key === 'body' ? 'body' : 'hair') + '-female-' + value.replace(/ /g, '-') + '.png';
  }

  function build(st, data) {
    var S = spec(), card = cardOf(data, st.card);
    if (!card) return '';
    var style = styleRow(st.style) || styleRow(S.DEFAULT_STYLE);
    var output = S.OUTPUTS[st.output] || S.OUTPUTS.portrait;
    var g = data.group || {}, mythEn = (g.myth && g.myth.en && g.myth.en[card.myth]) || card.myth;
    var kindEn = (g.kind && g.kind.en && g.kind.en[card.kind]) || card.kind;
    var awaken = st.output === 'awaken', extras = st.extras || {}, lines = [];
    var core = S.CORE[st.design] || S.CORE.mecha;

    lines.push('WEAPON: ' + card.en + ' (' + card.name + '), the ' + kindEn.toLowerCase() + ' of ' + mythEn + ' myth' +
      (card.wielder ? ', wielded in legend by ' + card.wielder : '') + '. Legend: ' + card.text);
    if (card.look) lines.push('WEAPON LOOK (materials and colors; shape; motifs): ' + card.look + '.');
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

  var api = { build: build, fileName: fileName, figureURL: figureURL, styleRow: styleRow, actionRow: actionRow,
              paramValue: paramValue, identity: identity, words: words, cardOf: cardOf };
  root.AtelierPrompt = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
