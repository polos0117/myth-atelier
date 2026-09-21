/* 프롬프트 조립 — 표(lib/prompt-spec.js)와 카드 자료를 받아 영어 프롬프트 한 덩이를 만든다.
   화면 없이 node 로도 부른다(tests/prompt-engine.cjs).

   설정(st): {card, style, output, action, casualIndex, scene, params:{ethnicity, age, …, *_custom}}
   자료(data): {cards:[…], group:{myth:{name,en}, kind:{name,en}}, skills:{…}}

   차례가 곧 우선순위다. 모델은 앞을 더 잘 읽는다: 무기와 그 시각 언어 → 화풍 → 출력 규격 →
   "무기가 곧 그녀" → 실루엣·신화권 언어 → 자세 → 외형(고른 것만, 묶음별) → 장면 → 금지.
   외형은 비면 줄이 없다. 서른아홉 칸을 다 채워도 600낱말 안이다(검사가 본다). */
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
  function actionRow(kind, key) {
    var list = spec().ACTIONS[kind] || spec().ACTIONS.sword, i;
    for (i = 0; i < list.length; i++) if (list[i][0] === key) return list[i];
    return list[0];
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

  function build(st, data) {
    var S = spec(), card = cardOf(data, st.card);
    if (!card) return '';
    var style = styleRow(st.style) || styleRow(S.DEFAULT_STYLE);
    var output = S.OUTPUTS[st.output] || S.OUTPUTS.portrait;
    var g = data.group || {}, mythEn = (g.myth && g.myth.en && g.myth.en[card.myth]) || card.myth;
    var kindEn = (g.kind && g.kind.en && g.kind.en[card.kind]) || card.kind;
    var awaken = st.output === 'awaken', lines = [];

    lines.push('WEAPON: ' + card.en + ' (' + card.name + '), the ' + kindEn.toLowerCase() + ' of ' + mythEn + ' myth' +
      (card.wielder ? ', wielded in legend by ' + card.wielder : '') + '. Legend: ' + card.text);
    if (card.look) lines.push('WEAPON LOOK (materials and colors; shape; motifs): ' + card.look + '.');
    lines.push('STYLE: ' + style[2]);
    lines.push(output.text);
    if (!awaken) {
      lines.push(S.RULES[0]);
      lines.push(S.RULES[1]);
      lines.push(S.KIND_SILHOUETTE[card.kind] || '');
      lines.push(S.MYTH_FLAVOR[card.myth] || '');
    }
    if (st.output === 'portrait' || !st.output) {
      var act = actionRow(card.kind, st.action);
      lines.push('POSTURE: ' + act[2]);
    }
    var id = identity(st, card);
    if (id.length && !awaken) lines.push('IDENTITY — ' + id.join('\n'));
    if (st.scene && st.scene.trim()) lines.push('SCENE NOTE: ' + st.scene.trim());
    lines.push(S.RULES[2]);
    if (!awaken) lines.push(S.RULES[3]);
    return lines.filter(Boolean).join('\n\n');
  }

  function words(text) { return (text.match(/\S+/g) || []).length; }

  var api = { build: build, fileName: fileName, styleRow: styleRow, actionRow: actionRow, paramValue: paramValue, identity: identity, words: words, cardOf: cardOf };
  root.AtelierPrompt = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
