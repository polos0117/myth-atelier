#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""그림 저장소의 img/ 를 읽어 data/img.json 에 등록한다.

파일 이름이 곧 등록 정보다. 폼은 없다 — 무기당 액션 한 장이 곧 그 캐릭터다.
    <카드>_<화풍>_f.webp            액션 한 장(카드 그림)
    <카드>_<화풍>_f_awaken.webp     각성 한 장(3성일 때 대신 뜬다) — 선택
    <카드>_<화풍>_f_cursed.webp     저주 한 장(저주 발현 때 대신 뜬다) — 선택
    <카드>_<화풍>_f_casual3.webp    일상컷 3 — 선택
카드 이름의 공백은 밑줄로 써도 된다(아킬레우스의_창_glossy_promo_f.webp).
화풍 key 는 data/style.json 목록만 쓰고, 그 밖의 토막이 끼면 카드 이름으로
읽히다 실패해 "그런 카드가 없다"로 남는다 — 오타를 잡으려고 일부러 통과시키지 않는다.
성별 표시(_f)는 반드시 붙인다. 지금은 여성만 만들지만 남성을 더해도 옛 파일의 뜻이 안 바뀐다.
누락·오타·같은 자리 충돌이 있으면 파일을 쓰지 않고 실패한다.

사용법:
    python3 tools/register-images.py            # data/img.json 에 없는 것을 더한다
    python3 tools/register-images.py --check    # 쓰지 않고 무엇이 달라지는지만 본다
    python3 tools/register-images.py --prune    # 파일이 사라진 항목도 지운다
