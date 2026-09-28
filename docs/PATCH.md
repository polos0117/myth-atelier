# 패치 기록

파일을 고친 쪽이 직접 한 칸 적는다. 규칙은 `AGENTS.md` 의 "고쳤으면 적는다" 에 있다.
집 화면(`index.html`)의 **패치 기록** 단추가 이 파일을 그대로 읽어 보여 준다.

모양은 두 줄이 전부다. 한 칸은 `##` 으로 시작하고 `날짜 · 누가 · 무엇을 바꿨나` 를
가운뎃점으로 나눈다. 그 아래 `-` 줄에 `파일 — 왜/무엇` 을 파일마다 하나씩 적는다.
날짜는 `2026-09-21` 꼴, 누가는 `claude` 또는 `gpt`, 새 칸이 위로 간다.
이 안내글은 첫 `##` 앞이라 화면이 읽지 않는다. `node tests/patch.cjs` 가 모양을 본다.

## 2026-09-28 · claude · 박물관 현판·명판과 글꼴
- museum.html — 관 이름판이 스스로 빛나고 빛 번짐(glow)까지 받아 네온사인 같았다. 권역마다 판 재질·테·글씨가 다른 현판(4.2×1m, 두께 있는 판)으로 바꾸고 조명을 받게, 밝은 판은 제 빛을 줄여 글씨가 날아가지 않게. 액자 명판·받침 이름판은 놋쇠 판에 검게 새긴 글씨
- museum.html — 캔버스 글씨가 명조가 오기 전에 쓰여 고딕으로 박히던 것: 자료를 받은 뒤 쓸 글자(무기·권·종류 이름)를 모두 넘겨 `document.fonts.load` 로 받아 두고 짓는다(2.5초 넘으면 그냥)
- museum.html — 전시실 천장 빛 줄을 문턱에서 1.2m 안쪽부터(홀에서 현판 위로 번지던 것). `__museum.view`·`doorAngle` 은 검사·스크린샷용
- docs/GAME_CONCEPT.md — 현판·명판

## 2026-09-28 · claude · 박물관 중앙 홀 그림 — 흑요석 벽·별자리 돔·보석 나침반 바닥
- data/group.json — `museum.hall = ["wall", "dome", "floor"]`. 그림 저장소 `img/ui/museum_hall_wall·dome·floor.webp` 를 올렸다
- 벽은 아래 바닥 타일 줄을 잘라(1024×1458) 문 사이 한 칸에 한 장. 바닥 원판은 별 꼭지가 여덟이라 문 아홉과 맞추지 않고 그대로 깔았다
- docs/GAME_CONCEPT.md — 홀 그림

## 2026-09-28 · claude · 박물관 중앙 홀 꾸미기
- museum.html — 홀 받침 위 금 고리에 아홉 관 깃발을 둥글게 매달아 제 관 문을 보게(깃발 그림이 오면 같이 바뀐다, 양면). 문 위 상인방에 그 관 벽 그림의 윗단. 돔은 판테온 우물 칸 네 겹을 그리고 위에서 내리찍는 UV 로, 바닥 가운데엔 아홉 관 색 빛살 나침반 원판(거울 바닥처럼 비친다). 문 사이 벽은 판 여섯 장 대신 둥근 판 하나. 홀 벽·돔·바닥 원판 그림 자리(`museum.hall`)를 만들었다 — 홀 벽 그림은 문 사이 한 칸에 한 장
- museum.html — 깃발 그림 크기 맞추기가 멈춘(freeze) 위치 때문에 반영되지 않을 수 있어 풀었다 다시 멈춘다
- data/group.json — `museum.hall` 칸(지금은 비어 있다). tests/data.cjs·tests/museum-grow.cjs — 홀 칸, 상인방도 벽 그림을 받는다
- docs/GAME_CONCEPT.md — 중앙 홀

## 2026-09-28 · claude · 박물관 인도관 — 쉬시 마할 벽·공작 깃발·흰 코끼리 감실·거울 천장 (아홉 관 완성)
- data/group.json — `museum.rooms.india = ["wall", "banner", "mural", "ceil"]`. 그림 저장소 `img/ui/museum_india_*.webp` 넷을 올렸다. 이로써 아홉 관이 모두 그림으로 섰다
- 벽은 띠마다 네 칸(313px 넷)이 떨어져 그대로 이어졌다. 천장은 대리석 들보가 네 변에 통째로 있어 네 귀 금 연꽃 가운데에서 가운데로(1123×1110) 한 칸으로. 벽화는 아래 바닥을 잘라 7:5, 깃발은 화면 초록과의 거리로 땄다
- docs/GAME_CONCEPT.md — 인도관, 아홉 관 완성

## 2026-09-28 · claude · 박물관 중국관 — 태화전 격선문 벽·황룡 깃발·구룡벽·반룡 천화
- data/group.json — `museum.rooms.china = ["wall", "banner", "mural", "ceil"]`. 그림 저장소 `img/ui/museum_china_*.webp` 넷을 올렸다
- 벽은 띠마다 네 칸(626px 둘)이 떨어져 그대로 이어졌다. 천장은 주홍 들보가 네 변에 통째로 있어 네 귀 금 연꽃 가운데에서 가운데로(1035×1022) 한 칸으로. 벽화는 양옆을 잘라 7:5, 깃발은 화면 초록과의 거리로 땄다
- docs/GAME_CONCEPT.md — 중국관

## 2026-09-28 · claude · 박물관 북유럽관 — 방패 걸린 발할라 벽·까마귀 깃발·이그드라실 감실·방패 지붕
- data/group.json — `museum.rooms.norse = ["wall", "banner", "mural", "ceil"]`. 그림 저장소 `img/ui/museum_norse_*.webp` 넷을 올렸다
- 벽: 3:2 양끝에 매듭 기둥이 통째로 있어 이으면 기둥 둘이 붙었다. 양끝 기둥 가운데에서 잘라(1481×1024) 한 개로. 천장: 창 자루 서까래가 네 변에 통째로 있어 네 귀 쇠고리 가운데에서 가운데로(1083×1078) 한 칸으로. 벽화는 양옆을 잘라 7:5, 깃발은 화면 초록과의 거리로 땄다(폭 상한 1.3m 에 걸려 조금 작다)
- docs/GAME_CONCEPT.md — 북유럽관과 양끝 기둥 자르는 법

## 2026-09-28 · claude · 박물관 켈트관 — 참나무 전당 벽·수사슴 깃발·고인돌 감실·참나무 우물천장
- data/group.json — `museum.rooms.celtic = ["wall", "banner", "mural", "ceil"]`. 그림 저장소 `img/ui/museum_celtic_*.webp` 넷을 올렸다
- 벽은 띠마다 네 칸이 떨어져 그대로 이어졌다. 천장은 네 변에 들보가 통째로 있어 겹들보가 되던 것을 네 귀 청동 장식 가운데에서 가운데로(1126×1088) 잘라 한 칸으로. 벽화는 양옆을 잘라 7:5, 깃발은 화면 초록과의 거리로 땄다
- museum.html — 깃발 그림은 폭을 1.3m 까지로. 켈트 깃발은 멧돼지 머리 봉이 천보다 넓어(가로:세로 0.6) 높이 2.6m 면 폭이 1.55m 로 액자 사이를 넘쳤다. 넘으면 비율대로 줄이고 윗단은 제자리
- docs/GAME_CONCEPT.md — 켈트관, 깃발 폭 상한

## 2026-09-28 · claude · 박물관 일본관 — 금박 후스마 벽·학 노보리·도코노마·모란 격천장
- data/group.json — `museum.rooms.japan = ["wall", "banner", "mural", "ceil"]`. 그림 저장소 `img/ui/museum_japan_*.webp` 넷을 올렸다
- 벽은 띠마다 네 칸이 딱 떨어져 그대로 이어졌다. 천장은 들보 바깥에 옆 칸 조각이 붙어 있어 네 귀 금장식 가운데에서 가운데로(1023×998) 잘라 한 칸으로. 벽화는 아래 다다미를 잘라 7:5, 깃발은 화면 초록과의 거리로 땄다
- docs/GAME_CONCEPT.md — 일본관

## 2026-09-28 · claude · 박물관 그리스관 — 채색 대리석 벽·보라 깃발·니케 감실·대리석 우물천장
- data/group.json — `museum.rooms.greek = ["wall", "banner", "mural", "ceil"]`. 그림 저장소 `img/ui/museum_greek_*.webp` 넷을 올렸다
- 벽: 3:2 에 프리즈가 4.8번 되풀이라 안 이어져, 띠마다(프리즈 321·달걀 40·번개 120.5·구슬 20px) 되풀이 몇 번치로 끊어 1284px 한 폭에 맞췄다. 마름돌 줄은 한 줄씩 줄눈에서 줄눈까지 잘라 맞추고, 그러면 모든 줄의 줄눈이 이음새에 한 줄로 서서 줄마다 옆으로 다르게 밀었다
- 천장은 그대로 이어졌고(가장자리 번개무늬가 반쪽씩), 벽화는 아래 바닥을 잘라 7:5, 깃발은 화면 초록과의 거리로 땄다
- docs/GAME_CONCEPT.md — 그리스관과 마름돌 줄 맞추는 법

## 2026-09-28 · claude · 박물관 이집트관 — 사암 신전 벽·스카라브 깃발·이시스 탑문·별하늘 천장
- data/group.json — `museum.rooms.egypt = ["wall", "banner", "mural", "ceil"]`. 그림 저장소 `img/ui/museum_egypt_*.webp` 넷을 올렸다
- 벽: 모든 띠가 네 번·여섯 번 되풀이라 그대로 이어져 손대지 않았다(프롬프트에 "모든 띠 같은 폭, 네 번"을 넣은 덕). 천장: 가장자리 색 벽돌 띠가 통째로 있어 띠 가운데에서 가운데로 잘라 한 칸으로(1154×1145 → 1024²). 벽화: 3:2 를 양옆을 잘라 7:5. 깃발: 화면 초록과의 거리로 땄다
- docs/GAME_CONCEPT.md — 이집트관

## 2026-09-28 · claude · 박물관 한국관 — 꽃담·청룡 깃발·일월오봉도·우물반자
- data/group.json — `museum.rooms.korea = ["wall", "banner", "mural", "ceil"]`. 그림 저장소 `img/ui/museum_korea_*.webp` 넷을 올렸다
- 벽: 받은 그림이 가로로 안 이어져(띠마다 되풀이 폭이 다르다) 띠별로 되풀이 몇 번치로 끊어 한 폭(1083px, 귀갑 네 번)에 맞췄다. 지붕 기와는 실내라 뺐다
- 깃발: 초록을 화면 초록과의 거리로 따서 진짜 녹색(끈·구름)이 살았다. 벽화: 아래를 남기고 위를 잘라 7:5 — 가운데 감실이 3.2m 까지 와서 액자가 들어간다. 천장: 들보를 두 번 담고 있어 들보 가운데에서 가운데로 한 칸(1039px)을 잘랐다
- docs/GAME_CONCEPT.md — 한국관과 그림 다듬는 법

