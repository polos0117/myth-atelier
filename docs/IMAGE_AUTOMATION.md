# GPT 세션 이미지 작업 — 실행마다 무기 하나 · 하루 열두 개

book-atelier · game-atelier 의 `docs/IMAGE_AUTOMATION.md` 를 신화 꼴로 옮긴 것이다(사용자 2026-11-01 「MYTH 쪽이 다른 저장소에 비해 생성기랑 GPT 자동화 쪽이 뒤쳐져 있지?」 → 「1번부터 끝까지 순서대로 진행해줘」).
사람이 지켜보지 않는 GPT 세션이 빈 무기를 차례대로 채우는 길이다. 사람이 지켜보는 세션은 `IMAGE_RULES.md` · `PROMPT_IMAGE_WORKFLOW.md` 그대로 한다(A/B · 「올릴까?」).

## 0. 승인 — 묻지 않고 올린다

다른 공방(pkm · game · book · element)과 같게: **중간에 묻지 않고, AI 검수(QA) 뒤 바로 올린다. 그림의 시각적 품질은 올라간 뒤 사용자가 본다.**
그래서 GPT 세션에서는 다음 셋이 바뀐다.

| 사람이 지켜보는 세션(PROMPT_IMAGE_WORKFLOW) | GPT 세션 |
|---|---|
| 올리기 전에 사람이 본다 — 「올릴까?」 | 묻지 않는다. 아래 4절 검수를 적고 올린다 |
| A안 → 실패면 B안(최소 보정)으로 다시 | 한 장. 그 한 장이 정본이다 |
| 계획대로 안 나오면 원인을 적어 먼저 묻는다 | 묻지도, 고쳐 다시 그리지도 않는다. 어긋난 데와 원인을 검수 기록에 적고 올린다 |

이 승인이 닿지 **않는** 것 — 그때는 그 자리에서 멈추고(5절 block) 보고한다:
안전 필터 거절이 `IMAGE_RULES.md` 「필터에 막히면」 순서(같은 지시문 한 번 → 노출 한 단계씩 → 계획 바꾸기 한 번)를 다 밟고도 남을 때, 결과가 불분명한 응답, 원본을 잃음, 도구 오류,
다른 세션의 잠금, 하루 · 실행 몫, 받은 그림이 1024×1536 이 아님(한 번 더 — 그래도 아니면 멈춤), 이미 있는 파일 이름.
이미 올라간 그림을 덮거나 지우는 일, 강제 push, 이력 재작성은 어떤 경우에도 하지 않는다.

## 1. 준비

- `AGENTS.md` · `IMAGE_RULES.md` · `PROMPT_IMAGE_WORKFLOW.md` 를 먼저 읽는다. 코드(`myth-atelier`)와 그림(`myth-atelier-img`) 저장소를 **나란히** 받아 최신 `main` 으로 둔다.
  남의 로컬 변경을 reset 하지 않는다.
- Node 와 Python 3 + Pillow 가 있으면 된다. **브라우저는 쓰지 않는다** — 생성기 화면 대신 지시문 묶음(`tools/prompt-pack.cjs`)이 같은 글을 파일로 준다
  (`tests/prompt-pack-screen.cjs` 가 액션 · 각성 · 저주 · 일상 · 스킨 자리를 실제 화면과 글자 하나까지 견준다).
- 실행 ID 를 **한 번** 정하고 이 실행의 모든 명령에 그대로 쓴다. 부모 작업이 준 호출 ID 가 있으면 그것.

```sh
export ATELIER_EXECUTION_ID="myth-$(date -u +%Y%m%dT%H%M%SZ)"
node tools/image-claim.cjs status                      # 잠금 · 오늘 쓴 몫 · 다음 차례(읽기만)
```

`status` 에 「빈 자리 없음 — done 으로 끝낸다」 가 붙은 잠금이 있으면 그것부터 `done` 한다(앞 실행이 등록을 기다리다 끝났다 — 6절).

## 2. 차례와 잠금

