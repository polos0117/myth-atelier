"""일상컷 트리 버전2 검사기. python3 tests/casual-tree-v2.py
   - 실제 표(data/casual-tree-v2.json)가 통과한다
   - 없는 열쇠·한글 영어 칸·두 동작 문장·두 손 칸·보이지 않는 손 자리·다리 칸·받침·장소 없는 추천을 건다"""
import copy, importlib.util, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('ct2', ROOT / 'tools' / 'casual-tree-v2.py')
T = importlib.util.module_from_spec(spec); spec.loader.exec_module(T)
doc, v1 = T.load()
assert T.check(doc, v1) == [], T.check(doc, v1)

def fails(mutate, word):
    d = copy.deepcopy(doc); mutate(d)
    e = ' | '.join(T.check(d, v1))
    assert word in e, (word, e)

row = lambda d, table, k: next(r for r in d[table] if r['key'] == k)
pre = lambda d, k: row(d, 'presets', k)
# 열쇠 · 가리키는 값
fails(lambda d: d['hands'].append(dict(row(d, 'hands', 'cheek'))), '열쇠 cheek 가 겹친다')
fails(lambda d: row(d, 'postures', 'stand')['supports'].append('hammock'), '받침 hammock')
fails(lambda d: row(d, 'legs', 'cross_legged')['families'].append('fly'), '자세 계열 fly')
fails(lambda d: row(d, 'props', 'cup')['places'].append('@casino'), '묶음 casino')
fails(lambda d: row(d, 'props', 'phone').update(eras=['stone_age']), '시대 stone_age')
fails(lambda d: d['places'].update(moon_base=['floor']), '장소 moon_base')
fails(lambda d: d['places']['home_bedroom'].append('trampoline'), '받침 trampoline')
fails(lambda d: d['places'].pop('night_taxi'), '장소 night_taxi 의 받침(has)이 없다')
# 영어 칸 · 동작 하나 · 자리 표시
fails(lambda d: row(d, 'gaze', 'window').update(en='창밖을 본다'), '한글')
fails(lambda d: row(d, 'prop_uses', 'cup_sip').update(en='brings {prop} to her lips and smiles'), '동작 둘')
fails(lambda d: row(d, 'hands', 'cheek').update(en='her hand rests on her cheek'), '{side}')
fails(lambda d: row(d, 'prop_uses', 'camera_shoot').pop('grip'), 'grip')
fails(lambda d: row(d, 'prop_uses', 'cup_hold').update(hands='both'), '손 수 both')
fails(lambda d: row(d, 'prop_uses', 'cup_hold').update(kind='use'), 'hold · raise · both 만')
fails(lambda d: d['prop_uses'].__setitem__(slice(None), [u for u in d['prop_uses'] if u['prop'] != 'cup']), '소품 cup 에 쓰는 동작이 없다')
# 렌즈 — 광각 24mm 는 안 쓴다
fails(lambda d: d['lens'].update(environmental='wide24'), '광각 24mm')
# 의상 특징 · 어색한 조합
fails(lambda d: d['outfit_features']['add'].update(moon_suit=['pocket']), '옷 moon_suit')
fails(lambda d: d['outfit_features']['defaults'].update(everyday=['zipper']), '특징 zipper')
fails(lambda d: d['outfit_features']['defaults'].pop('bridal'), '의상 계열 bridal 의 특징 기본값')
fails(lambda d: d['awkward'][0]['outfits'].append('spacesuit'), '의상 계열 spacesuit')
# 자세 추천 — 두 손 칸
fails(lambda d: pre(d, 'shush_close').update(left=''), 'left 손 칸이 비었다')
fails(lambda d: pre(d, 'crossed_wall').update(left='down'), '두 손 자세 arms_crossed 인데')
fails(lambda d: pre(d, 'shush_close').update(left='shush'), '두 손이 같은 자세 shush')
fails(lambda d: pre(d, 'camera_shot').update(left='down'), '소품 동작 both 와 소품 쓰는 손 1 개')
fails(lambda d: pre(d, 'sip_close').update(prop_kind=''), '꼴(prop_kind)이 없다')
# 보이는 부위 — 클로즈업에 허리 손, 전신에 「화면 밖」
fails(lambda d: pre(d, 'shush_close').update(left='hip'), '자리 waist 가 face_close 에 안 보인다')
fails(lambda d: pre(d, 'kneel_clasp').update(frame='full_body', right='out', left='down'), '「화면 밖」 은 가까운 컷만')
# 다리 — 다리가 안 보이는 컷, 발 동작, 계열 밖
fails(lambda d: pre(d, 'shush_close').update(legs='contrapposto'), '다리가 안 보이는 face_close')
fails(lambda d: pre(d, 'kneel_clasp').update(legs='kneel_sit'), '발 동작 kneel_sit')
fails(lambda d: pre(d, 'kneel_clasp').update(legs='contrapposto'), '자세 계열 low 밖')
# 받침 · 프레이밍 · 몸 방향
fails(lambda d: pre(d, 'shush_close').update(support='back_seat'), '받침 back_seat 가 붙지 않는다')
fails(lambda d: pre(d, 'soak_hair').update(frame='full_body', legs=''), '프레이밍 full_body 를 받지 않는다')
fails(lambda d: pre(d, 'shush_close').update(body='back'), '뒤쪽 몸 방향 back')
fails(lambda d: pre(d, 'shush_close').update(gaze='at_prop'), '시선이 소품인데')
fails(lambda d: pre(d, 'shush_close').update(gaze='staring'), '시선 staring')
# 장소 — 다 되는 곳이 없으면, 소품 동작이 그 자세에서 안 되면
fails(lambda d: [d['places'].update({k: [h for h in v if h != 'water']}) for k, v in list(d['places'].items())], '자세 soak 를 받는 장소가 없다')
fails(lambda d: [d['places'].update({k: [h for h in v if h != 'table']}) for k, v in list(d['places'].items())], '다 되는 장소가 없다')
fails(lambda d: [u.update(postures=['stand']) for u in d['prop_uses'] if u['kind'] == 'raise'], '맞는 소품 동작(raise)이 없다')
fails(lambda d: d['presets'].__setitem__(slice(None), [p for p in d['presets'] if p['frame'] != 'detail']), '프레이밍 detail 의 자세 추천이 없다')