## 2026-09-28 · claude · 박물관 개방 무기 진열장 메모
- docs/GAME_CONCEPT.md — 나중 목록의 개방컷에 박물관 진열장 안(액자 앞 낮은 유리장, 개방 전 봉인 천, 무기만 그린 그림 필요)을 적었다. 코드는 아직

## 2026-09-28 · claude · 박물관 — 폰에서 액자 누르기가 왼쪽 위에서만 되던 것
- museum.html — 액자 고르기에 렌더 픽셀 좌표를 넘겼는데 `scene.pick` 은 CSS 픽셀을 받아 안에서 해상도 배율로 한 번 더 나눈다. 폰(배율 1.6)에서는 탭이 2.5배 바깥으로 가서 왼쪽 위만 먹었다(한 번 탭 자세히도 같았다). CSS 픽셀로 넘긴다
- tests/browser-harness.cjs — `open(…, { dpr })` 로 화면 밀도를 줄 수 있게
- tests/museum-screen.cjs — 폰 검사를 화면 밀도 3 으로. 고치기 전 코드에서 두 번 탭 검사가 실패하는 것을 확인했다

## 2026-09-28 · claude · 박물관 — 두 번 눌러 액자 앞으로
- museum.html — 액자를 두 번 누르면(폰 두 번 탭, PC 두 번 클릭) 그 앞 2.3m 로 미끄러져 가서 액자를 본다. 다른 방 액자면 이 방 문 → 그 방 문 → 액자로. 걷기·돌기·끌기가 들어오면 멈춘다. 한 번 누르기는 두 번째를 0.32초 기다렸다 자세히를 연다. 고를 때 벽도 가림막으로 넣어 벽 너머 액자가 안 잡힌다. `__museum.screenOf`·`walking` 은 검사용
- lib/words.js — 도움말에 "두 번 누르면 그 앞으로"(myth32)
- tests/museum-screen.cjs — 폰에서 두 번 탭으로 그 액자 앞에 서고 자세히는 안 열림, 한 번 탭은 자세히

## 2026-09-28 · claude · 박물관 서아시아관 천장 그림
- data/group.json — `museum.rooms.westasia` 에 `ceil`. 그림 저장소 `img/ui/museum_westasia_ceil.webp`(1024², 청금석 우물 칸에 이슈타르 별, 갈매기 무늬 삼나무 들보). 가장자리 들보가 이웃 칸과 만나 겹들보가 되고 가운데 빛 줄이 그 사이를 지난다
- docs/GAME_CONCEPT.md — 천장 그림 만드는 법

## 2026-09-28 · claude · 박물관 천장을 관마다
- museum.html — 방 천장이 모두 같은 갈색이었다. 권역마다 판·들보 색과 가운데 무늬가 다른 우물천장(3.5m 한 칸, 폭 7m 에 두 칸 — 가운데 빛 줄이 이음새)을 코드가 그린다. 이집트는 푸른 바탕에 노란 별, 서아시아는 청금석에 이슈타르 별. `museum_<권>_ceil.webp` 를 적으면 그 그림으로. 그림 벽처럼 상태 색과 제 빛을 탄다
- tests/data.cjs·tests/museum-grow.cjs — ceil 칸. docs/GAME_CONCEPT.md — 천장 줄

## 2026-09-28 · claude · 박물관 서아시아관 — 청금석 벽·깃발·이슈타르 문 벽화
- museum.html — 관 그림에 끝 벽 벽화(`mural`)를 더했다. 벽 그림은 한 장이 벽 높이(5m)이고 가로로 이어 붙는다. 깃발 그림은 투명 배경이라 받으면 제 비율로 폭을 넓힌다. 그림 벽·벽화는 제 빛을 조금 섞어(`wallE`) 따뜻한 빛에 청금석이 잿빛으로 죽지 않게
- data/group.json — `museum.rooms.westasia = ["wall", "banner", "mural"]`. 그림 저장소 `img/ui/museum_westasia_wall·banner·mural.webp` 를 올렸다(벽은 로제트 띠를 한 줄만 남겨 1:2 로, 깃발은 초록 배경을 따서, 벽화는 7:5 로)
- tests/museum-grow.cjs·tests/data.cjs — 벽화 칸. docs/GAME_CONCEPT.md — 관 그림 규칙과 만드는 법

## 2026-09-28 · claude · 박물관 깃발을 권역마다 다르게
- museum.html — 코드가 그리는 깃발이 모든 방에서 서아시아식(붉은 천·금 테)이었다. 권역마다 천 색·테·문장을 따로(북유럽 은 매듭, 그리스 번개무늬, 한국 오방색 띠, 중국 황금 천, 일본 쪽빛 문장, 인도 연꽃, 이집트 줄무늬와 해 원반, 서아시아 날개 달린 해, 켈트 소용돌이). 표에 없는 새 권은 제 색을 어둡게 한 천에 둥근 문장
- docs/GAME_CONCEPT.md — 권역 깃발 줄

## 2026-09-28 · claude · 박물관이 권·카드가 늘어도 서게, 관 그림 자리
- museum.html — 홀 반지름을 신화권 수에서 잡는다(아홉까지 14m 그대로, 열다섯이면 22m). 문 사이가 좁아져 방이 겹치지 않게. 방 길이는 전처럼 무기 수에서. 권마다 벽·깃발 그림, 공통 바닥 그림을 그림 저장소 `img/ui/museum_*` 에서 받아 바꿔 끼우고, 못 받거나 안 적힌 권은 코드가 그린 그대로. `__museum.plan()` 으로 치수·바꾼 수를 본다
- data/group.json — `museum: {floor, rooms}` 칸. 지금은 비어 있다
- tests/museum-grow.cjs — 새 검사. 페이지 안에서 자료를 열다섯 권·서아시아 쉰다섯 점으로 부풀려 겹침·걷기·그림 바꿔 끼우기(받은 것·404)를 본다
- tests/data.cjs — museum 칸 모양. AGENTS.md·docs/GAME_CONCEPT.md — 늘리기와 관 그림 규칙

## 2026-09-28 · claude · 박물관을 궁전 전시실처럼 밝고 선명하게
- museum.html — 참고 그림처럼 밝고 선명하게. 빛·노출을 올린 따뜻한 색, 금맥 검은 대리석 거울 바닥(반사 흐림 줄임), 방과 홀에 화로와 흔들리는 불빛, 액자 사이 붉은 깃발, sharpen, 해상도 상한 올림, 원본 그림을 5.5m 안으로. 스포트라이트는 지금 방 액자만 비춰 홀 바닥의 갈색 쐐기를 없앴다
- docs/GAME_CONCEPT.md — 박물관 모습 줄 갱신

## 2026-09-28 · claude · 도감 박물관 단추를 검색줄로
- dex.html — 박물관 단추를 목록 줄에서 검색줄(조건 초기화 옆)로 옮겼다. 좁은 화면에선 목록 줄이 네 가지로 붐벼 글자가 세로로 꺾였다. 목록 줄은 줄바꿈되고 단추 글자는 안 꺾인다. 480px 아래에선 검색칸이 한 줄, 단추 둘이 그 아래

## 2026-09-28 · claude · 박물관을 Babylon.js 로 옮긴다 — 빛 번짐·스포트라이트·대리석
- museum.html — 3D 를 three.js 에서 Babylon.js 9 로. 빛 번짐·ACES 톤·가장자리 그늘(저주엔 색 번짐·입자감), 액자 둘레만 빛나는 빛 테, 가까운 액자 넷을 따라가는 스포트라이트,
  대리석 바닥·굽도리·금 걸이 띠·천장 빛 줄·홀 기둥, 입자 먼지(기본 떠돎·각성 떠오름·저주 가라앉음). 그림은 제 빛으로 — 색 조명에 물들지 않게. 걷기·명판·자세히·상태 셋은 그대로
- tests/browser-harness.cjs — babylonjs 를 node_modules 에서. AGENTS.md · docs/GAME_CONCEPT.md — 설명

## 2026-09-28 · claude · 3D 박물관 — 도감의 그림을 걸어 다니며 본다
- museum.html — 새 화면. 가운데 둥근 홀에서 신화권 아홉 전시실이 뻗고, 무기마다 액자 하나(명판·뒤 빛). WASD·방향키·Q·E·끌기, 폰은 손잡이. 전시실 바로 가기.
  가까이 선 액자는 원본으로, 아래 명판에 주인·전설. 누르면 자세히(큰 그림·기술·도감으로). 상태 기본·각성·저주 — 그림과 함께 벽·안개·테두리·뒤 빛·먼지가 바뀐다(각성 금빛, 저주 핏빛 안개와 깜박임). 없는 상태 그림은 기본 그림을 그 빛으로 물들인다
- dex.html — 목록에 "박물관" 단추. `dex.html?card=<이름>` 이면 그 무기 상세로 바로
- lib/words.js — 박물관 문구. 캐시 번호 올림
- tests/museum-screen.cjs — 액자 수·전시실·걷기·바로 가기·명판·자세히·상태 셋·폰 손잡이·도감 잇기. tests/browser-harness.cjs — three 를 node_modules 에서
- AGENTS.md · docs/GAME_CONCEPT.md — 검사 목록과 박물관 설명

## 2026-09-28 · claude · 오토 배틀 무기 정보 보기
- auto.html — 판·벤치의 내 무기를 누르면(고르기와 함께) 정보가 뜬다: 별만큼 오른 체력·공격·공격 간격, 사거리, 기술, 저주, 신화권·종류 시너지(지금 판에서 몇 장인지), 원래 주인·전설. 팔기 단추도 그 안에.
  상대 판·로비에서 본 남의 판·상점 그림·결과 화면의 두 판도 누르면 같은 정보(그 사람 판 기준 시너지)
- lib/words.js — 문구. 캐시 번호 올림
- tests/auto-screen.cjs — 내 무기·상대 무기·상점 정보

## 2026-09-28 · claude · 오토 배틀을 여섯이 하는 판으로 (TFT 식)
- lib/auto.js — 나 + 맞수 다섯(전설의 대장장이, 버릇 fast·econ·reroll). 체력 100, 마지막 하나가 남을 때까지(1~6등), 라운드 제한 없음.
  레벨·경험치(라운드 2, 4금에 4, 레벨 1~9 = 판 위 수), 레벨별 상점 확률, 이자 최대 5, 연승·연패 금. 수호자 라운드(1~3, 9·15·21…)는 모두가 같은 판과, 이기면 금.
  맞대결은 섞어서 둘씩, 홀수면 유령. 지면 라운드 기본(뒤로 갈수록 큼) + 살아남은 상대 수. 판의 세 권 무기를 여섯이 나눠 쓰는 더미(값마다 22·17·13·10·8장).
  판 세 줄 × 네 칸, 벤치 아홉. 근접은 가장 앞줄, 중거리는 바로 뒤까지. 옛 14라운드 버그는 라운드 제한과 함께 사라졌다
- auto.html — 로비(여섯의 체력·레벨·연승·순위, 누르면 그 판과 시너지를 본다), 레벨 업 단추와 경험치 막대, 상대 이름·유령·수호자, 상점에 남은 장수,
  결과에 다른 짝들, 끝에 순위. 판 열두 칸·벤치 아홉 배치(휴대폰 3열 로비·5열 벤치). 저장 열쇠 `myth_auto_v2` — 옛 판은 새 판으로
