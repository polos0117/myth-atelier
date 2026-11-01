#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""game-atelier data/casual-tree-v2.json → myth-atelier data/casual-tree-v2.json(2026-11-01).
book-atelier 의 tools/casual-tree-v2-from-game.py 를 신화 몫으로. 모듈(lib/casual-tree-v2.js) · 검사기(tools/casual-tree-v2.py)는 game 것 그대로, 표만 신화 몫으로.

    python3 tools/casual-tree-v2-from-game.py [game-atelier/data/casual-tree-v2.json]

게임 장소(game_*) → 신화 세계 장소(myth_*), 시대 release → heritage(신화의 옛 땅) · in_game → in_myth,
신화 공방에만 있는 장소(일터 · 공방 · 도장 · 제례 · 전설의 자리)의 받침과 소품을 더한다. 오락실 소품 · 휴대용 게임기는 뺀다."""
import json, copy, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'game-atelier', 'data', 'casual-tree-v2.json')
G = json.load(open(SRC, encoding='utf-8'))
M1 = json.load(open(os.path.join(HERE, '..', 'data', 'casual-tree.json'), encoding='utf-8'))
d = copy.deepcopy(G)
myth_places = {p['key'] for p in M1['places']}
myth_groups = {g['key'] for g in M1['groups']}
RENAME = {f'game_{x}': f'myth_{x}' for x in ('bath', 'field', 'inn', 'market', 'place', 'roof', 'room')}
# 열람실 · 수선실은 신화 표의 도서관 서가(work_library) · 재단 공방(work_tailor)과 겹친다. 보드게임 라운지는 게임 몫
DROP_EXTRA = {'library_reading', 'tailor_room', 'boardgame_lounge'}
ERA = {'release': 'heritage', 'in_game': 'in_myth'}
# 새 장소의 시대 — 기차 침대칸 · 공연장 대기실은 지금만, 나머지는 옛 땅에서도
EXTRA_ERAS = {'train_sleeper': ['now'], 'backstage_dressing': ['now']}

# 1. 장소 받침 — 게임 장소를 신화 세계 장소로, 신화 표에 없는 게임 장소는 빼고, 신화 장소는 닮은 자리의 받침으로
pl = {}
extra_keys = {x['key'] for x in G.get('extra_places', [])} - DROP_EXTRA
for k, v in G['places'].items():
    k2 = RENAME.get(k, k)
    if k2 in myth_places or k in extra_keys:
        pl[k2] = v
GP = G['places']
ALIKE = {
 # 일터
 'work_office': ['chair', 'table', 'wall', 'floor'], 'work_museum_store': ['wall', 'floor', 'table'], 'work_library': ['wall', 'floor', 'chair', 'table'],
 'work_florist': ['worktable', 'rail_waist', 'wall', 'floor'], 'work_kitchen': ['worktable', 'rail_waist', 'wall'], 'work_garage': ['worktable', 'wall', 'floor', 'edge'],
 'work_field': GP.get('travel_trail'), 'work_backstage': ['wall', 'floor', 'edge', 'chair'], 'work_tailor': ['worktable', 'chair', 'wall', 'floor'],
 # 공방
 'forge_polish': ['worktable', 'chair', 'wall', 'floor'], 'forge_smithy': ['worktable', 'wall', 'floor'], 'forge_silver': ['worktable', 'chair', 'wall'],
 'forge_kiln': ['worktable', 'chair', 'floor', 'wall'], 'forge_restore': ['worktable', 'chair', 'table', 'wall'], 'forge_leather': ['worktable', 'chair', 'wall', 'floor'],
 # 도장
 'dojo_hall': ['floor', 'wall', 'lie', 'edge'], 'dojo_archery': ['floor', 'wall', 'edge'], 'dojo_salle': GP.get('sports_gym'), 'dojo_training': ['floor', 'wall', 'edge', 'lie'],
 # 제례
 'rite_home': ['floor', 'table', 'wall', 'chair'], 'rite_doorstep': ['wall', 'edge', 'floor'], 'rite_hill': ['floor', 'lie', 'edge'],
 'rite_river': ['edge', 'floor', 'rail_waist'], 'rite_altar': ['floor', 'wall', 'table'], 'rite_shrine': ['floor', 'wall', 'edge', 'rail_waist'],
 # 전설의 자리(지금 현실)
 'heritage_museum': GP.get('evening_museum'), 'heritage_temple': ['edge', 'wall', 'floor'], 'heritage_ruin': ['edge', 'wall', 'floor', 'lie'],
 'heritage_archive': ['chair', 'table', 'wall', 'floor'], 'heritage_pass': GP.get('travel_lookout'), 'heritage_plaza': ['edge', 'wall', 'floor', 'chair'],
 'heritage_gallery': ['wall', 'rail_waist', 'floor'], 'heritage_theater': ['edge', 'floor', 'wall'], 'heritage_grove': ['floor', 'lie', 'edge', 'wall'],
 'heritage_spring': ['edge', 'floor', 'wall'], 'heritage_shop': GP.get('street_shop'),
}
for k, v in ALIKE.items():
    assert v, k
    assert k in myth_places, k
    pl[k] = list(v)
missing = myth_places - set(pl)
assert not missing, missing
d['places'] = pl

# 2. 새 장소 — 시대 release → heritage
d['extra_places'] = []
for x in G.get('extra_places', []):
    if x['key'] in DROP_EXTRA: continue
    y = dict(x); y['eras'] = EXTRA_ERAS.get(x['key'], ['now', 'heritage'])
    if y['group'] not in myth_groups: y['group'] = {'arcade': 'street'}.get(y['group'], y['group'])
    assert y['group'] in myth_groups, y
    d['extra_places'].append(y)
gone = ({k for k in G['places']} - set(RENAME)) - set(pl) | DROP_EXTRA

def fix_refs(lst):
    out = []
    for r in lst:
        neg = r.startswith('!'); k = r[1:] if neg else r
        if k.startswith('@'):
            gk = {'game': 'myth'}.get(k[1:], k[1:])
            if gk not in myth_groups: continue
            out.append(('!' if neg else '') + '@' + gk); continue
        if k == '*': out.append(r); continue
        k = RENAME.get(k, k)
        if k in gone or k not in pl: continue
        out.append(('!' if neg else '') + k)
    return out

# 3. 소품 — 휴대용 게임기 · 오락실 판 · 게임패드는 뺀다. 장소 열쇠를 신화 세계 장소로
d['props'] = []
for p in G['props']:
    if p['key'] in ('handheld', 'arcade_panel', 'gamepad'): continue
    q = dict(p)
    if 'places' in q: q['places'] = fix_refs(q['places'])
    if 'eras' in q: q['eras'] = [ERA.get(e, e) for e in q['eras']]
    q.pop('since', None)
    if q.get('places') == [] and 'places' in p: continue
    if q['key'] == 'signature': q['en'] = "her weapon's signature object"
    d['props'].append(q)
# 4. 신화 장소의 소품 — 일터 · 공방 · 도장 · 제례 · 전설의 자리(게임 표엔 없던 묶음)
MYTHP = {
 'book': ['work_library', 'heritage_archive', 'work_office', 'work_museum_store'],
 'notebook': ['work_office', 'work_field', 'work_museum_store', 'heritage_archive', 'heritage_museum', 'forge_restore'],
 'letter': ['rite_altar', 'rite_home', 'heritage_archive'],
 'cup': ['work_office', 'work_backstage', 'forge_kiln', 'forge_restore', 'rite_home', 'dojo_hall'],
 'teapot': ['rite_home', 'dojo_hall', 'forge_kiln'],
 'lantern': ['rite_doorstep', 'rite_river', 'rite_hill', 'rite_shrine', 'heritage_temple'],
 'sparkler': ['rite_doorstep', 'rite_hill'],
 'camera': ['heritage_ruin', 'heritage_plaza', 'heritage_pass', 'heritage_temple', 'heritage_gallery', 'heritage_grove', 'work_field'],
 'map': ['heritage_pass', 'heritage_ruin', 'work_field'],
 'sketchbook': ['heritage_gallery', 'heritage_museum', 'heritage_ruin', 'heritage_grove', 'work_tailor'],
 'loose_flowers': ['work_florist', 'rite_altar', 'rite_home', 'heritage_spring'],
 'bouquet': ['work_florist'], 'watering_can': ['work_florist'], 'embroidery': ['work_tailor'],
 'bow': ['dojo_archery'], 'water_bottle': ['@dojo', 'work_field'], 'towel': ['dojo_hall', 'dojo_training', 'dojo_salle'],
 'fan': ['heritage_theater', 'rite_shrine'], 'mask': ['heritage_theater'],
 'tote_bag': ['heritage_shop', 'heritage_plaza'], 'shopping_bag': ['heritage_shop'], 'ice_cream': ['heritage_plaza'],
 'umbrella': ['heritage_plaza', 'rite_shrine'], 'sun_hat': ['heritage_ruin', 'work_field', 'heritage_grove'],
 'headphones': ['work_office', 'work_backstage'], 'phone': ['@work', '@heritage'],
}
for q in d['props']:
    extra = [x for x in MYTHP.get(q['key'], []) if (x[1:] in myth_groups if x.startswith('@') else x in pl)]
    assert len(extra) == len(MYTHP.get(q['key'], [])), q['key']
    if extra and 'places' in q: q['places'] = q['places'] + [x for x in extra if x not in q['places']]
assert set(MYTHP) <= {p['key'] for p in d['props']}, set(MYTHP) - {p['key'] for p in d['props']}
pkeys = {p['key'] for p in d['props']}
d['prop_uses'] = []
for u in G['prop_uses']:
    if u['prop'] not in pkeys: continue
    v = dict(u)
    if 'places' in v: v['places'] = fix_refs(v['places'])
    d['prop_uses'].append(v)

# 5. 어색한 조합 — 장소 열쇠 · 묶음을 신화 꼴로, 신화 표에 없는 의상 계열(주인공 코스튬)은 뺀다. 신화 장소의 어색한 조합을 더한다
fams = {o['key'] for o in M1['outfits']}
aw = []
for a in G['awkward']:
    b = dict(a); b['places'] = fix_refs(a['places']); b['outfits'] = [o for o in a['outfits'] if o in fams]
    if b['places'] and b['outfits']: aw.append(b)
aw += [
 {'outfits': ['swimwear', 'bath'], 'places': ['@work', '@forge', '@dojo', 'rite_home', 'rite_altar', 'rite_shrine', '@heritage', '!heritage_spring'], 'ko': '일터 · 공방 · 도장 · 제례 · 전설의 자리에 수영복 · 목욕 차림(옛 샘터는 괜찮다)'},
 {'outfits': ['bridal', 'evening'], 'places': ['@forge', 'dojo_training', 'dojo_salle', 'work_garage', 'work_field'], 'ko': '드레스로 불 · 쇠 · 땀 쓰는 자리'},
]
d['awkward'] = aw

# 6. 옷 — 신화 표(버전1)에 없는 옷은 가리키지 않는다. 일터 옷(work)은 옷마다
items = {i['key'] for o in M1['outfits'] for i in o['items']}
of = d['outfit_features']
of['defaults'] = {k: v for k, v in of['defaults'].items() if k in fams}
for f in fams: of['defaults'].setdefault(f, [])
of['add'] = {k: v for k, v in of.get('add', {}).items() if k in items}
WORK = {'office_blouse_skirt': ['collar'], 'barista_apron': ['pocket'], 'leather_apron_work': ['strap'], 'curator_cardigan': ['pocket'],
        'coach_polo': ['collar'], 'chef_jacket': ['collar'], 'mechanic_overalls': ['strap', 'pocket'], 'field_vest': ['pocket', 'collar'],
        'stage_blacks': ['pocket'], 'tailor_dress': [], 'tailored_glam': ['collar'], 'glam_apron': ['strap']}
for k, v in WORK.items():
    assert k in items, k
    if v: of['add'][k] = v
if 'remove' in of: of['remove'] = {k: v for k, v in of['remove'].items() if k in items}
for w in d.get('weather_awkward', []): w['items'] = [i for i in w.get('items', []) if i in items]
for a in d['awkward']:
    if 'items' in a: a['items'] = [i for i in a['items'] if i in items]

d['note'] = G['note'] + ' 신화 공방 몫(2026-11-01, game 표에서 변환 — tools/casual-tree-v2-from-game.py): 게임 장소 → 신화 세계 장소(myth_*), 일터 · 공방 · 도장 · 제례 · 전설의 자리의 받침과 소품, 오락실 소품 · 휴대용 게임기 뺌, 시대 release → heritage.'
s = json.dumps(d, ensure_ascii=False)
for bad in ['game_', '"release"', 'in_game', '@game', 'hero_costume']:
    assert bad not in s, bad
OUT = os.path.join(HERE, '..', 'data', 'casual-tree-v2.json')
with open(OUT, 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=1); f.write('\n')
print('places', len(pl), 'props', len(d['props']), 'uses', len(d['prop_uses']), 'awkward', len(aw), 'extra', len(d['extra_places']))
