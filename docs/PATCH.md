# 패치 기록

파일을 고친 쪽이 직접 한 칸 적는다. 규칙은 `AGENTS.md` 의 "고쳤으면 적는다" 에 있다.
집 화면(`index.html`)의 **패치 기록** 단추가 이 파일을 그대로 읽어 보여 준다.

모양은 두 줄이 전부다. 한 칸은 `##` 으로 시작하고 `날짜 · 누가 · 무엇을 바꿨나` 를
가운뎃점으로 나눈다. 그 아래 `-` 줄에 `파일 — 왜/무엇` 을 파일마다 하나씩 적는다.
날짜는 `2026-09-21` 꼴, 누가는 `claude` 또는 `gpt`, 새 칸이 위로 간다.
이 안내글은 첫 `##` 앞이라 화면이 읽지 않는다. `node tests/patch.cjs` 가 모양을 본다.

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
