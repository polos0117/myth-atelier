/* 낱말 표 — 화면에 뜨는 주제 낱말은 전부 여기 한 곳에서 온다.

   앞선 저장소(atelier → pkm-atelier)에서 배운 것이다. 규칙 코드는 한 줄도 안
   고쳐도 도는데, 사람이 읽는 말이 화면 코드에 박혀 있으면 주제를 바꿀 때
   "모함 건업" 같은 것이 뜬다. 그래서 화면은 W('card.cost') 로 부르고,
   주제를 바꾸면 이 파일 하나만 갈아 끼운다.

   쓰는 법
     W('card.cost')                → '값'
     W('art.count', {n: 3})        → 자리표시자가 있으면 채워 넣는다
     W('없는.열쇠')                 → 열쇠를 그대로 돌려주고 콘솔에 적는다
                                      (조용히 빈칸이 되는 것보다 낫다)

   자료의 말(신화권·무기 종류·기술 이름)은 여기 없다. 그것은 data/group.json 과
   data/skill.json 이 준다 — 카드가 늘면 자료가 늘지 화면 낱말이 늘지 않는다. */
(function (root) {
  'use strict';

  var WORDS = {
    /* 저장소 이름표 */
    'app.title': '신화 무기 공방',
    'app.subtitle': '신화 속 무기를 사람으로 그리고, 판에 놓아 자동으로 싸운다.',
    'app.code': 'MYTH / 001',
    'app.brand': 'MYTHIC ARMS × ATELIER',   /* 큰 제목 위 작은 글씨. 저장소 이름이 아니라 만든 이의 표다 */
    'workspace.signature': 'ARMORY OF LEGENDS',

    /* 항해 — 네 화면 */
    'nav.index': '공방',
    'nav.dex': '도감',
    'nav.auto': '오토 배틀',
    'nav.prompt': '프롬프트',

    /* 집 화면 */
    'home.title': '무기가 사람이 되어 싸운다.',
    'home.intro': '묠니르·아이기스·여의봉·바즈라. 신화 속 무기를 의인화한 카드로 상점에서 사고 판에 놓으면 싸움은 저절로 돈다. 사람이 하는 일은 무엇을 사고 어디에 두느냐뿐이다.',
    'home.tag': '북유럽 · 그리스 · 동아시아 · 인도 — 마흔 자루',
    'home.dex.code': '01 / CODEX',
    'home.dex.title': '신기 도감',
    'home.dex.note': '마흔 자루의 값·체력·공격·기술과 원래 주인. 그림이 올라오면 여기 걸린다.',
    'home.auto.code': '02 / AUTO BATTLE',
    'home.auto.title': '오토 배틀러',
    'home.auto.note': '금으로 사고, 앞줄·뒷줄에 놓고, 같은 자루 셋을 모아 별을 올린다. 싸움은 자동이다.',
    'home.prompt.code': '03 / STUDIO',
    'home.prompt.title': '그림 프롬프트',
    'home.prompt.note': '무기당 액션 한 장. 화풍을 고르고 문장을 받아 그림 모델에 넣는다.',
    'home.themes': '공방의 결',
    'home.themes.note': '색은 여기서 고른다. 어느 화면이든 같이 바뀐다.',
    'home.patch': '패치 기록',
    'home.patch.open': '패치 기록 보기',
    'home.patch.close': '닫기',
    'home.patch.note': '두 세션이 무엇을 왜 고쳤나. 새 것이 위.',
    'home.patch.loading': '읽는 중',
    'home.patch.none': '아직 적힌 것이 없다',
    'home.patch.fail': '패치 기록을 읽지 못했다 — docs/PATCH.md',

    /* 겉모습 */
    'ui.theme': '테마',
    'ui.density': '화면 밀도',
    'ui.density.compact': '촘촘하게',
    'ui.density.relaxed': '여유롭게',
    'ui.header.fold': '머리 접기 — 제목과 테마를 숨긴다',
    'ui.header.unfold': '머리 펼치기',
    'ui.loading': '읽는 중…',
    'ui.error': '자료를 못 읽었다 — {message}',
    'ui.back': '목록으로',
    'theme.midnight': '별의 밤', 'theme.daylight': '신전의 낮', 'theme.blossom': '벚꽃 사당',
    'theme.moss': '세계수 그늘', 'theme.plum': '자수정 궁', 'theme.sand': '사막의 제단',
    'theme.deep': '심해 신전', 'theme.ember': '대장간 불',
    'theme.note.midnight': '별빛 아래 번개 망치',
    'theme.note.daylight': '대리석과 붉은 칼집',
    'theme.note.blossom': '벚꽃잎과 시위 소리',
    'theme.note.moss': '이끼 낀 창끝',
    'theme.note.plum': '자수정과 도는 원반',
    'theme.note.sand': '모래빛 도끼날',
    'theme.note.deep': '깊은 물의 방패',
    'theme.note.ember': '불꽃과 모루',

    /* 새 판 알림 */
    'fresh.notice': '새 판이 나왔습니다. 하던 것을 마치고 눌러 주세요.',
    'fresh.reload': '갈아타기',
    'fresh.close': '닫기',
    'fresh.stamp': '판',

    /* 카드 값 — 자료 이름은 data/ 가 준다. 여기는 칸 이름뿐이다 */
    'kind.card': '무기',
    'card.myth': '신화권',
    'card.kind': '종류',
    'card.cost': '값',
    'card.cost.n': '{n}금',
    'card.hp': '체력',
    'card.atk': '공격',
    'card.spd': '공격 간격',
    'card.spd.n': '{n}박',
    'card.range': '사거리',
    'card.skill': '기술',
    'card.wielder': '원래 주인',
    'card.text': '전설',
    'card.star': '{n}성',
    'card.curse': '저주',
    'card.curse.n': '체력 {at}%부터 — 공격 +{atk}% · 기술 +{skill}% · 박자당 {bleed}%',
    'card.curse.note': '한 판에 한 번 발현. 세지는 대신 피를 잃고 치유·보호막을 못 받는다. 되살아나도 안 풀린다.',
    'card.stats': '세기',
    'range.melee': '근접 — 앞줄만 친다',
    'range.reach': '중거리 — 앞줄과 그 뒤까지',
    'range.ranged': '원거리 — 아무 줄이나',
    'range.short.melee': '근접',
    'range.short.reach': '중거리',
    'range.short.ranged': '원거리',

    /* 도감 */
    'dex.title': '신기 도감',
    'dex.filter.title': '거르기',
    'dex.filter.search': '이름·주인으로 찾기',
    'dex.filter.reset': '조건 초기화',
    'dex.filter.all': '전체',
    'dex.filter.myth': '신화권',
    'dex.filter.kind': '종류',
    'dex.filter.cost': '값',
    'dex.filter.style': '화풍',
    'dex.filter.art': '그림',
    'dex.filter.art.any': '있든 없든',
    'dex.filter.art.yes': '그림 있는 것',
    'dex.filter.art.no': '아직 없는 것',
    'dex.filter.count': '{cards}자루 · 그림 {images}장',
    'dex.filter.empty': '조건에 맞는 무기가 없다',
    'dex.view.small': '촘촘히',
    'dex.view.normal': '보통',
    'dex.style': '화풍',
    'dex.style.unknown': '화풍 미상',
    'dex.style.compare': '화풍 나란히',
    'dex.cut.portrait': '액션',
    'dex.cut.awaken': '각성',
    'dex.cut.cursed': '저주',
    'dex.cursed.note': '저주가 발현되면 이 그림으로 바뀐다',
    'dex.cut.casual': '일상컷',
    'dex.cut.extra': '특별컷',
    'dex.extra': '특별컷',
    'dex.extra.note': '저주형처럼 놀이에 안 쓰는 변주. 파일 이름 _f_extraN',
    'dex.cut.number': '{cut} {n}',
    'dex.casual': '일상컷',
    'dex.awaken.note': '3성이 되면 이 그림으로 바뀐다',
    'dex.selected': '고른 것',
    'dex.synergy': '시너지',

    /* 오토 배틀 */
    'auto.title': '오토 배틀러',
    'auto.round': '{n}라운드',
    'auto.round.of': '{n} / {total}',
    'auto.gold': '금',
    'auto.gold.n': '{n}금',
    'auto.hp': '체력',
    'auto.income': '다음 수입 {n}',
    'auto.shop': '상점',
    'auto.shop.note': '값만큼 금을 낸다. 같은 자루 셋이면 별이 오른다.',
    'auto.reroll': '다시 돌리기 {n}금',
    'auto.buy': '사기',
    'auto.sold': '팔림',
    'auto.bench': '벤치',
    'auto.bench.note': '벤치의 무기를 누르고 판의 칸을 누르면 올라간다. 다시 누르면 판다.',
    'auto.board': '내 판',
    'auto.board.cap': '판 위 {n} / {cap}',
    'auto.board.front': '앞줄',
    'auto.board.back': '뒷줄',
    'auto.enemy': '이번 상대',
    'auto.enemy.note': '{myth} 쪽으로 쏠린 판. 앞줄부터 친다.',
    'auto.synergy': '시너지',
    'auto.synergy.off': '{count} / {next}',
    'auto.synergy.on': '{count} — 켜짐',
    'auto.fight': '싸운다',
    'auto.fight.note': '판을 다 놓았으면 싸운다. 싸움은 자동이다.',
    'auto.next': '다음 라운드',
    'auto.result.me': '이겼다',
    'auto.result.them': '졌다 — 체력 −{n}',
    'auto.result.draw': '무승부 — 체력 −1',
    'auto.result.beats': '{n}박',
    'auto.result.left': '남은 것 — 나 {me} · 상대 {them}',
    'auto.log': '싸움 기록',
    'auto.log.hit': '{a} → {b} {d}',
    'auto.log.crit': '{a} → {b} {d} 치명타',
    'auto.log.splash': '{a} ⇢ {b} {d} 뒤 칸',
    'auto.log.skillhit': '{a} ✦ {b} {d}',
    'auto.log.skill': '{a} 가 {skill}',
    'auto.log.die': '{b} 쓰러짐',
    'auto.log.revive': '{b} 되살아남 ({hp})',
    'auto.log.curse': '{b} 저주 발현',
    'auto.log.bleed': '{b} 저주 {d}',
    'auto.log.stun': '{b} 멈춤',
    'auto.log.heal': '{b} 회복 +{d}',
    'auto.log.shield': '{b} 보호막 +{d}',
    'auto.log.dot': '{b} 독 {d}',
    'auto.log.selfhurt': '{b} 반동 {d}',
    'auto.log.start': '싸움 시작 — 나 {me} · 상대 {them}',
    'auto.log.end': '끝',
    'auto.won': '열 라운드를 다 이겼다',
    'auto.lost': '체력이 다했다 — {n}라운드',
    'auto.new': '새 판',
    'auto.new.note': '지금 판을 버리고 처음부터',
    'auto.autoplan': '대신 두기',
    'auto.autoplan.note': '맡긴 손이 사고 놓는다. 그다음은 네 차례',
    'auto.sell': '팔기 {n}금',
    'auto.pick': '고른 것: {name}',
    'auto.empty': '비었음',
    'auto.star': '★',
    'auto.side.me': '나',
    'auto.side.them': '상대',
    'auto.saved': '판은 이 브라우저에 남는다',
    'auto.why.gold': '금이 모자라다',
    'auto.why.bench': '벤치가 찼다',
    'auto.why.cap': '판 위 수가 상한이다',

    /* 프롬프트 생성기 */
    'prompt.title': '그림 프롬프트',
    'prompt.subtitle': '무기 하나, 화풍 하나, 출력 하나를 고르면 영어 문장이 나온다. 그림 모델에 그대로 넣는다.',
    'prompt.card': '무기',
    'prompt.card.pick': '무기를 고른다',
    'prompt.style': '화풍',
    'prompt.output': '출력',
    'prompt.action': '동작',
    'prompt.casual.index': '일상컷 번호',
    'prompt.scene': '장면 메모 (영어, 선택)',
    'prompt.scene.hint': 'stormy cliff at dusk 처럼 짧게. 비워도 된다.',
    'prompt.identity': '외형',
    'prompt.identity.note': '비우면 자동이다 — 무기와 신화권이 정한다. 고른 것만 문장에 들어가고, 무기마다 따로 기억한다.',
    'prompt.group.set': '{n}개 고름',
    'prompt.design': '설계',
    'prompt.design.note': '기본은 짧다 — 무기·화풍·뼈대 한 문단·규격뿐. 아래는 켜야 붙는 문단이다.',
    'prompt.design.kind': '설계 언어',
    'prompt.extras': '붙일 문단',
    'prompt.posture': '자세',
    'prompt.posture.none': '자동 — 서 있는 위엄 포즈',
    'prompt.figure.pick': '{label} · 그림으로 고르기',
    'prompt.color.pick': '{label} 팔레트',
    'prompt.auto': '자동',
    'prompt.casual': '일상컷 장면',
    'prompt.casual.note': '액션 그림을 첨부해 같은 사람으로 만든다. 외형 표는 안 쓰고 아래 장면 설정만 쓴다.',
    'prompt.casual.category': '일상 갈래',
    'prompt.casual.example': '장면 예시',
    'prompt.casual.pose': '자세',
    'prompt.casual.orient': '방향',
    'prompt.casual.expr': '표정',
    'prompt.casual.outfit': '의상·소품 (영어, 선택)',
    'prompt.casual.scene': '장소·상황 (영어, 선택)',
    'prompt.casual.axes': '세부 강도',
    'prompt.casual.axes.note': '자동이면 안 붙는다. 켜면 그 축의 영어 문장이 장면 설정에 들어간다.',
    'prompt.casual.random': '랜덤',
    'prompt.casual.random.field': '{label} 랜덤',
    'prompt.casual.random.all': '잠기지 않은 항목 전체 랜덤',
    'prompt.casual.lock': '잠금',
    'prompt.casual.locked': '잠김',
    'prompt.casual.lock.field': '{label} 잠금',
    'prompt.casual.tier.basic': '기본',
    'prompt.casual.tier.popular': '대중',
    'prompt.casual.tier.special': '특수',
    'prompt.eye.same': '양쪽 같은 색',
    'prompt.custom': '직접 입력',
    'prompt.result': '프롬프트',
    'prompt.copy': '복사',
    'prompt.copied': '복사했다',
    'prompt.words': '{n}낱말',
    'prompt.file': '저장할 파일 이름',
    'prompt.file.note': '그림 저장소 img/ 에 이 이름으로 올리면 등록은 자동이다. 세로 2:3, 1024×1536, webp.',
    'prompt.awaken.note': '각성은 액션 그림을 첨부해야 한다. 같은 구도에서 무기만 깨어난다.',
    'prompt.reset': '이 무기의 설정 지우기',
    'prompt.art.have': '액션 그림 있음',
    'prompt.art.none': '액션 그림 아직 없음',

    /* 그림 */
    'art.none': '그림 없음',
    'art.missing': '아직 안 만든 것',
    'art.count': '{n}장',
    'art.done': '액션 ✓',
    'art.awaken.done': '각성 ✓',
    'art.cursed.done': '저주 ✓',
    'art.states': '기본 · 각성 · 저주',
  };

  var missing = {};
  function W(key, vars) {
    var s = WORDS[key];
    if (s === undefined) {
      /* 조용히 빈칸으로 두면 화면에서만 티가 나고 원인을 못 찾는다 */
      if (!missing[key]) { missing[key] = 1; console.warn('낱말 표에 없는 열쇠: ' + key); }
      return key;
    }
    if (!vars) return s;
    return s.replace(/\{(\w+)\}/g, function (m, k) {
      return vars[k] === undefined ? m : String(vars[k]);
    });
  }

  /* 표를 통째로 갈아 끼울 때(다른 주제로 시험할 때) 쓴다 */
  function load(table) { for (var k in table) WORDS[k] = table[k]; }

  root.AtelierWords = { W: W, load: load, table: WORDS,
    missing: function () { return Object.keys(missing); } };
  root.W = W;   /* 화면에서 짧게 부르라고 */
})(window);
