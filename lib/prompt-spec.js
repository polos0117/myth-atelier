/* 프롬프트 표 — 생성기가 쓰는 문장과 선택지는 전부 여기 있다. 함수는 없다(tests/words.cjs 가 본다).
   조립은 lib/prompt-myth.js 가 한다.

   포켓몬 판(pkm-atelier)의 320KB 표를 옮기지 않았다. 거기서는 폼 셋·기준 시트·확대컷·등 장비 때문에
   문장이 불었는데, 여기는 무기당 액션 한 장이라 필요한 것이 다르다: 무기가 손에 있고 알아볼 수 있을 것,
   신화권의 옷·재질 언어, 한 사람, 세로 2:3, 얼굴이 카메라를 향할 것. 그게 전부다.

   화풍 key 는 data/style.json 과 같아야 한다 — 파일 이름에 들어간다. tests/prompt-engine.cjs 가 맞춘다. */
(function (root) {
  'use strict';

  /* 화풍 — 이름은 한국어(화면), core 는 영어 한 단락(프롬프트) */
  var STYLES = [
    ['cinematic_semi_real', '세미리얼 시네마틱', 'Cinematic semi-real illustration with believable anatomy, painterly skin and hair, solid material volume and controlled film lighting. Keep the face clearly illustrated, the materials distinct and the action readable.'],
    ['game_keyart', '게임 키아트 2.5D', 'Polished 2.5D game key art with clean linework, controlled anime facial design, layered cel-to-soft shading and crisp costume and weapon detail. Use a vivid, readable silhouette and campaign-quality lighting.'],
    ['glossy_kr_game', '한국형 글로시 게임 일러스트', 'Glossy Korean mobile-game character art with an elegant anime face, smooth dimensional shading, luminous color accents and refined ornament rendering. Keep highlights selective and the figure sharply readable.'],
    ['glossy_promo', '글로시 프로모 키아트', 'Premium glossy anime promotional key art with clean linework, vivid controlled color, dimensional 2.5D shading and dense but organized costume and weapon detail. Match the face and the weapon at the same polished rendering intensity.'],
    ['mecha_cinematic_keyart', '시네마틱 키아트', 'Illustration-first cinematic key art with a clear anime face, saturated campaign color, convincing material volume, strong rim and key light and a crisp readable environment. It reads as authored premium illustration rather than literal CGI.'],
    ['game_cgi', '게임 시네마틱 CGI', 'High-end stylized game CGI with coherent three-dimensional anatomy, physically convincing costume and weapon construction, clean materials and dramatic production lighting. Preserve a designed character-art finish rather than live-action texture.'],
    ['semi_real_paint', '세미리얼 유화', 'Sophisticated semi-real digital painting with natural anatomy, restrained facial stylization, broad painterly planes and tactile metal, cloth and stone surfaces. Use composed light and visible brush character without losing structural clarity.'],
    ['photoreal', '사진풍', 'Photoreal cinematic character photography with plausible anatomy, lens behavior, lighting and material response. The weapon and costume read as physically built props integrated into the photographed scene.'],
    ['anime_illust', '애니 일러스트', 'Detailed modern anime illustration with expressive linework, clear facial features, controlled cel shading and crisp weapon construction. Use dimensional color and lighting while preserving an unmistakably drawn finish.'],
    ['cel_anime', '셀화 애니', 'Clean cel-anime art with decisive outlines, limited stepped shadows, flat controlled color and readable graphic shapes. The weapon stays structurally clear through line and silhouette rather than surface noise.'],
    ['painterly', '회화적 컨셉아트', 'Painterly fantasy character art with expressive brushwork, shaped color masses, atmospheric depth and solid weapon forms. Preserve readable edges at the face, hands and the weapon.'],
    ['retro_anime', '레트로 애니', 'Retro hand-painted anime key art with confident ink lines, simplified weapon shapes, warm cel colors and period-style painted lighting. Keep the composition bold and graphic.'],
    ['ink_wash', '수묵 담채', 'Ink-and-wash character illustration with expressive brush outlines, diluted ink values, restrained translucent color and open paper-like atmosphere. Use selective dark accents to keep the weapon silhouette readable.'],
    ['bright_catalog', '밝은 카탈로그', 'Bright polished catalog illustration with clean neutral lighting, crisp color separation, controlled reflections and highly readable costume and weapon construction. Keep the character vivid against a simple spatial environment.']
  ];
  var DEFAULT_STYLE = 'glossy_promo';

  /* 놀이 규칙 — 어느 출력에나 붙는다 */
  var RULES = [
    'SUBJECT: one adult woman who is the personification of the named legendary weapon. She is not the wielder of the legend; she is the weapon itself given a human form.',
    'THE WEAPON IS THE POINT: the actual legendary weapon must be in the frame, in her hands or on her body, at a plausible physical scale, and instantly recognizable as that specific object from its legend. Costume, ornament and color echo the weapon’s material and myth.',
    'ONE FIGURE ONLY. No second character, no creature, no text, no logo, no watermark, no speech bubble, no frame border.',
    'ANATOMY: natural adult proportions, both hands drawn correctly, weapon held with a believable grip. No body-part enlargement, no extra limbs.'
  ];

  /* 출력 셋 — 액션 한 장(카드), 각성, 일상컷 */
  var OUTPUTS = {
    portrait: {
      name: '액션 한 장',
      note: '카드 그림. 세로 2:3 전신, 무기가 손에, 얼굴이 카메라를 향한다.',
      text: 'OUTPUT: one dynamic action image that also works as this character’s card art. Vertical 2:3 frame, full body with head and feet inside the frame with clear margins, no foreground occlusion, face turned toward the camera (front or three-quarter, never a back view). Motion, effects and environment may be dramatic while she and the weapon stay fully readable.',
      file: '{name}_{style}_f.webp'
    },
    awaken: {
      name: '각성',
      note: '3성일 때 뜨는 그림. 액션 그림을 첨부하고 같은 구도에서 무기만 깨운다.',
      text: 'OUTPUT: the AWAKENED state of the attached action image. Keep the attached image’s camera, pose, framing, subject scale, face, hair, costume and colors exactly. Change only this: the weapon ignites with its legendary power (light, aura, runes, elemental effect matching its myth), her eyes and ornaments catch that light, and the air around her reacts. The pair must read as the same picture before and after the weapon wakes.',
      file: '{name}_{style}_f_awaken.webp'
    },
    casual: {
      name: '일상컷',
      note: '같은 사람의 평상시. 무기는 작은 장신구나 소품으로만.',
      text: 'OUTPUT: one standalone off-duty scene of the same woman. Modern or myth-flavored everyday clothing of her choice; the weapon appears only as a small accessory, motif or carried object, never as a battle prop. Relaxed pose and expression; the scene and outfit follow the scene note.',
      file: '{name}_{style}_f_casual{n}.webp'
    }
  };

  /* 신화권의 옷·재질·장식 언어 */
  var MYTH_FLAVOR = {
    norse: 'Norse language: fur trim, braided leather, wolf and raven motifs, cold iron and knotwork silver, runic engraving, muted snow and steel palette with one cold accent.',
    greek: 'Greek language: draped chiton or pleated tunic, bronze and gold fittings, laurel and meander patterns, marble whites and Aegean blues with warm bronze accents.',
    east: 'East Asian language: layered silk robes with structured collars, lacquer and jade, cloud and dragon or tiger motifs, embroidered sashes, restrained vermilion, ink black and gold.',
    india: 'Indian language: draped and pleated silks, heavy gold jewelry, marigold and lotus motifs, henna-like linework, bindi or forehead ornament, saffron, indigo and gold.'
  };

  /* 무기 종류별 동작 — 액션 한 장에서 고른다. 첫 것이 기본 */
  var ACTIONS = {
    sword: [
      ['draw', '발도 — 칼을 뽑는 순간', 'Mid-draw: the blade leaves its sheath in one clean arc, weight forward, eyes on the camera.'],
      ['slash', '베기 — 휘두르는 궤적', 'A committed horizontal or diagonal slash frozen at full extension, the blade’s path readable as a trail.'],
      ['guard', '중단 — 겨눔', 'A poised guard with the blade held level toward the viewer, feet set, calm focus.'],
      ['leap', '도약 — 내려베기 직전', 'Airborne with the sword raised for a downward cut, cloth and hair lifting, ground far below.']
    ],
    spear: [
      ['thrust', '찌르기 — 뻗는 순간', 'A full-extension thrust toward the camera side, rear foot planted, the point leading the composition.'],
      ['sweep', '후리기 — 넓게 쓸기', 'A wide sweeping arc with the shaft held at its end, the head’s path readable, hair and cloth following.'],
      ['plant', '꽂기 — 땅에 세움', 'The spear planted upright beside her, one hand on the shaft, standing tall as a banner.'],
      ['throw', '던지기 — 놓는 순간', 'The instant of a throw: arm fully extended, the spear just released and still close to her hand.']
    ],
    blunt: [
      ['overhead', '내려찍기 — 머리 위로', 'Overhead smash at the top of its arc, both hands on the haft, shoulders and hips wound up, ground cracking below.'],
      ['shoulder', '어깨에 걸침', 'The weapon resting on one shoulder, relaxed and dangerous, weight on one hip, direct gaze.'],
      ['impact', '착탄 — 땅을 치는 순간', 'The moment of impact on the ground, dust and fragments lifting, her stance braced and low.'],
      ['swing', '휘두르기 — 옆으로', 'A sideways swing at full extension, the head blurring at the end of the arc.']
    ],
    bow: [
      ['fulldraw', '만작 — 시위를 당김', 'Full draw at anchor, string at her cheek, the arrow aimed just off the camera, absolute stillness.'],
      ['release', '발사 — 놓는 순간', 'The instant after release: the string still vibrating, the arrow a streak leaving the frame, her hand open.'],
      ['volley', '연사 — 화살이 하늘에', 'Several arrows already in the air above her as she nocks the next, motion in the hair and cloth.'],
      ['rest', '활을 내림', 'The bow lowered in one hand after a shot, quiver visible, gaze following the arrow.']
    ],
    relic: [
      ['invoke', '발동 — 힘을 부름', 'The relic held up or forward as it activates, light gathering around it, her face lit from below.'],
      ['shield', '막기 — 앞에 세움', 'The relic raised as a ward between her and the viewer, braced stance, calm face above it.'],
      ['throw', '던지기 — 놓는 순간', 'The relic just released from her hand, still close, spinning or flaring, her body twisted from the throw.'],
      ['carry', '들고 나아감', 'Walking toward the camera with the relic carried openly, cloak and hair moving, steady eyes.']
    ]
  };

  /* 외형 — 비면 자동. 자동일 때 신화권이 얼굴 계통을 정한다 */
  var PARAMS = [
    { key: 'ethnicity', ko: '얼굴 계통', label: 'Facial ethnicity', auto: { norse: 'Nordic', greek: 'Mediterranean', east: 'East Asian', india: 'South Asian' },
      options: [['', '자동 — 신화권에 맞춤'], ['Nordic', '북유럽'], ['Mediterranean', '지중해'], ['East Asian', '동아시아'], ['Korean', '한국'], ['Japanese', '일본'], ['Chinese', '중국'], ['South Asian', '남아시아'], ['Middle Eastern', '중동'], ['European', '유럽'], ['mixed East Asian and European', '동아시아·유럽 혼혈'], ['__custom__', '직접 입력']] },
    { key: 'age', ko: '나이 인상', label: 'Apparent age',
      options: [['', '자동'], ['early 20s', '20대 초'], ['late 20s', '20대 후'], ['30s', '30대'], ['mature adult', '연륜 있는 성인'], ['__custom__', '직접 입력']] },
    { key: 'body', ko: '체형', label: 'Body type',
      options: [['', '자동 — 무기에 맞춤'], ['slender', '가늘고 슬림'], ['athletic', '탄탄한 운동 체형'], ['tall and long-limbed', '키 크고 팔다리 긴'], ['strong and broad-shouldered', '단단하고 어깨 넓은'], ['curvy', '굴곡 있는'], ['__custom__', '직접 입력']] },
    { key: 'hairColor', ko: '머리색', label: 'Hair color',
      options: [['', '자동 — 무기 재질에 맞춤'], ['white', '흰색'], ['silver', '은색'], ['platinum blonde', '백금발'], ['golden blonde', '금발'], ['ash brown', '애쉬 브라운'], ['dark brown', '진갈색'], ['black', '검정'], ['crimson', '진홍'], ['copper', '구릿빛'], ['midnight blue', '짙은 남색'], ['violet', '보라'], ['__custom__', '직접 입력']] },
    { key: 'hairStyle', ko: '머리 모양', label: 'Hairstyle',
      options: [['', '자동'], ['long straight', '긴 생머리'], ['long wavy', '긴 웨이브'], ['high ponytail', '높은 포니테일'], ['braided crown', '땋아 올림'], ['loose braid', '느슨한 땋은 머리'], ['bob', '단발'], ['short undercut', '짧은 언더컷'], ['twin tails', '트윈테일'], ['bun with loose strands', '올림머리'], ['__custom__', '직접 입력']] },
    { key: 'eyeColor', ko: '눈 색', label: 'Eye color',
      options: [['', '자동'], ['ice blue', '얼음빛 파랑'], ['gold', '금색'], ['amber', '호박색'], ['emerald', '에메랄드'], ['crimson', '진홍'], ['violet', '보라'], ['dark brown', '진갈색'], ['silver', '은색'], ['__custom__', '직접 입력']] },
    { key: 'expression', ko: '표정', label: 'Expression',
      options: [['', '자동 — 동작에 맞춤'], ['calm', '차분함'], ['focused', '집중'], ['fierce', '사나움'], ['serene smile', '고요한 미소'], ['playful', '장난기'], ['cold', '차가움'], ['proud', '당당함'], ['__custom__', '직접 입력']] },
    { key: 'outfit', ko: '옷 방향', label: 'Outfit direction',
      options: [['', '자동 — 신화권 언어'], ['battle dress', '전투 드레스'], ['light armor over cloth', '천 위에 가벼운 갑옷'], ['ceremonial robes', '의식용 예복'], ['practical warrior wear', '실용적인 전사 복장'], ['regal and ornate', '화려한 왕족풍'], ['__custom__', '직접 입력']] }
  ];

  /* 화풍 견본 문장(스타일만 시험할 때) */
  var STYLE_SAMPLE = 'One adult woman standing in a plain studio, full body, holding a plain straight sword, neutral expression, simple grey backdrop.';

  root.AtelierSpec = {
    STYLES: STYLES, DEFAULT_STYLE: DEFAULT_STYLE, RULES: RULES, OUTPUTS: OUTPUTS,
    MYTH_FLAVOR: MYTH_FLAVOR, ACTIONS: ACTIONS, PARAMS: PARAMS, STYLE_SAMPLE: STYLE_SAMPLE
  };
})(typeof window !== 'undefined' ? window : globalThis);