- lib/words.js — 로비·레벨·맞수 이름·수호자·유령 문구. 캐시 번호 올림
- tests/auto-sim.cjs — 새 규칙 249가지(레벨·더미 장수 보존·짝·유령·수호자·탈락·순위·여섯이 끝까지). 보고는 여섯 중 순위·판 길이·시너지
- tests/auto-screen.cjs — 로비 여섯·레벨 업·살펴보기·열두 칸
- docs/GAME_CONCEPT.md — 규칙과 굴려 본 것을 새로, 나중 작업 목록 갱신

## 2026-09-27 · claude · 오토 배틀 싸움 다시 보기
- auto.html — 싸우기를 누르면 판 위에서 싸움이 돈다: 체력·보호막 막대가 줄고, 맞은 칸은 붉게 번쩍이며 흔들리고 피해 숫자가 떠오른다(치명타 금색·도트 분홍·회복 초록·보호막 파랑). 친 칸은 한 걸음 나서고, 기술은 금 테두리에 기술 이름, 저주 발현은 저주 그림으로 바뀌며 심홍 빛, 되살아남은 흰 빛, 멈춤은 ✶. 2배속(이 브라우저에 남는다)·건너뛰기·다시 보기. 도는 동안은 결과·기록을 숨긴다. 새로고침으로 다시 온 판이나 움직임 줄이기 설정이면 끝난 판을 바로 보인다
- lib/auto.js — `replayAt(result, t)`: 기록을 t 까지 접어 그 순간의 체력·보호막·쓰러짐·저주·멈춤과 방금 일어난 일을 준다. 결과에 시작 보호막 `sh0`. 싸움 규칙·결과는 그대로
- lib/words.js — 다시 보기 문구, 빠져 있던 기록 줄 영생(`regen`)·되돌림(`thorns`). 캐시 번호 올림
- tests/auto-sim.cjs — 다시 보기를 끝까지 접으면 결과와 같다, 처음엔 모두 온전, 중간도 판 안. tests/auto-screen.cjs — 도는 동안 체력이 준다·2배속 저장·건너뛰기·다시 보기
- docs/GAME_CONCEPT.md — 오토 배틀 나중 작업 목록(14라운드 버그 · 종류 2단 · 체력 압박 · 한국 창 · 편의)

## 2026-09-27 · claude · 프롬프트 생성기 "스킨 있는 무기만"
- prompt.html — 무기 고르기 아래 체크 칸. 켜면 지역은 스킨 있는 무기가 있는 곳만(스킨 수), 무기 목록엔 스킨 이름이 붙고, 고르면 출력이 스킨으로 바뀐다. 켤 때 고른 무기에 스킨이 없으면 비운다. 켠 상태는 저장된다
- lib/words.js — 문구. 캐시 번호 올림
- tests/prompt-screen.cjs — 스킨만 보기: 지역·무기 거르기, 출력이 스킨, 파일 이름, 끄면 전부

## 2026-09-27 · claude · 도감에서 스킨 있는 무기만 거르기
- dex.html — 거르기에 "스킨" 칸: 있든 없든 · 스킨 있는 것(카드 자료) · 스킨 그림까지 있는 것. 검색이 스킨 이름(프림 블레이드, 바라기…)도 찾는다. 넓은 화면 거르기 칸 여섯 줄
- lib/words.js — 문구. 캐시 번호 올림
- tests/dex-screen.cjs — 스킨 거르기 둘과 스킨 이름 검색

## 2026-09-27 · claude · 간장막야 스킨 바라기
- data/card.json — 간장막야 · 바라기(`baragi`). 눈물을 마시는 새의 쌍신검: 해바라기·달바라기 쌍검을 한 자루로 합친 별철 검, 날 둘이 한 자루에 나란히. 개인용이라 원작 이름 그대로

## 2026-09-27 · claude · 클라우 솔라스 스킨 프림 블레이드
- data/card.json — 클라우 솔라스 · 프림 블레이드(`prim`). 드래곤 라자의 에고 소드: 흑철 날에 빛나는 흰 금속 심, 날과 한 몸인 가드, 검은 보석, 흰 가죽 손잡이. 개인용이라 원작 이름 그대로

## 2026-09-27 · claude · 프롬프트 생성기 눈색·머리색을 RGB 로 고른다
- prompt.html — 눈동자(오른쪽·오드아이)·머리색 칸을 RGB 고르개로: 색 상자, HEX 칸, R/G/B 막대와 0–255 숫자. 옛 동그라미는 아래 "빠른 선택"으로 남아 누르면 그 이름이 들어간다. 드롭다운은 뺐다
- lib/prompt-myth.js — 값이 `#rrggbb` 면 프롬프트에 코드와 영어 색 이름을 같이 넣는다(`#3A7BD5 (medium azure blue)`). 이름은 색상·명도·채도에서 만든다
- lib/words.js — 고르개 문구. 캐시 번호 올림
- tests/prompt-engine.cjs · tests/prompt-screen.cjs — hex 문장, 색 이름, HEX↔막대↔색 상자 연동, 빠른 선택

## 2026-09-27 · claude · 열셋째 신전 청금석 성문(서아시아 · 황혼), 가운데 뒤에 지구라트
- lib/workspace.css — 황혼 팔레트(청금석 남색, 금 강조, 푸른 신호), 별 뿌린 하늘, 천천히 가라앉는 금가루, 기둥 그림 `hall_lapis_col`(457×1497)과 금 부조 마스크. 어두운 신전·기둥 목록에 더함
- index.html · lib/workspace.css — 새 층 `.hall-back`: 기둥 뒤·카드 뒤 가운데에 서는 큰 건물 하나. 평소엔 숨고 lapis 에서만 지구라트 그림 `hall_lapis_back`(1412×931)이 선다. 각성엔 부조가 금으로 차오르고 저주엔 핏빛으로 깜박인다
- 그림 저장소 img/ui — 사용자가 뽑은 이슈타르 문 기둥과 지구라트, 자홍 바탕을 땄다. 마스크는 청금석 띠 안에 든 금(사자·황소·로제트)만
- lib/workspace-theme.js · lib/workspace-ui.js · lib/words.js — 테마 열쇠 `lapis`, 문장(계단 탑·별), 이름표. data/group.json 신전 lapis → 서아시아
- tests/workspace-theme.cjs — 테마 열셋. 캐시 번호 올림
- docs/GAME_CONCEPT.md — 서아시아 신전 기록

