# 작업 지침

신화 속 무기를 사람으로 그린 카드로 하는 **오토 배틀러**다. 무엇이 정해졌고 무엇이
아직 시험 중인지는 `docs/GAME_CONCEPT.md` 에 있다. 코드의 바탕(껍데기·결·낱말 표·
그림 계층·검사 틀)은 `pkm-atelier` 에서 주제와 무관한 층만 가져왔다.

## 먼저 읽을 것

| 문서 | 무엇 |
|---|---|
| 이 문서 | 규칙과 자리 |
| `docs/GAME_CONCEPT.md` | 놀이 구조 — 정해진 것과 아직 시험할 것 |
| `IMAGE_RULES.md` | 그림 한 장 규칙 — 이름·크기·두 저장소 순서 |
| `docs/PATCH.md` | 무엇을 고쳤나 — 고친 쪽이 직접 적는다 (아래 규칙 5) |

## 지켜야 할 것 다섯

### 1. 화면에 말을 적지 않는다

사람이 읽는 말은 전부 `lib/words.js` 에서 온다. 화면은 `W('card.cost')` 로 부른다.
`node tests/words.cjs` 가 막는다. `<title>` 만 예외이고, 낱말 표의 `app.title` 과 같아야 한다.

자료의 말(신화권·무기 종류·기술 이름과 설명)은 낱말 표가 아니라 `data/group.json` 과
`data/skill.json` 에 있다. 카드가 늘면 자료가 늘지 화면 낱말이 늘지 않는다.

### 2. 그림은 이 저장소에 두지 않는다

`myth-atelier-img` 저장소에 올리고 Pages 를 켠다. `lib/img.js` 의 `BASE` 한 줄이 그 주소다.
`img/` 는 `.gitignore` 에 있다 — 브라우저 검사가 배포 주소를 이 폴더로 돌려주는 임시 자리다.

그림이 그림 저장소에 있다고 화면에 뜨지는 않는다. `python3 tools/register-images.py` 가
`data/img.json` 에 적은 것만 뜬다. 이건 `.github/workflows/register-images.yml` 이 돌린다 —
그림 저장소의 썸네일 워크플로가 깨우거나(토큰 `CODE_REPO_TOKEN`), 매시 17분 시간표(자주
빠진다), 또는 수동 실행.

**무기당 그림 한 장이다.** 폼도 기준 시트도 없다. 각성(`_awaken`)과 일상컷(`_casualN`)은
선택이다. 이름 규칙은 `IMAGE_RULES.md` 에 있다.

### 3. 화면을 갈아치우면 그 화면에 딸린 검사를 같이 옮긴다

안 옮기면 검사가 조용히 죽는다. 늘 빨간 검사가 있으면 진짜 고장도 같이 묻힌다.
화면이 늘면 `tests/header-layout.cjs` 와 `tests/theme-screen.cjs` 의 화면 목록에 더한다.

### 4. 화면은 껍데기가 정한 자리에 들어간다

`lib/workspace.css` 는 `.dex-page` · `.prompt-page` 를 `100dvh` 로 잠그고 **한 자리만**
구르게 한다 — 도감·오토 배틀은 `.collection-scroll`, 집·생성기는 `.wrap`. 그 자리를 안 쓰면
아래쪽이 통째로 잘리는데 화면은 멀쩡해 보인다. Preact 가 그리는 `#app` 이 사이에 끼면
키도 물려준다(`dex.html` 의 `.dex-page > #app`).

### 5. 고쳤으면 적는다

파일을 고쳤으면 `docs/PATCH.md` 맨 위에 한 칸 적는다. 커밋 메시지로 갈음하지 않는다 —
두 세션(`claude` · `gpt`)이 같은 `main` 에 번갈아 밀기 때문에, 상대가 무엇을 왜 바꿨는지
`git log` 를 뒤져야만 아는 상태가 문제였다.

```
## 2026-09-21 · claude · 무엇을 바꿨나
- lib/foo.js — 왜 고쳤나
```

날짜는 `2026-09-21` 꼴, 누가는 `claude` 또는 `gpt`, 새 칸이 맨 위. 자동 커밋
(`[skip actions]` 붙은 등록·썸네일)은 적지 않는다. `node tests/patch.cjs` 가 모양을 본다.

## 규칙은 엔진에만

싸움 규칙은 `lib/auto.js` 에만 있다. 화면(`auto.html`)은 굴리고 보여 주기만 한다.
시너지 수치는 `data/synergy.json`, 기술은 `data/skill.json` — 엔진이 읽는 자료이지 코드가 아니다.
균형은 `node tests/auto-sim.cjs` 로 잰다. `--quick` 은 규칙만 보고, 빼고 돌리면 수천 판을
굴려 표를 찍는다 — 그건 실패가 아니라 보고다.

## 검사

```bash
node tests/words.cjs             # 낱말이 코드에 박히지 않았나
node tests/workspace-theme.cjs   # 결 여덟 · 밀도 · 문양
node tests/data.cjs              # 카드·이름표·기술·화풍·그림 목록이 서로 맞나
node tests/patch.cjs             # 패치 기록의 모양
node tests/auto-sim.cjs --quick  # 싸움 규칙 (빼면 균형 표)
node tests/prompt-engine.cjs     # 프롬프트가 화면 없이 나오나
```

브라우저 검사에는 준비물이 하나 더 있다. 생성기의 체형·헤어 견본 그림은 앞 저장소(atelier)가 Pages 에 올린
png 를 쓰는데, 검사에서는 harness 가 그 주소를 `img/figure-previews/` 로 돌린다:

```bash
mkdir -p img/figure-previews && cp <atelier>/assets/figures/*-female-*.png img/figure-previews/
```

브라우저 검사는 `tests/browser-harness.cjs` 를 쓴다. CDN(esm.sh)이 막힌 곳에서는 `ESM_DIR` 에
preact·htm 이 든 `node_modules` 경로를, 브라우저는 `CHROMIUM_PATH` 로 준다. Playwright 는
`NODE_PATH` 로 찾는다.

```bash
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/dex-screen.cjs      # 도감 — 거르기·상세·각성
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/auto-screen.cjs     # 오토 배틀 — 상점·판·라운드
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/prompt-screen.cjs   # 생성기
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/header-layout.cjs   # 화면의 머리가 같은 자리에
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/theme-screen.cjs    # 결이 화면을 따라다니나
ESM_DIR=<node_modules> CHROMIUM_PATH=<chrome> node tests/patch-screen.cjs    # 패치 기록 단추
```

**검사를 고칠 때는 일부러 어겨 실패하는 것을 먼저 본다.** 통과하는데 아무것도 안 보는 검사가 제일 나쁘다.

## 자료

`data/*.json` 은 머리말 `note` 에 **모양을 적어 둔다.**

**카드 이름(`name`)은 그림 파일 이름이다.** `<카드>_<화풍>_f.webp` 가 여기서 만들어지므로
한 번 정하면 못 바꾼다 — 바꾸면 이미 올린 그림이 미아가 된다. `tests/data.cjs` 가 이름이
겹치거나 밑줄이 들어가면 선다.
