# 움직임 — 정지 그림에서 만드는 장면 연출

영상은 없다. 그림 한 장 한 장을 **천천히 다가가는 카메라(켄 번스)**, **그 장면의 입자**,
**폼 → 개방이 열리는 연출(reveal)**, **짧은 장 넘김(turn)** 으로 움직여 보이게 한다.

| 파일 | 무엇 |
|---|---|
| `lib/scene-motion.js` | 모듈 전부. 의존 없음·빌드 없음, `window.AtelierMotion` 을 단다 |
| `lib/scene-motion.css` | 모듈이 만드는 층(사본·빛·고리·입자 캔버스)의 꼴 |
| `tests/scene-motion.cjs` | 모듈과 이 저장소에 붙인 자리의 브라우저 검사 |

## 1. 네 공방이 같은 두 파일을 쓴다

`lib/scene-motion.js` · `lib/scene-motion.css` 는 **book · pkm · myth · atelier(건담) 네 저장소에 글자 하나 다르지 않게** 둔다.

- 두 파일 첫 줄에 판이 있다: `/* scene-motion.js — version 1 (2026-10-21)` · `/* scene-motion.css — version 1 (2026-10-21)`.
  고치면 **두 파일의 판을 함께 올리고**, 네 저장소에 그대로 복사한다. 한 저장소에서만 고치지 않는다.
- 파일 안에는 책·포켓몬·신화·건담의 말이 없다. 화면이 요소·그림 주소·씨앗·입자 종류를 넘긴다.
  화면 말(움직임 켜기·끄기)은 각 저장소의 낱말 표에 둔다 — 모듈은 낱말 표를 부르지 않는다.
- 스위치 열쇠 `atelier_motion_v1`(값 `on`·`off`)는 공방 지도(polos0117.github.io) 한 출처에서 네 공방이 같이 쓴다 — 한 곳에서 끄면 다 꺼진다.
- 검사(`tests/scene-motion.cjs` 의 0번)는 판 머리줄·js/css 판 일치·바깥에서 받는 것 없음·주제 말 없음을 본다. 다른 저장소로 옮길 때 그 부분만 떼어 가도 된다.

싣는 법:

```html
<link rel="stylesheet" href="lib/scene-motion.css?v=1">
<script src="lib/scene-motion.js?v=1"></script>
```

## 2. 지키는 것

- **동작 줄이기(prefers-reduced-motion)가 이긴다.** 켄 번스 없음, 떠도는 입자 캔버스 없음, 열리기·넘기기는 70ms 사라짐. 그동안 스위치는 잠긴다(눌러도 켤 수 없다).
- **스위치** — `setEnabled(false)` 면 켄 번스·떠도는 입자가 바로 걷히고 도는 전환은 끝 상태로 건너뛴다. 켜면 그 자리에서 되살아난다(이미 부른 컨트롤러가 다시 붙는다). 처음 값은 켜짐.
- **끊기** — 같은 열쇠(`key`, 없으면 새 그림의 부모)로 새 전환을 부르면 앞의 것은 `{cancelled: true}` 로 끝나고 남는 층이 없다. 같은 요소에 켄 번스를 다시 걸면 앞의 것이 멈춘다.
- **성능** — DOM 움직임은 transform·opacity 뿐(열리기의 조리개만 clip-path — Chromium 에서 합성기로 돈다). 입자는 캔버스 하나에 requestAnimationFrame 고리 하나, 크기는 ResizeObserver 로 받아 두고 고리 안에서 레이아웃을 읽지 않는다. 빛 입자는 색마다 한 번 그린 조각을 찍는다. 화면 밖(IntersectionObserver)·숨은 탭(visibilitychange)이면 멈춘다.

## 3. API

```js
const M = window.AtelierMotion;
M.VERSION; M.KEY;            // 1, 'atelier_motion_v1'
M.KINDS                      // 입자 종류 이름들(아래 4절)
M.enabled() · M.reduced() · M.setEnabled(bool) · M.subscribe(fn) → 풀기 함수   // fn(켜졌나)
```