## 2026-09-27 · claude · 아홉째 신화권 서아시아(메소포타미아·레반트·페르시아), 무기 열다섯
- data/card.json · data/skill.json — 서아시아 열다섯, 종류마다 셋, 금액대마다 셋. 새 기술 열다섯(효과는 있는 것만)
- data/synergy.json · lib/auto.js — 눈에는 눈(`thorns`): 맞은 피해의 15% / 30% 를 때린 쪽에 되돌린다. 되돌림은 다시 안 돌아온다. 기록에 `thorns`
- data/wielder.json · data/draft.json — 주인 열여섯, 인연 여덟(악연 하나), 천둥의 형제에 아다드의 번개·바알의 쌍곤봉
- data/group.json — 이름표·색(청금석 #4a57b8), 이집트 다음 차례
- lib/prompt-spec.js · lib/words.js — 서아시아 옷 언어와 얼굴 계통(Middle Eastern), 집 문구. 캐시 번호 올림
- tests/auto-sim.cjs — 눈에는 눈 검사
- docs/GAME_CONCEPT.md · README.md · PROMPT_IMAGE_WORKFLOW.md · .claude/skills/upload-art/SKILL.md — 135장

## 2026-09-26 · claude · 열두째 신전 나일 열주(이집트 · 황혼), 헌원검 집행의 대검 그림
- lib/workspace.css — 황혼 팔레트(보랏빛 밤, 금 강조, 청록 신호), 별 뿌린 하늘, 비스듬히 흐르는 금빛 별똥, 기둥 그림 `hall_nile_col`(532×1504)과 금 상감 마스크. 어두운 신전·기둥 목록에 더함
- 그림 저장소 img/ui — 사용자가 뽑은 파피루스 기둥, 자홍 바탕을 땄다. 상형 문양과 사암이 거의 같은 색이라 마스크는 가운데 판·날개 해 안의 밝은 금만
- lib/workspace-theme.js · lib/workspace-ui.js · lib/words.js — 테마 열쇠 `nile`, 문장(피라미드·해·강물), 이름표. data/group.json 신전 nile → 이집트
- 그림 저장소 img — 헌원검 `judge` 스킨 기본·각성·저주 셋
- tests/workspace-theme.cjs — 테마 열둘. 캐시 번호 올림

## 2026-09-26 · claude · 여덟째 신화권 이집트, 무기 열다섯
- data/card.json · data/skill.json — 이집트 열다섯, 종류마다 셋, 금액대마다 셋. 새 기술 열다섯(효과는 있는 것만)
- data/synergy.json · lib/auto.js — 영생(`regen`): 박자마다 최대 체력 2.5% / 4.5% 회복, 저주 중엔 없다. 기록에 `regen`
- auto.html — 시너지 설명의 % 를 소수 한 자리까지(2.5%)
- data/wielder.json · data/draft.json — 주인 열다섯, 인연 여덟(악연 둘), 활의 명수에 아멘호테프의 활
- data/group.json — 이름표·색(홍옥수 주황 #e07b39), 인도 다음 차례
- lib/prompt-spec.js · lib/words.js — 이집트 옷 언어와 얼굴 계통, 집 문구. 캐시 번호 올림
- tests/auto-sim.cjs — 영생 검사(둘이면 회복, 저주 중·하나일 땐 없음)
- docs/GAME_CONCEPT.md · README.md · PROMPT_IMAGE_WORKFLOW.md · .claude/skills/upload-art/SKILL.md — 120장

## 2026-09-26 · claude · 그림 검수에 손 보기를 넣음
- .claude/skills/upload-art/SKILL.md — 손가락이 이상한 그림이 여럿 그대로 올라갔다. 올리기 전에 장마다 손(손가락 수·녹은 마디·물건과 섞임)을 보고, 틀리면 어느 장인지 짚는다

## 2026-09-24 · claude · 열한째 신전 단청 전각(한국 · 달밤)
- lib/workspace.css — 달밤 팔레트(남빛 바탕, 뇌록 강조, 주홍 신호), 별 뿌린 밤하늘, 오르는 연등, 기둥 그림 `hall_dancheong_col`(452×1497)과 금 상감 마스크. 어두운 신전·기둥 목록에 더함
- 그림 저장소 img/ui — 사용자가 뽑은 기둥. 단청의 초록이 뚫리지 않게 이번만 자홍 바탕으로 받아 땄다. 마스크는 금 메달리온과 금 띠, 주춧돌은 뺐다
- lib/workspace-theme.js · lib/workspace-ui.js · lib/words.js — 테마 열쇠 `dancheong`, 문장(기와 지붕 아래 두 기둥과 달), 이름표
- data/group.json — 신전 dancheong → 한국
- tests/workspace-theme.cjs — 테마 열하나. 캐시 번호 올림

## 2026-09-24 · claude · 동아시아를 한국·중국·일본 셋으로, 새 무기 서른
- data/card.json — `east` 를 `korea`(일곱) · `china`(여섯) · `japan`(둘)로 옮기고 새 서른(한국 8 · 중국 9 · 일본 13)으로 권마다 열다섯, 금액대마다 셋. 헌원검은 5금으로(중국 4금이 넷이었다). 한국 무기의 `ethnicity` 는 지웠다
- data/skill.json — 새 기술 서른(효과는 있는 것만), 천명 +25% → +30%
- data/synergy.json · lib/auto.js — 한국 호국(`guard`, 받는 피해 −15% / −30%), 일본 일섬(`critChance`, 평타 20% / 40% 두 배), 중국은 기 그대로
- lib/auto.js · auto.html — 옛 판의 `east` 는 한국·중국·일본으로 받는다(`liveMyths`). 신화권 고르개도 그것으로
- data/wielder.json · data/draft.json — 주인 스물일곱, 인연 열다섯(세종의 발명·서유기·삼황·삼종신기·요술 방망이·동방의 명궁 등, 악연 둘), 무라마사는 저주받은 검에도
- data/group.json — 이름표·색(한국 청록 · 중국 주홍 그대로 · 일본 벚꽃 분홍), 신전 blossom → 일본 · ember → 중국
- lib/prompt-spec.js — 옷 언어와 얼굴 계통 자동값을 셋으로
- lib/words.js · dex.html — 문구, 도감 옛 거르개 `east` 는 거르지 않는다. 캐시 번호 올림
- tests/auto-sim.cjs · tests/hall-screen.cjs — 호국·일섬·옛 판 검사. 신전 검사의 "그림 없는 무기"는 자료에서 찾는다(천부인에 그림이 생겼다)
- docs/GAME_CONCEPT.md · README.md · PROMPT_IMAGE_WORKFLOW.md · .claude/skills/upload-art/SKILL.md — 셋 떼기 기록, 105장

## 2026-09-24 · claude · 그림 검수에서 "무기 안 보임"을 흠으로 잡지 않게
- .claude/skills/upload-art/SKILL.md — 인물이 곧 무기라 손에 무기가 없는 게 규칙대로다. 없다고 짚지 말고, 든 무기가 생겼을 때만 흠으로 본다

## 2026-09-23 · gpt · 이미지 파일명 무기 이름 공백은 밑줄로

- IMAGE_RULES.md · PROMPT_IMAGE_WORKFLOW.md — 이미지 생성 후 파일명에 들어가는 무기 이름의 공백을 모든 출력에서 반드시 밑줄로 치환하도록 명시

## 2026-09-23 · gpt · A/B 보정에서 외모·체형 옵션 수정 허용

- PROMPT_IMAGE_WORKFLOW.md — B안은 A안의 카메라 구도를 유지하면서 외모·체형을 생성기 선택 옵션으로 먼저 수정하고, 선택지가 없거나 부족한 경우에만 텍스트를 보충하도록 명시

## 2026-09-23 · claude · 드래프트 카드의 신화권 색 줄 정렬

- lib/workspace.css — 드래프트 카드(`.df-card`)와 던전 고르기 칸(`.rn-pick .cell`)을 세로 flex 로, 내용을 위로 붙인다. 버튼은 격자 칸 높이만큼 늘어나면 내용을 가운데로 모아서, 설명 줄 수가 다른 카드끼리 그림과 색 줄이 최대 16px 어긋났다(휴대폰). 주인 카드의 이름 칸은 높이를 박고 두 줄까지(넓으면 96px, 휴대폰 72px). 캐시 번호 myth21

## 2026-09-23 · claude · 전설의 무기 후보 목록

- docs/reference/legendary-weapons.md(새) — 나무위키 「전설의 무기」(2026-08-25 판)를 사용자가 붙여 준 본문으로 추렸다. 권별 표(이름·출전·주인·한 줄·카드 여부), 우리 카드와 닿는 짚을 점(브류나크 이름의 출처, 하르페는 곡검, 프라가라흐의 주인 등), 한국 떼기 후보, 쓰지 않는 성물. 원문 문장은 옮기지 않고 출처·라이선스를 적었다
- docs/GAME_CONCEPT.md — "다음 권"에서 이 목록을 가리킨다

## 2026-09-23 · claude · 생성기 무기 고르기를 지역과 이름으로

- prompt.html — 무기 고르개 하나(신화권 묶음)를 둘로: 지역(`#pm-myth`, "켈트 · 그림 0/15"처럼 그 권의 그림 수)과 이름(`#pm-card`, 그 권의 무기만, 그림이 없으면 "그림 없음"). 지역을 바꾸면 무기 칸이 빈다. 고른 지역도 저장(`__myth`). 넓으면 나란히, 좁은 휴대폰은 위아래
- lib/words.js — 지역 낱말
- tests/prompt-screen.cjs — 지역마다 그 권의 무기만·다 돌면 전부·지역 저장·바꾸면 빔

## 2026-09-23 · claude · 안개의 선돌 기둥

- lib/workspace.css — 켈트 신전 기둥을 빌린 발할라 것에서 제 그림으로(`hall_stone_col`·`hall_stone_runes`, 613×1394). 그림 저장소 `img/ui/` 에 올렸다 — 초록을 따고, 오검 한 줄·삼중 나선·갓의 매듭을 금 상감 마스크로(덮는 넓이 3.7%)

## 2026-09-23 · claude · 열 번째 신전 "안개의 선돌"(켈트) · 신전마다 모시기

- lib/workspace.css · lib/workspace-theme.js · lib/workspace-ui.js · lib/words.js — 테마 `stone` 안개의 선돌(켈트 · 안개): 팔레트(AA 여섯 쌍 통과), 바닥 안개 배경, 옆으로 흐르는 안개 자락, 선돌 문장. 기둥은 그림이 오기 전까지 발할라의 룬 돌기둥을 빌린다 — 오면 `[data-theme="stone"] .hall-col` 한 줄만 `hall_stone_*` 로
- data/group.json — `temple`: 신전(테마) → 신화권. 만신전은 null(전부)
- lib/img.js — 신전 모시기를 신전마다(`myth_hall_v1` = {테마: [이름…]}), 처음 판(배열)은 만신전 몫으로. 캐시 번호 myth5
- index.html — 지금 테마의 신전에 모신 무기를, 비었으면 그 신전의 신화권 그림에서 무작위로(여덟이 안 되면 다른 권으로 채움). 테마를 바꾸면 바로 다시 고른다
- dex.html — 단추·개수·비우기에 신전 이름("발할라의 밤에 모신다"), 테마를 바꾸면 그 신전 몫으로 다시 읽는다
- tests/hall-screen.cjs — 신전별 신화권·신전마다 따로·옛 저장. tests/theme-screen.cjs · tests/workspace-theme.cjs — 테마 수를 박지 않는다

## 2026-09-23 · claude · 신전에 모실 무기를 도감에서

- lib/img.js — 신전 고르기(`myth_hall_v1`, 열둘까지): `hallPicks`·`setHallPicks`·`toggleHall`·`hallShotsOf`(입은 스킨이면 스킨의 기본·각성·저주). 캐시 번호 myth4
- dex.html — 상세에 "신전에 모신다/내린다"(찼으면 막힘)와 개수, 목록에 신전 표시와 "신전 n / 12 · 신전 비우기"
- index.html — 신전 홀이 도감에서 모신 무기를 그 차례로 돌린다. 비어 있으면 그림 있는 무기 중에서 **매번 무작위로** 열둘(전에는 늘 card.json 앞의 열둘). 썸네일이 아직 없으면 원본으로 한 번 더(막 올린 그림이 이름표로 뜨던 것). "신전에 모실 무기는 도감에서 고른다" 길
- lib/workspace.css — 그 길의 모양. 좁은 휴대폰에서 메인 태그가 상자 밖으로 삐져나오던 것(켈트를 더하며 길어졌다)을 줄바꿈으로
- lib/words.js — 신전 낱말
- tests/hall-screen.cjs(새) — 무작위 열둘·모시기·목록 표시·메인 차례·이름표·스킨·열둘 상한·비우기

## 2026-09-23 · claude · 원작 없는 스킨을 검토안에

- docs/GAME_CONCEPT.md — "아직 시험할 것"에 원작 없는 스킨(신전·계절·다른 전승) 한 칸

## 2026-09-23 · claude · 올리기 도구가 스킨 등록을 못 알아보던 것

- tools/upload-art.py — 자동 등록을 기다릴 때 칸 꼴(base·awaken·casual…)을 따지던 것을 "올린 파일 이름이 img.json 에 다 적혔나"로. 티르핑 서리 스킨은 등록됐는데 도구가 3분 뒤 실패라고 했다

## 2026-09-23 · claude · 책은 이형으로

- docs/GAME_CONCEPT.md — "다음 권"에 책 규칙: 이형·지원 기술, 고르는 차례, 경전과 신화 무기가 나오는 작품(삼국지연의·오디세이아 등)은 빼기, 권마다 한두 권, 그림은 문양으로만
- IMAGE_RULES.md — 글자 없음 규칙을 책 카드까지 넓히고, 훈민정음의 낱자 문양만 예외

## 2026-09-23 · claude · 한국 떼기 계획

- docs/GAME_CONCEPT.md — "다음 권"에 한국 떼기: 때(밀린 그림을 채운 뒤 새 열다섯과 한 번에), 그때까지 동아시아에 더하지 않기, 한국·중국·일본 각 열다섯 후보, 떼면서 고칠 자리, 훈민정음 메모(낱자 문양만 글자 규칙 예외)

## 2026-09-23 · claude · 권마다 열다섯 · 판의 신화권 둘

- data/card.json — 북유럽·그리스·인도·켈트에 다섯씩 스물(글레이프니르·울르의 활·흐룽니르의 숫돌·프레이의 검·걀라르호른 / 에로스의 활·하데스의 투구·크로노스의 낫·아레스의 창·오디세우스의 활 / 카마의 활·판차잔야·카우모다키·비자야·바사비 샥티 / 누아다의 은팔·게이 데르그·다그다의 곤봉·론고미니아드·프라가라흐). 일흔다섯, 권마다 열다섯
- data/skill.json · data/wielder.json · data/draft.json — 기술 스물, 주인 열여섯, 인연 열다섯(악연 넷), 원탁에 론고미니아드
- lib/auto.js — `MYTHS_PER_GAME` 3 → 2. 75장에서 셋은 한 판 45장(완주 53%), 둘은 30장(완주 65%, 3금 3성까지 상점 51 → 34번). auto.js 캐시 번호 4
- lib/words.js · auto.html — 신화권 줄 문구가 권 수를 표에서 받는다(`{all}권 중 {n}권`)
- tests/auto-sim.cjs · tests/auto-screen.cjs — 권 수를 박지 않는다
- README.md · docs/GAME_CONCEPT.md · .claude/skills/upload-art/SKILL.md — 일흔다섯, 판의 신화권 둘과 잰 값, "다음 권" 묶음 계획

## 2026-09-23 · claude · 판의 신화권 · 한국 무기 다섯

- lib/auto.js — 판마다 다섯 권 중 셋만(`MYTHS_PER_GAME`·`st.myths`·`inPlay`). 상점과 상대가 그 셋에서만 나온다. `newGame(data, seed, {myths})`, 첫 라운드 빈손이면 `setMyths`. 옛 판(myths 없음)은 전부
- auto.html — "이번 판의 신화권" 줄: 켜진 셋, 첫 라운드 빈손이면 골라 "이 셋으로", 사면 잠긴다. auto.js 캐시 번호 3
- data/card.json — 한국 무기 다섯(도깨비 방망이·만파식적·칠지도·이순신의 활·천부인)을 동아시아에. 한국 무기 일곱에 `ethnicity: "Korean"`
- data/skill.json · data/wielder.json · data/draft.json — 기술 다섯, 주인 다섯(도깨비·신문왕·근초고왕·이순신·환웅), 인연 셋
- lib/prompt-myth.js — 얼굴 계통 자동값을 카드의 `ethnicity` 가 먼저 정한다. 캐시 번호 4
- lib/words.js · README.md · docs/GAME_CONCEPT.md · .claude/skills/upload-art/SKILL.md — 신화권 줄 낱말, 무기 수를 박지 않는 문구, "판의 신화권" 칸과 잰 값
- tests/auto-sim.cjs · tests/auto-screen.cjs · tests/prompt-engine.cjs — 신화권 셋·상점·상대·바꾸기·잠김·옛 판, 화면 줄, 카드 얼굴 계통

## 2026-09-23 · claude · 켈트 열 자루

- data/card.json — 켈트 열 자루(리아 팔·페일노트·타슬럼·수켈루스의 망치·다그다의 솥·칼라드볼그·브류나크·클라우 솔라스·게이 볼그·엑스칼리버). 값·체력·공격은 같은 금액대의 기존 띠 안
- data/skill.json — 기술 열(새 효과 없이 기존 종류만)
- data/group.json — 신화권 `celtic` 켈트, 색 #4fae7e
- data/synergy.json · lib/auto.js — 켈트 시너지 투혼(`frenzy`): 잃은 체력 비율만큼 공격 +40% / +80%
- data/wielder.json — 주인 아홉. data/draft.json — 인연 일곱(악연 하나)
- lib/prompt-spec.js — 켈트 신화권 문양 문단, 얼굴 계통 자동값
- lib/words.js · README.md · docs/GAME_CONCEPT.md · .claude/skills/upload-art/SKILL.md — 마흔 → 쉰, 카탈로그 칸
- tests/auto-sim.cjs — 투혼 검사. tests/run-screen.cjs · tests/prompt-screen.cjs — 카드 수를 박지 않고 card.json 에서 센다
- 값: 오토 배틀 맡긴 손 완주 58% → 55%(상점이 묽어졌다). 드래프트·던전은 거의 그대로

## 2026-09-23 · claude · 월광 대검 스킨을 뺀다

- data/card.json — 찬드라하스의 `moonlight` 스킨을 뺐다. 곡도에 곧은 대검을 입히는 건 치장이 아니라 다른 무기다. 그림은 아직 없었다
- docs/GAME_CONCEPT.md — 스킨은 원래 무기와 형태가 맞을 때만

## 2026-09-23 · claude · 스킨의 각성·저주

- tools/register-images.py — `_f_skin_<열쇠>_awaken` · `_cursed` 를 받는다. `img.json` 의 스킨 칸이 `skin: {f: {열쇠: {base, awaken, cursed}}}` 꼴로(아직 등록된 스킨이 없어 옮길 것은 없었다)
- lib/img.js — `skinSets`. `dressOf` 가 스킨의 상태 그림을 먼저 쓰고, 없을 때만 `fx` 로 효과를 덮게 알린다. 캐시 번호 myth3
- run.html · auto.html — 효과 층은 `fx` 일 때만
- dex.html — 스킨을 보면 기본·각성·저주 단추, 크게 보기에 스킨 상태 그림 포함
- lib/prompt-spec.js · lib/prompt-myth.js · prompt.html — "스킨 상태"(기본·각성·저주). 각성·저주는 스킨 기본을 첨부하고 그 상태 문장에 스킨 묘사와 "장갑 색은 스킨 색 그대로" 한 줄. 파일 이름 `_skin_<열쇠>_awaken`
- tools/upload-art.py — 칸 `skin_<열쇠>_awaken` · `_cursed`, 스킨 기본과 구도 대조, 스킨 묘사 출력
- tests/skin-screen.cjs · tests/prompt-engine.cjs · tests/data.cjs — 스킨 각성 그림은 효과 없이, 없는 저주는 효과로. 스킨 상태 문장·파일 이름·칸 꼴
- IMAGE_RULES.md · PROMPT_IMAGE_WORKFLOW.md · .claude/skills/upload-art/SKILL.md · docs/GAME_CONCEPT.md — 스킨 각성·저주

## 2026-09-23 · claude · 스킨 둘 더

- data/card.json — 헌원검 · 집행의 대검(`judge`), 찬드라하스 · 월광 대검(`moonlight`). 서리 룬검과 함께 첫 셋
- docs/GAME_CONCEPT.md — 첫 스킨 목록

## 2026-09-23 · claude · 스킨

- data/card.json — 카드에 `skins: [{key, name, look}]` 자리. 첫 스킨 티르핑 · 서리 룬검(`frost`)
- tools/register-images.py — `_f_skin_<열쇠>.webp` 를 `img.json` 의 `skin: {f: {열쇠: 파일}}` 로. card.json 에 없는 열쇠는 안 받는다. `--prune` 도 스킨을 본다
- lib/img.js — `skinFiles`·`skinPick`·`setSkinPick`·`dressOf`. 고른 스킨은 `myth_skin_v1`(카드 → 열쇠). 캐시 번호 myth2
- dex.html — 상세에 스킨 칸, 크게 보기에 스킨 포함, "판에서 이 스킨으로" 입기·벗기
- run.html · auto.html · draft.html — 고른 스킨으로 그린다. 각성·저주는 스킨 그림 위에 `.skin-fx` 효과로
- lib/workspace.css — `.skin-fx` 각성(금빛 테두리·빛줄기)·저주(심홍 테두리·바랜 색). 던전 초상이 45% 로 흐리던 것 고침 — 누를 수 없는 초상이 `button:disabled` 의 투명도를 받고 있었다(던전을 만든 때부터)
- lib/prompt-spec.js · lib/prompt-myth.js · prompt.html — 출력 "스킨": 첨부 그림의 같은 구도에서 장갑만 스킨 `look` 으로, 파일 이름 `_f_skin_<열쇠>`
- tools/upload-art.py — 칸 `skin_<열쇠>=경로`, 열쇠 확인, 기본과 구도 대조
- tests/skin-screen.cjs(새) · tests/data.cjs · tests/prompt-engine.cjs — 스킨 칸·입기·던전 효과·벗기, 열쇠 꼴, 스킨 문장·파일 이름
- IMAGE_RULES.md · PROMPT_IMAGE_WORKFLOW.md · .claude/skills/upload-art/SKILL.md · docs/GAME_CONCEPT.md — 스킨 규칙. 뒷모습이어도 평상시 장면은 일상컷

## 2026-09-23 · claude · 던전 전리품과 상점

- lib/run.js — 덱이 길 내내 이어진다(`st.deck`, 싸움마다 새로 만들지 않는다). 이기면 금화와 전리품 셋 중 한 장(`takeReward`), 새 칸 상점(`buy`·`removeCard`·`shopHeal`·`purify`·`leaveShop`). 예비가 올라오면 쓰러진 무기의 카드가 빠지고 새 무기의 넉 장이 든다. 덱·금화 없이 저장된 길은 `ensure` 가 그때의 동료로 덱을 만든다
- data/run.json — 길이 아홉 칸(저주의 문 뒤 상점, 휴식은 보스 앞으로). 종류마다 전리품 카드 셋(보통 둘·희귀 하나), 기본기에 `basic` 표시. `loot`·`shop` 표. 2·3마나 기본기를 마나당 ×0.63 → ×1.35·×1.45 로 — 전엔 무슨 카드를 더해도 덱이 약해졌다. 상대 체력↑ 공격↓ 보스 폭↓(`enemyHpDiv` 5→3, `enemyAtk` 0.7→0.46, `enemyHpPerNode` 0.12→0.18, `bossHp` 1.7→1.25)
- run.html — 이긴 화면에 금화·전리품 셋, 상점 화면(카드 셋·빼기·치유·정화), 길 화면에 금화·덱 수. 카드 모양 하나(`Card`)를 손패·전리품·상점·빼기가 같이 쓴다
- lib/words.js — 전리품·상점·기록 낱말, 여덟 칸 → 아홉 칸
- lib/workspace.css — 길 아홉 칸, 금화·전리품·상점·희귀 카드 모양. 캐시 번호를 모든 화면에서 올림(css myth15, words myth9)
- tests/run-sim.cjs · tests/run-screen.cjs — 전리품·상점·덱 이어짐·예비 덱 교체·옛 저장, 균형 표는 전리품을 쓰는 손과 안 쓰는 손 둘
- docs/GAME_CONCEPT.md — 던전 칸을 새 규칙과 수치로

## 2026-09-22 · claude · PROMPT_IMAGE_WORKFLOW.md 와 CLAUDE.md

- PROMPT_IMAGE_WORKFLOW.md — 사용자가 검토해 준 작업 규칙을 이 저장소 꼴로 옮겼다. 원문은 건담 저장소(`atelier`) 앞으로 쓰여 있어 기체·파일럿·남성 의인화·`generation/` 기록 체계를 가리켰는데, 여기 없는 것은 빼고 우리 것(카드·`look`·`curse.text`·기본/각성/저주/일상 넷·`upload-art.py`·구도 대조·명암·자동 등록)으로 바꿨다. 사용자가 새로 넣은 규칙 셋 — 생성기 원문 A안 우선과 명확한 실패에만 B안, 기준컷을 검수 관문으로 삼아 각성은 힘의 발현만·저주는 오염만, 일상컷은 원본 구도에 매이지 않고 랜덤은 한 번만 — 은 그대로다
- CLAUDE.md — 새 파일. 건담 저장소처럼 먼저 읽을 셋(AGENTS·IMAGE_RULES·PROMPT_IMAGE_WORKFLOW)을 가리킨다
- AGENTS.md — 먼저 읽을 것 표에 한 줄

## 2026-09-22 · claude · 드래프트 → 던전 출정

- lib/run.js — 던전이 드래프트의 짝을 받는다. `newRun(data, seed, null, {pairs, reserve, foes, boss, rank})`. 주인이 붙으면 힘(힘·기예·신성)이 체력·위력을 ×0.8~1.17 보정, 원래 주인이면 각성 게이지가 넷 아닌 셋, 손에 익은 종류면 위력 +10%, 파티에 악연이 있으면 저주를 45%부터 묻고 거절이 안 된다. 상대는 드래프트 적 두 편의 짝이 약한 것부터 차례로, 보스는 1등 적의 최고의 짝. 드래프트 순위가 상대 체력 ×0.9/1.0/1.2. 예비: 여섯 중 안 데려간 셋이 예비고, 동료가 쓰러지면 다음 칸에서 올라온다. 드래프트 없이 오면 옛 규칙 그대로
- draft.html — 결과 화면에 "출정" 단추. 내 짝 여섯·적 짝·보스·순위를 `myth_handoff_v1` 에 놓고 던전으로 간다
- run.html — 넘겨받은 것이 있으면 짝 여섯에서 셋 고르기(전용·손에 익음 표). 동료·상대에 주인 이름, 게이지 점 수는 동료마다, 악연이면 거절 단추가 없다, 예비 목록. 한 번 쓰면 지운다
- lib/words.js — `run.sortie.*`, `run.pair.*`, `draft.sortie*`
- tests/run-sim.cjs, tests/run-screen.cjs, tests/draft-screen.cjs — 출정 경로

## 2026-09-22 · claude · 신기 드래프트 — 우리 근본을 옮김

- lib/draft.js — 새 엔진. 건담 드래프트(atelier/gundam/draft-engine.js)의 규칙을 신화 무기로: 세 편(나·적 둘)이 열두 라운드에 무기 여섯·주인 여섯을 팩(아홉 장)에서 집고, 안 집은 것은 버림패로 돌아가 다시 섞인다. 순서는 라운드마다 뱀처럼 뒤집힌다. 짝은 무기 힘 × 주인 힘 × 궁합(같은 신화권 1.0/0.8, 손에 익은 종류 +0.1, 원래 주인 ×1.35) — 여섯×여섯은 720가지라 다 세어 최고 배정을 찾는다. 결속(같은 신화권·같은 종류 n), 인연(전용·연대·악연, data/draft.json). 적장 셋: 신참(35% 헛발질, 인연 못 봄)·숙련(전용만 봄)·에이스(다 보고 한 장이면 터질 인연을 내다보며 보급을 물린다). 함·지휘관·정원·공개 목표·공유 팩은 옮기지 않았다
- data/wielder.json — 주인 서른여섯(힘·기예·신성, 손에 익은 종류, 한 줄). card.json 의 wielder 와 이름이 맞는다
- data/draft.json — 라운드표, 팩 장수, 결속 표, 인연 스물셋(전용 여덟, 연대 열, 악연 다섯)
- draft.html — 화면. 판 짜기(적장·보급) → 팩 아홉 장(누르면 미리보기 ±, 다시 누르면 집기) → 내 편성(짝·내역)·적 편성·지명 기록 → 결과(세 편 순위·내역·최고의 짝). 판과 전적이 브라우저에 남는다
- lib/words.js, lib/workspace-ui.js, index.html — 항해 여섯(공방·도감·오토 배틀·던전·드래프트·프롬프트), 폰에서는 글자를 줄임
- lib/workspace.css — `.df-*`
- tests/draft-sim.cjs(규칙 + 균형 표), tests/draft-screen.cjs — 새 검사. header-layout·theme-screen 은 여섯 화면
- 균형(미리보기 최고만 집는 손 200판): 신참 상대 1등 80%, 숙련·에이스 상대 1등 37~39%. 에이스가 숙련보다 조금 쉬운 게 남은 숙제

## 2026-09-22 · claude · 던전 — 로그라이크 덱빌딩 첫 판

- lib/run.js — 새 엔진. 무기 셋을 동료로 데려가 여덟 칸의 길(싸움·싸움·제단·싸움·저주의 문·휴식·싸움·보스)을 간다. 카드는 무기가 준다: 종류 공통 셋(run.json) + 고유 기술 한 장(skill.json 을 카드 꼴로 옮김) = 무기당 넷, 덱 열둘. 손패 다섯, 마나 셋. 각성은 한 싸움에서 그 무기 카드 넉 장이면 켜져 ×1.8, 제단이면 영구. 저주는 피가 35% 아래일 때 한 번 묻고(받으면 영구), 저주의 문에서도 고른다 — 세지지만 낼 때마다 피 1, 회복·보호막 없음. 상태는 통째로 JSON, 난수는 seed 하나. 세 상태가 매 판 화면에 나오게 하려고 만든 장르다(오토 배틀러에선 3성이 안 나와 각성이 안 보였다)
- data/run.json — 공통 카드 열다섯, 길, 조율 수치
- run.html — 화면. 동료 셋이 전신 그림으로 서고(각성·저주 그림으로 넘어감), 아래 손패. 상대가 둘이면 카드 → 상대 차례로 고른다. 저주 물음은 창으로. 길은 이 브라우저에 남는다
- lib/words.js — `run.*` 낱말, 항해에 던전, 집 화면 카드
- lib/workspace-ui.js, index.html — 항해 다섯(공방·도감·오토 배틀·던전·프롬프트)
- lib/workspace.css — `.rn-*`
- tests/run-sim.cjs(규칙 42 + 균형 표), tests/run-screen.cjs — 새 검사. header-layout·theme-screen 은 다섯 화면
- 균형(맡긴 손 300판): 완주 53%, 각성은 매 판, 저주는 86%가 받는다. 사람 손이면 더 쉽다. 아직 없는 것: 싸움 뒤 보상(카드·금), 상점, 둘째·셋째 층, 도감에 각성·저주 도달 기록

## 2026-09-22 · claude · 열네 라운드, 5금 30%까지 — 별을 올릴 자리를 늘림

- lib/auto.js — 열 라운드에서는 2금 위로 3성이 안 났다(자동 플레이 500판에 0, 5금 2성도 13). 라운드를 14로, 확률표를 뒤로 네 줄 더 붙여 5금이 14라운드에 30%. 상대 예산은 8라운드까지 가파르게(×3.2) 그 뒤 완만하게(+2/라운드), 상대 값 단계는 `round/2.5` → `round/3` 으로 늦춰 완주 58%(전 60%)에 라운드별 승률이 56% 아래로 안 떨어진다. 5금은 2성이 정점(500판에 118), 3성은 여전히 못 만든다 — 그건 값별 카드 풀을 좁혀야 닿는다
- lib/words.js, docs/GAME_CONCEPT.md, tests/auto-sim.cjs — 열 → 열네

## 2026-09-21 · claude · 기본 테마를 만신전으로

- lib/workspace-theme.js, lib/workspace.css — 처음 오는 사람과 저장값이 깨진 사람은 만신전(흑요석+금)에서 시작한다. 대리석 신전은 고를 수 있는 아홉 가운데 하나로 남는다
- index.html, dex.html, auto.html, prompt.html — 브라우저 크롬 색도 만신전으로
- tests/workspace-theme.cjs, tests/theme-screen.cjs — 기본값 검사

## 2026-09-21 · claude · 아홉 신전 기둥을 전부 그림 스프라이트로, Three.js 실험 걷어냄

- lib/workspace.css — 발할라에 이어 여덟 기둥(세계수·대리석·심해·벚꽃·주홍·태양·연꽃·만신전)을 그림 모델이 뽑은 스프라이트로. 신전마다 그림 비율과 파일만 다르고 나머지 규칙은 한 덩어리(`:is([data-theme=…])`)다. 금 상감 마스크로 룬이 빛나는 것도 아홉 다 같다 — 주홍 사당은 등롱이, 만신전은 금 갓이 같이 빛난다. 옛 CSS 돌기둥 신전별 규칙과 만신전 캔버스 규칙은 지웠다(기본 돌기둥 하나만 남김). 폰 배치도 아홉 공통
- lib/hall-3d.js — 지움. 만신전도 스프라이트가 더 좋아 Three.js 실험을 걷었다. 저장소는 다시 라이브러리가 없다
- index.html — 캔버스 붙이던 코드 걷어냄

## 2026-09-21 · claude · 발할라의 밤 — 룬이 빛난다

- lib/workspace.css — 기둥 그림에서 금 상감만 딴 알파 마스크(그림 저장소 `img/ui/hall_midnight_runes.webp`, `tools` 없이 한 번 만든 것)를 기둥 안 `<i>` 에 씌워 색을 채운다. 기본은 은은한 금 맥동, 각성은 환한 금이 아래서 위로 차오르며 후광, 저주는 핏빛이 깜박인다. 그림을 새로 뽑지 않고 효과로 갔다 — 룬 자리가 그림과 정확히 맞고 파일 하나(30KB)면 된다

## 2026-09-21 · claude · 폰에서 카드가 기둥 가운데 오게

- lib/workspace.css — 폰(≤599px)에서는 글이 홀 아래 절반을 덮어 카드가 기둥 위쪽에서 돌았다. 홀을 더 높이고(최대 540px), 기둥을 위로 올려(bottom 30%, 높이 56%) 기둥 한가운데에 카드가 오게 했다. 발할라의 밤 스프라이트 기둥도 같이

## 2026-09-21 · claude · 발할라의 밤 기둥을 그림 스프라이트로

- lib/workspace.css — 발할라의 밤은 CSS 기둥 대신 그림 모델이 뽑은 룬 돌기둥 스프라이트(그림 저장소 `img/ui/hall_midnight_col.webp`, 초록 배경을 따서 투명 webp)가 여섯 자리에 선다. 갓·받침이 그림 안에 있어 가짜 갓은 끄고, 폭은 그림 비율에서 나온다. 저주는 같은 그림을 마스크로 써서 오른쪽에서 붉은 빛을 얹고, 각성은 금빛 후광. 이게 2번안(이미지 모델로 기둥)의 첫 시험 — 괜찮으면 나머지 신전도 같은 길로. `img/ui/` 는 화면 소품 자리라 썸네일·등록 자동화가 안 본다

## 2026-09-21 · claude · 만신전만 진짜 3D — Three.js 실험

- lib/hall-3d.js — 새 파일. 만신전을 골랐을 때만 Three.js(0.170, jsdelivr)를 그때 받아 홀 바닥에 캔버스를 깐다. 흑요석 기둥 여섯(clearcoat 검은 유리, 엔타시스), 금 에키누스·주판·토러스·받침, 금 격자 바닥, 제단 위 금빛 점광(그림자·숨쉬기), 남보라 림 스폿 둘, 불티 120점. 손이 닿으면 카메라가 살짝 돌고, 각성·저주는 등불·림·불티 색이 바뀐다. 움직임 줄이기면 한 프레임만, 탭이 숨으면 멈춘다. CDN 을 못 받거나 WebGL 이 없으면 mount 가 null 을 주고 CSS 기둥이 그대로 선다 — 검사 하네스가 그 길을 탄다. 저장소는 원래 라이브러리를 안 쓰는데, 이건 만신전 하나에 한한 실험이다. 괜찮으면 다른 신전으로 넓히고, 아니면 이 파일 하나만 지우면 된다
- index.html — 테마가 만신전이면 모듈을 받아 붙이고, 바뀌면 걷는다. 기울기·상태를 캔버스에도 넘긴다
- lib/workspace.css — `.hall-gl`, `.hall.webgl` 이면 CSS 기둥·바닥 숨김

## 2026-09-21 · claude · 홀 기둥을 돌처럼, 각성·저주 단추

- lib/workspace.css — 기둥을 다시 그렸다. 층 넷: 돌결(SVG 잡음을 overlay 로 섞음) · 세로 홈 · 원기둥 음영(왼쪽 그늘, 3분의 1 지점 하이라이트, 오른쪽 깊은 그늘) · 재료색. 갓은 clip-path 로 주판+에키누스, 받침은 토러스, 바닥에 drop-shadow. 신전마다 재료색과 갓 모양만 바꾼다(룬 돌·나무껍질·산호·도리이·옻칠과 등롱·사암·연꽃·흑요석). 각성·저주 상태: `.hall[data-mode]` — 각성은 금빛 후광·고리·불티, 저주는 심홍 후광·붉은 바닥·기둥에 붉은 림라이트·핏빛 불티. 카드 그림은 세 장을 겹쳐 두고 opacity 로 건너간다
- index.html — 홀에 각성·저주 단추 둘(`aria-pressed`, 다시 누르면 기본). 카드마다 기본·각성·저주 파일을 img.json 에서 뽑아 겹쳐 둔다 — 각성·저주가 없는 카드는 기본 그림 그대로. 기둥에 등롱 자리 `<i>`
- lib/words.js — 단추 이름과 상태별 눈썹 문구

## 2026-09-21 · claude · 웅장하게 — 새김체·금빛 제목·상인방 항해·모서리 괄호, 그리고 아홉째 신전 만신전

- lib/workspace.css — ui-ux-pro-max 로 방향을 잡았다(3D & hyperrealism, 겹그림자·시차·300ms 전환, 체크리스트: 커서·호버 전환·초점·움직임 줄이기·375/768/1024/1440). 팔레트 추천은 핀테크 초록이라 버리고 키아트 색을 지켰다. 새김체(Cinzel)를 눈썹·서명·구획 제목에, 명조(Noto Serif KR)를 제목에 — 둘 다 구글 폰트, 안 오면 시스템 명조. 제목은 흰→금 그라데이션 새김, 제목 아래 금 실선에 마름모, 항해는 위아래 금 실선 든 상인방에 현재 칸이 은은히 빛난다. 카드·테마 카드엔 금 모서리 괄호와 겹그림자, 호버에 3~4px 떠오르며 금 테와 후광. 어두운 신전은 가장자리 비네트. 홀은 더 높고(최대 640px) 제목이 금빛, 바닥에 안개, 고리에 안쪽 빛. 초점 테두리는 금. 아홉째 신전 `pantheon`(만신전): 흑요석 바탕에 금, 여섯 쌍 AA 대비 통과. 홀은 검은 유리 기둥에 금 갓, 금 불꽃
- lib/workspace-ui.js — 만신전 문장(돔·기둥 넷·오쿨루스·월계관)
- lib/words.js — 만신전 이름·표·메모, '여덟 신전' → '아홉 신전'
- lib/workspace-theme.js — 만신전 크롬색
- index.html — 홀에 안개 층. 네 화면에 구글 폰트 링크, `?v=myth4`
- tests/theme-screen.cjs, tests/workspace-theme.cjs — 여덟 → 아홉

## 2026-09-21 · claude · UI/UX Pro Max skill 들여오기

- .claude/skills/ui-ux-pro-max/ — nextlevelbuilder/ui-ux-pro-max-skill v2.13.0 (MIT, LICENSE 동봉) 의 핵심 skill 만 복사. SKILL.md + 참고문서 + CSV 자료(스타일 79·팔레트 192·폰트 74·UX 규칙 119·아이콘·차트·스택) + 표준 라이브러리만 쓰는 검색 스크립트. 딸려오는 sub-skill 여섯(banner·brand·design·design-system·slides·ui-styling)은 안 넣었다. SKILL.md 의 `${CLAUDE_PLUGIN_ROOT}` 경로 열한 곳을 저장소 상대경로(`python3 .claude/skills/ui-ux-pro-max/scripts/search.py`)로 바꿨다 — 플러그인이 아니라 저장소에 든 skill 이라서. `/plugin` 이 안 되는 웹·모바일 세션에서도 붙는다

## 2026-09-21 · claude · 그림 올리기 skill 과 도구

- .claude/skills/upload-art/SKILL.md — "미스틸테인 2.5d" 처럼 그림 몇 장에 무기 이름만 붙어 오면 따르는 절차. 칸 읽기(기본→각성→저주→일상), 화풍 별칭, 수치 읽는 법(구도 일치 0.6, 명암 48~67), 답하는 모양, 안 될 때. 저장소 안에 두어 웹·모바일 어느 세션에서 열어도 같이 붙는다
- tools/upload-art.py — 그 손. 카드·화풍을 자료와 맞춰 보고(오타면 비슷한 이름을 댄다), webp 1024×1536 으로 바꾸고, 각성·저주를 기본과 구도 대조하고, 등록 시늉을 돌린 뒤, 그림 저장소에 커밋(세 번 재시도)·푸시하고 자동 등록을 3분까지 기다려 커버리지를 찍는다. `--dry` 면 저장소를 안 건드린다

## 2026-09-21 · claude · 신전마다 홀의 기둥과 공기를 다르게

- lib/workspace.css — 집 화면 홀이 테마를 따라 바뀐다. 기둥: 대리석 세로 홈(대리석 신전), 룬을 새긴 네모 돌기둥(발할라의 밤), 잎 덩이 인 나무줄기(세계수 그늘), 산호 갓 얹은 물결 돌기둥(심해 신전), 검은 갓 쓴 주홍 둥근 기둥(벚꽃 사당), 금 띠 두른 옻칠 기둥에 걸린 등롱(주홍 사당), 새김 띠 사암 기둥(태양 사원), 연꽃 갓 남색 기둥(연꽃 사원의 밤). 떠오르는 것: 햇살 먼지 → 눈·반딧불·물방울·꽃잎·불티·모래알·분홍 반딧불. 심해 바닥은 격자 대신 물결 고리. 기둥 재료색은 테마가 바뀌어도 그 재료라 변수 대신 박았다

## 2026-09-21 · claude · 테마를 여덟 신전으로, 집 화면에 3D 신전 홀, 도감 빈칸을 대좌로

- lib/workspace.css — 포켓몬 판에서 이름만 바꿔 온 크림색·알약 테마를 걷어냈다. 테마 여덟 개는 열쇠 그대로 두고(저장된 선호가 살아야 하니) 신화권마다 둘씩 신전으로 다시 칠했다: 발할라의 밤·세계수 그늘(북유럽), 대리석 신전·심해 신전(그리스), 벚꽃 사당·주홍 사당(동아시아), 태양 사원·연꽃 사원의 밤(인도). 색은 올라온 키아트에서 뽑았고 여섯 쌍 AA 대비를 다 넘긴다. 모서리는 각지게, 강조선은 금(`--gold`), 제목은 명조(`--display`), 바탕은 제단 후광 + 기둥 띠. 도감·오토 배틀 빈칸의 포켓볼 모양을 후광 아래 검이 선 대좌(`--sigil`)로 바꿨다. 집 화면 신전 홀(`.hall*`)은 CSS 3D뿐이다 — 기둥 여섯, 흐르는 바닥 격자, 도는 금 고리 셋, 올라온 카드가 도는 회전목마, 떠오르는 불티. 손이 닿으면 홀이 기울고, 움직임 줄이기 설정이면 멈춘다
- lib/workspace-ui.js — 문장 여덟 개를 신전 모티프로 다시 그렸다(홀 지붕과 번개, 물푸레나무, 페디먼트, 삼지창, 도리이, 등롱, 태양 원반과 계단, 연꽃과 달). 테마 카드에 신화권 표(`theme.myth.*`)를 붙였다
- lib/words.js — 테마 이름·메모·신화권 표, 홀 낱말(`home.hall*`), '공방의 결' → '여덟 신전'
- lib/workspace-theme.js — 브라우저 크롬 색(`themeColors`)을 새 갑판색에 맞췄다
- index.html — `Hall` 컴포넌트. card.json 과 img.json 을 읽어 그림 있는 카드 열둘까지 고리 위에 세우고, 모자라면 이름표로 채운다. 썸네일이 안 오면 그 자리만 이름표로 바꾼다
- auto.html, dex.html, prompt.html — 테마색 메타와 `?v=myth2`

## 2026-09-21 · claude · 일상컷 번호 칸 — 1이 안 지워지던 것

- prompt.html — 숫자 입력이 빈 값을 곧장 1로 되돌려 2를 못 치던 것. 1~9 셀렉트로

## 2026-09-21 · claude · 도감 크게 보기

- dex.html · lib/words.js — 큰 그림을 누르면 화면을 덮는 크게 보기. 같은 화풍의 컷(액션·각성·저주·특별·일상)을 화살표·키보드로 넘기고, Esc·바깥·그림 누르기로 닫는다. 원본 열기 링크
- tests/dex-screen.cjs — 열기·넘기기·닫기
- dex.html — 원본 열기 링크가 맨 a 태그라 안 보였다. 닫기 단추와 같은 모양으로

## 2026-09-21 · claude · 기준 화풍은 게임 키아트 2.5D, 목록 차례는 고른 다섯이 앞

- data/style.json · lib/prompt-spec.js — 궁니르 열넷을 견줘 보니 화풍 문장이 거의 안 먹었고, 사용자가 얼굴이 반 발짝 실사인 다섯을 골랐다.
  기본 화풍을 game_keyart 로(처음엔 세미리얼 시네마틱을 권했는데 사용자가 게임 키아트로 정했다), 차례를 게임 키아트·세미리얼 시네마틱·한국형 글로시·게임 CGI·세미리얼 유화 → 나머지로. 열쇠는 그대로
- tests/prompt-screen.cjs — 기본 화풍을 표에서 읽는다

## 2026-09-21 · claude · 도감 화풍 고르개 — 단추 벽 대신 셀렉트와 썸네일 줄

- dex.html · lib/words.js — 궁니르 열네 화풍이 올라오자 단추 열네 개가 글자 벽이 됐다. 머리에는 셀렉트 하나, 본문에 화풍별 썸네일이 옆으로 구르는 줄. 눌러도 골라진다
- tests/dex-screen.cjs — 화풍 셋인 카드로 셀렉트·썸네일·둘의 동기화

## 2026-09-21 · claude · 게임 키아트 문장을 조였다가 되돌렸다

- lib/prompt-spec.js · prompt.html — 미스틸테인 혼자 밝고 대비 없이 나와서(대비 48, 열 장 중 꼴찌) 문장에 깊은 그림자·강한 대비를 넣어 봤는데,
  잘 나온 아홉 장이 이미 옛 문장으로 뽑힌 것이라 문장을 바꾸면 다음 자루들이 그 아홉과 어긋난다(사용자 지적). 원래 문장으로 되돌렸다.
  화풍이 틀어지는 것은 생성 쪽 변동으로 보고 다시 뽑는 것으로 해결한다

## 2026-09-21 · claude · 각성에서 무기를 실체화하는 안을 적어 둠

- docs/GAME_CONCEPT.md — "아직 시험할 것" 에 한 줄. 각성 = 봉인이 풀려 무기가 손에 나타남. 미룬 까닭 셋(구도 짝·이미 만든 것들·손 문제). 할 거면 한 번에

## 2026-09-21 · claude · 스킨 구상을 적어 둠

- docs/GAME_CONCEPT.md — "아직 시험할 것" 에 스킨 한 줄. 카탈로그 밖 무기는 카드가 아니라 스킨으로. 나중에

## 2026-09-21 · claude · 세 상태 — 기본 · 각성 · 저주. 벤치가 차도 셋째는 산다

- lib/auto.js — 저주: 체력이 curse.at 아래면 한 판에 한 번 발현, 공격·기술 배수, 박자당 출혈, 치유·보호막 제외, 되살아나도 유지. 벤치가 찼어도 같은 1성이 둘이면 사서 바로 2성으로
- data/card.json — 카드마다 curse {at, atk, skill, bleed, text}. 전승이 저주인 아홉 자루는 세다
- lib/img.js · tools/register-images.py — _f_cursed 슬롯. coverOf 는 저주 > 각성 > 기본
- dex.html · auto.html · lib/words.js — 도감에 저주 단추와 저주 줄, 오토 배틀 결과 칸은 저주받은 유닛의 그림·테두리
- lib/prompt-spec.js · lib/prompt-myth.js · prompt.html — 출력에 저주. 첨부 그림 기준, 룬은 붉은 보랏빛으로 오염되고 은색 장갑은 그대로
- tests — auto-sim(합치기 사기·저주 다섯), data(curse 모양), dex-screen(저주 단추), prompt-engine·screen(저주 출력)
- docs/GAME_CONCEPT.md · IMAGE_RULES.md — 세 상태 정의와 파일 이름

## 2026-09-21 · claude · 도감에 특별컷 — 저주형 같은 변주 자리

- dex.html · lib/words.js — 등록기가 이미 받던 _f_extraN 을 도감이 안 보여 주고 있었다. 일상컷 위에 특별컷 갤러리
- tests/dex-screen.cjs · IMAGE_RULES.md — 특별컷 한 장이 뜨고 눌리는지, 이름 규칙

## 2026-09-21 · claude · 일상컷 생성기 — 갈래·예시·자세·방향·표정·강도 축·랜덤

- lib/prompt-spec.js — 앞 생성기의 일상컷 표를 옮겼다: 갈래 17(포켓몬 세계 것은 빼고 신화 유적 나들이·무기 모티브 에디토리얼·현대 직업컷을 새로), 예시 270여 개, 자세 34·방향 22·표정 32, 강도 축 다섯, 규칙 문단(첨부 그림 기준·갑옷 없음·재질·카메라·금지·마지막 확인)
- lib/prompt-myth.js — 일상컷 갈래: 캐릭터 → 화풍 → 첨부 규칙 → 규격 → 갈래 → 예시 → 장면 설정(자세·방향·표정·프레임·렌즈·의상·장소·축) → 우선 규칙 → 재질·카메라·금지·확인. 외형 표는 안 쓴다
- lib/prompt-random.js — 칸별 랜덤과 잠금. 예시가 잠기면 갈래도 못 돌리고, 갈래가 바뀌면 예시는 비운다
- prompt.html · lib/words.js — 일상컷이면 설계·외형 대신 장면 칸. 칸마다 랜덤·잠금, 전체 랜덤, 세부 강도는 접힘
- tests/prompt-engine.cjs · tests/prompt-screen.cjs — 갈래·예시·축·직접 입력·랜덤·잠금, 표에 포켓몬이 없는지

## 2026-09-21 · claude · 덮어쓴 그림의 썸네일이 안 바뀌던 것

- tools/make-thumbs.py — CI 체크아웃은 파일 시각이 다 같아서 "원본이 더 새것" 규칙이 덮어쓴 그림을 못 알아봤다. --redo <파일…> 과 --all 을 더했다
- myth-atelier-img/.github/workflows/thumbs.yml — 이번 푸시에서 달라진 webp 를 git diff 로 뽑아 --redo 로 넘긴다. 궁니르 썸네일은 손으로 다시 만들어 올렸다

## 2026-09-21 · claude · 견본 줄이 옆으로 안 구르고 칸을 넓히던 것

- prompt.html — 격자 칸의 min-width:auto 때문에 헤어·체형 견본 줄이 줄어들지 못하고 화면을 밀었다. 칸을 0 으로, 줄은 overflow-x:auto
- tests/prompt-screen.cjs — 줄의 scrollWidth 가 폭의 두 배 넘고 실제로 굴러가며 화면은 안 넘치는지

## 2026-09-21 · claude · 뼈대는 한 문단, 나머지는 선택 — 그리고 견본 그림·팔레트

- lib/prompt-spec.js — 한 줄 프롬프트로 만든 엑스칼리버 메카가 제일 좋았다. 뼈대(CORE)는 "무기를 모티브로 한 여성 메카 의인화, 무기는 들지 않는다, 손은 손" 한 문단.
  재질 옮기기·실루엣·신화권 언어·자세는 꺼진 선택 문단(EXTRAS). 설계 언어는 메카·천 둘. "fused to a limb" 를 지웠다 — 팔이 창이 됐다.
  체형 17·헤어 33 견본 그림 목록(atelier Pages 의 png)과 머리색·눈 색 팔레트(COLOR_HEX)를 앞 생성기에서 가져왔다
- lib/prompt-myth.js — 차례: 무기 → 시각 언어 → 화풍 → 뼈대 → 규격 → (켠 문단) → (고른 자세) → 외형 → 장면 → 금지. 기본 280낱말 언저리
- prompt.html · lib/words.js — 설계 칸(설계 언어·붙일 문단·자세), 체형·헤어 견본 그림 줄, 색 팔레트. 누르면 select 가 따라온다
- tests/prompt-engine.cjs · tests/prompt-screen.cjs — 기본에 선택 문단이 없는지, 견본·팔레트가 옵션값과 맞는지, 그림이 실제로 뜨는지
- AGENTS.md — 브라우저 검사 준비물: atelier/assets/figures 의 여성 견본 50장을 img/figure-previews/ 에 복사

## 2026-09-21 · claude · 무기를 든 사람이 아니라 무기가 사람이 된 것으로, 세부 선택 서른아홉

- data/card.json — 카드마다 look(재질과 색; 형태; 문양) 영어 한 줄. 첫 궁니르가 창 든 전사로 나와서, 모델에게 무기의 시각 언어를 줘야 했다
- lib/prompt-spec.js — 규칙을 뒤집었다: 무기가 곧 그녀, 재질·색·형태·문양이 몸과 옷으로, 실물 무기는 소품이 아니라 몸의 일부. 종류별 실루엣 다섯, 동작은 자세로.
  외형은 앞 생성기(pkm)의 세부 선택을 다섯 묶음(기본·체형·얼굴·머리·구도) 서른아홉 칸으로 가져왔다 — 장갑·장비 묶음은 뺐다
- lib/prompt-myth.js — 차례: 무기 → 시각 언어 → 화풍 → 규격 → 의인화 → 실루엣·신화권 → 자세 → 외형(묶음별, 고른 것만) → 장면 → 금지
- prompt.html · lib/words.js — 외형을 접히는 묶음 다섯으로, 고른 수 표시
- tests/prompt-engine.cjs · tests/prompt-screen.cjs · tests/data.cjs — look 필수, 실루엣·자세·묶음 줄, 다 채워도 650낱말 안
- IMAGE_RULES.md · docs/GAME_CONCEPT.md — 조건 문장

## 2026-09-21 · claude · 그림이 하나도 없을 때 등록 워크플로가 서던 것

- tools/register-images.py · .github/workflows/register-images.yml — 그림 저장소 img/ 가 비어 폴더가 없으면 빈 것으로 친다. 첫 수동 실행이 여기서 섰다

## 2026-09-21 · claude · 그림 프롬프트 생성기와 문서 — 3·4단계

- lib/prompt-spec.js — 화풍 열넷의 문장, 놀이 규칙 넷, 출력 셋(액션·각성·일상), 신화권 옷·재질 언어, 종류별 동작 넷, 외형 여덟. 표만 있다
- lib/prompt-myth.js — 조립. 무기·화풍·출력·동작·외형·장면을 300낱말 안으로. 각성은 첨부 그림을 따르고 외형을 다시 말하지 않는다
- prompt.html · tests/prompt-screen.cjs — 고르면 문장과 파일 이름이 나오고 무기마다 설정이 남는다
- tests/prompt-engine.cjs — 1680개 프롬프트의 이름·화풍·출력·예산·자동 얼굴 계통·파일 이름 규칙
- data/style.json — 화풍 이름 하나 손봄(메카 → 시네마틱 키아트). 열쇠는 그대로
- lib/words.js — prompt.* 낱말
- IMAGE_RULES.md · README.md — 그림 한 장 규칙과 저장소 안내
- tests/header-layout.cjs · tests/theme-screen.cjs — 화면 목록에 prompt.html

## 2026-09-21 · claude · 오토 배틀러 엔진과 화면 — 2단계

- lib/auto.js — 규칙 전부: 상점·금·이자·벤치·판(앞줄·뒷줄 × 3)·합치기·시너지·싸움(사거리·마나·기술·멈춤·되살기)·라운드·맡긴 손. 상태는 JSON, 난수는 정수 하나
- data/synergy.json — 아홉 시너지의 켜지는 수·값·범위. 엔진이 읽는 자료
- tests/auto-sim.cjs — 규칙 73가지. --quick 없이 돌리면 400판 균형 표
- auto.html · tests/auto-screen.cjs — 상점·판·벤치·시너지·싸움 기록·저장. 화면은 엔진을 부를 뿐
- lib/words.js — auto.* 낱말
- tests/header-layout.cjs · tests/theme-screen.cjs — 화면 목록에 auto.html
- docs/GAME_CONCEPT.md — 정해진 수치와 굴려 본 결과

## 2026-09-21 · claude · 집·도감·자료·등록 도구 — 1단계

- lib/words.js — 신화 무기 주제의 낱말 표. 항해는 공방·도감·오토 배틀·프롬프트 넷
- lib/workspace-ui.js — 항해 네 칸, 여덟 결의 무기 문양(망치·검·활·창·원반·도끼·방패·모루)
- lib/img.js — 그림 주소를 myth-atelier-img 로. 폼을 지우고 각성(awaken) 칸을 더했다
- data/group.json · data/skill.json · data/img.json — 신화권·종류 이름표와 색, 기술 마흔 개(효과·배수·대상), 빈 그림 목록
- tools/roster.py · tools/register-images.py — 폼 없는 이름 규칙 `<카드>_<화풍>_f[_awaken|_casualN].webp`
- index.html · dex.html — 집 화면과 도감(거르기 다섯, 상세, 각성 단추, 일상컷)
- tests/data.cjs · tests/dex-screen.cjs — 자료 정합과 도감 화면 검사. 머리·결 검사는 화면 목록만 고쳤다
- .github/workflows/register-images.yml — 그림 저장소 이름과 검사 명령