# 고정 사례(검토 2026-10-30) — 무릎 꿇기 + 책상다리, 헤엄칠 물, 두 팔뚝 받침 + 머리 뒤 손, 등 돌림 + 카메라 응시, 표정의 시선 말, 입 공간
fails(lambda d: pre(d, 'kneel_clasp').update(legs='cross_legged'), '자세 kneel 에서 못 한다')
fails(lambda d: [d['places'].update({k: [h for h in v if h != 'deep_water']}) for k, v in list(d['places'].items())], '자세 swim 를 받는 장소가 없다')
fails(lambda d: pre(d, 'lie_front_full').update(right='behind_head', left='out', frame='chest_up', legs=''), '받침 front_floor 이 right 손 behind_head')
fails(lambda d: pre(d, 'walk_away').update(gaze='camera'), '고개를 안 돌리고 카메라를 본다')
fails(lambda d: d['expressions'].update(flustered='raised inner brows, darting or averted eyes'), '표정 flustered 에 시선')
fails(lambda d: d.pop('expressions'), '표정 표(expressions)가 없다')
fails(lambda d: row(d, 'legs', 'cross_legged')['postures'].append('stand'), '다리 cross_legged 의 자세 stand 가 다리 계열 밖')
fails(lambda d: pre(d, 'floor_horizon').update(head='turn_side'), '머리 turn_side 는 몸 방향 side 와 같이 못 고른다')
fails(lambda d: pre(d, 'shush_close').update(gaze='into_prop'), '「소품을 들여다봄」 인데 소품 동작이 없다')
fails(lambda d: row(d, 'head', 'turn_side').update(not_bodies=['sideways']), '몸 방향 sideways')
assert not T.use_fits(doc, row(doc, 'prop_uses', 'cup_hold'), dict(pre(doc, 'prop_detail'), gaze='into_prop'))
fails(lambda d: d['extra_places'].append(dict(d['extra_places'][0], key='home_bedroom')), '새 장소 home_bedroom 가 버전1 장소와 겹친다')
fails(lambda d: d['weather_awkward'][0]['weather'].append('hail'), '날씨 hail')
fails(lambda d: row(d, 'prop_uses', 'cup_wrap')['postures'].append('stand'), 'cup_wrap 의 postures 에 같은 값이 두 번')
fails(lambda d: row(d, 'props', 'phone').update(since=1700), 'since')
fails(lambda d: row(d, 'prop_uses', 'book_turn').update(needs_any=['sofa_arm']), '받침 sofa_arm')
# 공방마다 다른 칸(pkm 2026-10-30) — game 표엔 없지만 같은 검사기라 적으면 본다
fails(lambda d: d.update(banned={'body': ['back']}), '추천 walk_away — 이 공방이 안 쓰는 값')
fails(lambda d: row(d, 'prop_uses', 'cup_hold').update(role='a barista'), '역할에 한국어 이름(role_ko)')
fails(lambda d: row(d, 'prop_uses', 'cup_hold').update(places=['moon_base']), '장소 moon_base')
fails(lambda d: row(d, 'hands', 'wave').update(companion=True), '동료가 있어야 하는데 동료 묶음이 없다')
assert 'street_park' not in T.preset_places(doc, v1, pre(doc, 'counter_work')) and 'bakery_kitchen' in T.preset_places(doc, v1, pre(doc, 'counter_work'))
sip = dict(pre(doc, 'sip_close'), left='shush')
assert not T.use_fits(doc, row(doc, 'prop_uses', 'cup_sip'), sip) and T.use_fits(doc, row(doc, 'prop_uses', 'cup_sip'), pre(doc, 'sip_close'))
assert 'spa_footbath' not in T.preset_places(doc, v1, pre(doc, 'swim_close')) if any(p['key'] == 'swim_close' for p in doc['presets']) else True

# 길 — 장소 펼치기 · 추천 장소
assert T.expand(v1, ['@water', '!water_pool']) and 'water_pool' not in T.expand(v1, ['@water', '!water_pool'])
assert len(T.expand(v1, ['*'])) == len(v1['places'])
assert 'night_taxi' not in T.prop_places(doc, v1, row(doc, 'props', 'phone')) or 'now' in [e for p in v1['places'] if p['key'] == 'night_taxi' for e in p['eras']]
lie = T.preset_places(doc, v1, pre(doc, 'recline_head'))
assert lie and all('lie' in doc['places'][k] for k in lie), lie
assert all(T.preset_places(doc, v1, p) for p in doc['presets'])
print('casual-tree-v2 ok — 추천', len(doc['presets']), '· 장소', len(doc['places']))