### `kenBurns(el, {seed, duration, zoom, pan, startScale})` → `{pause, resume, stop, running}`
아주 느린 밀기·흘리기. `seed`(보통 그림 파일 이름)가 방향(여덟 방향 ± 조금)·속도(12~20초)·당기기/밀기를 정한다 — 같은 그림은 늘 같은 쪽으로 흐른다.
기본 1.00 → 1.07, 옆으로 2.2%, 왕복. `M.stop(el)` 로 걷는다. 꺼져 있으면 잠든 컨트롤러를 돌려주고 켜지면 돈다.

### `particles(container, kind, {density, max, seed, alpha, burst, count, origin, speed})` → `{canvas, kind, running, frames, pause, resume, destroy, done}`
- 떠도는 입자: 칸을 채우는 캔버스(칸이 static 이면 relative 로). 개수 = 넓이 ÷ 4000 css px² × 종류 밀도 × `density`, 화소비 2 이상이면 15%·3 이상이면 30% 덜, 종류마다 최소·`max`(기본 70) 상한. 캔버스 해상도는 화소비 2까지.
- `burst: true` — 한 번 터지고(가운데 또는 `origin {x,y}` 비율에서 퍼져 나가 끌림·중력으로 가라앉는다) 저절로 걷힌다. `done` 이 그때 풀린다.
- 꺼져 있으면 떠도는 것은 캔버스 없이 기다리고, 터지는 것은 아무것도 안 한다.

### `reveal(fromEl, toEl, {kind, duration, removeFrom, kenBurns:{el, seed}, key, wait, seed})` → `Promise<{cancelled}>`
폼 → 개방. 새 그림(`toEl`)이 **그 그림이 실제로 그려진 크기에 맞춘 조리개(clip-path circle)** 로 가운데서 열리고, 가장자리를 따라 빛 고리, 가운데 빛 번짐,
`kind` 입자 한 번 터짐, 옛 그림(`fromEl`)은 조금 다가가며 사라진다. 앞 55%가 열리기, 뒤가 살짝 밀어 들어가기 — `kenBurns` 를 주면 그 배율(1.04)에서 켄 번스가 이어받아 튀지 않는다. 기본 1100ms.
새 그림이 아직 안 받혔으면 `wait`(1500ms)까지 기다린다(그동안 옛 그림이 남아 빈칸이 안 보인다). `removeFrom` 이면 끝에 `fromEl` 을 걷는다.

### `turn(fromEl, toEl, {direction:'next'|'previous', duration, shift, removeFrom, kenBurns, key})` → `Promise<{cancelled}>`
장 넘김. 420ms 엇갈려 사라지기 + 읽는 쪽으로 18px 미끄러짐. 3D 책장 말림이 아니다.

### `ghost(toEl, src, {fit, transform, parent, position})` · `snapshot(el)`
화면이 그림 요소를 갈아 끼우면(Preact 의 key 등) 옛 그림은 이미 없다. 넘기기 **직전에** `snapshot(지금 그림 칸)` 으로 주소와 지금 켄 번스 변형을 적어 두고,
새 그림이 그려진 뒤 `ghost(새 칸, 주소, {transform})` 로 같은 자리에 정지 사본(배경 그림 div — `img` 가 아니라서 그림 찾기 검사에 안 걸린다)을 깔아 `fromEl` 로 넘긴다.
`parent` 를 주면 그 안에(그 칸은 positioned), 없으면 새 그림 바로 앞에 넣는다.

`cancel(key?)` — 그 열쇠(없으면 전부)의 전환을 끝 상태로.

## 4. 입자 종류

