/* 프롬프트 표 — 생성기가 쓰는 문장과 선택지는 전부 여기 있다. 함수는 없다(tests/words.cjs 가 본다).
   조립은 lib/prompt-myth.js 가 한다.

   포켓몬 판(pkm-atelier)의 320KB 표를 옮기지 않았다. 거기서는 폼 셋·기준 시트·확대컷·등 장비 때문에
   문장이 불었는데, 여기는 무기당 액션 한 장이라 필요한 것이 다르다: 무기가 손에 있고 알아볼 수 있을 것,
   신화권의 옷·재질 언어, 한 사람, 세로 2:3, 얼굴이 카메라를 향할 것. 그게 전부다.
   2026-09-21 방향 전환 둘: "무기를 든 사람" 이 아니라 "무기를 모티브로 한 메카 의인화". 첫 궁니르가 창 든 전사로,
   둘째가 팔이 창이 된 채로 나왔고, 한 줄짜리 프롬프트로 만든 엑스칼리버 메카가 제일 좋았다. 그래서 뼈대(CORE)는
   한 문단이고 나머지(재질 옮기기·실루엣·신화권 언어·자세)는 꺼진 선택 문단이다.

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

  /* 뼈대 — 기본은 이 한 문단이 전부다. 한 줄 프롬프트("엑스칼리버 모티브 여성 메카 의인화, 무기는 들지 마")로
     만든 그림이 긴 지시문보다 좋았다(2026-09-21). "무엇"만 주고 "어떻게"는 모델에게 맡긴다. 설계 언어 둘 중 하나 */
  var CORE = {
    mecha: 'A female mecha personification character with {weapon} as her motif \u2014 the weapon reimagined as an armored woman: plates, joints, binders and glow lines carry its materials, colors, shape and motifs. She does NOT hold, carry or wield the weapon; the weapon is not in her hands and not a separate object. Both hands are ordinary human hands, free and fully visible.',
    cloth: 'A female personification character with {weapon} as her motif \u2014 the weapon reimagined as a woman in cloth, metal ornament and regalia that carry its materials, colors, shape and motifs. She does NOT hold, carry or wield the weapon; the weapon is not in her hands and not a separate object. Both hands are ordinary human hands, free and fully visible.'
  };
  var DESIGNS = [['mecha', '메카 의인화', '판·관절·바인더·발광선. 건담 판의 문법. 기본'], ['cloth', '천·장신구 의인화', '천 옷과 금속 장신구, 예장']];
  var RULES = [
    'ONE FIGURE ONLY. No second character, no creature, no text, no lettering on banners or walls, no logo, no watermark, no speech bubble, no frame border.',
    'ANATOMY: natural adult proportions, both hands drawn correctly as hands. No body-part enlargement, no extra limbs, no limb replaced by a weapon or a blade.'
  ];

  /* 선택 문단 — 기본은 꺼져 있다. 켜면 그 문단이 붙는다. 앞 생성기의 parameter 처럼 */
  var EXTRAS = [
    ['embodiment', '재질 옮기기 지시', '무기의 재질·색·형태·문양을 어디로 옮길지 일일이 말한다. 켜면 더 문자 그대로 나온다'],
    ['silhouette', '종류별 실루엣', '검은 곧게, 창은 세로 한 줄, 둔기는 덩어리, 활은 곡선, 이형은 그 물건 형태'],
    ['myth', '신화권 옷·재질 언어', '북유럽 모피·룬, 그리스 청동·월계, 동아시아 비단·옥, 인도 금·연꽃']
  ];
  var EMBODIMENT = 'EMBODIMENT: the weapon\u2019s materials, its two colors, its shape and its motifs (see WEAPON LOOK) are carried by her body, hair, ornaments and armor \u2014 blade steel becomes plate and jewelry, haft wood becomes leather and braid, its glow becomes her eyes and hair tips, its engraving becomes her patterns. The weapon\u2019s form may float behind her as a back unit or be worn as regalia on the crown, shoulders or hem, never in or as a hand.';

  /* 무기 종류별 실루엣 — 선택 문단. 자리를 못 박는다(팔이 창이 되지 않게) */
  var KIND_SILHOUETTE = {
    sword: 'SILHOUETTE: sword \u2014 sharp, straight and vertical; narrow shoulders-to-hips line, pointed hems and hair ends, edges on the crown, shoulders and skirt plates, nothing rounded.',
    spear: 'SILHOUETTE: spear \u2014 tall and long-limbed, everything reads as one vertical line; narrow upward-pointing ornaments on the crown, shoulders and hem, a long straight fall of hair or cloth.',
    blunt: 'SILHOUETTE: blunt weapon \u2014 weight and mass; broad shoulders or heavy sleeves, dense rounded plates at shoulders and hips, a grounded stance, thick braids.',
    bow: 'SILHOUETTE: bow \u2014 tension and curve; a lean drawn-bowstring posture, arcs in hair, sash and hem, a string-like line running through the design, quiver or arrows worn on the back.',
    relic: 'SILHOUETTE: relic \u2014 the object\u2019s own form becomes her regalia; its shape (ring, disc, shield, sandal, bolt) repeats as halo, pauldron, belt or crown at readable scale.'
  };

  /* 출력 셋 — 액션 한 장(카드), 각성, 일상컷 */
  var OUTPUTS = {
    portrait: {
      name: '액션 한 장',
      note: '카드 그림. 세로 2:3 전신, 무기가 손에, 얼굴이 카메라를 향한다.',
      text: 'OUTPUT: one dynamic action image that also works as this character’s card art. Vertical 2:3 frame, full body with head and feet inside the frame with clear margins, no foreground occlusion, face turned toward the camera (front or three-quarter, never a back view). Default stance is a standing, regal, card-ready pose; motion, effects and environment may be dramatic while her design stays fully readable.',
      file: '{name}_{style}_f.webp'
    },
    awaken: {
      name: '각성',
      note: '3성일 때 뜨는 그림. 액션 그림을 첨부하고 같은 구도에서 무기만 깨운다.',
      text: 'OUTPUT: the AWAKENED state of the attached action image. Keep the attached image’s camera, pose, framing, subject scale, face, hair, costume and colors exactly. Change only this: her weapon-self ignites with its legendary power (light, aura, runes, elemental effect matching its myth) along the parts of her design that carry the weapon, her eyes and ornaments catch that light, and the air around her reacts. The pair must read as the same picture before and after the weapon wakes.',
      file: '{name}_{style}_f_awaken.webp'
    },
    casual: {
      name: '일상컷',
      note: '같은 사람의 평상시. 무기는 작은 장신구나 소품으로만.',
      text: 'OUTPUT: one standalone off-duty scene of the same woman. Modern or myth-flavored everyday clothing of her choice; her weapon nature shows only as a small accessory, a motif on the clothing or a color echo, never as a battle prop. Relaxed pose and expression; the scene and outfit follow the scene note.',
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

  /* 무기 종류별 자세 — 선택. 비우면 뼈대의 '서 있는 위엄 포즈' 가 기본이다. 무기를 휘두르는 컷이 아니라 무기의 성격이 몸으로 드러나는 순간 */
  var ACTIONS = {
    sword: [
      ['draw', '발도 — 날이 깨어나는 순간', 'The instant of unsheathing: her blade-self flares along one arm or spine, weight forward, eyes locked on the camera, hair and hem lifting as edges.'],
      ['slash', '베기 — 궤적이 남는 순간', 'A committed cut frozen at full extension; the cutting line is drawn by her whole body, cloth and hair trailing the arc.'],
      ['guard', '중단 — 겨눔', 'A poised, level guard toward the viewer, feet set, absolute calm; every line of her design points straight at the camera.'],
      ['leap', '도약 — 내려베기 직전', 'Airborne, raised for a downward cut, the ground far below, cloth and hair lifted into blade shapes.']
    ],
    spear: [
      ['thrust', '찌르기 — 한 점으로', 'A full-extension thrust toward the camera side, rear foot planted; her entire body reads as one straight line ending in a point.'],
      ['sweep', '후리기 — 넓게 쓸기', 'A wide sweeping arc, hair and cloth following the long line, the tip\u2019s path readable across the frame.'],
      ['plant', '꽂기 — 세워 서다', 'Standing tall as a planted banner, weight centered, the vertical of her design unbroken from crown to heel.'],
      ['throw', '던지기 — 놓는 순간', 'The instant of a throw: arm fully extended, the point still close to her hand, body twisted along the line of flight.']
    ],
    blunt: [
      ['overhead', '내려찍기 — 머리 위로', 'Wound up at the top of an overhead swing, shoulders and hips loaded, mass gathered in fists and shoulders, ground cracking below.'],
      ['shoulder', '어깨에 걸침', 'Weight resting on one hip, relaxed and dangerous, heavy ornaments hanging still, direct gaze.'],
      ['impact', '착탄 — 땅을 치는 순간', 'The beat of impact: dust and fragments lifting from the ground, her stance braced and low, mass driven downward.'],
      ['swing', '휘두르기 — 옆으로', 'A sideways swing at full extension, the heavy end of her design blurring at the end of the arc.']
    ],
    bow: [
      ['fulldraw', '만작 — 시위를 당김', 'Full draw at anchor, string-line at her cheek, aimed just off the camera, absolute stillness in a tensed curve.'],
      ['release', '발사 — 놓는 순간', 'The instant after release: the string-line still vibrating, an arrow as a streak leaving the frame, her hand open.'],
      ['volley', '연사 — 화살이 하늘에', 'Several arrows already in the air above her as she nocks the next, motion in hair and cloth.'],
      ['rest', '활을 내림', 'The curve relaxed after a shot, quiver and arrows worn on her body visible, gaze following the arrow.']
    ],
    relic: [
      ['invoke', '발동 — 힘을 부름', 'The relic-self activating: light gathering in her regalia, her face lit from below, the object\u2019s shape glowing on her body.'],
      ['shield', '막기 — 앞에 세움', 'The relic\u2019s form raised as a ward between her and the viewer, braced stance, calm face above it.'],
      ['throw', '던지기 — 놓는 순간', 'The relic just released from her hand, still close, spinning or flaring, her body twisted from the throw.'],
      ['carry', '들고 나아감', 'Walking toward the camera with the relic worn openly as regalia, cloak and hair moving, steady eyes.']
    ]
  };

  /* 외형 — 비면 자동. 앞선 생성기(pkm-atelier)의 세부 선택을 다섯 묶음으로 가져왔다.
     장갑·장비 묶음은 뺐다(여기는 무기가 곧 사람이라 장비 개념이 없다). 자동일 때 신화권이 얼굴 계통을 정한다.
     첫 칸은 얼굴 계통이어야 한다 — 검사와 자동 규칙이 PARAMS[0] 을 본다 */
  var PARAM_GROUPS = [
    ['base', '기본', '나이·얼굴 계통·옷 방향. 비우면 신화권과 무기가 정한다.'],
    ['build', '체형', '체형이 큰 방향이고 세부값은 그 범위에서 조절한다. 보통·균형은 초기화가 아니다.'],
    ['face', '얼굴', '얼굴 인상보다 구체적인 윤곽·크기·각도가 우선한다. 세부값은 그 부위만 바꾼다.'],
    ['hair', '머리', '스타일의 구조가 우선한다. 길이는 풀었을 때, 머릿결은 한 올의 굵기, 볼륨은 전체 부피.'],
    ['shot', '구도', '실루엣·포즈 성격·시점·프레임·렌즈. 카드 규격(세로 전신, 얼굴이 카메라로)은 그 위에서 지킨다.']
  ];
  var PARAMS = [
    { key: "ethnicity", ko: "얼굴 계통", label: "Facial ethnicity", group: "base", auto: {"norse": "Nordic", "greek": "Mediterranean", "east": "East Asian", "india": "South Asian"},
      options: [["", "자동 — 신화권에 맞춤"], ["East Asian", "East Asian — 동아시아 계열"], ["Korean", "Korean — 한국계"], ["Japanese", "Japanese — 일본계"], ["Chinese", "Chinese — 중국계"], ["Southeast Asian", "Southeast Asian — 동남아 계열"], ["Central Asian", "Central Asian — 중앙아시아 계열"], ["South Asian", "South Asian — 남아시아 계열"], ["Middle Eastern", "Middle Eastern — 중동 계열"], ["European", "European — 유럽 계열"], ["Nordic", "Nordic — 북유럽 계열"], ["Mediterranean", "Mediterranean — 지중해 계열"], ["Slavic", "Slavic — 슬라브 계열"], ["Latin American", "Latin American — 라틴 계열"], ["African", "African — 아프리카 계열"], ["mixed East Asian and European", "Mixed (EA×EU) — 동아시아·유럽 혼혈"], ["__custom__", "직접 입력… — 원하는 계통 직접 작성"]] },
    { key: "age", ko: "나이 인상", label: "Apparent age", group: "base",
      options: [["", "자동 — 자동 결정"], ["20s", "20s — 20대 성인"], ["30s", "30s — 30대 성인"], ["40s", "40s — 40대 성인"], ["mature adult", "Mature Adult — 성숙하고 연륜 있는 성인"], ["youthful adult", "Youthful — 동안 (성인이되 어려 보이는 얼굴)"], ["__custom__", "직접 입력… — 원하는 나이 인상 직접 작성"]] },
    { key: "outfit", ko: "옷 방향", label: "Outfit direction", group: "base",
      options: [["", "자동 — 무기의 재질과 신화권 언어"], ["battle dress", "전투 드레스"], ["light armor over cloth", "천 위에 가벼운 갑옷"], ["ceremonial robes", "의식용 예복"], ["practical warrior wear", "실용적인 전사 복장"], ["regal and ornate", "화려한 왕족풍"], ["__custom__", "직접 입력"]] },
    { key: "body", ko: "체형", label: "Body type", group: "build",
      options: [["", "자동 — 무기에 맞춤"], ["slender", "Slender — 가늘고 슬림한 체형"], ["athletic", "Athletic — 탄탄한 운동형 체형"], ["curvy", "Curvy — 허리와 골반 곡선이 강조된 체형"], ["glamorous", "Glamorous — 풍만하고 화려한 체형"], ["muscular", "Muscular — 근육이 뚜렷한 체형"], ["heavy-built", "Heavy-built — 중후하고 묵직한 체형"], ["tall and lean", "Tall & Lean — 장신의 길고 슬림한 체형"], ["petite", "Petite — 작고 아담한 체형"], ["hourglass", "Hourglass — 허리가 잘록한 모래시계형"], ["voluptuous", "Voluptuous — 굴곡이 크고 육감적인 체형"], ["toned", "Toned — 군살 없이 잔근육이 잡힌 체형"], ["wiry", "Wiry — 가늘지만 단단한 체형"], ["soft-figured", "Soft-figured — 부드럽고 살집 있는 체형"], ["pear-shaped", "Pear-shaped — 하체에 무게가 실린 체형"], ["inverted triangle", "Inverted Triangle — 어깨가 넓고 하체가 좁은 역삼각형"], ["stocky", "Stocky — 짧고 다부진 체형"], ["statuesque", "Statuesque — 크고 당당한 조각상 같은 체형"], ["broad-shouldered", "Broad-shouldered — 어깨가 특히 넓은 체형"], ["burly", "Burly — 크고 두꺼운 거구"], ["lanky", "Lanky — 키만 크고 마른 체형"], ["barrel-chested", "Barrel-chested — 흉곽이 통처럼 두꺼운 체형"], ["rangy", "Rangy — 길고 유연한 근육질"], ["__custom__", "직접 입력… — 원하는 체형 직접 작성"]] },
    { key: "height", ko: "키 인상", label: "Height impression", group: "build",
      options: [["", "자동 — 전체 비율에서 자동 결정"], ["short", "Short — 비교적 작은 키 인상"], ["average", "Average — 평균적인 키 인상"], ["tall", "Tall — 장신 인상"], ["very tall", "Very Tall — 매우 큰 키 인상"], ["__custom__", "직접 입력… — 원하는 키/비율 직접 작성"]] },
    { key: "shoulder", ko: "어깨", label: "Shoulder build", group: "build",
      options: [["", "자동 — 자동 결정"], ["narrow", "Narrow — 좁은 어깨"], ["average", "Average — 평균적인 어깨"], ["broad", "Broad — 넓은 어깨"], ["__custom__", "직접 입력…"]] },
    { key: "torso", ko: "상체·흉곽", label: "Torso and chest build", group: "build",
      options: [["", "자동 — 자동 결정"], ["slim", "Slim — 얇고 가벼운 상체"], ["balanced", "Balanced — 균형 잡힌 상체"], ["full", "Full — 풍만한 상체"], ["powerful", "Powerful — 넓고 강한 흉곽"], ["v-taper", "V-taper — 어깨에서 허리로 급히 좁아지는 상체"], ["full bust", "Full Bust — 가슴 볼륨이 뚜렷한 상체"], ["__custom__", "직접 입력…"]] },
    { key: "torsoLength", ko: "몸통 길이", label: "Torso length", group: "build",
      options: [["", "자동 — 자동 결정"], ["short", "Short — 짧은 몸통"], ["balanced", "Balanced — 보통"], ["long", "Long — 긴 몸통"], ["__custom__", "직접 입력…"]] },
    { key: "waistHip", ko: "허리·골반", label: "Waist and hip silhouette", group: "build",
      options: [["", "자동 — 자동 결정"], ["straight", "Straight — 직선적인 실루엣"], ["athletic", "Athletic — 운동형 허리/골반"], ["balanced", "Balanced — 균형형"], ["hourglass", "Hourglass — 허리가 잘록한 모래시계형"], ["curvy", "Curvy — 골반 곡선이 강조된 형태"], ["narrow-hipped", "Narrow-hipped — 골반이 좁은 형태"], ["broad-hipped", "Broad-hipped — 골반이 넓게 벌어진 형태"], ["__custom__", "직접 입력…"]] },
    { key: "legs", ko: "다리 비율", label: "Leg proportion", group: "build",
      options: [["", "자동 — 자동 결정"], ["balanced", "Balanced — 균형형"], ["long", "Long — 긴 다리"], ["very long", "Very Long — 매우 긴 다리"], ["powerful", "Powerful — 굵고 힘 있는 다리"], ["__custom__", "직접 입력…"]] },
    { key: "lowerBody", ko: "하체 굵기", label: "Lower-body build", group: "build",
      options: [["", "자동 — 자동 결정"], ["slender", "Slender — 가는 하체"], ["balanced", "Balanced — 보통"], ["full", "Full — 굵은 하체"], ["__custom__", "직접 입력…"]] },
    { key: "measurements", ko: "신체 치수 B/W/H", label: "Body measurements", group: "build",
      options: [["", "자동 — 자동 결정"], ["__custom__", "직접 입력…"]] },
    { key: "faceCharacter", ko: "얼굴 인상", label: "Facial character", group: "face",
      options: [["", "자동 — 자동 결정"], ["elegant", "Elegant — 우아하고 정제된 인상"], ["cool", "Cool — 차갑고 세련된 인상"], ["sharp", "Sharp — 예리하고 공격적인 인상"], ["mature", "Mature — 성숙하고 안정된 인상"], ["soft", "Soft — 부드럽고 온화한 인상"], ["glamorous", "Glamorous — 화려하고 매력적인 인상"], ["rugged", "Rugged — 거칠고 강인한 인상"], ["stoic", "Stoic — 무표정하고 절제된 인상"], ["weathered", "Weathered — 풍상을 겪은 거친 인상"], ["boyish", "Boyish — 앳되고 장난기 있는 인상"], ["regal", "Regal — 위엄 있고 고압적인 인상"], ["cute", "Cute — 귀엽고 사랑스러운 인상"], ["doll-like", "Doll-like — 인형처럼 정제된 인상"], ["cheerful", "Cheerful — 밝고 명랑한 인상"], ["innocent", "Innocent — 맑고 순수해 보이는 인상"], ["friendly", "Friendly — 다가가기 쉬운 인상"], ["sleepy-eyed", "Sleepy-eyed — 나른한 인상"], ["refined", "Refined — 단정하고 세련된 인상"], ["fierce", "Fierce — 사납고 거센 인상"], ["exotic", "Exotic — 이국적인 인상"], ["androgynous", "Androgynous — 중성적인 인상"], ["melancholic", "Melancholic — 어딘가 쓸쓸한 인상"], ["__custom__", "직접 입력… — 원하는 얼굴 인상 직접 작성"]] },
    { key: "skinTone", ko: "피부 톤", label: "Skin tone", group: "face",
      options: [["", "자동 — 자동 결정"], ["pale", "Pale — 매우 밝은 피부"], ["light", "Light — 밝은 피부"], ["medium", "Medium — 중간 피부톤"], ["tan", "Tan — 태닝된 피부"], ["deep", "Deep — 짙은 피부톤"], ["__custom__", "직접 입력…"]] },
    { key: "faceShape", ko: "얼굴형", label: "Face shape", group: "face",
      options: [["", "자동 — 자동 추론"], ["oval", "Oval — 균형 잡힌 타원형"], ["angular", "Angular — 각지고 선명한 얼굴형"], ["heart-shaped", "Heart-shaped — 이마가 넓고 턱이 가는 하트형"], ["elongated", "Elongated — 길고 세련된 얼굴형"], ["compact", "Compact — 짧고 응축된 얼굴형"], ["softly rounded", "Softly Rounded — 부드럽고 둥근 얼굴형"], ["sharp", "Sharp — 턱선과 골격이 날카로운 얼굴형"], ["__custom__", "직접 입력… — 얼굴형 직접 작성"]] },
    { key: "eyeShape", ko: "눈매", label: "Eye shape", group: "face",
      options: [["", "자동 — 자동 결정"], ["narrow", "Narrow — 가늘고 날카로운 눈"], ["almond", "Almond — 아몬드형 눈"], ["large", "Large — 큰 눈"], ["sharp", "Sharp — 강하게 치켜올라간 눈"], ["drooping", "Drooping — 살짝 처진 부드러운 눈"], ["upturned", "Upturned — 끝이 올라간 눈"], ["__custom__", "직접 입력…"]] },
    { key: "eyeColor", ko: "눈동자 색 · 오른쪽", label: "Eye color", group: "face",
      options: [["", "자동 — 무기에 맞춤"], ["red", "Red — 적색"], ["crimson", "Crimson — 진홍색"], ["amber", "Amber — 호박색"], ["gold", "Gold — 금색"], ["orange", "Orange — 주황색"], ["green", "Green — 녹색"], ["teal", "Teal — 청록색"], ["pale blue", "Pale Blue — 옅은 하늘색"], ["blue", "Blue — 청색"], ["navy", "Navy — 짙은 남색"], ["purple", "Purple — 보라색"], ["lavender", "Lavender — 연보라"], ["pink", "Pink — 분홍색"], ["gray", "Gray — 회색"], ["silver", "Silver — 은색"], ["brown", "Brown — 갈색"], ["black", "Black — 검은색"], ["__custom__", "직접 입력…"]] },
    { key: "eyeColor2", ko: "오드아이 · 왼쪽 눈", label: "Left eye color (heterochromia)", group: "face",
      options: [["", "사용 안 함 — 양쪽 같은 색"], ["red", "Red — 적색"], ["crimson", "Crimson — 진홍색"], ["amber", "Amber — 호박색"], ["gold", "Gold — 금색"], ["orange", "Orange — 주황색"], ["green", "Green — 녹색"], ["teal", "Teal — 청록색"], ["pale blue", "Pale Blue — 옅은 하늘색"], ["blue", "Blue — 청색"], ["navy", "Navy — 짙은 남색"], ["purple", "Purple — 보라색"], ["lavender", "Lavender — 연보라"], ["pink", "Pink — 분홍색"], ["gray", "Gray — 회색"], ["silver", "Silver — 은색"], ["brown", "Brown — 갈색"], ["black", "Black — 검은색"], ["__custom__", "직접 입력… — 원하는 색 직접 작성"]] },
    { key: "expression", ko: "표정", label: "Expression", group: "face",
      options: [["", "자동 — 자동 결정"], ["calm", "Calm — 차분함"], ["serious", "Serious — 진지함"], ["confident", "Confident — 자신감"], ["cold", "Cold — 차갑고 냉정함"], ["gentle", "Gentle — 부드러움"], ["smirk", "Smirk — 옅은 비웃음/미소"], ["fierce", "Fierce — 강렬하고 사나움"], ["stoic", "Stoic — 감정을 절제한 무표정"], ["__custom__", "직접 입력…"]] },
    { key: "faceLength", ko: "얼굴 길이", label: "Face length", group: "face",
      options: [["", "자동 — 자동 결정"], ["short", "Short — 짧은 얼굴"], ["balanced", "Balanced — 보통"], ["long", "Long — 긴 얼굴"], ["__custom__", "직접 입력…"]] },
    { key: "faceWidth", ko: "얼굴 폭", label: "Face width", group: "face",
      options: [["", "자동 — 자동 결정"], ["narrow", "Narrow — 좁은 얼굴"], ["medium", "Medium — 보통"], ["wide", "Wide — 넓은 얼굴"], ["__custom__", "직접 입력…"]] },
    { key: "jaw", ko: "턱선 · 턱끝", label: "Jaw and chin", group: "face",
      options: [["", "자동 — 자동 결정"], ["soft rounded jaw", "Soft — 부드럽고 둥근 턱"], ["balanced jawline", "Balanced — 보통"], ["angular defined jaw", "Angular — 각지고 또렷한 턱"], ["square broad jaw", "Square — 넓고 각진 사각 턱"], ["narrow tapered chin", "Tapered — 아래로 갈수록 좁아지는 턱끝"], ["wide heavy chin", "Heavy — 넓고 묵직한 턱끝"], ["long chin with defined jaw", "Long — 턱끝이 길고 턱선이 또렷한"], ["receding soft chin", "Receding — 턱끝이 뒤로 물러난"], ["__custom__", "직접 입력…"]] },
    { key: "eyeSize", ko: "눈 크기", label: "Eye size", group: "face",
      options: [["", "자동 — 자동 결정"], ["small", "Small — 작은 눈"], ["medium", "Medium — 보통"], ["large", "Large — 큰 눈"], ["__custom__", "직접 입력…"]] },
    { key: "eyeTilt", ko: "눈꼬리 각도", label: "Eye tilt", group: "face",
      options: [["", "자동 — 자동 결정"], ["downturned outer corners", "Downturned — 처진 눈꼬리"], ["level outer corners", "Level — 수평"], ["upturned outer corners", "Upturned — 올라간 눈꼬리"], ["__custom__", "직접 입력…"]] },
    { key: "nose", ko: "코", label: "Nose", group: "face",
      options: [["", "자동 — 자동 결정"], ["small delicate nose", "Delicate — 작고 여린 코"], ["balanced nose", "Balanced — 보통"], ["prominent defined nose", "Prominent — 크고 또렷한 코"], ["straight slender bridge", "Straight — 곧고 가는 콧대"], ["aquiline nose with convex bridge", "Aquiline — 콧대가 볼록한 매부리코"], ["rounded soft tip", "Rounded Tip — 코끝이 둥근"], ["broad low bridge", "Broad Low — 콧대가 낮고 넓은"], ["short nose with upturned tip", "Upturned — 짧고 코끝이 들린"], ["long nose with low tip", "Long — 길고 코끝이 내려온"], ["__custom__", "직접 입력…"]] },
    { key: "lips", ko: "입술", label: "Lips", group: "face",
      options: [["", "자동 — 자동 결정"], ["thin lips", "Thin — 얇은 입술"], ["medium lips", "Medium — 보통"], ["full lips", "Full — 도톰한 입술"], ["fuller lower lip", "Fuller Lower — 아랫입술이 더 도톰한"], ["bow-shaped upper lip", "Bow — 윗입술이 활 모양인"], ["straight even lips", "Even — 굴곡 없이 곧은"], ["wide mouth", "Wide — 입이 넓은"], ["small mouth", "Small — 입이 작은"], ["__custom__", "직접 입력…"]] },
    { key: "hairColor", ko: "머리색", label: "Hair color", group: "hair",
      options: [["", "자동 — 무기에 맞춤"], ["white", "White — 흰색"], ["platinum", "Platinum — 백금색"], ["silver", "Silver — 은색"], ["ash blonde", "Ash Blonde — 애시 블론드"], ["blonde", "Blonde — 금발"], ["gold", "Gold — 금색"], ["orange", "Orange — 주황색"], ["red", "Red — 붉은색"], ["crimson", "Crimson — 진홍색"], ["pink", "Pink — 분홍색"], ["purple", "Purple — 보라색"], ["lavender", "Lavender — 연보라"], ["navy", "Navy — 짙은 남색"], ["blue", "Blue — 파란색"], ["teal", "Teal — 청록색"], ["mint", "Mint — 민트색"], ["green", "Green — 녹색"], ["brown", "Brown — 갈색"], ["black", "Black — 검은색"], ["__custom__", "직접 입력… — 원하는 색 직접 작성"]] },
    { key: "hairStyle", ko: "헤어스타일", label: "Hairstyle", group: "hair",
      options: [["", "자동 — 자동 결정"], ["bob", "Bob — 단정한 보브컷"], ["pixie cut", "Pixie Cut — 짧고 가벼운 픽시컷"], ["layered", "Layered — 층을 살린 레이어드"], ["ponytail", "Ponytail — 포니테일"], ["twin tail", "Twin Tail — 트윈테일"], ["wolf cut", "Wolf Cut — 층감이 강한 울프컷"], ["slicked back", "Slicked Back — 뒤로 넘긴 스타일"], ["wavy", "Wavy — 웨이브 헤어"], ["straight", "Straight — 곧은 생머리"], ["side ponytail", "Side Ponytail — 사이드 포니테일"], ["high ponytail", "High Ponytail — 높이 묶은 포니테일"], ["braid", "Single Braid — 한 갈래 땋은 머리"], ["twin braids", "Twin Braids — 양갈래 땋은 머리"], ["crown braid", "Crown Braid — 머리를 둘러 땋은 왕관형"], ["chignon", "Chignon — 단정하게 말아 올린 시뇽"], ["messy bun", "Messy Bun — 흐트러진 번"], ["top knot", "Top Knot — 정수리에 묶어 올린 번"], ["low bun", "Low Bun — 목덜미 낮은 번"], ["half-up", "Half-up — 반묶음"], ["space buns", "Space Buns — 양쪽 동그란 번"], ["hime cut", "Hime Cut — 히메컷"], ["asymmetric cut", "Asymmetric Cut — 좌우 길이가 다른 비대칭컷"], ["undercut", "Undercut — 옆/뒤를 밀어낸 언더컷"], ["side-shaved long hair", "Side-shaved Long — 한쪽만 밀고 나머지는 긴 머리"], ["curly", "Curly — 굵은 곱슬"], ["tight curls", "Tight Curls — 잔곱슬 / 아프로"], ["locs", "Locs — 로크스 / 드레드풍"], ["ringlet curls", "Ringlet Curls — 세로로 말린 드릴 컬"], ["finger waves", "Finger Waves — 레트로 웨이브"], ["feathered", "Feathered — 끝을 가볍게 친 페더컷"], ["blunt cut", "Blunt Cut — 끝을 일자로 자른 컷"], ["wet-look slick", "Wet-look Slick — 젖은 듯 넘긴 스타일"], ["windswept", "Windswept — 바람에 날린 듯한 스타일"], ["buzz cut", "Buzz Cut — 아주 짧게 민 머리"], ["crew cut", "Crew Cut — 짧고 단정한 크루컷"], ["side part", "Side Part — 가르마를 탄 단정한 컷"], ["fade", "Fade — 옆을 그라데이션으로 짧게 친 컷"], ["man bun", "Man Bun — 뒤로 묶어 올린 번"], ["swept back", "Swept Back — 뒤로 넘긴 볼륨 있는 스타일"], ["shaggy", "Shaggy — 덥수룩하게 흐트러진 컷"], ["mullet", "Mullet — 앞은 짧고 뒤만 긴 컷"], ["__custom__", "직접 입력… — 헤어스타일 직접 작성"]] },
    { key: "hairLength", ko: "머리 길이", label: "Hair length", group: "hair",
      options: [["", "자동 — 자동 결정"], ["very short", "Very Short — 매우 짧은 머리"], ["short", "Short — 짧은 머리"], ["medium", "Medium — 중간 길이"], ["long", "Long — 긴 머리"], ["very long", "Very Long — 매우 긴 머리"], ["__custom__", "직접 입력… — 길이 직접 작성"]] },
    { key: "bangs", ko: "앞머리", label: "Bangs", group: "hair",
      options: [["", "자동 — 자동 결정"], ["none", "None — 앞머리 없음"], ["straight bangs", "Straight Bangs — 일자 앞머리"], ["side-swept bangs", "Side-swept Bangs — 옆으로 넘긴 앞머리"], ["curtain bangs", "Curtain Bangs — 커튼뱅"], ["long side bangs", "Long Side Bangs — 긴 사이드뱅"], ["long side bangs covering one eye", "One-eye Cover — 한쪽 눈을 덮는 긴 사이드뱅"], ["asymmetric bangs", "Asymmetric Bangs — 좌우 길이가 다른 앞머리"], ["parted bangs", "Parted Bangs — 가운데를 가른 앞머리"], ["choppy bangs", "Choppy Bangs — 끝을 불규칙하게 친 앞머리"], ["__custom__", "직접 입력…"]] },
    { key: "hairAccent", ko: "머리 삐침 · 잔머리", label: "Hair accent", group: "hair",
      options: [["", "자동 — 지정 안 함"], ["a single antenna strand standing up", "Antenna Strand — 안테나 헤어 한 가닥"], ["two antenna strands standing up", "Twin Antennae — 안테나 헤어 두 가닥"], ["a prominent cowlick", "Cowlick — 크게 뻗친 가마머리"], ["loose stray strands framing the face", "Stray Strands — 얼굴 옆 잔머리"], ["neatly kept, no stray strands", "Neat — 삐침 없이 정돈"], ["__custom__", "직접 입력… — 원하는 형태 직접 작성"]] },
    { key: "hairTexture", ko: "머릿결", label: "Hair texture", group: "hair",
      options: [["", "자동 — 자동 결정"], ["fine", "Fine — 가늘고 매끄러운"], ["medium", "Medium — 보통"], ["thick", "Thick — 굵고 뻣뻣한"], ["__custom__", "직접 입력…"]] },
    { key: "hairVolume", ko: "머리 볼륨", label: "Hair volume", group: "hair",
      options: [["", "자동 — 자동 결정"], ["flat", "Flat — 납작한"], ["moderate", "Moderate — 보통"], ["full", "Full — 풍성한"], ["__custom__", "직접 입력…"]] },
    { key: "parting", ko: "가르마", label: "Parting", group: "hair",
      options: [["", "자동 — 자동 결정"], ["center part", "Center — 가운데 가르마"], ["slight off-center part", "Slight off-center — 살짝 비낀 가르마"], ["deep side part", "Deep side — 깊은 옆 가르마"], ["no visible part", "None — 가르마 없음"], ["swept back", "Swept back — 뒤로 넘긴"], ["__custom__", "직접 입력…"]] },
    { key: "silhouette", ko: "전체 실루엣 성격", label: "Silhouette character", group: "shot",
      options: [["", "자동 — 무기에 맞춤"], ["aerodynamic", "Aerodynamic — 공기역학적이고 날렵함"], ["elegant", "Elegant — 우아하고 유려함"], ["aggressive", "Aggressive — 공격적이고 뾰족함"], ["heavy", "Heavy — 중장갑형의 묵직함"], ["tactical", "Tactical — 실전적이고 전술적"], ["regal", "Regal — 위엄 있고 장식적인 인상"], ["experimental", "Experimental — 실험기다운 이질적 형태"], ["minimal", "Minimal — 간결하고 절제된 형태"], ["__custom__", "직접 입력…"]] },
    { key: "poseCharacter", ko: "포즈 성격", label: "Pose character", group: "shot",
      options: [["", "자동 — 자동 결정"], ["neutral", "Neutral — 정적인 기본 자세"], ["heroic", "Heroic — 영웅적인 자세"], ["confident", "Confident — 자신감 있는 자세"], ["relaxed", "Relaxed — 힘을 뺀 자연스러운 자세"], ["combat-ready", "Combat-ready — 전투 준비 자세"], ["elegant", "Elegant — 우아한 자세"], ["__custom__", "직접 입력…"]] },
    { key: "viewAngle", ko: "시점", label: "View angle", group: "shot",
      options: [["", "자동 — 자동 결정"], ["front", "Front — 정면"], ["front three-quarter", "Front 3/4 — 정면 45도"], ["side", "Side — 측면"], ["rear three-quarter", "Rear 3/4 — 후면 45도"], ["__custom__", "직접 입력…"]] },
    { key: "frame", ko: "프레임", label: "Framing", group: "shot",
      options: [["", "자동 — 장면에 맞게"], ["environmental wide shot with the figure small in a large setting", "환경 중심 와이드"], ["full body with head and feet inside the frame", "전신"], ["three-quarter framing from the knees up", "무릎 위"], ["waist-up framing", "허리 위"], ["chest-up framing", "가슴 위"], ["close face framing", "얼굴 클로즈업"], ["a detail framing on the hands and the weapon", "손·소품 디테일"], ["__custom__", "직접 입력"]] },
    { key: "lens", ko: "렌즈 느낌", label: "Lens", group: "shot",
      options: [["", "자동 — 장면에 맞게"], ["wide 24mm feel with mild perspective stretch", "광각 · 24mm 느낌"], ["35mm documentary feel", "준광각 · 35mm 느낌"], ["natural 50mm feel", "표준 · 50mm 느낌"], ["85mm portrait compression", "준망원 · 85mm 느낌"], ["135mm telephoto compression", "망원 · 135mm 느낌"], ["__custom__", "직접 입력"]] }
  ];

  /* 체형·헤어스타일 견본 그림과 색 팔레트 — 앞 저장소(atelier)가 Pages 에 올려 둔 65장을 그대로 쓴다.
     검사에서는 browser-harness 가 이 주소를 img/figure-previews/ 로 돌린다(atelier/assets/figures 를 복사해 둔다).
     값을 파일 이름으로 바꾸는 규칙: 공백 → '-', body-female-<값>.png · hair-female-<값>.png */
  var FIGURE_BASE = 'https://polos0117.github.io/atelier/assets/figures/';
  var FIGURE_VALUES = { body: ["slender", "athletic", "curvy", "glamorous", "muscular", "heavy-built", "tall and lean", "petite", "hourglass", "voluptuous", "toned", "wiry", "soft-figured", "pear-shaped", "inverted triangle", "stocky", "statuesque"],
    hairStyle: ["bob", "pixie cut", "layered", "ponytail", "twin tail", "wolf cut", "slicked back", "wavy", "straight", "side ponytail", "high ponytail", "braid", "twin braids", "crown braid", "chignon", "messy bun", "top knot", "low bun", "half-up", "space buns", "hime cut", "asymmetric cut", "undercut", "side-shaved long hair", "curly", "tight curls", "locs", "ringlet curls", "finger waves", "feathered", "blunt cut", "wet-look slick", "windswept"] };
  var COLOR_KEYS = { hairColor: 1, eyeColor: 1, eyeColor2: 1 };
  var COLOR_HEX = {"white": "#F2F2F2", "platinum": "#E4E6EA", "silver": "#C8CCD2", "ash blonde": "#C9BBA0", "blonde": "#E3C574", "gold": "#D8A72B", "amber": "#C87E24", "orange": "#D97524", "red": "#C0392B", "crimson": "#8E1B2B", "pink": "#E08AA8", "purple": "#7E5AA8", "lavender": "#B9A6DE", "pale blue": "#9EC7E8", "blue": "#2F6FD0", "navy": "#1E3A6E", "teal": "#1F8A8A", "mint": "#7FD8C0", "green": "#2E9E5B", "brown": "#7A5230", "gray": "#8A8F98", "black": "#14161A"};

  /* 화풍 견본 문장(스타일만 시험할 때) */
  var STYLE_SAMPLE = 'One adult woman standing in a plain studio, full body, holding a plain straight sword, neutral expression, simple grey backdrop.';

  root.AtelierSpec = {
    STYLES: STYLES, DEFAULT_STYLE: DEFAULT_STYLE, RULES: RULES, OUTPUTS: OUTPUTS,
    CORE: CORE, DESIGNS: DESIGNS, EXTRAS: EXTRAS, EMBODIMENT: EMBODIMENT,
    MYTH_FLAVOR: MYTH_FLAVOR, KIND_SILHOUETTE: KIND_SILHOUETTE, ACTIONS: ACTIONS,
    PARAM_GROUPS: PARAM_GROUPS, PARAMS: PARAMS,
    FIGURE_BASE: FIGURE_BASE, FIGURE_VALUES: FIGURE_VALUES, COLOR_KEYS: COLOR_KEYS, COLOR_HEX: COLOR_HEX, STYLE_SAMPLE: STYLE_SAMPLE
  };
})(typeof window !== 'undefined' ? window : globalThis);
