/* 프롬프트 조립 — 표(lib/prompt-spec.js)와 카드 자료를 받아 영어 프롬프트 한 덩이를 만든다.
   화면 없이 node 로도 부른다(tests/prompt-engine.cjs).

   설정(st): {card, style, output, action, casualIndex, scene, params:{ethnicity, age, …, *_custom}}
   자료(data): {cards:[…], group:{myth:{name,en}, kind:{name,en}}, skills:{…}}

   왜 짧은가: 포켓몬 판의 이어가기 액션이 456낱말이었다. 여기는 폼도 시트도 없어 그 절반이면 된다.
   문장이 길수록 모델이 앞부분만 읽는다 — 무기와 얼굴 방향처럼 꼭 지킬 것을 앞에 둔다. */
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
  function identity(st, card) {
    var out = [], P = spec().PARAMS, i, v;
    for (i = 0; i < P.length; i++) {
      v = paramValue(P[i], st.params, card);
      if (v) out.push(P[i].label + ': ' + v + '.');
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
    var lines = [];

    lines.push('WEAPON: ' + card.en + ' (' + card.name + '), the ' + kindEn.toLowerCase() + ' of ' + mythEn + ' myth' +
      (card.wielder ? ', wielded in legend by ' + card.wielder : '') + '. Legend: ' + card.text);
    lines.push('STYLE: ' + style[2]);
    lines.push(output.text);
    if (st.output !== 'awaken') {
      lines.push(S.RULES[0]);
      lines.push(S.RULES[1]);
      lines.push(S.MYTH_FLAVOR[card.myth] || '');
    }
    if (st.output === 'portrait' || !st.output) {
      var act = actionRow(card.kind, st.action);
      lines.push('ACTION: ' + act[2]);
    }
    var id = identity(st, card);
    if (id.length && st.output !== 'awaken') lines.push('IDENTITY: ' + id.join(' '));
    if (st.scene && st.scene.trim()) lines.push('SCENE NOTE: ' + st.scene.trim());
    if (st.output !== 'awaken') { lines.push(S.RULES[2]); lines.push(S.RULES[3]); }
    else lines.push(S.RULES[2]);
    return lines.filter(Boolean).join('\n\n');
  }

  function words(text) { return (text.match(/\S+/g) || []).length; }

  var api = { build: build, fileName: fileName, styleRow: styleRow, actionRow: actionRow, paramValue: paramValue, words: words, cardOf: cardOf };
  root.AtelierPrompt = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
