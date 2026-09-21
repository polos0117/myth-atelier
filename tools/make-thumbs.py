#!/usr/bin/env python3
"""img/ 의 초상 webp 로 목록용 썸네일을 만든다.

도감 목록(.face)은 2:3 비율에 96px 안팎으로 그리는데, 지금은 원본(평균 140KB)을
그대로 배경 이미지로 받는다. 여기서 만든 작은 파일을 대신 쓰면 목록 트래픽이
10분의 1 아래로 떨어진다.

  img/<카드>_....webp  ->  img/thumb/<같은 이름>

전신 비율을 유지한 채 긴 변 기준으로 줄인다. 얼굴만 잘라내지 않는 이유는
목록에서 기체 실루엣이 보여야 카드를 구분하기 때문이다.

원본이 2:3 이 아닌 것(예: 1122x1402)도 비율 그대로 줄인다. 목록 CSS 가
cover 로 잘라 보여주므로 여기서 굳이 맞추지 않는다.

이미 있고 원본보다 새 것이면 건너뛴다. 그래서 워크플로가 매번 돌아도
새로 올라온 것만 처리한다.

화풍 견본(style-*.webp)은 목록에 안 쓰이므로 제외한다.
"""
import sys
from pathlib import Path
from PIL import Image

SRC = Path("img")
DST = SRC / "thumb"
LONG_EDGE = 512          # 2:3 이면 341x512. 갤러리(.gal, 120~200px 폭) 기준으로 잡았다
QUALITY = 72


def targets():
    for p in sorted(SRC.glob("*.webp")):
        if p.name.startswith("style-"):
            continue
        yield p


def stale(src: Path, dst: Path) -> bool:
    if not dst.exists():
        return True
    return src.stat().st_mtime > dst.stat().st_mtime


def build(src: Path, dst: Path) -> int:
    im = Image.open(src).convert("RGB")
    w, h = im.size
    scale = LONG_EDGE / max(w, h)
    if scale < 1:
        im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))),
                       Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "WEBP", quality=QUALITY, method=6)
    return dst.stat().st_size


def main() -> int:
    check = "--check" in sys.argv
    if not SRC.is_dir():
        print("img/ 가 없다", file=sys.stderr)
        return 1

    made = skipped = total = 0
    for src in targets():
        dst = DST / src.name
        if not stale(src, dst):
            skipped += 1
            continue
        if check:
            print("생성 예정:", dst)
            made += 1
            continue
        total += build(src, dst)
        made += 1

    # 원본이 사라진 썸네일은 치운다
    removed = 0
    if DST.is_dir() and not check:
        names = {p.name for p in targets()}
        for p in DST.glob("*.webp"):
            if p.name not in names:
                p.unlink()
                removed += 1

    print(f"썸네일 {made}장 생성, {skipped}장 유지, {removed}장 삭제"
          + (f", 합계 {total/1024:.0f}KB" if total else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
