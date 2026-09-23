#!/usr/bin/env python3
"""그림 올리기 — 받은 그림을 webp 로 바꾸고, 각성·저주가 기본과 같은 구도인지 대조하고,
등록 시늉을 돌려 이름이 맞는지 본 뒤, 그림 저장소에 커밋·푸시하고 자동 등록을 기다린다.

    python3 tools/upload-art.py <카드> [--style game_keyart] \
        base=/경로/1.png awaken=/경로/2.png cursed=/경로/3.png casual1=/경로/4.png [extra1=…] [skin_frost=…]

    --dry        바꾸고 대조만 한다. 저장소에 아무것도 안 쓴다
    --no-push    커밋까지만
    --trailer L  커밋 메시지 끝에 붙일 줄. 여러 번 줄 수 있다 (Co-Authored-By 같은 것)
    --img-repo   그림 저장소 경로. 기본은 옆 폴더 ../myth-atelier-img

칸 이름은 IMAGE_RULES.md 와 같다: base(=_f) · awaken · cursed · casualN · extraN · skin_<열쇠> · skin_<열쇠>_awaken · skin_<열쇠>_cursed.
스킨의 각성·저주는 그 스킨 기본과 구도를 대조한다(스킨 기본은 원래 기본과).
스킨 열쇠는 data/card.json 의 그 카드 skins 에 먼저 적혀 있어야 한다(등록기가 거기 없는 열쇠는 안 받는다).
같은 칸을 다시 주면 덮어쓴다 — 썸네일 워크플로가 바뀐 파일만 다시 만든다.

대조 수치는 이렇게 읽는다. 구도 일치(각성·저주 대 기본)는 흑백 96×144 로 줄여 정규화한 뒤 내적한 값이다.
같은 구도면 0.6~0.95, 다른 그림이면 0.1~0.2. 0.3~0.6 은 눈으로 본다.
명암은 흑백 표준편차다. 게임 키아트는 대개 48~67 — 벗어나도 팔레트(금·흰옷·밝은 하늘) 탓일 수 있으니
화풍이 바뀐 건지 눈으로 본다. 이름표(글자)가 들어간 그림은 여기서 못 잡는다."""
import argparse, difflib, json, math, os, re, subprocess, sys, tempfile, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SIZE = (1024, 1536)
SLOT = re.compile(r'^(base|awaken|cursed|casual\d+|extra\d+|skin_[a-z0-9]+(?:_awaken|_cursed)?)$')
def skin_key(k): return re.sub(r'_(awaken|cursed)$', '', k[5:])

def die(msg):
    print('!! ' + msg); sys.exit(1)

def load_json(p):
    with open(p, encoding='utf-8') as f: return json.load(f)

def run(cmd, cwd, check=True):
    r = subprocess.run(cmd, cwd=str(cwd), text=True, capture_output=True)
    if check and r.returncode: die(' '.join(cmd) + '\n' + r.stdout + r.stderr)
    return r

def convert(src, dst):
    from PIL import Image
    im = Image.open(src).convert('RGB')
    was = im.size
    if im.size != SIZE: im = im.resize(SIZE, Image.LANCZOS)
    im.save(dst, 'WEBP', quality=90, method=6)
    return was

def gray(p):
    from PIL import Image
    return Image.open(p).convert('L')

def contrast(p):
    from PIL import ImageStat
    return ImageStat.Stat(gray(p)).stddev[0]

def vec(p):
    im = gray(p).resize((96, 144))
    d = list(im.get_flattened_data() if hasattr(im, 'get_flattened_data') else im.getdata())
    n = len(d); m = sum(d) / n
    v = math.sqrt(sum((x - m) ** 2 for x in d) / n) or 1
    return [(x - m) / v for x in d], n

def corr(a, b):
    va, n = vec(a); vb, _ = vec(b)
    return sum(x * y for x, y in zip(va, vb)) / n

