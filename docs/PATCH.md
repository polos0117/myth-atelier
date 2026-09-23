# 패치 기록

파일을 고친 쪽이 직접 한 칸 적는다. 규칙은 `AGENTS.md` 의 "고쳤으면 적는다" 에 있다.
집 화면(`index.html`)의 **패치 기록** 단추가 이 파일을 그대로 읽어 보여 준다.

모양은 두 줄이 전부다. 한 칸은 `##` 으로 시작하고 `날짜 · 누가 · 무엇을 바꿨나` 를
가운뎃점으로 나눈다. 그 아래 `-` 줄에 `파일 — 왜/무엇` 을 파일마다 하나씩 적는다.
날짜는 `2026-09-21` 꼴, 누가는 `claude` 또는 `gpt`, 새 칸이 위로 간다.
이 안내글은 첫 `##` 앞이라 화면이 읽지 않는다. `node tests/patch.cjs` 가 모양을 본다.

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
