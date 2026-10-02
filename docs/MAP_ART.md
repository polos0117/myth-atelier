# 맵 그림 — 놀이 판 배경

> 2026-10-02 · claude. 결투 판 뒤에 까는 전장 그림. 지금은 그림이 없어 박물관 끝 벽 그림(`museum_<권>_mural.webp`)을 대신 깐다.
> 권마다 한 장 만들어 올리면 그 권부터 저절로 바뀐다. 다른 놀이(오토 배틀·던전·드래프트)로 넓히는 길도 아래에.

## 규격

| 항목 | 값 |
|---|---|
| 파일 | 그림 저장소 `img/ui/map_<권>.webp` — `map_norse.webp` `map_greek.webp` `map_korea.webp` `map_china.webp` `map_japan.webp` `map_india.webp` `map_egypt.webp` `map_westasia.webp` `map_celtic.webp` `map_america.webp` `map_knight.webp` |
| 크기·비율 | 세로 2:3, 1024×1536(카드 그림과 같다). 폰 세로 화면이 첫 화면이라 세로로 뽑는다 |
| 내용 | 사람·글자·카드 없는 **빈 전장**. 위 1/3 은 상대 줄, 가운데 띠, 아래 1/3 은 내 줄이 덮이므로 **가운데를 비우고 위아래 가장자리에 지형**(기둥·바위·나무·건물)을 둔다 |
| 밝기 | 어둡게 깔리므로(검은 55~72% 덮개) 원본은 중간~밝은 명도로. 너무 어두우면 아무것도 안 보인다 |
| 화풍 | 게임 키아트 2.5D(카드와 같은 화풍). 글자 없음 |
| 등록 | 올린 뒤 `data/group.json` 의 `museum.maps` 에 권 열쇠를 더한다 — `"maps": ["norse"]`. 코드는 안 고친다 |
| 올리기 | 그림 저장소에 `img/ui/` 로 바로 커밋(카드 그림이 아니라 `tools/upload-art.py`·등록기는 안 거친다). 박물관 그림을 올린 손과 같다 |

## 생성 문장 — 열한 권

공통 머리말(화풍, 카드와 같다):

> Polished 2.5D game key art, clean linework, layered cel-to-soft shading, campaign-quality lighting. Vertical 2:3 composition, empty battlefield with no people, no creatures, no text, no cards. Open empty ground in the middle third; terrain and structures only along the top and bottom edges. Mid-to-bright overall exposure, atmospheric depth.

권마다 뒤에 붙인다:

| 권 | 문장 |
|---|---|
| 북유럽 `norse` | Snow-covered fjord plain at dusk under faint aurora, a ring of weathered rune stones at the top edge, frozen shore and dark pine silhouettes at the bottom, cold blue-green light with silver highlights. |
| 그리스 `greek` | Marble agora before a Doric temple on a hill at golden hour, fluted white columns and laurel trees at the top edge, cracked marble paving and olive branches at the bottom, warm gold and sky blue, wine-dark sea far away. |
| 한국 `korea` | Palace courtyard at dawn, dancheong-painted gate and pine trees at the top edge, granite paving stones and a stone balustrade with lanterns at the bottom, misty blue mountains behind, jade green and vermilion accents. |
| 중국 `china` | Mountain terrace among clouds, red lacquer pavilion and pagoda roofs at the top edge, carved stone steps and golden dragon balustrade at the bottom, crimson and gold with jade mist, peaks fading into haze. |
| 일본 `japan` | Shrine approach under falling cherry blossom, red torii gate and cedar forest at the top edge, stone lantern and moss-covered steps at the bottom, indigo twilight sky with soft pink petals in the air. |
| 인도 `india` | Sandstone temple courtyard at sunrise, carved gopuram tower and banyan tree at the top edge, lotus pond with floating petals and brass oil lamps at the bottom, saffron and marigold light, incense haze. |
| 이집트 `egypt` | Desert temple forecourt under a vast sky, pylon gate with winged sun disc and obelisks at the top edge, sandstone paving and papyrus columns at the bottom, warm ochre and lapis blue, heat shimmer on the horizon. |
| 서아시아 `westasia` | Ziggurat processional way at blue hour, glazed lapis brick walls with golden lions and rosettes at the top edge, basalt paving and date palms at the bottom, deep blue and gold, stars appearing. |
| 켈트 `celtic` | Misty highland moor, ancient standing stone circle and gnarled oak at the top edge, wet mossy rocks and heather with a still lake at the bottom, emerald green and grey mist, pale sunlight breaking through. |
| 아메리카 `america` | Jungle plaza before a stepped Mesoamerican pyramid, carved serpent stair and feathered banners at the top edge, flagstones with jade-green moss and torches at the bottom, lush green, turquoise and sunset orange. |
| 기사 전설 `knight` | Castle tourney field at morning, grey stone keep with heraldic banners and a wooden lists fence at the top edge, trampled grass, lances and a chest of shields at the bottom, steel grey, crimson and gold. |

뒤에 늘 붙이는 꼬리:

> No characters, no text, no watermark, no border, no cards, no weapons held by anyone. Soft vignette at the edges.

## 넓히기 — 다른 놀이

- **오토 배틀(`auto.html`)** — 이번 판의 신화권 가운데 첫 권의 맵을 두 판 뒤에. 판이 두 줄 세 칸이라 가로가 넓다 — 세로 그림을 위아래로 자르면 된다.
- **던전(`run.html`)** — 길의 칸마다 권을 돌려 가며(보스 칸은 보스의 권). 싸움 화면 뒤에.
- **드래프트(`draft.html`)** — 판 짜기에서 고른 권 가운데 첫 권. 팩 아홉 장 뒤에.
- 세 놀이 모두 결투와 같은 함수(`mapURL`)를 공용 `lib/img.js` 로 옮겨 쓰면 한 곳에서 관리된다.

## 지금 상태

- 결투 — 그 주인의 권 그림을 판 뒤에 깐다(맵 → 끝 벽 그림 → 없음).
- 맵 그림: 열한 권 전부(2026-10-02). 결투는 이제 모든 주인의 판 뒤에 맵이 깔린다. 다음은 위 "넓히기" — 오토 배틀·던전·드래프트.