```sh
node tools/image-claim.cjs next                         # 다음에 그릴 무기와 빈 자리
node tools/image-claim.cjs claim <카드> --execution $ATELIER_EXECUTION_ID
```

- `<카드>` 는 `data/card.json` 의 name 에서 공백을 밑줄로(`아킬레우스의_창`). 차례는 카드 표 순서다 — 빈 자리가 있는 첫 무기를 도구가 고른다.
- **실행마다 무기 하나, 하루 열두 개**(Asia/Seoul 날짜와 UTC 날짜를 따로 센다). 실행 ID 를 바꿔 몫을 넘기지 않는다.
- 잠금은 그림 저장소 `records/automation/claims/<카드>.json` 하나다. `claim` 은 그 파일만 커밋해 일반 push 한다 —
  다른 세션이 먼저 밀었으면 거절되고 도구가 제 커밋을 되돌린다. 그때는 pull 하고 `status` 부터 다시.
- 잡힌 무기(`working` · `blocked`)는 시간이 지나도 가져가지 않는다. `blocked` 는 사용자가 정한 뒤 `release` 로만 푼다.
- 한 무기의 빈 자리 = 액션 · 각성 · 저주 · **일상컷 다섯 장**(사용자 2026-11-02 「다섯장으로 바꿔줘」)(그 무기의 기본 그림 화풍 — 보통 `game_keyart`, `data/img.json`).
  일상컷이 다섯보다 적은 무기는 모자란 만큼만 더 그린다(비어 있는 가장 작은 번호부터 — `claim` 이 적어 준 `missing` 그대로). 스킨 · 특별컷은 빈 자리에 들지 않는다(사람이 요청할 때만).

## 3. 계획과 지시문 묶음

작업 폴더(`$W`)는 세션 임시 자리에 둔다. 일상컷이 빈 자리에 있으면 계획부터:

```sh
node tools/casual-plan.cjs <카드> --slots <빈 일상 번호들, 예: 2,3,4,5> \
     --records ../myth-atelier-img/records/<카드> --out $W/plan
node tools/prompt-pack.cjs init <카드> --dir $W/pack --plan $W/plan/plan.json   # 일상 빈 자리가 없으면 --plan 없이
node tools/prompt-pack.cjs build --dir $W/pack                                  # 자리마다 <자리>-prompt.txt · <자리>-ui.json · INDEX.md
cp $W/plan/plan.json $W/pack/casual-plan.json                                   # 올릴 때 기록으로 같이 간다(6절)
```

- 일상컷은 **트리 버전2**(`IMAGE_RULES.md` 「일상컷 트리 버전2」)로 짠다. 계획기가 묶음 규칙(필수 갈래 · 장소 · 의상 · 자세 추천 · 먼/가까운 컷 · 시대 · 무기 사이 안 쓴 장소 · 옷 · 자세 · 표정 먼저 …)을 지킨다.
  그림 저장소 기록을 읽어야 하니 `--usage none` 은 쓰지 않는다.
  옛 일상컷(2026-11-01 전)은 기록이 그림 저장소에 없다 — 이미 있는 컷과의 겹침은 계획기가 못 본다(검수에서 그림끼리 견준다).
  GPT 세션은 계획을 사람에게 보이지 않는다 — 계획기 출력 그대로 간다. 이미 있는 컷의 기록(`--records`)은 겹침 검사에만 쓴다.
- `prompt-pack init` 은 등록부에 없는 액션 · 각성 · 저주만 자리로 넣는다. 액션(기준컷)이 이미 있으면 각성 · 저주 · 일상은 그 등록된 그림을 첨부한다.
- `settings.json` 은 **비워 둔 채** build 하는 것이 기본이다. 고칠 때만 칸을 채우고, 직접 입력(글 칸 · 표에 없는 값)엔 `why` 를 적는다.
  틀린 칸이 하나라도 있으면 build 가 아무것도 안 쓴다. 고칠 수 있는 칸은 `tools/prompt-pack.cjs` 머리말에.