| 종류 | 모양 | 떠도는 쪽 |
|---|---|---|
| `petals` | 분홍 꽃잎, 팔랑이며 | 위에서 비스듬히 |
| `snow` | 흰 눈송이(빛) | 위에서 천천히 |
| `embers` | 주황 불티, 깜빡임 | 아래에서 올라감 |
| `ash` | 회색 재 조각 | 아무 데나 흩날림 |
| `bats` | 날갯짓하는 박쥐 몇 마리 | 옆에서 가로질러 |
| `dust` | 빛 속 먼지(따뜻한 점) | 제자리에서 떠오르고 사라짐 |
| `sparks` | 튀는 불꽃 줄 | 아무 데서 튀어 떨어짐 |
| `bubbles` | 물방울 고리 | 아래에서 올라감 |
| `leaves` | 초록·갈색 잎, 뒤집히며 | 위에서 비스듬히 |
| `pages` | 종잇조각(줄 몇 개) | 옆에서 날림 |
| `cards` | 트럼프·예고장 카드 | 옆에서 날림 |
| `stars` | 반짝이는 별(큰 것은 십자 빛) | 제자리에서 깜빡임 |
| `rain` | 비스듬한 빗줄기 | 위에서 빠르게 |
| `mist` | 큰 안개 덩이(몇 개) | 옆으로 느리게 |
| `gold` | 금빛 반짝이 | 천천히 떠오름 |
| `fireflies` | 연두 반딧불·도깨비불 | 제멋대로 떠돎 |

새 종류는 모듈에 더하고(판을 올리고 네 저장소에 복사) 각 저장소의 자료 표가 그 이름을 쓴다.

## 5. 각 공방이 제 자료를 종류로 잇는 법

모듈은 자료를 모른다. 각 저장소가 제 자료에서 종류 이름 하나를 골라 넘긴다. book 은 개방마다 적은 `particles`,
pkm 은 타입, atelier(건담)는 기체·장면 성격으로 고른다 — 그 표는 각 저장소의 이 문서에 있다.

### myth(이 저장소) — 무기의 원소·신화로

카드 자료에는 원소 칸이 없다. 대신 `look`(재질·색·문양 영어 한 줄)·`skill` 열쇠·`en` 에 원소가 적혀 있으므로
**`data/motion.json` 의 표**가 그 글에서 고른다. 코드는 표를 대기만 한다(`lib/img.js` 의 `IMG.particlesOf(card, table)`).

고르는 차례:

1. `cards[이름]` — 손으로 정한 무기(지금은 롱기누스의 창 → `gold`).
2. `rules` 를 위에서부터 — `look · skill(밑줄은 띄어쓰기) · en` 에 `match`(대소문자 안 가리는 정규식)가 처음 맞는 줄. `myth` 가 있으면 그 신화권 무기만 본다, `match` 가 없으면 늘 맞는다.
3. `myth[신화권]` — 원소 말이 없으면 신화권 기본.

| 차례 | 글에 이런 말이 있으면 | 종류 |
|---|---|---|
| 1 | lightning · thunder · storm · vajra · spark | `sparks` |
| 2 | fire · flame · ember · blaze · burn · molten · lava · forge · smith · sun · solar | `embers` |
| 3 | ice · frost · snow · winter · frozen · glacier | `snow` |
| 4 | sea · ocean · wave · tide · water · river · lake · foam · pearl · coral · conch | `bubbles` |
| 5 | mist · fog · cloud · wind · gale · veil · smoke · ghost · shadow | `mist` |
| 6 | death · dead · underworld · grave · soul · plague · curse · bone · skull · soot · reaper · venom · poison | `ash` |
| 7 | star · moon · crescent · night · cosmic | `stars` |
| 8 | (북유럽 무기면 여기서 끝) | `snow` |
| 9 | flower · blossom · petal · lotus · cherry · plum · peach · rose · love | `petals` |
| 10 | leaf · forest · tree · vine · mistletoe · oak · laurel · herb · cedar · reed | `leaves` |
| 11 | divine · holy · heaven · celestial · radiant · halo · sacred · light · sky | `gold` |
| 12 | war · earth · stone · sand · desert · mountain · rock · bronze · battle | `dust` |

