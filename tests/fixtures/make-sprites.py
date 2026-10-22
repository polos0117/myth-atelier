"""브라우저 검사용 가짜 도트 시트 — 주어진 sprites.json 의 인물마다 칸·칸 수대로, 칸마다 색이 다른 사람 꼴을 투명 바탕에 그린다.
   python3 tests/fixtures/make-sprites.py <sprites.json> <자리>   → <자리>/sprites/<인물 파일> 들
(도트 재생기를 쓰는 공방이 같은 파일을 둔다 — book-atelier 의 make-sprites.py 를 자료 경로를 받게 고친 것)"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw


def main(src, out):
    data = json.loads(Path(src).read_text(encoding='utf-8'))
    for key, a in data['actors'].items():
        cw, ch = a['cell']; fx, fy = a.get('foot', [cw // 2, ch - 2])
        for name, st in a['states'].items():
            n = st.get('frames', 1)
            im = Image.new('RGBA', (cw * n, ch), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
            for k in range(n):
                c = ((60 + 40 * k) % 256, (140 + 70 * (sum(map(ord, name)) % 3)) % 256, (200 - 30 * k) % 256, 255)
                x = k * cw + fx
                d.ellipse((x - 10, fy - 120, x + 10, fy - 98), fill=c)
                d.rectangle((x - 14, fy - 98, x + 14, fy - 40), fill=c)
                d.rectangle((x - 12, fy - 40, x - 3, fy - 1), fill=c)
                d.rectangle((x + 3, fy - 40, x + 12, fy - 1), fill=c)
            f = Path(out) / 'sprites' / st['file']; f.parent.mkdir(parents=True, exist_ok=True); im.save(f)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