- **`<자리>-prompt.txt` 를 손으로 고쳐 내지 않는다.** 고칠 것이 있으면 settings 를 고쳐 build 를 다시 돌린다.
- 이미지 도구가 일상 한 칸을 막아(같은 지시문 두 번 · 노출 보통 · 적게까지 다 막혀) 다시 정할 때는 그 칸만 `--slots N --seed <다른 씨앗>` 으로 계획기에 다시 맡기고
  `--records` 에 나머지 기록을 준다 — 그것도 한 번만. 새 계획에서도 같은 지시문 한 번 · 노출 낮추기를 밟고, 다시 막히면 5절.
  액션 · 각성 · 저주가 막히면 노출 칸이 없으니(메카 의인화는 노출 축이 없다) 같은 지시문 한 번 뒤 `slots.<자리>.scene` 에 중립적인 장면 한 줄(why 에 막힌 까닭)로 한 번 — 그래도 막히면 5절.
- 올리기 전에 `node tools/casual-plan.cjs <카드> --check <이 무기의 기록 폴더>` 가 통과해야 한다(새 기록을 넣은 사본으로 본다).

## 4. 그리기와 검수

- `INDEX.md` 의 차례대로, **`claim` 의 `missing` 에 있는 자리만** 그린다. 자리 하나에 생성 호출 한 번.
- 첨부는 `INDEX.md` 의 「첨부」 그대로다 — 이 세션에서 받은 원본, 이미 등록된 자리면 그림 저장소의 `img/<파일>.webp`. 액션(기준컷)이 없으면 뒤 자리를 그리지 않는다.
- 이미지 도구에 크기 설정이 있으면 1024×1536 으로 준다. 도구가 실제로 돌려준 파일만 쓴다.
- 받은 뒤 **AI 검수**를 적는다(`<자리>-import.json` 의 `qa` — 7절). 본 것을 구체적으로:
  1024×1536 인가 · 그녀 한 명(배경 흐린 사람은 괜찮다 — 주인공을 다투거나 몸에 닿거나 같은 얼굴이 둘이면 걸림) · 온몸이 프레임 안(액션) ·
  **무기를 들지 않았나**(따로 떠 있는 무기 · 손이 창이 된 것 — 무기는 판 · 관절 · 발광선 · 장신구로만) · 손은 손 · 얼굴이 카메라를 향하나(액션) ·
  읽히는 글자 · 숫자 · 로고(훈민정음 낱자 문양만 예외) · 카드 `look` 의 재질 · 색 · 문양이 장갑에 보이나 ·
  각성 · 저주가 액션과 같은 구도 · 같은 얼굴인가(`upload-art.py` 의 구도 일치 수치를 적는다), 저주가 `curse.text` 방향인가 ·
  일상컷이면 같은 얼굴 · 머리 · 체형인가, 갑옷이 없나, 계획 칸(시대 · 장소 · 의상 · 몸 자세 · 받침 · 프레이밍 · 몸 방향 · 두 손 · 소품 · 시선)대로인가, 옷에 무기 색 · 무늬를 옮기지 않았나 ·
  **팔 · 다리 · 손의 수와 이어짐**.
- 검수에서 걸린 것은 `passed: false` 와 함께 그대로 적고 **올린다**(0절 승인 — 사용자가 올라간 뒤 본다). 다시 그리지 않는다.
  지시문에서 부딪힌 줄(장소 · 의상 · POSTURE · SUPPORT · COMPOSITION · HAND · PROP · LEGS · GAZE · WARDROBE · 시대)을 찾았으면 원인도 적는다 — 규칙 · 계획기를 고치는 일은 사람이 지켜보는 세션이 한다.

## 5. 멈춤

```sh
node tools/image-claim.cjs block <카드> --execution $ATELIER_EXECUTION_ID --reason '실제 까닭(어느 자리 · 무슨 응답)'
```

- 0절의 「닿지 않는 것」 이면 그 자리는 그리지 않고 block 한다. 그 전까지 검수한 자리는 6절대로 올려도 된다(빈 자리를 줄인다).
- 거절된 지시문은 sha256 과 함께 `<자리>-blocked.json` 으로 기록에 남긴다(지시문 · 시도 수 · 응답 코드). 그 지시문을 바꿔 다시 시도하지 않는다.
- block 된 무기는 사용자가 정할 때까지 잠긴 채다. 사용자가 정하면 사람이 지켜보는 세션이 `release --approval '<사용자 말>'` 로 푼다.