신화권 기본: 북유럽 `snow` · 그리스 `gold` · 한국 `leaves` · 중국 `mist` · 일본 `petals` · 인도 `gold` · 이집트 `dust` ·
서아시아 `dust` · 켈트 `mist` · 아메리카 `leaves` · 기사 전설 `dust`.

정규식은 오해를 피하게 좁혀 두었다 — `sun-bleached`(햇빛에 바랜 나무), `leaf blade`·`leaf-shaped`(창날 모양), `gold leaf`(금박), `sound waves` 는 원소로 안 친다.
`ash` 는 물푸레나무(ash shaft)와 겹쳐서 쓰지 않고 `ashes`·`soot` 로 본다. 표를 고치면 `node tests/scene-motion.cjs` 가 모든 값이 모듈 종류인지,
모든 무기가 종류 하나를 받는지, 몇 무기의 답(묠니르 `sparks`, 레바테인 `embers`, 울르의 활 `snow`, 트리아이나 `bubbles`, 티르핑 `ash`, 아르테미스의 활 `stars`)을 본다.
지금 187자루는 embers 37 · sparks 27 · bubbles 20 · mist 19 · leaves 19 · stars 17 · dust 16 · gold 11 · petals 9 · ash 7 · snow 5.

붙인 자리:

- **도감 상세(`dex.html`)** — 큰 그림에 켄 번스(씨앗은 그림 파일 이름). 기본 ↔ 각성(스킨이면 같은 스킨의 기본 ↔ 각성)이 바뀌면 `reveal` —
  각성으로 갈 때만 그 무기의 입자가 터지고, 각성 그림 위에는 같은 입자가 옅게(밀도 0.5·투명 0.6·최대 36) 떠돈다(`.big-motion`, 넘기기 화살표 아래).
  저주·특별·일상·스킨·다른 화풍으로는 `turn`(컷 줄에서 앞이면 previous, 뒤면 next). 무기를 넘기면 상세가 새로 서므로 켄 번스만.
  "움직임 켜기·끄기" 단추(`#dex-motion`)는 신전 단추 아래. 낱말은 `lib/words.js` 의 `motion.*`.
- **크게 보기** — 켄 번스·입자 없음. 열려 있는 동안 큰 그림의 켄 번스와 떠도는 입자도 쉬고, 그새 넘긴 컷은 전환 없이 바뀐다. 닫으면 다시.
- **신전 홀(`index.html`)** — 각성·저주 보기를 켤 때 그림은 원래대로 CSS 로 겹쳐 바뀌고(.55초) 장면 가운데서 입자가 한 번 터진다 —
  카드 열둘이 섞여 있으니 무기별이 아니라 `motion.json` 의 `hall`(각성 `gold`, 저주 `ash`). 끌 때는 안 터진다.
- 결투(`duel.html`)는 제 연출(뒤집기·빛줄기·불꽃)이 이미 있어 붙이지 않았다.

## 6. 검사

```bash
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/scene-motion.cjs
```

같은 파일(판·바깥 없음·주제 말 없음), 입자 표(값이 모두 모듈 종류·신화권마다 기본·정규식이 선다·모든 무기가 종류 하나·몇 무기의 답),
입자(화소가 프레임마다 바뀐다·숨은 탭·화면 밖이면 멈춘다·destroy·종류마다 돈다), 켄 번스(같은 씨앗 같은 움직임·12~20초·transform 만),
열리기·끊기·넘기기, 스위치(저장·구독·새로고침), 동작 줄이기(켄 번스·캔버스 없음·열리기 거의 바로·도감 단추 잠김),
도감 상세(열리기·터짐·떠도는 입자·넘기기·크게 보기·스위치·포커스), 신전 홀 터짐, 다섯 크기(344×882·390×844·844×390·690×829·1280×900)에서 가로 넘침·화면 오류 없음.
그림은 검사가 만드는 단색 PNG 라 체크아웃에 그림이 없어도 돈다.
