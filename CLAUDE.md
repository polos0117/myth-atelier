# Myth Atelier 작업 안내

먼저 [AGENTS.md](AGENTS.md)를 읽는다.

그림 변환·업로드·이름 변경·도감 등록·화풍 옮기기 전에는 [IMAGE_RULES.md](IMAGE_RULES.md)를 반드시 읽는다. 파일 이름·크기·두 저장소 순서는 그 문서 한 곳에서 관리한다.

`prompt.html`로 문장을 뽑아 그림을 만들고 올리는 작업 전에는 [PROMPT_IMAGE_WORKFLOW.md](PROMPT_IMAGE_WORKFLOW.md)도 반드시 읽는다. 올리는 손은 `tools/upload-art.py`(`.claude/skills/upload-art/`)다.

검사는 바꾼 만큼만 돌린다(사용자 2026-11-11 「쓸데없는 검사를 너무 자주돌리는거 같아」 → 「응 적어줘」):
- 지시문 글 몇 마디(낱말 · 문장 교체) — 검사 없음. 바뀐 지시문을 직접 뽑아 새 글이 들어갔는지만 본다.
- core 낱말 — 화풍공방 `node tests/core.cjs` 하나(몇 초).
- 지시문 조립 코드(칸 순서 · 줄 옮기기 등) — 그 공방 지시문 검사(`tests/prompt-*`)만.
- 화면 · 도구 코드 — 그 화면 · 도구 검사만.
- 여러 공방의 구조를 크게 바꿀 때만 전체 검사(`tests/*.cjs`).
