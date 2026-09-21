# 패치 기록

파일을 고친 쪽이 직접 한 칸 적는다. 규칙은 `AGENTS.md` 의 "고쳤으면 적는다" 에 있다.
집 화면(`index.html`)의 **패치 기록** 단추가 이 파일을 그대로 읽어 보여 준다.

모양은 두 줄이 전부다. 한 칸은 `##` 으로 시작하고 `날짜 · 누가 · 무엇을 바꿨나` 를
가운뎃점으로 나눈다. 그 아래 `-` 줄에 `파일 — 왜/무엇` 을 파일마다 하나씩 적는다.
날짜는 `2026-09-21` 꼴, 누가는 `claude` 또는 `gpt`, 새 칸이 위로 간다.
이 안내글은 첫 `##` 앞이라 화면이 읽지 않는다. `node tests/patch.cjs` 가 모양을 본다.

## 2026-09-21 · claude · 집·도감·자료·등록 도구 — 1단계

- lib/words.js — 신화 무기 주제의 낱말 표. 항해는 공방·도감·오토 배틀·프롬프트 넷
- lib/workspace-ui.js — 항해 네 칸, 여덟 결의 무기 문양(망치·검·활·창·원반·도끼·방패·모루)
- lib/img.js — 그림 주소를 myth-atelier-img 로. 폼을 지우고 각성(awaken) 칸을 더했다
- data/group.json · data/skill.json · data/img.json — 신화권·종류 이름표와 색, 기술 마흔 개(효과·배수·대상), 빈 그림 목록
- tools/roster.py · tools/register-images.py — 폼 없는 이름 규칙 `<카드>_<화풍>_f[_awaken|_casualN].webp`
- index.html · dex.html — 집 화면과 도감(거르기 다섯, 상세, 각성 단추, 일상컷)
- tests/data.cjs · tests/dex-screen.cjs — 자료 정합과 도감 화면 검사. 머리·결 검사는 화면 목록만 고쳤다
- .github/workflows/register-images.yml — 그림 저장소 이름과 검사 명령