"""
import argparse
import os
import re

import roster

# GitHub 의 파일 목록 API 가 1000개에서 잘리므로 img/ 폴더 안에 둔다.
# img.json 에는 폴더 없이 파일 이름만 적는다 — 경로는 lib/img.js 의 BASE 가 붙인다.
IMG_DIR = "img"

PAT = re.compile(r"^(.+?)_(m|f|awaken|cursed|casual(\d+)|extra(\d+))\.webp$", re.I)
# 화풍 견본. 카드 그림이 아니다
SKIP = re.compile(r"^style-")


def split_gender(head):
    """'묠니르_glossy_promo_f' → ('묠니르_glossy_promo', 'f'). 표시가 없으면 None."""
    for g in ("f", "m"):
        if head.lower().endswith("_" + g):
            return head[:-2], g
    return head, None


def split_style(head, styles):
    """'묠니르_glossy_promo' → ('묠니르', 'glossy_promo'). 아는 화풍일 때만 떼어낸다."""
    for k in styles:
        if head.lower().endswith("_" + k):
            return head[: -len(k) - 1], k
    return head, None


def card_index():
    """'공백을 밑줄로 바꾼 이름' → 카드 이름."""
    return {n.replace(" ", "_"): n for n in roster.cards()}


def shots(bucket, slot):
    """일상컷은 {"f": [...], "m": [...]} 꼴이다. 없는 성별은 칸이 없다."""
    v = bucket.get(slot)
    return v if isinstance(v, dict) else ({"f": v} if v else {})


def buckets(img):
    """카드 몫·화풍 몫을 한 줄로 늘어놓는다. 둘의 속은 같은 꼴이다."""
    for v in img.values():
        yield v
        for b in (v.get("byStyle") or {}).values():
            yield b


SLOTS = ("m", "f", "awaken", "cursed", "casual", "extra")


def tidy(img, styles):
    """칸 차례를 고정한다. 차례가 흔들리면 같은 내용도 diff 가 지저분해진다."""
    order = list(styles)

    def one(b):
        return {k: b[k] for k in SLOTS if k in b}

    for v in img.values():
        bs = v.pop("byStyle", None)
        for k in [k for k in v if k not in SLOTS]:
            del v[k]
        if bs:
            v["byStyle"] = {k: one(bs[k]) for k in sorted(bs, key=lambda x: (
                order.index(x) if x in order else len(order), x))}


def listed_files(img):
    """img.json 이 이미 가리키고 있는 파일 전부. byStyle 안쪽까지 본다."""
    out = set()
    for d in buckets(img):
        for k in ("m", "f"):
            if d.get(k):
                out.add(d[k])
        for slot in ("awaken", "cursed"):
            for g, f in (d.get(slot) or {}).items():
                if f:
                    out.add(f)
        for k in ("casual", "extra"):
            for lst in shots(d, k).values():
                for f in lst or []:
                    out.add(f)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--prune", action="store_true", help="파일이 없어진 항목을 지운다")
    a = ap.parse_args()

    doc = roster.read("img")
    img = doc["img"]
    idx = card_index()
    styles = roster.styles()
    # 그림이 하나도 없으면 폴더 자체가 없다(git 은 빈 폴더를 안 올린다). 그것도 정상이다
    disk = {f for f in (os.listdir(IMG_DIR) if os.path.isdir(IMG_DIR) else [])
            if f.lower().endswith(".webp")}
    listed = listed_files(img)

    added, unknown = [], []
    for f in sorted(disk - listed):
        if SKIP.match(f):
            continue
        m = PAT.match(f)
        if not m:
            unknown.append((f, "이름 꼴이 안 맞는다"))
            continue
        kind = m.group(2).lower()
        head, gender = split_gender(m.group(1))
        if kind in ("m", "f"):
            gender = kind
        elif not gender:
            unknown.append((f, "성별 표시(_f)가 없다"))
            continue
        head, style = split_style(head, styles)
        card = idx.get(head.replace(" ", "_"))
        if not card:
            unknown.append((f, "카드 이름·화풍 key 중에 잘못된 것이 있다"))
            continue
        if not style:
            unknown.append((f, "화풍 key 가 없다 — <카드>_<화풍>_f.webp 꼴이어야 한다"))
            continue
        e = img.setdefault(card, {}).setdefault("byStyle", {}).setdefault(style, {})
        if kind in ("m", "f"):
            if e.get(kind):
                unknown.append((f, "액션 자리 중복: " + e[kind]))
                continue
            e[kind] = f
        elif kind in ("awaken", "cursed"):
            box = e.setdefault(kind, {})
            if box.get(gender):
                unknown.append((f, kind + " 자리 중복: " + box[gender]))
                continue
            box[gender] = f
        else:
            slot = "casual" if kind.startswith("casual") else "extra"
            n = int(m.group(3) or m.group(4))
            if n < 1:
                unknown.append((f, "컷 번호는 1 이상이어야 한다"))
                continue
            box = e.setdefault(slot, {})
            if not isinstance(box, dict):
                box = e[slot] = {"f": box}
            lst = box.setdefault(gender, [])
            collision = next((x for x in lst if x and
                              re.search(r"_" + slot + r"0*" + str(n) + r"\.webp$", x, re.I)), None)
            if collision:
                unknown.append((f, "컷 자리 중복: " + collision))
                continue
            lst[:] = [x for x in lst if x]
            lst.append(f)
            lst.sort(key=lambda x: int(re.search(r"_(?:casual|extra)(\d+)\.webp$", x, re.I).group(1)))
        added.append((card + " · " + styles[style]
                      + ("" if kind in ("m", "f") else " · " + kind), f))

    ghosts = sorted(listed_files(img) - disk)
    if a.prune and ghosts:
        gone = set(ghosts)
        for e in buckets(img):
            for k in ("m", "f"):
                if e.get(k) in gone:
                    del e[k]
            for slot in ("awaken", "cursed"):
                if slot in e:
                    e[slot] = {g: f for g, f in e[slot].items() if f not in gone}
                    if not e[slot]:
                        del e[slot]
            for k in ("casual", "extra"):
                if k not in e:
                    continue
                box = {g: [x for x in lst if x not in gone]
                       for g, lst in shots(e, k).items()}
                box = {g: lst for g, lst in box.items() if lst}
                if box:
                    e[k] = box
                else:
                    del e[k]

    # 그림이 다 빠진 화풍 칸·카드 칸은 남겨봐야 헷갈린다
    for name in list(img):
        bs = img[name].get("byStyle") or {}
        for k in [k for k, b in bs.items() if not b]:
            del bs[k]
        if not bs:
            del img[name]

    tidy(img, styles)
    doc["img"] = dict(sorted(img.items()))
    doc["count"] = len(img)
    if not a.check and not unknown:
        roster.write("img", doc)

    print("[%s] data/img.json · 카드 %d · 파일 %d"
          % ("검증 실패·저장 안 함" if unknown else ("대조" if a.check else "완료"),
             len(img), len(listed_files(img))))
    print("  등록 후보 %d%s" % (len(added), " — 오류로 저장 안 함" if unknown else ""))
    for card, f in added[:20]:
        print("     %-24s %s" % (card, f))
    if ghosts:
        print("  적혀 있는데 파일이 없는 것 %d%s"
              % (len(ghosts), " (지웠다)" if a.prune and not a.check else " — --prune 으로 지운다"))
        for f in ghosts[:10]:
            print("     %s" % f)
    if unknown:
        print("  등록 못 한 파일 %d" % len(unknown))
        for f, why in unknown:
            print("     %-40s %s" % (f, why))
    odd = roster.art_size()
    if odd:
        print("  %d×%d 이 아닌 그림 %d" % (roster.ART_SIZE[0], roster.ART_SIZE[1], len(odd)))
        for name, w, h in odd[:10]:
            print("     %-40s %d×%d" % (name, w, h))
    annotate(added, ghosts, unknown, a.prune and not a.check and not unknown, odd)
    if unknown:
        raise SystemExit(1)


def annotate(added, ghosts, unknown, pruned, odd=()):
    """GitHub Actions 로 돌 때는 실행 화면에도 남긴다."""
    if not os.environ.get("GITHUB_ACTIONS"):
        return
    for f, why in unknown:
        print("::error file=%s::그림을 등록하지 못했다 — %s" % (f, why))
    for f in ghosts:
        print("::warning::%s 가 img.json 에 적혀 있는데 파일이 없다%s"
              % (f, " (지웠다)" if pruned else " — --prune 으로 지운다"))
    for name, w, h in odd:
        print("::warning file=%s::%d×%d 로 들어왔다 — 규격은 %d×%d 다. 일상컷이면 그냥 두라"
              % (name, w, h, roster.ART_SIZE[0], roster.ART_SIZE[1]))
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not path:
        return
    with open(path, "a", encoding="utf-8") as f:
        f.write("### 그림 등록\n\n")
        f.write("- 새로 등록 **%d**\n" % len(added))
        for card, name in added:
            f.write("  - `%s` ← %s\n" % (card, name))
        if unknown:
            f.write("- 등록 못 한 파일 **%d** — 카드 이름과 파일 이름이 맞는지 본다\n" % len(unknown))
            for name, why in unknown:
                f.write("  - `%s` — %s\n" % (name, why))
        if ghosts:
            f.write("- 적혀 있는데 파일이 없는 것 **%d**\n" % len(ghosts))
        if odd:
            f.write("- 규격(%d×%d) 밖으로 들어온 그림 **%d**\n"
                    % (roster.ART_SIZE[0], roster.ART_SIZE[1], len(odd)))


if __name__ == "__main__":
    main()
