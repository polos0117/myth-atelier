# 패치 기록

파일을 고친 쪽이 직접 한 칸 적는다. 규칙은 `AGENTS.md` 의 "고쳤으면 적는다" 에 있다.
집 화면(`index.html`)의 **패치 기록** 단추가 이 파일을 그대로 읽어 보여 준다.

모양은 두 줄이 전부다. 한 칸은 `##` 으로 시작하고 `날짜 · 누가 · 무엇을 바꿨나` 를
가운뎃점으로 나눈다. 그 아래 `-` 줄에 `파일 — 왜/무엇` 을 파일마다 하나씩 적는다.
날짜는 `2026-09-21` 꼴, 누가는 `claude` 또는 `gpt`, 새 칸이 위로 간다.
이 안내글은 첫 `##` 앞이라 화면이 읽지 않는다. `node tests/patch.cjs` 가 모양을 본다.

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
