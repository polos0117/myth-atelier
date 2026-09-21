#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""저장소에 있는 초상 파일을 data/img.json 에 등록한다.

파일 이름이 곧 등록 정보다.
    <카드 이름>_m.webp        남성체 초상
    <카드 이름>_f.webp        여성체 초상
    <카드 이름>_f_casual3.webp  여성 일상컷 3
    <카드 이름>_m_casual3.webp  남성 일상컷 3
    <카드 이름>_f_extra1.webp   여성 특별컷 1
일상컷·특별컷도 초상과 같이 성별을 나눈다. 성별 표시가 없는 예전 이름
(<카드 이름>_casual3.webp)은 여성으로 친다 — 지금 있는 것이 전부 여성이라
이름을 다시 붙이지 않고 규칙 한 줄로 받는다.
카드 이름의 공백은 밑줄로 써도 된다(건담_데스사이즈_m.webp).

카드 이름과 칸 사이에 화풍 key 를 끼우면 그 화풍 몫으로 들어간다.
    <카드 이름>_<화풍>_f.webp        건이지_glossy_kr_game_f.webp
    <카드 이름>_<화풍>_m_casual1.webp  화풍과 성별을 같이 쓸 수도 있다
화풍 key 는 prompt-spec.js에서 생성한 data/style.json 목록만 쓰고, 그 밖의 토막이 끼면
카드 이름으로 읽히다 실패해 "그런 카드가 없다"로 남는다 — 오타를 잡으려고
일부러 통과시키지 않는다. 이미 등록된 기본 자리는 화풍 미상으로 보존한다.
신규 파일에는 화풍 key가 필수이며 byStyle[화풍] 밑에 등록한다.
누락·오타·동일 슬롯 충돌이 있으면 파일을 쓰지 않고 실패한다.

얼굴 좌표(face)는 파일 이름에서 알 수 없다. 없으면 게임이 기본값
FACE_DEF=[.34,.03,.30] 을 쓰므로 일단 뜨기는 뜨고, 잘라낸 자리가 어색하면
사람이 img.json 에서 손봐야 한다. 그래서 이 스크립트는 없는 것만 더하고
이미 적힌 것은 건드리지 않는다 — 손으로 맞춰 둔 값을 덮지 않기 위해서다.

play.html과 dex.html은 검증된 data/img.json을 읽는다. GitHub 파일 목록만으로
미등록 이미지를 화면에 추가하지 않으므로 이 스크립트의 검증이 먼저 통과해야 한다.

사용법:
    python3 register-images.py            # data/img.json 에 없는 것을 더한다
    python3 register-images.py --check    # 쓰지 않고 무엇이 달라지는지만 본다
    python3 register-images.py --prune    # 파일이 사라진 항목도 지운다