def main():
    ap = argparse.ArgumentParser(add_help=False)
    ap.add_argument('card'); ap.add_argument('--style', default='game_keyart')
    ap.add_argument('--dry', action='store_true'); ap.add_argument('--no-push', action='store_true')
    ap.add_argument('--trailer', action='append', default=[])
    ap.add_argument('--img-repo', default=str(ROOT.parent / 'myth-atelier-img'))
    ap.add_argument('pairs', nargs='*')
    a = ap.parse_intermixed_args()

    cards = {c['name']: c for c in load_json(ROOT / 'data/card.json')['cards']}
    if a.card not in cards:
        near = difflib.get_close_matches(a.card, list(cards), n=3, cutoff=.5)
        die('카드 이름이 없다: %s%s' % (a.card, ('  — 비슷한 것: ' + ', '.join(near)) if near else ''))
    styles = load_json(ROOT / 'data/style.json')
    slist = styles.get('styles') if isinstance(styles, dict) else styles
    names = {s['key']: s.get('name', s['key']) for s in slist} if isinstance(slist, list) else {k: (v.get('name', k) if isinstance(v, dict) else v) for k, v in slist.items()}
    if a.style not in names: die('화풍 key 가 없다: %s  — data/style.json: %s' % (a.style, ', '.join(names)))

    pairs = {}
    for p in a.pairs:
        if '=' not in p: die('칸=경로 꼴이어야 한다: ' + p)
        k, v = p.split('=', 1)
        if not SLOT.match(k): die('칸 이름이 이상하다: ' + k)
        if k.startswith('skin_') and skin_key(k) not in [x['key'] for x in cards[a.card].get('skins') or []]:
            die('스킨 열쇠 %s 가 data/card.json 의 %s skins 에 없다 — 먼저 적는다 (있는 것: %s)' % (skin_key(k), a.card, ', '.join(x['key'] for x in cards[a.card].get('skins') or []) or '없음'))
        if not os.path.isfile(v): die('파일이 없다: ' + v)
        pairs[k] = v
    if not pairs: die('그림이 하나도 없다')

    img_repo = Path(a.img_repo)
    img_dir = img_repo / 'img'
    if not img_dir.is_dir(): die('그림 저장소가 없다: ' + str(img_dir))
    if not a.dry:
        run(['git', 'fetch', 'origin', 'main', '-q'], img_repo)
        run(['git', 'merge', '-q', '--ff-only', 'origin/main'], img_repo)

    stem = a.card.replace(' ', '_') + '_' + a.style + '_f'
    def fname(k): return stem + ('' if k == 'base' else '_' + k) + '.webp'
    out_dir = img_dir if not a.dry else Path(tempfile.mkdtemp(prefix='upload-art-'))

    print('[변환] %s · %s (%s)%s' % (a.card, names[a.style], a.style, '  — 시늉' if a.dry else ''))
    written = {}
    for k in sorted(pairs, key=lambda x: ['base', 'awaken', 'cursed'].index(x) if x in ('base', 'awaken', 'cursed') else 9):
        dst = out_dir / fname(k)
        was = convert(pairs[k], dst)
        written[k] = dst
        print('   %-8s %s%s' % (k, dst.name, '' if was == SIZE else '  (%dx%d 에서 맞춤)' % was))

    base = written.get('base') or (img_dir / fname('base') if (img_dir / fname('base')).exists() else None)
    print('[대조]')
    if base: print('   기본 명암 %.1f' % contrast(base))
    warn = False
    for k, p in written.items():
        if k == 'base': continue
        line = '   %-8s 명암 %.1f' % (k, contrast(p))
        ref = base
        if re.search(r'^skin_.+_(awaken|cursed)$', k):
            sb = 'skin_' + skin_key(k)
            ref = written.get(sb) or (img_dir / fname(sb) if (img_dir / fname(sb)).exists() else None)
            if not ref: line += '  (스킨 기본이 없어 구도 대조 못 함)'
        if ref and (k in ('awaken', 'cursed') or k.startswith('skin_')):
            c = corr(ref, p)
            flag = '' if c >= .6 else ('  ← 눈으로 볼 것' if c >= .3 else '  ← 다른 구도!')
            warn = warn or c < .6
            line += '  구도 일치 %.3f%s' % (c, flag)
        elif k in ('awaken', 'cursed'):
            line += '  (기본 그림이 없어 구도 대조 못 함)'
        print(line)
    look = cards[a.card].get('look')
    if look: print('   look: ' + look)
    for sk in cards[a.card].get('skins') or []:
        if any(k.startswith('skin_') and skin_key(k) == sk['key'] for k in written): print('   skin %s: %s' % (sk['key'], sk['look']))

    print('[등록 시늉]')
    link = ROOT / 'img'; link.mkdir(exist_ok=True)
    made = []
    try:
        for f in list(img_dir.glob('*.webp')) + [p for p in written.values() if a.dry]:
            t = link / f.name
            if not t.exists(): os.symlink(f.resolve(), t); made.append(t)
        r = run([sys.executable, 'tools/register-images.py', '--check'], ROOT, check=False)
        print('\n'.join('   ' + l for l in (r.stdout + r.stderr).strip().splitlines()))
        if r.returncode: die('등록 시늉이 실패했다')
    finally:
        for t in made: t.unlink()
    if a.dry:
        print('[시늉 끝] 바꾼 파일은 %s 에 있다' % out_dir); return
    if warn: print('!! 구도 일치가 낮은 칸이 있다. 눈으로 보고 아니면 되돌려라 (git checkout -- img/…)')

    n = len(written)
    msg = '%s %s %d장' % (a.card, names[a.style], n)
    if a.trailer: msg += '\n\n' + '\n'.join(a.trailer)
    run(['git', 'add', 'img'], img_repo)
    for i in range(3):
        r = run(['git', 'commit', '-q', '-m', msg], img_repo, check=False)
        if r.returncode == 0: break
        if i == 2: die('커밋 실패:\n' + r.stdout + r.stderr)
        time.sleep(3 * (i + 1))
    print('[커밋] ' + run(['git', 'log', '--oneline', '-1'], img_repo).stdout.strip())
    if a.no_push: return
    for i in range(4):
        r = run(['git', 'push', '-u', 'origin', 'main'], img_repo, check=False)
        if r.returncode == 0: break
        if i == 3: die('푸시 실패:\n' + r.stdout + r.stderr)
        time.sleep(2 ** (i + 1))
    print('[푸시] origin/main')

    print('[자동 등록] 기다리는 중 (썸네일 → 등록, 보통 90초쯤)')
    for _ in range(14):
        time.sleep(15)
        run(['git', 'fetch', 'origin', 'main', '-q'], ROOT, check=False)
        r = run(['git', 'show', 'origin/main:data/img.json'], ROOT, check=False)
        if r.returncode: continue
        try: d = json.loads(r.stdout)
        except ValueError: continue
        entry = d.get('img', {}).get(a.card, {}).get('byStyle', {}).get(a.style)
        # 칸 꼴을 따지지 않고 올린 파일 이름이 다 적혔는지만 본다 — 스킨처럼 새 칸이 생겨도 그대로 맞는다
        def names(v):
            if isinstance(v, str): return {v}
            if isinstance(v, list): return set().union(*map(names, v)) if v else set()
            if isinstance(v, dict): return set().union(*map(names, v.values())) if v else set()
            return set()
        if entry and all(p.name in names(entry) for p in written.values()):
            print('   등록됨: %s %s %s' % (a.card, a.style, sorted(entry)))
            done = d['img']; tot = len(cards); by = {}
            for c in cards.values(): by.setdefault(c['myth'], [0, 0])[1] += 1
            for nm in done:
                if nm in cards: by[cards[nm]['myth']][0] += 1
            print('   카드 %d/%d — ' % (len(done), tot) + ' · '.join('%s %d/%d' % (m, x, y) for m, (x, y) in by.items()))
            run(['git', 'pull', '-q', 'origin', 'main'], ROOT, check=False)
            return
    print('!! 3분 넘게 등록이 안 됐다. 코드 저장소 Actions 의 "그림 등록" 을 보거나 수동 실행해라')

if __name__ == '__main__':
    main()
