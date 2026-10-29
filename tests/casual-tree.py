"""일상컷 트리 검사기. python3 tests/casual-tree.py
   - 실제 표(data/casual-tree.json)가 통과한다
   - 끊긴 길·없는 열쇠·한글 영어 칸·필수 갈래 없는 시대·칸끼리 규칙 표의 빈 데를 건다"""
import copy, importlib.util, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('ct', ROOT / 'tools' / 'casual-tree.py')
T = importlib.util.module_from_spec(spec); spec.loader.exec_module(T)
doc = T.load()
assert T.check(doc) == [], T.check(doc)

def fails(mutate, word):
    d = copy.deepcopy(doc); mutate(d)
    e = ' | '.join(T.check(d))
    assert word in e, (word, e)

place = lambda d, k: next(p for p in d['places'] if p['key'] == k)
act = lambda d, k: next(a for a in d['activities'] if a['key'] == k)
fails(lambda d: place(d, 'arcade_hall').update(group='casino'), '묶음 casino')
fails(lambda d: act(d, 'swim').update(family='fly'), '자세 계열 fly')
fails(lambda d: act(d, 'swim')['places'].append('moon_base'), '장소 moon_base')
fails(lambda d: place(d, 'night_taxi').update(en='택시 뒷좌석'), '한글')
fails(lambda d: d['activities'].append(dict(act(d, 'swim'), key='night_taxi')), '겹친다')
fails(lambda d: act(d, 'bike_check').update(prefer=['lace_set']), '고르라는 옷 lace_set')
# 칸끼리 규칙 표 — 자세 표에 없는 자세, 이상한 앉는 자리, 다 허리 아래 옷인 계열
fails(lambda d: d['pose_meta'].pop('sitting'), '자세 sitting 가 자세 표')
fails(lambda d: act(d, 'gala_dinner').update(seat=['sofa']), "앉는 자리 'sofa'")
fails(lambda d: [i.update(low=True) for o in d['outfits'] if o['key'] == 'bath' for i in o['items']], '옷 계열 bath 는 가슴 위')
# 길이 끊기면 — 장소에 하는 일이 하나뿐, 하는 일에 옷이 없다
fails(lambda d: [a['places'].remove('night_taxi') for a in d['activities'] if 'night_taxi' in a['places'] and a['key'] != 'taxi_ride'], '하는 일이 1 개')
fails(lambda d: place(d, 'night_taxi').update(outfits=['editorial']), '입을 옷 계열이 없다')
# 필수 갈래 — 환상 무대에서 란제리·수영복·역할극을 다 빼면 닿는 길이 없다
fails(lambda d: next(e for e in d['eras'] if e['key'] == 'fantasy').update(outfits=['costume', 'editorial', 'evening', 'bridal', 'bath', 'retro']), '필수 갈래')
# 추천 조합·예전 기록 변환 — 트리 위의 길만
pre = lambda d, k: next(p for p in d['presets'] if p['key'] == k)
fails(lambda d: pre(d, 'travel_station').update(act='swim'), '하는 일 swim 를 못 고른다')
fails(lambda d: pre(d, 'travel_station').update(era='fantasy'), '시대가 없다')
fails(lambda d: pre(d, 'blade_polish').update(item='lace_set'), '옷 lace_set')
fails(lambda d: d['legacy'].update({'x/y': {'preset': 'nope'}}), '추천 조합 nope')
assert all(('preset' in v) or ('era' in v) for v in doc['legacy'].values())
# !장소 는 묶음에서 뺀다 — 사진 부스·PC방에서 거닐기는 없다
assert 'arcade_photo' not in T.act_places(doc, act(doc, 'stroll')) and 'arcade_hall' in T.act_places(doc, act(doc, 'stroll'))
fails(lambda d: act(d, 'stroll')['places'].append('!moon_base'), '장소 !moon_base')
# 고정물 훑기 — 지금 표는 0, 부두 없는 곳에 「부두에서 낚시」 를 쓰면 걸린다
assert T.audit(doc) == [], T.audit(doc)
d2 = copy.deepcopy(doc); act(d2, 'fishing').update(en='casting a fishing line from the pier')
assert any(r[0] == 'fishing' and r[2] == 'travel_coast' for r in T.audit(d2))
# 하는 일의 @묶음 은 그 묶음 모든 장소
assert set(T.act_places(doc, act(doc, 'warmup'))) >= {p['key'] for p in doc['places'] if p['group'] == 'sports'}
# 옷 계열 = 시대 ∩ 장소 ∩ 하는 일
assert T.outfit_families(doc, 'heritage', 'water_pool', act(doc, 'swim')) == ['swimwear']
assert 'retro' not in T.outfit_families(doc, 'heritage', 'night_bar', act(doc, 'bar_drink'))
print('PASS 일상컷 트리: 실제 표 · 없는 열쇠·자세 계열·장소·한글·겹침 · 끊긴 길 · 필수 갈래 · 추천 조합·예전 기록 · @묶음 · 옷 계열 교집합')
# 신화 무기 몫(2026-10-29, game-atelier 에서 옮김) — 게임 몫 장소는 없고, 신화 세계는 그 시대에서만, 수련·세시 하는 일은 표시가 있다
keys = {p['key'] for p in doc['places']}
assert not keys & {'arcade_pcbang', 'studio_dev', 'studio_stream', 'game_place'} and {'work_office', 'forge_smithy', 'dojo_hall', 'rite_hill', 'heritage_museum', 'myth_place'} <= keys
assert all(p['eras'] == ['in_myth'] for p in doc['places'] if p['group'] == 'myth')
assert all(a.get('practice') for a in doc['activities'] if set(T.act_places(doc, a)) <= {p['key'] for p in doc['places'] if p['group'] == 'dojo'} | {'street_park'} and a['key'] in ('practice_form', 'hold_stance', 'draw_practice_bow', 'footwork_drill', 'shield_brace', 'wrap_wrists'))
assert all(a.get('rite') for a in doc['activities'] if set(T.act_places(doc, a)) <= {p['key'] for p in doc['places'] if p['group'] == 'rite'})
assert doc['required']['world']['era'] == 'in_myth' and 'in_game' not in doc['required']
print('PASS 신화 무기 몫: 게임 장소 없음 · 신화 세계 · 수련·세시 표시 · 필수 갈래(신화 속 일상)')
