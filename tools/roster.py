# -*- coding: utf-8 -*-
"""자료 파일 읽기·쓰기. pkm-atelier 의 roster.py 에서 주제와 무관한 몫만 가져왔다.

카드 모양이 다르다 — 여기는 data/card.json 의 cards 가 한 목록이고,
갈래(myth·kind)는 카드 안에 적혀 있다. 폼은 없다."""
import json, os

DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
ART_SIZE = (1024, 1536)          # 2:3 세로. 액션 한 장은 이 크기로 맞춘다


def path(name):
    return os.path.join(DIR, name if name.endswith(".json") else name + ".json")


def read(name):
    with open(path(name), encoding="utf-8") as f:
        return json.load(f)


def cards():
    """{카드 이름: 카드}. 이름은 한국어 정본이고 그림 파일 이름이 여기서 나온다."""
    return {c["name"]: c for c in read("card").get("cards") or []}


def styles():
    """화풍 key → 이름. data/style.json 을 읽는다."""
    return {r["key"]: r["name"] for r in read("style")["styles"]}


def one_line(v):
    """줄바꿈 없이 한 줄로. 항목 하나가 한 줄이면 diff 로 바로 읽힌다."""
    return json.dumps(v, ensure_ascii=False, separators=(", ", ": "))


def _render(obj):
    def val(v, pad):
        if isinstance(v, list) and v and isinstance(v[0], dict):
            return "[\n" + ",\n".join(pad + " " + one_line(x) for x in v) + "\n" + pad + "]"
        if isinstance(v, dict) and len(v) > 8:
            return ("{\n" + ",\n".join('%s "%s": %s' % (pad, k, val(x, pad + " "))
                                       for k, x in v.items()) + "\n" + pad + "}")
        return one_line(v)
    return "{\n" + ",\n".join(' "%s": %s' % (k, val(v, " "))
                              for k, v in obj.items()) + "\n}\n"


def write(name, obj):
    open(path(name), "w", encoding="utf-8").write(_render(obj))


def _webp_size(rel):
    """webp 머리말에서 가로·세로만 읽는다. 외부 꾸러미 없이."""
    try:
        b = open(os.path.join(os.path.dirname(DIR), rel), "rb").read(64)
    except OSError:
        return None
    if b[:4] != b"RIFF" or b[8:12] != b"WEBP":
        return None
    if b[12:16] == b"VP8X":
        return (int.from_bytes(b[24:27], "little") + 1,
                int.from_bytes(b[27:30], "little") + 1)
    if b[12:16] == b"VP8L":
        n = int.from_bytes(b[21:25], "little")
        return ((n & 0x3FFF) + 1, ((n >> 14) & 0x3FFF) + 1)
    if b[12:16] == b"VP8 ":
        return (int.from_bytes(b[26:28], "little") & 0x3FFF,
                int.from_bytes(b[28:30], "little") & 0x3FFF)
    return None


def art_size():
    """[(이름, 가로, 세로)…] — img/ 안에서 ART_SIZE 가 아닌 그림.
    액션과 각성은 같은 자리에 번갈아 뜨므로 크기가 같아야 한다. 일상컷은
    일부러 다른 꼴로 뽑을 수 있으므로 서지는 않고 적어 내기만 한다."""
    root = os.path.dirname(DIR)
    d = os.path.join(root, "img")
    if not os.path.isdir(d):
        return []
    bad = []
    for n in sorted(os.listdir(d)):
        if not n.lower().endswith(".webp"):
            continue
        sz = _webp_size(os.path.join("img", n))
        if sz and sz != ART_SIZE:
            bad.append((n, sz[0], sz[1]))
    return bad