## 6. 올리기와 끝

1. 검수 기록(`<자리>-import.json`)을 묶음 폴더(`$W/pack`)에 둔다.
2. `upload-art.py` 로 바꾸고 · 대조하고 · **무기 하나 한 커밋**으로 일반 push 한다 — 덮지 않게 `--new-only`, 기록을 같은 커밋에 `--records`:

```sh
python3 tools/upload-art.py '<카드 이름>' --style <화풍> --new-only --records $W/pack \
    base=$W/base.png awaken=$W/awaken.png cursed=$W/cursed.png casual2=$W/casual2.png …
```

   그림은 `img/<파일>.webp`(1024×1536, 품질 90), 기록은 `records/<카드>/` 에 `<자리>-ui.json`(묶음 파일 그대로) · `<자리>-import.json` · `casual-plan.json` 이 간다.
   **원본 PNG 는 올리지 않는다** — sha256 만. 썸네일 · `data/img.json` 은 손으로 만들지 않는다(워크플로가 한다).
3. push 가 밀리면 도구가 다시 해 본다. 그 사이 같은 파일 이름이 들어왔으면 멈추고 보고한다.
4. 도구가 등록(`data/img.json`)까지 기다린다. 3분 넘게 안 되면 코드 저장소 Actions 의 「그림 등록」 을 본다.
5. 코드 저장소를 pull 한 뒤 끝낸다. 등록이 아직이면 잠금을 `working` 으로 두고 실행을 마친다 — 다음 실행의 `status` 가 끝내라고 알려 준다.

```sh
node tools/image-claim.cjs done <카드> --execution $ATELIER_EXECUTION_ID
```

`done` 은 `data/img.json` 에 그 무기의 빈 자리가 없어야 된다(일상컷 다섯 장까지).

## 7. 기록 꼴 — `records/<카드>/<자리>-import.json`

```json
{"version": 1, "card": "<카드 이름>", "slot": "<자리 — base · awaken · cursed · casualN>", "style": "<화풍 — game_keyart>", "file": "<올린 파일>",
 "source": {"kind": "generated", "tool": "image_gen (GPT 세션)", "format": "png", "size": [1024, 1536], "sha256": "<원본>",
            "note": "원본 PNG 는 올리지 않는다 — sha256 만 남긴다"},
 "reference": "<첨부한 파일 이름 | null>", "prompt": "records/<카드>/<자리>-ui.json", "prompt_sha256": "<INDEX.md 의 값 전체>",
 "converted": {"format": "webp", "quality": 90, "composition_match": "<각성 · 저주면 upload-art 의 구도 일치 | null>"},
 "imported": "<YYYY-MM-DD>", "execution": "<실행 ID>",
 "qa": {"reviewer": "<세션>", "image_sha256": "<원본>", "passed": true, "observations": ["<본 것 하나씩>"], "cause": "<어긋났으면 부딪힌 줄>"},
 "acceptance": "user_approval_2026-11-01 — 다른 공방과 같게 묻지 않고 올리고 사용자가 올라간 뒤 본다"}
```

`<자리>-ui.json` 은 생성기 「기록 내보내기」 와 같은 꼴이다 — 그 `storage` 를 생성기(localStorage `myth_prompt_v1`)에 넣으면 같은 지시문이 나온다.

## 8. 하지 않는 것

- 브라우저로 생성기를 조작하지 않는다 · 다른 유료 API 나 새 자격증명을 쓰지 않는다 · 계획 · 지시문을 손으로 고쳐 내지 않는다.
- 남의 잠금 · 기록 · 그림을 고치지 않는다 · 검수 실패를 통과로 바꾸지 않는다 · 같은 자리를 여러 번 다시 그려 고르지 않는다 · 이미 있는 그림을 덮지 않는다.