"""
import argparse
import os
import re

import roster

# 초상 파일이 사는 곳. 예전에는 저장소 최상위였는데 GitHub 의 파일 목록 API 가
# 1000개에서 잘려서, 그 앞에서 새 그림이 조용히 안 보이게 된다. img.json 에는
# 폴더 없이 파일 이름만 적는다 — 경로는 화면 쪽 IMG_BASE 한 곳이 붙인다.
IMG_DIR = "img"

PAT = re.compile(r"^(.+?)_(m|f|casual(\d+)|extra(\d+)|action(\d+))\.webp$", re.I)
# 툴킷 화풍 견본. 카드 초상이 아니다
SKIP = re.compile(r"^style-")


def split_gender(head):
    """'피카츄_light_cinematic_semi_real_f' → (…, 'f'). 표시가 없으면 None.

    앞선 저장소는 표시가 없으면 여성으로 쳤는데, 그러면 한 그림을 두 철자로
    쓸 수 있어 언젠가 갈린다. 여기서는 _f 를 반드시 붙인다 — 지금은 여성만
    만들지만 나중에 남성을 더해도 옛 파일의 뜻이 안 바뀐다."""
    for g in ("f", "m"):
        if head.lower().endswith("_" + g):
            return head[:-2], g
    return head, None


def split_style(head, styles):
    """'건이지_glossy_kr_game' → ('건이지', 'glossy_kr_game').

    화풍이 안 붙었으면 style 자리가 None 이다. 이름 뒤가 아는 화풍일 때만
    떼어내므로, 화풍처럼 생겼지만 목록에 없는 토막은 카드 이름의 일부로 남아
    뒤에서 '그런 카드가 없다'로 걸린다."""
    for k in styles:
        if head.lower().endswith("_" + k):
            return head[: -len(k) - 1], k
    return head, None


def card_index():
    """'공백을 밑줄로 바꾼 이름' → 카드 이름."""
    return {n.replace(" ", "_"): n for n in roster.cards()}


def split_form(head, forms):
    """'피카츄_mobility' → ('피카츄', 'mobility'). 폼이 없으면 form 자리가 None.

    split_style 과 같은 방식이다 — 아는 폼일 때만 떼어낸다. 그래서 폼을 안 쓰는
    카드는 이름이 그대로 남고, 폼처럼 생겼지만 목록에 없는 토막이 끼면 뒤에서
    '그런 카드가 없다'로 걸린다.

    이름 차례가 <카드>_<폼>_<화풍>_<성별> 인 까닭도 여기 있다. 뒤에서부터
    성별 → 화풍 → 폼 순으로 벗겨야 남는 것이 카드 이름이 된다."""
    # 폭주는 장갑별 그림 자리다. 긴 키부터 읽어 _overdrive 만 먼저 벗기지 않는다.
    keys = list(forms) + [k + '_overdrive' for k in forms if k != 'overdrive']
    for k in sorted(keys, key=len, reverse=True):
        if head.lower().endswith("_" + k):
            return head[: -len(k) - 1], k
    return head, None


def shots(bucket, slot):
    """일상컷·특별컷은 {"f": [...], "m": [...]} 꼴이다. 없는 성별은 칸이 없다."""
    v = bucket.get(slot)
    return v if isinstance(v, dict) else ({"f": v} if v else {})


def buckets(img):
    """카드 몫·화풍 몫·폼 몫을 한 줄로 늘어놓는다. 셋의 속은 같은 꼴이다."""
    def walk(v):
        yield v
        for b in (v.get("byStyle") or {}).values():
            for x in walk(b):
                yield x
        for b in (v.get("byForm") or {}).values():
            yield b

    for v in img.values():
        for x in walk(v):
            yield x


SLOTS = ("m", "f", "face", "casual", "extra", "action", "byForm")


def tidy(img, styles):
    """칸 차례를 고정한다. 파일이 붙는 차례대로 두면 같은 내용이라도 줄이
    달라 보여서, 손으로 넣은 항목과 이 스크립트가 넣은 항목의 diff 가 지저분해진다."""
    order = list(styles)

    def one(b):
        return {k: b[k] for k in SLOTS if k in b}

    for v in img.values():
        bs = v.pop("byStyle", None)
        for k in [k for k in v if k not in SLOTS]:
            del v[k]
        v.update(one(dict(v)))
        for k in [k for k in v if k not in SLOTS]:
            del v[k]
        if bs:
            v["byStyle"] = {k: one(bs[k]) for k in sorted(bs, key=lambda x: (
                order.index(x) if x in order else len(order), x))}


def listed_files(img):
    """img.json 이 이미 가리키고 있는 파일 전부. byStyle 안쪽까지 본다."""
    out = set()

    def take(d):
        for k in ("m", "f"):
            if d.get(k):
                out.add(d[k])
        for k in ("casual", "extra", "action"):
            for lst in shots(d, k).values():
                for f in lst or []:
                    out.add(f)

    for b in buckets(img):
        take(b)
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
    forms = roster.forms()
    disk = {f for f in os.listdir(IMG_DIR) if f.lower().endswith(".webp")}
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
        # 초상은 성별이 뒤쪽 토막(kind)에 있고, 컷은 이름 가운데에 있다.
        # 어느 쪽이든 반드시 적혀 있어야 한다 — 빠뜨리면 한 그림을 두 철자로 쓰게 된다
        if kind in ("m", "f"):
            gender = kind
        elif not gender:
            unknown.append((f, "성별 표시(_f)가 없다"))
            continue
        head, style = split_style(head, styles)
        head, form = split_form(head, forms)
        card = idx.get(head.replace(" ", "_"))
        if not card:
            unknown.append((f, "카드 이름·화풍 key·폼 key 중에 잘못된 것이 있다"))
            continue
        if not style:
            unknown.append((f, "신규 파일에 화풍 key가 없다 — 과거 기본 자리는 기존 등록만 유지"))
            continue
        e = img.setdefault(card, {})
        if style:
            e = e.setdefault("byStyle", {}).setdefault(style, {})
        # 폼이 붙었으면 그 폼 몫으로 들어간다. 일상컷은 폼을 안 타므로 여기 안 온다
        if form:
            if not kind in ("m", "f") and not kind.startswith("action"):
                unknown.append((f, "폼에는 초상과 action 만 붙는다 — 일상컷은 폼을 안 탄다"))
                continue
            e = e.setdefault("byForm", {}).setdefault(form, {})
        if kind in ("m", "f"):
            if e.get(kind):
                unknown.append((f, "초상 슬롯 중복: " + e[kind]))
                continue
            e[kind] = f
        else:
            slot = ("casual" if kind.startswith("casual")
                    else "action" if kind.startswith("action") else "extra")
            n = int(m.group(3) or m.group(4) or m.group(5))
            if n < 1:
                unknown.append((f, "컷 번호는 1 이상이어야 한다"))
                continue
            box = e.setdefault(slot, {})
            if not isinstance(box, dict):
                box = e[slot] = {"f": box}
            lst = box.setdefault(gender, [])
            # 기존 배열은 압축돼 있으므로 인덱스가 아니라 파일명 컷 번호로 비교한다.
            collision = next((x for x in lst if x and
                              re.search(r"_" + slot + r"0*" + str(n) + r"\.webp$", x, re.I)), None)
            if collision:
                unknown.append((f, "컷 슬롯 중복: " + collision))
                continue
            lst[:] = [x for x in lst if x]
            lst.append(f)
            lst.sort(key=lambda x: int(re.search(r"_(?:casual|extra|action)(\d+)\.webp$", x, re.I).group(1)))
        added.append((card + ("" if not style else " · " + styles[style])
                      + ("" if kind in ("m", "f") else " · " + ("남" if gender == "m" else "여")), f))

    # 자리를 메우려고 넣은 빈 칸은 도로 걷어낸다
    for e in buckets(img):
        for slot in ("casual", "extra"):
            if slot not in e:
                continue
            box = shots(e, slot)
            box = {g: [x for x in lst if x] for g, lst in box.items()}
            box = {g: lst for g, lst in box.items() if lst}
            if box:
                e[slot] = {g: box[g] for g in ("f", "m") if g in box}
            else:
                del e[slot]

    ghosts = sorted(listed_files(img) - disk)
    if a.prune and ghosts:
        gone = set(ghosts)
        for e in buckets(img):
            for k in ("m", "f"):
                if e.get(k) in gone:
                    del e[k]
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

    # 그림이 다 빠진 화풍 칸은 남겨봐야 화풍만 하나 더 있는 것처럼 보인다
    for v in img.values():
        bs = v.get("byStyle")
        if bs is None:
            continue
        for k in [k for k, b in bs.items() if not b]:
            del bs[k]
        if not bs:
            del v["byStyle"]

    tidy(img, styles)
    doc["img"] = dict(sorted(img.items()))
    doc["count"] = len(img)
    if not a.check and not unknown:
        roster.write("img", doc)

    print("[%s] data/img.json · 카드 %d · 파일 %d"
          % ("검증 실패·저장 안 함" if unknown else ("대조" if a.check else "완료"), len(img), len(listed_files(img))))
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
        print("  새로 들어왔는데 %d×%d 이 아닌 그림 %d"
              % (roster.ART_SIZE[0], roster.ART_SIZE[1], len(odd)))
        for name, w, h in odd[:10]:
            print("     %-40s %d×%d" % (name, w, h))
    annotate(added, ghosts, unknown, a.prune and not a.check and not unknown, odd)
    if unknown:
        raise SystemExit(1)


def annotate(added, ghosts, unknown, pruned, odd=()):
    """GitHub Actions 로 돌 때는 실행 화면에도 남긴다.

    등록 못 한 파일이 있으면 저장하지 않고 실패한다. 실행 요약에 원인을 모두 남긴다."""
    if not os.environ.get("GITHUB_ACTIONS"):
        return
    for f, why in unknown:
        print("::error file=%s::초상을 등록하지 못했다 — %s" % (f, why))
    for f in ghosts:
        print("::warning::%s 가 img.json 에 적혀 있는데 파일이 없다%s"
              % (f, " (지웠다)" if pruned else " — --prune 으로 지운다"))
    for name, w, h in odd:
        print("::warning file=%s::%d×%d 로 들어왔다 — 초상 규격은 %d×%d 다."
              " 함선·삼국처럼 일부러 다른 꼴이면 그냥 두라"
              % (name, w, h, roster.ART_SIZE[0], roster.ART_SIZE[1]))
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if not path:
        return
    with open(path, "a", encoding="utf-8") as f:
        f.write("### 초상 등록\n\n")
        f.write("- 새로 등록 **%d**\n" % len(added))
        for card, name in added:
            f.write("  - `%s` ← %s\n" % (card, name))
        if unknown:
            f.write("- 등록 못 한 파일 **%d** — 카드 이름과 파일 이름이 맞는지 본다\n"
                    % len(unknown))
            for name, why in unknown:
                f.write("  - `%s` — %s\n" % (name, why))
        if ghosts:
            f.write("- 적혀 있는데 파일이 없는 것 **%d**\n" % len(ghosts))
        if odd:
            f.write("- 규격(%d×%d) 밖으로 들어온 그림 **%d** — 일부러 그런 것인지 본다\n"
                    % (roster.ART_SIZE[0], roster.ART_SIZE[1], len(odd)))
            for name, w, h in odd:
                f.write("  - `%s` — %d×%d\n" % (name, w, h))


if __name__ == "__main__":
    main()
