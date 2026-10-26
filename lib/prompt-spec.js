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
  /* 차례가 화면 차례다. 앞의 다섯은 궁니르 열넷을 나란히 놓고 고른 결(2026-09-21) — 얼굴이 반 발짝 실사 쪽. 첫 것이 기준 */
  var STYLES = [
    ['game_keyart', '게임 키아트 2.5D', 'Polished 2.5D game key art with clean linework, controlled anime facial design, layered cel-to-soft shading and crisp costume and weapon detail. Use a vivid, readable silhouette and campaign-quality lighting.'],
    ['cinematic_semi_real', '세미리얼 시네마틱', 'Cinematic semi-real illustration with believable anatomy, painterly skin and hair, solid material volume and controlled film lighting. Keep the face clearly illustrated, the materials distinct and the action readable.'],
    ['glossy_kr_game', '한국형 글로시 게임 일러스트', 'Glossy Korean mobile-game character art with an elegant anime face, smooth dimensional shading, luminous color accents and refined ornament rendering. Keep highlights selective and the figure sharply readable.'],
    ['game_cgi', '게임 시네마틱 CGI', 'High-end stylized game CGI with coherent three-dimensional anatomy, physically convincing costume and weapon construction, clean materials and dramatic production lighting. Preserve a designed character-art finish rather than live-action texture.'],
    ['semi_real_paint', '세미리얼 유화', 'Sophisticated semi-real digital painting with natural anatomy, restrained facial stylization, broad painterly planes and tactile metal, cloth and stone surfaces. Use composed light and visible brush character without losing structural clarity.'],
    ['glossy_promo', '글로시 프로모 키아트', 'Premium glossy anime promotional key art with clean linework, vivid controlled color, dimensional 2.5D shading and dense but organized costume and weapon detail. Match the face and the weapon at the same polished rendering intensity.'],
    ['mecha_cinematic_keyart', '시네마틱 키아트', 'Illustration-first cinematic key art with a clear anime face, saturated campaign color, convincing material volume, strong rim and key light and a crisp readable environment. It reads as authored premium illustration rather than literal CGI.'],
    ['photoreal', '사진풍', 'Photoreal cinematic character photography with plausible anatomy, lens behavior, lighting and material response. The weapon and costume read as physically built props integrated into the photographed scene.'],
    ['anime_illust', '애니 일러스트', 'Detailed modern anime illustration with expressive linework, clear facial features, controlled cel shading and crisp weapon construction. Use dimensional color and lighting while preserving an unmistakably drawn finish.'],
    ['cel_anime', '셀화 애니', 'Clean cel-anime art with decisive outlines, limited stepped shadows, flat controlled color and readable graphic shapes. The weapon stays structurally clear through line and silhouette rather than surface noise.'],
    ['painterly', '회화적 컨셉아트', 'Painterly fantasy character art with expressive brushwork, shaped color masses, atmospheric depth and solid weapon forms. Preserve readable edges at the face, hands and the weapon.'],
    ['retro_anime', '레트로 애니', 'Retro hand-painted anime key art with confident ink lines, simplified weapon shapes, warm cel colors and period-style painted lighting. Keep the composition bold and graphic.'],
    ['ink_wash', '수묵 담채', 'Ink-and-wash character illustration with expressive brush outlines, diluted ink values, restrained translucent color and open paper-like atmosphere. Use selective dark accents to keep the weapon silhouette readable.'],
    ['bright_catalog', '밝은 카탈로그', 'Bright polished catalog illustration with clean neutral lighting, crisp color separation, controlled reflections and highly readable costume and weapon construction. Keep the character vivid against a simple spatial environment.']
  ];
  var DEFAULT_STYLE = 'game_keyart';

  /* 뼈대 — 기본은 이 한 문단이 전부다. 한 줄 프롬프트("엑스칼리버 모티브 여성 메카 의인화, 무기는 들지 마")로
     만든 그림이 긴 지시문보다 좋았다(2026-09-21). "무엇"만 주고 "어떻게"는 모델에게 맡긴다. 설계 언어 둘 중 하나 */
  var CORE = {
    mecha: 'A female mecha personification character with {weapon} as her motif \u2014 the weapon reimagined as an armored woman: plates, joints, binders and glow lines carry its materials, colors, shape and motifs. She does NOT hold, carry or wield the weapon; the weapon is not in her hands and not a separate object. Both hands are ordinary human hands, free and fully visible.',
    cloth: 'A female personification character with {weapon} as her motif \u2014 the weapon reimagined as a woman in cloth, metal ornament and regalia that carry its materials, colors, shape and motifs. She does NOT hold, carry or wield the weapon; the weapon is not in her hands and not a separate object. Both hands are ordinary human hands, free and fully visible.'
  };
  /* 방어구는 원래 입는 것 — "들지도 지니지도 않는다"를 그대로 두면 모델이 투구를 벗기거나 작게 그린다.
     방어구 카드만 이 줄을 카드의 wear(어떻게 입나)에 맞는 줄로 바꾼다. 한 줄에 여러 장비를 적으면 다 그린다
     (투구 카드에 "방패는 등에"를 적었더니 방패를 메고 나왔다) — 그 장비 하나만 적고 다른 장비는 더하지 않게 한다 */
  var HOLD_LINE = 'She does NOT hold, carry or wield the weapon; the weapon is not in her hands and not a separate object.';
  var ARMOR_WORN = 'She WEARS it as her own costume at full scale, never as a separate prop in her hands; add no other gear.';
  var ARMOR_WEAR = {
    helm: 'She WEARS it on her head at full scale as the centerpiece of her design; no shield, no other gear, nothing in her hands.',
    crown: 'She WEARS it on her brow at full scale as the centerpiece of her design; no shield or helm, nothing in her hands.',
    shield: 'It is her shield, strapped flat to her left forearm at full scale, face to the viewer \u2014 never floating beside her or gripped by a handle; no helm unless the look says so.',
    body: 'She WEARS it as her body armor at full scale, the centerpiece of her design; no shield, nothing in her hands.',
    cloak: 'She WEARS it as a cloak or mantle over her at full scale, the centerpiece of her design; no shield, nothing in her hands.',
    belt: 'She WEARS it at her waist at full scale, the centerpiece of her design; no shield, nothing in her hands.',
    gauntlet: 'She WEARS them on both hands and forearms at full scale; the hands inside stay human hands; no shield, nothing held.'
  };
  /* 손 줄 — 방패만 바꾼다. "두 손은 비어 있다" 와 "팔에 찬 방패" 가 같이 있으면 모델이 방패를 팔에서 떼어 옆에 띄운다(스발린, 2026-10-03) */
  var HANDS_LINE = 'Both hands are ordinary human hands, free and fully visible.';
  var ARMOR_HANDS = { shield: 'Both hands are ordinary human hands; the shield hand stays open.' };
  var DESIGNS = [['mecha', '메카 의인화', '판·관절·바인더·발광선. 건담 판의 문법. 기본'], ['cloth', '천·장신구 의인화', '천 옷과 금속 장신구, 예장']];
  var RULES = [
    'ONE FIGURE ONLY. No second character, no creature, no text, no lettering on banners or walls, no logo, no watermark, no speech bubble, no frame border.',
    'ANATOMY: natural adult proportions, both hands drawn correctly as hands. No body-part enlargement, no extra limbs, no limb replaced by a weapon or a blade.'
  ];

  /* 선택 문단 — 기본은 꺼져 있다. 켜면 그 문단이 붙는다. 앞 생성기의 parameter 처럼 */
  var EXTRAS = [
    ['embodiment', '재질 옮기기 지시', '무기의 재질·색·형태·문양을 어디로 옮길지 일일이 말한다. 켜면 더 문자 그대로 나온다'],
    ['silhouette', '종류별 실루엣', '검은 곧게, 창은 세로 한 줄, 둔기는 덩어리, 활은 곡선, 방어구는 입은 갑주 그 자체, 이형은 그 물건 형태'],
    ['myth', '신화권 옷·재질 언어', '북유럽 모피·룬, 그리스 청동·월계, 한국 단청·노리개, 중국 비단·옥, 일본 오비·금줄, 인도 금·연꽃, 이집트 아마포·청금석, 서아시아 양털 술·유약 벽돌, 아메리카 깃털·비취·흑요석, 기사 판금·문장']
  ];
  var EMBODIMENT = 'EMBODIMENT: the weapon\u2019s materials, its two colors, its shape and its motifs (see WEAPON LOOK) are carried by her body, hair, ornaments and armor \u2014 blade steel becomes plate and jewelry, haft wood becomes leather and braid, its glow becomes her eyes and hair tips, its engraving becomes her patterns. The weapon\u2019s form may float behind her as a back unit or be worn as regalia on the crown, shoulders or hem, never in or as a hand.';

  /* 무기 종류별 실루엣 — 선택 문단. 자리를 못 박는다(팔이 창이 되지 않게) */
  var KIND_SILHOUETTE = {
    sword: 'SILHOUETTE: sword \u2014 sharp, straight and vertical; narrow shoulders-to-hips line, pointed hems and hair ends, edges on the crown, shoulders and skirt plates, nothing rounded.',
    spear: 'SILHOUETTE: spear \u2014 tall and long-limbed, everything reads as one vertical line; narrow upward-pointing ornaments on the crown, shoulders and hem, a long straight fall of hair or cloth.',
    blunt: 'SILHOUETTE: blunt weapon \u2014 weight and mass; broad shoulders or heavy sleeves, dense rounded plates at shoulders and hips, a grounded stance, thick braids.',
    bow: 'SILHOUETTE: bow \u2014 tension and curve; a lean drawn-bowstring posture, arcs in hair, sash and hem, a string-like line running through the design, quiver or arrows worn on the back.',
    armor: 'SILHOUETTE: armor \u2014 the armor itself is what she wears at full scale, not a prop; a solid protective mass at chest, shoulders and forearms, a broad guarding stance, its own motif repeated as pauldron, gorget or crest.',
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
    cursed: {
      name: '저주',
      note: '저주가 발현됐을 때 뜨는 그림. 액션 그림을 첨부하고 같은 구도에서 전승의 어두운 면이 드러난다.',
      text: 'OUTPUT: the CURSED state of the attached action image \u2014 not her power opened, but the weapon\u2019s own legend turned against her: its price, its obsession, its tragedy. Keep the attached image\u2019s camera, pose, framing, subject scale, face, hair and the base armor exactly; the silver plates stay silver. Change only this: her rune and glow lines are corrupted from their clean color to a sick red-violet that flickers, the engravings crack and bleed light along the seams, any feathers, cloth or halo elements split, fray or break, her eyes take the same corrupted light and her expression hardens or empties. The pair must read as the same picture before and after the curse takes hold.',
      file: '{name}_{style}_f_cursed.webp'
    },
    casual: {
      name: '일상컷',
      note: '같은 사람의 평상시. 무기는 작은 장신구나 소품으로만.',
      text: 'OUTPUT: one standalone off-duty scene of the same woman as the attached image. Modern or myth-flavored everyday clothing chosen for the scene; her weapon nature shows only as a small accessory, a motif on the clothing or a color echo, never as a battle prop and never as armor. The scene, outfit, pose and camera follow the casual scene settings below.',
      file: '{name}_{style}_f_casual{n}.webp'
    },
    skin: {
      name: '스킨',
      note: '정식 모습 위에 입히는 치장. 기본은 액션 그림을 첨부해 장갑과 색만 스킨 쪽으로, 각성·저주는 그 스킨 기본을 첨부해 만든다(선택 — 없으면 게임이 효과로 덮는다).',
      text: 'OUTPUT: a SKIN of the attached action image \u2014 an alternate costume for the same woman, like a cosmetic variant in a game. Keep the attached image\u2019s camera, pose, framing, subject scale, face, body and hairstyle exactly. Replace her armor materials, palette and motifs with the SKIN LOOK above, keeping the same armor layout and silhouette logic, so the pair reads as the same character in a different outfit. Hands stay human hands and hold nothing. No text, logos, emblems or names.',
      file: '{name}_{style}_f_skin_{skin}.webp'
    }
  };

  /* 신화권의 옷·재질·장식 언어 */
  var MYTH_FLAVOR = {
    norse: 'Norse language: fur trim, braided leather, wolf and raven motifs, cold iron and knotwork silver, runic engraving, muted snow and steel palette with one cold accent.',
    greek: 'Greek language: draped chiton or pleated tunic, bronze and gold fittings, laurel and meander patterns, marble whites and Aegean blues with warm bronze accents.',
    korea: 'Korean language: hanbok-like layered silhouettes with a short fitted jacket and high-waisted skirt lines, norigae tassels and hairpins, dancheong patterns, cloud and crane motifs, five-colour accents of blue, red, yellow, white and black on muted silk.',
    china: 'Chinese language: layered silk robes with structured collars and wide sleeves, lacquer and jade, cloud and dragon motifs, embroidered sashes, restrained vermilion, ink black and gold.',
    japan: 'Japanese language: wrapped kimono-like collars and wide obi sashes, lacquered lamellar plates, shrine rope and paper streamers, wave, crane and cherry-blossom motifs, indigo, vermilion and white.',
    india: 'Indian language: draped and pleated silks, heavy gold jewelry, marigold and lotus motifs, henna-like linework, bindi or forehead ornament, saffron, indigo and gold.',
    egypt: 'Egyptian language: pleated white linen and sheer kalasiris layers, broad beaded collars, gold and lapis striped nemes-like headcloths, winged sun discs, lotus and papyrus motifs, kohl-lined eyes, gold, lapis blue, turquoise and carnelian.',
    westasia: 'West Asian language: layered wool fleeces and fringed shawls of Mesopotamia, glazed lapis and gold rosettes, winged lion and bull motifs, ziggurat steps, Persian brocade with simurgh feathers, lapis blue, carnelian red and gold.',
    celtic: 'Celtic language: woven wool and tartan-like weaves, torcs and penannular brooches, triple spirals, knotwork and ogham lines, bronze, silver and river-stone greens with a single bright enamel accent.',
    america: 'Mesoamerican and Andean language: quetzal and macaw feather mantles, jade and turquoise mosaic, obsidian and hammered gold, woven cotton with stepped fret and zigzag borders, jaguar pelt accents, feathered serpent and sun-face motifs, jade green, turquoise, obsidian black and Inca gold.',
    knight: 'Knightly language: polished plate and mail under a heraldic surcoat, a flowing cloak, gilded pauldrons and gauntlet trims, heraldic lions and fleur-de-lis, Gothic tracery and tournament pennons, steel silver, royal blue, crimson and gold.'
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
    armor: [
      ['bulwark', '막아서기 — 앞을 가림', 'Planted squarely between the viewer and something behind her, shield-face or armored forearm raised, feet wide, calm unbroken gaze over the guard.'],
      ['brace', '버티기 — 충격을 받음', 'The beat of absorbing a blow: sparks or dust breaking against her armor, heels dug in, body leaning into the impact without giving ground.'],
      ['bash', '밀쳐내기 — 방패로 침', 'Driving forward shoulder-first behind her armored guard, the plates of her design leading the motion, hair and cloth swept back.'],
      ['vigil', '지킴 — 서서 버팀', 'Standing watch at rest, armor worn openly and whole, one hand on the rim or crest of her armor-self, steady eyes toward the camera.']
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
    { key: "ethnicity", ko: "얼굴 계통", label: "Facial ethnicity", group: "base", auto: {"norse": "Nordic", "greek": "Mediterranean", "korea": "Korean", "china": "Chinese", "japan": "Japanese", "india": "South Asian", "egypt": "North African and Egyptian", "westasia": "Middle Eastern", "celtic": "Irish and Celtic British", "america": "Indigenous Latin American", "knight": "Western European"},
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

  /* ── 일상컷 — 앞 생성기(pkm-atelier)의 갈래·예시·자세·방향·강도 축을 가져왔다.
     포켓몬 세계 갈래(파트너 돌봄·열매·콘테스트·포켓몬 직업)는 빼고, 신화 유적 나들이·무기 모티브 에디토리얼·
     현대 직업컷을 새로 썼다. 일상컷은 액션 그림을 첨부해 같은 사람으로 만든다 — 외형 표는 안 쓴다.
     갈래: [key, 한국어, 영어 지시, sex('f' 면 여성 전용)]. 예시: [key, 한국어, 영어 문장, tier(basic·popular·special)] */
  /* 무예 수련·세시 제례 — 무기 종류·신화 지역에 맞춘 한 줄(2026-10-26) */
  var CASUAL_PRACTICE = {
    sword: "a wooden or bamboo practice sword, never a sharpened blade",
    spear: "a long wooden practice staff with a padded tip",
    blunt: "a padded practice club or a weighted wooden training baton",
    bow: "a plain practice bow with blunt target arrows",
    armor: "a padded training shield and soft arm guards",
    relic: "a soft, blunt practice version of her weapon's general shape, or a fan or ribbon for a flowing form"
  };
  var CASUAL_RITES = {
    norse: "a Midsummer bonfire, Yule candles and evergreen boughs, or a winter-solstice feast table",
    greek: "a harvest offering of olives, grapes and bread, or a candlelit spring procession",
    korea: "a Seollal ancestral table, Chuseok songpyeon on pine needles, or the first full-moon bonfire",
    china: "Lunar New Year dumplings and red lanterns, the Mid-Autumn mooncake table, or Qingming offerings",
    japan: "Obon lanterns and floating lights, a New Year shrine visit, or a Tanabata bamboo branch with paper strips",
    india: "Diwali clay lamps and rangoli patterns, or Holi colour powder in the morning",
    egypt: "a Sham el-Nessim spring picnic, or a Nile-side lantern evening",
    westasia: "a Nowruz table with sprouted greens, painted eggs and a mirror, or a Yalda night with pomegranates",
    celtic: "a Samhain bonfire and carved turnip lanterns, or Beltane flowers on a hawthorn branch",
    america: "a Day of the Dead ofrenda with marigolds and candles, or a harvest-moon gathering",
    knight: "a May Day garland and village fair, Candlemas candles, or a Twelfth Night feast"
  };
  var CASUAL_CATS = [
    ["auto_random", "자동 / 랜덤", "", ""],
    ["everyday_basic", "일상컷 — 기본", "Create candid ordinary personal-life moments in a modern city. The scene should feel lived-in, believable and visually specific rather than staged. Use normal contemporary clothing with clear character personality. Avoid glamour-shoot posing, professional work and costume styling.", ""],
    ["everyday_sensual", "일상컷 — 섹시", "Create a sensual but non-explicit everyday lifestyle moment with the same clearly adult character. The situation must read as believable ordinary life, so specify the room, the clothing and a concrete action already in progress rather than a posed shoot. Use natural household or street lighting and eye-level framing; fabric drape, movement and light carry the mood. Avoid turning the scene into a lingerie catalogue or a deliberate glamour shoot.", ""],
    ["occupation_basic", "직업컷 — 기본", "Show one believable working moment in a modern occupation. Make the profession readable through a concrete task, practical clothing and relevant tools. Preserve the approved woman; invent her own workwear instead of a stock uniform. No real institutional insignia.", ""],
    ["occupation_sensual", "직업컷 — 섹시", "Show one believable working moment in a modern occupation. Make the profession readable through a concrete task, practical clothing and relevant tools. Use glamorous tailoring and confident professional presence while keeping the outfit credible for the task. No real institutional insignia.", ""],
    ["adult_roleplay", "성인 역할극 / 직업풍 이벤트 패션", "Create playful adult event fashion inspired by occupation or roleplay motifs. It must read as a costume made for a stage presentation or themed event, not as an authentic workplace uniform. Use original colours and decorative details — no real institutional insignia, no weapons, no tactical gear. Describe the costume by its tailoring, trim and props, and show a believable styling or preparation action.", "f"],
    ["heritage_visit", "신화 유적 나들이", "Show a quiet modern-day visit to a place tied to her own legend: a museum hall where \"her\" weapon is displayed, a temple, a ruin, a shrine, a saga library or a mountain pass from the myth. Ordinary travel clothing; the weapon appears only behind glass, as a statue or as a relief, never in her hands. Let a small knowing gesture or gaze connect her to the exhibit.", ""],
    ["forge_workshop", "대장간·공방", "Show one moment in a modern workshop where things like her weapon are made or cared for: a blade-polishing studio, a smithing class, a silversmith's bench, a kiln-side pottery studio, a conservation lab. Practical work clothing with a leather apron, rolled sleeves or safety glasses; the task is readable through real tools and materials. Never a finished weapon in her hands, only raw stock, blanks, small pieces and tools.", ""],
    ["martial_practice", "무예 수련", "Show a calm off-duty practice of the martial discipline that matches her weapon kind (see CHARACTER and PRACTICE TOOL), in practice wear at a dojo, a range, a fencing salle, a riverside or a park at dawn. Use only practice equipment, padded, wooden or blunt, never her legendary weapon or a real blade, and show one clear form, stance or drill rather than a fight. No opponent; at most a few blurred fellow students far in the background.", ""],
    ["seasonal_rite", "세시·제례", "Show her taking part, as a modern woman, in a seasonal festival or household rite from her own myth region (see CHARACTER and RITES OF HER REGION): preparing offerings, lighting lamps or a bonfire, setting a lantern afloat, decorating an altar. The rite's own activity is the focus; clothing may be everyday or festive, with traditional garments only as they are really worn for that rite. Respectful and quiet, never a caricature of the culture.", ""],
    ["travel", "여행·나들이", "Show travel or peaceful exploration with useful travel clothing and a specific activity: a station, a trail, a lakeside, a coast, a lookout, a camp. Let the environment support the woman without overwhelming her.", ""],
    ["festival", "축제·밤 나들이", "Show one moment at a modern festival, night market or seasonal event, with an identifiable activity and event props. Preserve the approved identity and let the scene determine clothing and mood.", ""],
    ["hobbies_leisure", "취미·느긋한 휴식", "Show a personal hobby or restful leisure moment with a specific action and relevant objects: reading, drawing, crafts, music, photography, plants. A weapon motif may appear naturally in the activity, never as an actual weapon.", ""],
    ["swimwear", "수영복 라이프스타일", "This single scene is swimwear-focused. Use modern swimwear that is fully lined and stays secure during movement, described by its construction — neckline, straps, panels, leg line, fabric. Prioritize a memorable swimwear scene with real action and water context over static posing. Keep the setting a public or resort one: poolside, shoreline, deck or open water.", "f"],
    ["active", "액티브 / 무브먼트 패션", "Show real movement with fashion-forward activewear or movement-oriented clothing. Avoid generic gym snapshots. Prioritize dynamic motion, readable silhouette, waist and hip lines, fabric movement and varied action.", ""],
    ["motif_editorial", "무기 모티브 에디토리얼", "Reinterpret her weapon as human editorial fashion: translate its two colors, its shape, its materials and its motifs (see WEAPON LOOK) into couture or themed fashion. Cloth, jewelry and tailoring only — no armor, no mechanical body, no weapon held.", ""],
    ["homewear", "패션 홈웨어 / 라운지 라이프", "Create designed, fashion-forward homewear or lounge-life scenes. Avoid plain pajamas and bland static sofa poses. Use believable home-life actions, stylish home fashion silhouettes and a sensual but natural private-life atmosphere.", "f"],
    ["private_evening", "프라이빗 이브닝 패션", "Create mature private evening fashion scenes with intimate but non-explicit atmosphere. Use elegant, attractive, clearly adult styling, confident body language and believable private-life context.", "f"],
    ["lingerie", "란제리풍 패션", "Use tasteful adult lingerie-inspired evening fashion with full intimate coverage. Describe the garment by its construction — cut, fabric, trim, straps, closures, layers — rather than by mood words. The garments are securely fitted and fully opaque, and the look is suitable for a mainstream evening-fashion editorial. Build the image through framing, silhouette, posture and lighting rather than exposure.", "f"],
    ["traditional", "전통 의상 / 헤리티지 패션", "This cut is built around traditional dress drawn from the character’s own heritage (her myth region unless the identity says otherwise). Use either authentic formal traditional clothing or a modernised everyday interpretation of it, as specified by the example. Keep the garment structure, layering logic, fastening and silhouette faithful to that tradition rather than costume-shop pastiche. Colours may follow the weapon, but the construction must remain true to the tradition. Place the character in a setting where such clothing is plausibly worn.", ""],
    ["retro_glamour", "레트로 글래머", "Build the cut around one past decade's glamour fashion, as the example names it — its silhouette, fabrics, hair-styling cues and set dressing — worn by the same adult woman in a believable scene with a concrete action. Real construction details carry the era (bias cut, dropped waist, high waist, structured bra, wiggle skirt, lurex, leg warmers), not costume-shop pastiche. Use the bold, flattering exposure that era itself would show — high-waisted swimsuits, playsuits, slips, mini dresses — in fully opaque, secure garments; keep her own haircut and colours.", "f"],
    ["subculture_fashion", "서브컬처 패션", "Dress her in one real street subculture as the example names it — goth, punk, rock, gyaru, Harajuku, cybergoth, grunge and so on — with its true silhouettes, materials and accessories (leather, lace, plaid, studs, chains, corset belts, platform boots, layered jewelry), and place her where that scene actually lives: a live house, a record store, a back alley, a street crossing, a club queue. Confident styling with bold exposure through cut, never through see-through fabric; original designs only, no band names, logos or lettering; keep her own haircut and colours.", "f"],
    ["nightlife", "나이트라이프", "Show one moment of public nightlife — a club dance floor, a DJ booth, a neon bar, a karaoke room, a rooftop party, a jazz bar. Bold night-out fashion such as bodycon, sequins, cut-outs, backless or mini dresses, with a specific action already in progress. Other guests stay soft, out-of-focus shapes in the background; coloured club light, haze and reflections carry the mood.", "f"],
    ["dance_stage", "댄스 무대", "Show her dancing — one clear, readable move from a named dance style (tango, salsa, flamenco, belly dance, ballet, jazz, hula, cabaret, K-pop choreography) on a stage, in a studio or at a social dance hall. A dance costume or dancewear built for movement — backless dresses, high slits, fitted bodices, flaring skirts — with fabric motion that follows the step. She dances solo; any partner or troupe is only implied or far in the soft background.", "f"],
    ["spa_wellness", "스파·온천·사우나", "Show a moment of rest at a spa, hot spring, sauna or bathhouse: an open-air bath edge, a cedar tub, a robe lounge, a hammam, a cold plunge. She wears swimwear, a secure towel wrap, a plush robe or bathhouse loungewear that stays fully covering at chest and hips; steam, wood, stone and water light carry the scene. Calm, unhurried posture; no shower scenes.", "f"],
    ["fantasy_costume", "판타지 코스튬", "Show her in an original fantasy costume made for a costume party, a cosplay event or a themed photoshoot — elf, fairy, angel and devil, sorceress, forest spirit, star goddess, vampire. Costume details are fabric, craft and props (wing props, pointed ear tips, staffs, capes), never armor, real weapons or creature anatomy; no existing franchise characters. Show a believable styling, posing or event moment.", "f"],
    ["bridal", "웨딩·브라이덜", "Show one moment of her own bridal day or bridal styling: a gown fitting, waiting before the ceremony, walking a garden aisle, a solo bridal photoshoot, the reception dress, the honeymoon suite. Wedding gowns, veils and reception dresses with bold, elegant cuts (open backs, sweetheart necklines, slits) in secure, opaque fabric. She is alone in the frame; any groom or guests are only implied.", "f"],
    ["gala_red_carpet", "레드카펫·갈라", "Show a public gala or red-carpet moment: arriving on a red carpet, posing at a photo wall, a film-festival staircase, an award ceremony, a gala dinner, a charity auction, a fashion-week front row. A show-stopping evening gown or couture look — high slits, open backs, plunging or one-shoulder necklines, trains — with event lights and flashes. Photographers and guests stay blurred in the background; no real event names or logos.", "f"],
    ["wildcard", "와일드카드", "Invent one fresh adult lifestyle scene. It should remain stylish, sensual, cinematic and non-explicit with a coherent specific activity.", ""],
    ["__custom__", "직접 입력", "", ""]
  ];
  var CASUAL_EXAMPLES = {
    "everyday_basic": [
        ["", "자동", "", "basic"],
        ["commute_train", "지하철 / 기차 통근", "Train / Subway Commute", "basic"],
        ["grocery_run", "장보기", "Grocery Run", "basic"],
        ["simple_cooking", "간단한 요리", "Simple Cooking", "basic"],
        ["cafe_takeout", "커피 / 테이크아웃", "Coffee / Takeout Run", "popular"],
        ["laundry", "세탁 / 빨래 개기", "Laundry / Folding Clothes", "popular"],
        ["rain_walk", "비 오는 날 걷기", "Rainy Day Walk", "popular"],
        ["station_wait", "역에서 기다리기", "Waiting at Station", "popular"],
        ["bookstore", "서점 구경", "Bookstore Browsing", "popular"],
        ["parcel_pickup", "택배 / 편의점 픽업", "Parcel / Convenience-store Pickup", "popular"],
        ["midnight_laundromat", "심야 코인세탁방", "Midnight Laundromat", "special"],
        ["greenhouse", "온실 / 식물가게", "Greenhouse / Plant Shop", "special"],
        ["pottery_class", "도예 / 공예 클래스", "Pottery / Craft Class", "special"],
        ["record_store", "레코드숍", "Vinyl Record Store", "special"],
        ["hardware_store", "철물 / 홈센터", "Hardware / Home-improvement Store", "special"],
        ["festival_daily", "지역 축제날", "Local Festival Day", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "everyday_sensual": [
        ["", "자동", "", "basic"],
        ["morning_stretch", "아침 스트레칭", "stretching her shoulders beside a sunlit window just after opening the curtains", "basic"],
        ["window_light", "창가 자연광 캐주얼 순간", "standing in casual clothes in the light of a large window, one hand on the frame", "basic"],
        ["late_snack", "늦은 밤 간식 / 음료", "eating a late-night snack at the kitchen counter in loungewear", "popular"],
        ["high_shelf", "높은 선반 손 뻗기", "reaching for a storage box on a high kitchen shelf, shown from an eye-level three-quarter view", "popular"],
        ["hair_tie", "샤워 후 머리 묶기", "tying her hair up after a shower, wearing a soft robe in a bright bathroom", "popular"],
        ["laundry_soft", "소프트 패션 리빌 세탁 장면", "folding laundry at home in soft loungewear, a cardigan slipping loosely off one shoulder", "popular"],
        ["sunroom_relax", "선룸 휴식", "curled on a sunroom sofa in soft knitwear with a blanket and a book", "popular"],
        ["balcony_plants", "발코니 식물 물주기", "watering balcony plants in a fitted knit dress, morning light across the railing", "popular"],
        ["rainy_return", "비 맞고 귀가한 순간", "coming in from the rain and slipping off a damp raincoat in the entryway, hair slightly wet", "special"],
        ["floor_organizing", "바닥에 앉아 옷장 정리", "kneeling on the floor to sort folded clothes into a low drawer", "special"],
        ["after_work_change", "퇴근 후 겉옷 정리", "hanging up a work jacket and changing into home wear just after getting in", "special"],
        ["fridge_light", "냉장고 불빛 늦은 밤 순간", "standing at the open refrigerator late at night, lit only by its interior light", "special"],
        ["shoe_bench", "신발 신으려 앉은 순간", "sitting on the entryway bench to tie her shoes before going out", "popular"],
        ["mirror_selfie", "전신거울 앞 옷매무새", "checking her outfit in a full-length mirror, phone raised", "popular"],
        ["window_rain", "창밖 비 구경", "watching rain run down the window from an armchair, mug in hand", "popular"],
        ["stair_landing", "계단 참에서 잠깐 멈춤", "pausing on a stair landing with one hand on the railing", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "adult_roleplay": [
        ["", "자동", "", "basic"],
        ["event_staff", "성인 이벤트 스태프 코스튬", "an event staff costume with a fitted vest, name-tag ribbon, and lanyard, at a themed venue", "basic"],
        ["uniform_inspired", "스타일화된 유니폼풍 룩", "a stylized uniform-inspired costume with crisp lapels and decorative epaulettes, no real insignia", "basic"],
        ["adult_police", "성인 경찰 코스튬", "a fictional police-inspired costume at a theatrical costume event, using original decorative badges rather than real insignia", "popular"],
        ["adult_nurse", "성인 간호사 코스튬", "a fictional retro nurse-inspired costume at a theatrical costume event, using original decorative symbols rather than authentic hospital identification", "popular"],
        ["adult_maid", "성인 메이드 코스튬", "a black-and-white maid costume with a structured bodice, puffed sleeves, and a full apron, at a costume event", "popular"],
        ["adult_secretary", "성인 비서 코스튬", "a retro secretary-inspired costume with a fitted blazer, pencil skirt, and decorative eyewear, at a themed office party", "popular"],
        ["bunny", "바니 코스튬", "a retro casino bunny costume with a fitted one-piece garment, cuffs, bow-tie collar, and rabbit-ear headband, on a stage floor", "popular"],
        ["flight_attendant", "승무원풍 코스튬", "a retro flight-attendant-inspired costume with a fitted jacket, scarf, and original airline-style trim, at a themed event", "popular"],
        ["casino_dealer", "카지노 딜러 / 호스티스 스타일", "a casino dealer costume with a fitted waistcoat, bow tie, and cuffs, at a card table", "popular"],
        ["lab_roleplay", "연구실 역할극 패션", "a laboratory-themed costume with a crisp white coat over a fitted dress, using original decorative badges", "special"],
        ["ceremonial_instructor", "세리머니얼 인스트럭터 스타일", "a ceremonial instructor costume with a belted jacket, gloves, and a decorative sash", "special"],
        ["retro_racer", "레트로 레이싱 코스튬", "a retro racing grid costume with a cropped team jacket, shorts, and boots, beside a track barrier", "special"],
        ["vinyl_stage", "비닐 스테이지 패션", "a vinyl stage costume with a glossy fitted jacket and boots under stage lighting", "special"],
        ["masquerade", "마스커레이드 코스튬 패션", "a masquerade costume with a feathered eye mask, a structured bodice, and a full skirt", "special"],
        ["adult_teacher", "성인 교사 코스튬", "a teacher-inspired costume look with a fitted blazer, pleated skirt, reading glasses, and books", "popular"],
        ["adult_librarian", "성인 사서 스타일", "a librarian-inspired costume with a fitted cardigan, pencil skirt, and glasses, among bookshelves", "popular"],
        ["cheer_costume", "치어 코스튬", "a varsity cheer costume with a pleated skirt, striped fitted top, and team-colour panels, on a gym floor", "popular"],
        ["cabin_crew_retro", "레트로 객실승무원", "a retro cabin crew costume with a fitted jacket, pillbox hat, and neck scarf", "special"],
        ["circus_ringmaster", "서커스 링마스터 패션", "a circus ringmaster costume with a tailcoat, high boots, and a top hat, under a tent canopy", "special"],
        ["witch_party", "핼러윈 마녀 코스튬", "a Halloween witch party costume — a tall pointed hat, a lace-up bodice short dress and striped stockings; holding a pumpkin lantern at a costume party", "popular"],
        ["majorette", "마칭 마조렛 코스튬", "a marching majorette costume — a plumed shako hat, a braided short jacket without real insignia, a pleated mini skirt and white boots; twirling a baton at a parade", "popular"],
        ["sailor_stage", "세일러 무대 의상", "a sailor stage costume — a sailor-collar cropped top, a pleated mini skirt and a small cap; saluting playfully on a harbour-set stage (no real navy insignia)", "basic"],
        ["lifeguard_event", "라이프가드 이벤트 코스튬", "a lifeguard event costume — a red one-piece-style costume with a whistle on a cord and a rescue buoy prop; posing beside a prop lifeguard tower", "basic"],
        ["cat_cafe", "고양이 카페 이벤트 의상", "a cat cafe event costume — a cat-ear headband, a bow choker and a frilled apron dress; serving a latte at a themed cafe", "basic"],
        ["santa_party", "크리스마스 파티 코스튬", "a Christmas party costume — a fur-trimmed red velvet mini dress, a Santa hat and boots; hanging an ornament on a tree at a party", "popular"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "swimwear": [
        ["", "자동", "", "basic"],
        ["classic_bikini", "클래식 비키니", "a navy high-waisted bikini with a supportive halter top", "basic"],
        ["sport_onepiece", "스포티 원피스", "a sporty one-piece swimsuit with a racerback and a high neckline in solid performance fabric", "basic"],
        ["highleg_onepiece", "하이레그 원피스", "a high-leg one-piece swimsuit with a high neckline and supportive racerback", "popular"],
        ["monokini", "모노키니", "a sculptural monokini with asymmetric side cut-outs joined by a solid central panel", "popular"],
        ["triangle_bikini", "트라이앵글 비키니", "a triangle bikini with slider cups and tie-side bottoms", "popular"],
        ["bandeau_bikini", "반두 비키니", "a bandeau bikini with a straight strapless top and matching bottoms", "popular"],
        ["halter_bikini", "홀터 비키니", "a halter bikini with a neck tie and a supportive underbust band", "popular"],
        ["asymmetric_swim", "비대칭 원숄더 수영복", "an asymmetric one-shoulder swimsuit with a single wide strap and a clean diagonal neckline", "popular"],
        ["crossstrap_swim", "크로스 스트랩 수영복", "a swimsuit with crossed back straps and a scooped front neckline", "popular"],
        ["moonlit_pool", "달빛 야외풀", "in swimwear at an outdoor pool at night, lit by underwater lamps and moonlight", "special"],
        ["rooftop_infinity_pool", "루프탑 인피니티 풀", "in swimwear at a rooftop infinity pool with the city skyline behind her", "special"],
        ["outdoor_shower", "야외 샤워 / 린스오프", "rinsing off at an open-air poolside shower after swimming, still in swimwear", "special"],
        ["cabana_daybed", "리조트 카바나 / 데이베드", "seated at a resort cabana daybed in swimwear with an open cover-up, a book and a cold drink beside her", "special"],
        ["thermal_spa", "모던 온천 / 스파 풀", "in swimwear at a modern thermal spa pool, steam rising off the water", "special"],
        ["shoreline_walk", "젖은 해변 산책", "walking along a wet shoreline in swimwear, wet sand and shallow surf underfoot", "special"],
        ["boyshort_swim", "보이쇼트 수영복", "a boyshort swimsuit set with a fitted top and short square-cut bottoms", "popular"],
        ["rashguard_set", "래시가드 세트", "a long-sleeve rashguard with a zip front over matching swim bottoms", "popular"],
        ["wrap_swim", "랩 프론트 수영복", "a wrap-front swimsuit with a crossed bodice and a tie at the waist", "popular"],
        ["swim_coverup", "수영복 + 커버업", "swimwear worn under an open gauzy cover-up, tied loosely at the hip", "popular"],
        ["poolside_bar", "풀사이드 바", "in swimwear at a poolside bar, a cold drink on the counter", "special"],
        ["river_dock", "강가 데크 / 호수 선착장", "in swimwear on a wooden river dock, feet over the edge above the water", "special"],
        ["burkini_modest", "부르키니 · 전신형", "a modest full-cover swimsuit with long sleeves, full-length legs, and a fitted hood", "popular"],
        ["sarong_wrap", "사롱을 두른 수영복", "swimwear with a printed sarong knotted at the hip", "popular"],
        ["yukata_poolside", "수영복 위 유카타", "swimwear with a light yukata worn open over it, poolside", "popular"],
        ["heritage_pattern_swim", "전통 문양 수영복", "a swimsuit in a heritage textile pattern with matching trim", "special"],
        ["onsen_after", "온천 후", "at an outdoor hot-spring bathing area after a soak, wrapped in a towel, steam and a stone basin around her", "special"],
        ["hanbok_coverup", "한복 선을 딴 커버업", "swimwear under a hanbok-line cover-up with a high waist and wide flowing skirt", "special"],
        ["cutout_onepiece", "컷아웃 원피스", "a fully lined one-piece swimsuit with large cut-outs at the sides of the waist", "popular"],
        ["plunge_onepiece", "딥 플런지 원피스", "a one-piece swimsuit with a deep plunging V neckline and a secure wide band at the waist", "popular"],
        ["oring_bikini", "링 장식 비키니", "a bikini whose top and bottom are joined at the centre and hips by polished metal rings", "special"],
        ["crochet_bikini", "크로셰 비키니", "a fully lined crochet-knit bikini in a sunny resort colour", "special"],
        ["yacht_deck", "요트 갑판", "sunbathing in a bikini on the cushioned foredeck of a moored yacht, leaning back on her hands", "special"],
        ["waterfall_pool", "폭포 웅덩이", "standing waist-deep in a rocky waterfall pool in a swimsuit, pushing wet hair back with both hands", "special"],
        ["beach_volley", "비치발리볼", "playing beach volleyball in a sporty bikini, crouching low to receive the ball on hot sand", "popular"],
        ["paddle_board", "패들보드", "standing on a paddleboard in a swimsuit on a calm bay, the paddle mid-stroke", "popular"],
        ["pool_float", "튜브 위 휴식", "lounging on a large inflatable ring in a swimsuit in a sunny pool, a drink in one hand", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "active": [
        ["", "자동", "", "basic"],
        ["warmup", "워밍업 / 쿨다운", "Warm-up / Cool-down", "basic"],
        ["stretch", "모빌리티 스트레칭", "Mobility Stretch Session", "basic"],
        ["dance_transition", "댄스 연습 중 전환 동작", "Dance Practice Transition", "popular"],
        ["pilates", "필라테스 / 코어 세션", "Pilates / Core Session", "popular"],
        ["tennis_active", "테니스풍 액티브 패션", "Tennis-inspired Active Fashion", "popular"],
        ["basketball_jersey", "루즈 농구저지 패션", "Loose Basketball Jersey Fashion", "popular"],
        ["boxing_fitness", "복싱 피트니스 스타일", "Boxing Fitness Styling", "popular"],
        ["running_recovery", "러닝 후 리커버리", "Post-run Recovery", "popular"],
        ["parkour_stairs", "계단 / 파쿠르 전환 동작", "Stair / Parkour Transition", "special"],
        ["roller_skating", "롤러스케이트 패션", "Roller-skating Fashion", "special"],
        ["fencing_motion", "펜싱풍 무브먼트 패션", "Fencing-inspired Movement Fashion", "special"],
        ["climbing_warmup", "클라이밍 워밍업", "Climbing Warm-up", "special"],
        ["surf_prep", "서핑 준비 장면", "Surf Preparation", "special"],
        ["yoga_flow", "요가 플로우", "Yoga Flow", "popular"],
        ["cycling_kit", "사이클링 복장", "Cycling Kit", "popular"],
        ["track_sprint", "트랙 스타트 자세", "Track Sprint Start", "popular"],
        ["archery_draw", "활 당기는 순간", "Archery Draw", "special"],
        ["aerial_silk", "에어리얼 실크 연습", "Aerial Silk Practice", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "homewear": [
        ["", "자동", "", "basic"],
        ["soft_tank_shorts", "소프트 탱크탑 + 쇼츠", "Soft Tank Top + Shorts", "basic"],
        ["satin_lounge", "새틴 라운지 세트", "Satin Lounge Set", "basic"],
        ["offshoulder_knit", "오프숄더 니트 홈웨어", "Off-shoulder Knit Homewear", "popular"],
        ["camisole_wrap", "캐미솔 + 랩 바텀", "Camisole + Wrap Bottom", "popular"],
        ["bralette_cardigan", "브라렛 + 오픈 가디건", "Bralette + Open Cardigan", "popular"],
        ["one_shoulder_lounge", "원숄더 라운지 세트", "One-shoulder Lounge Set", "popular"],
        ["backless_lounge", "백리스 라운지 룩", "Backless Lounge Look", "special"],
        ["after_bath", "목욕 후 홈웨어", "After-bath Homewear", "special"],
        ["window_vanity", "창가 화장대 순간", "Window-side Vanity Moment", "special"],
        ["late_night_kitchen", "늦은 밤 주방 홈웨어", "Late-night Kitchen Homewear", "special"],
        ["laundry_lounge", "빨래 / 침구 정리 라운지 장면", "Laundry / Bedding Lounge Scene", "special"],
        ["sunroom_lounge", "선룸 라운지 패션", "Sunroom Lounge Fashion", "special"],
        ["oversized_shirt", "오버사이즈 셔츠 홈웨어", "Oversized Shirt Homewear", "popular"],
        ["hoodie_shorts", "크롭 후디 + 쇼츠", "Cropped Hoodie + Shorts", "popular"],
        ["knit_dress_home", "소프트 니트 원피스", "Soft Knit Dress", "popular"],
        ["robe_morning", "아침 로브", "Morning Robe", "popular"],
        ["floor_cushion", "바닥 쿠션에서 뒹굴기", "Floor Cushion Lounging", "special"],
        ["home_workout", "집 안 스트레칭 코너", "Home Stretch Corner", "special"],
        ["hammock_balcony", "발코니 해먹", "swaying in a balcony hammock in a silk lounge set, one leg trailing over the side", "popular"],
        ["breakfast_bed", "침대 위 아침", "sitting up in bed in satin pyjamas with a breakfast tray across her lap", "popular"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "private_evening": [
        ["", "자동", "", "basic"],
        ["slip_dress", "슬립 드레스 이브닝", "Slip Dress Evening", "basic"],
        ["cocktail_mini", "칵테일 미니드레스", "Cocktail Mini Dress", "basic"],
        ["one_shoulder_satin", "원숄더 새틴 이브닝", "One-shoulder Satin Evening", "popular"],
        ["low_back_evening", "로우백 이브닝 드레스", "Low-back Evening Dress", "popular"],
        ["after_party", "애프터파티 스타일링", "After-party Styling", "popular"],
        ["hotel_evening", "호텔룸 이브닝", "Hotel Room Evening", "popular"],
        ["balcony_night", "야간 발코니 무드", "Night Balcony Mood", "popular"],
        ["mirror_touchup", "거울 앞 메이크업 수정", "Mirror Touch-up", "special"],
        ["opera_night", "오페라 / 극장 나이트 스타일", "Opera / Theater Night Styling", "special"],
        ["penthouse_window", "펜트하우스 창가 무드", "Penthouse Window Mood", "special"],
        ["silk_robe_evening", "이브닝 베이스 위 실크 로브", "Silk Robe over Evening Base", "special"],
        ["velvet_evening", "벨벳 이브닝 드레스", "Velvet Evening Dress", "popular"],
        ["halter_evening", "홀터넥 이브닝", "Halter-neck Evening", "popular"],
        ["high_slit_gown", "하이슬릿 가운", "High-slit Gown", "popular"],
        ["wine_bar", "와인바 구석 자리", "Wine Bar Corner", "special"],
        ["night_drive", "야간 드라이브 조수석", "Night Drive Passenger Seat", "special"],
        ["heritage_evening", "전통 정장 차림의 저녁", "Traditional Formal Evening", "popular"],
        ["tea_ceremony_night", "저녁 다례", "Evening Tea Ceremony", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "lingerie": [
        ["", "자동", "", "basic"],
        ["lace_set", "레이스 란제리 세트", "a black lace lingerie set with a longline top, high-waisted bottoms, and geometric lace trim", "basic"],
        ["satin_set", "새틴 란제리 세트", "a satin lingerie set with a smooth bias-cut top and matching bottoms in a single deep colour", "basic"],
        ["bralette_highwaist", "브라렛 + 하이웨이스트 바텀", "a soft-cup bralette with wide supportive straps and matching high-waisted lingerie bottoms", "popular"],
        ["bustier_inspired", "뷔스티에풍 란제리", "a bustier-inspired satin lingerie top with a long structured bodice and vertical seam detailing", "popular"],
        ["bodysuit", "란제리 보디수트", "a lingerie bodysuit with a scooped neckline, wide shoulder straps, and lace side panels", "popular"],
        ["garter_set", "가터풍 스타일링", "a lingerie set with decorative garter straps, worn as styling detail", "popular"],
        ["corset_lingerie", "코르셋풍 란제리", "a corset-inspired lingerie bodice with visible boning seams and a matching high-waisted piece", "popular"],
        ["open_shirt_lingerie", "란제리 위 오픈 셔츠", "a tailored oversized shirt worn open over a matching satin lingerie set", "special"],
        ["night_robe", "나이트 로브 + 란제리", "a lingerie set worn under an open silk night robe with a tied sash", "special"],
        ["back_strap", "백스트랩 란제리", "a lingerie set with a decorative strap arrangement across the upper back", "special"],
        ["asymmetric_lingerie", "비대칭 란제리 세트", "an asymmetric lingerie set with one shoulder strap, a diagonal neckline, and matching high-waisted bottoms", "special"],
        ["slip_lingerie", "란제리 슬립", "a bias-cut satin lingerie slip with narrow straps and a straight hem", "popular"],
        ["babydoll", "베이비돌", "a babydoll lingerie slip with narrow shoulder straps, an empire waist, and a softly flared hem", "popular"],
        ["longline_bra", "롱라인 브라 세트", "a longline bra set with a wide supportive underband and matching high-waisted bottoms", "popular"],
        ["knit_lingerie", "니트 혼방 란제리", "a knit-blend lingerie set in soft ribbed jersey with a relaxed cropped top", "special"],
        ["morning_lingerie", "아침 햇살 란제리", "a simple cotton lingerie set in morning window light, sheets and a mug nearby", "special"],
        ["juban_inspired", "나가주반 응용 실크 레이어", "a juban-inspired silk underlayer with a wrapped front and a narrow sash", "popular"],
        ["hanbok_slip", "속적삼·속치마 응용 세트", "a hanbok underlayer-inspired lingerie set with a short wrapped top and a full high-waisted skirt", "popular"],
        ["qipao_silk_set", "치파오 응용 실크 세트", "a qipao-inspired silk lingerie set with a mandarin collar and frog-button closures", "popular"],
        ["embroidered_corset", "민속 자수 코르셋", "a folk-embroidered corset with structured boning and colourful thread work over a matching piece", "special"],
        ["kebaya_lace", "크바야 응용 레이스 상의", "a kebaya-inspired sheer lace top with fine floral embroidery over a fitted camisole", "special"],
        ["sari_blouse_set", "사리 블라우스 응용 세트", "a sari blouse-inspired lingerie set with a short fitted top and a draped lower piece", "special"],
        ["satin_teddy", "새틴 테디", "a satin teddy — a single-piece lingerie garment from neckline to hip in one smooth deep colour", "basic"],
        ["velvet_set", "벨벳 란제리 세트", "a deep-coloured velvet lingerie set of a bralette and high-waisted bottoms", "basic"],
        ["cage_back", "스트랩 등판 브라렛", "a lingerie set whose bralette back is crossed by geometric straps", "special"],
        ["sport_cotton", "스포티 코튼 세트", "a sporty cotton lingerie set with plain wide bands, on a bright bedroom morning", "basic"],
        ["chemise_silk", "실크 슈미즈", "a knee-skimming silk chemise slip with a lace hem and an opaque lining", "popular"],
        ["front_lace_corset", "앞 끈 코르셋", "a front-lacing corset over matching high-waisted lingerie bottoms", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "traditional": [
        ["", "자동", "", "basic"],
        ["auto_traditional", "계통에 맞춰 자동 선택", "Auto — Match Ethnicity", "basic"],
        ["hanbok_formal", "한복(한국) · 정장", "Hanbok — Formal", "popular"],
        ["hanbok_daily", "생활한복(한국) · 일상형", "Hanbok — Modern Daily", "popular"],
        ["kimono_formal", "기모노(일본) · 정장", "Kimono — Formal", "popular"],
        ["yukata_daily", "유카타(일본) · 여름 일상", "Yukata — Summer Casual", "popular"],
        ["hanfu_formal", "한푸(중국) · 정장", "Hanfu — Formal", "popular"],
        ["qipao_daily", "치파오(중국) · 현대형", "Qipao — Modern Daily", "popular"],
        ["aodai_daily", "아오자이(베트남)", "Áo Dài", "popular"],
        ["sari_formal", "사리(인도) · 정장", "Sari — Formal", "popular"],
        ["lehenga_formal", "레헹가(인도)", "Lehenga", "special"],
        ["salwar_daily", "살와르 카미즈(인도·파키스탄) · 일상", "Salwar Kameez — Daily", "special"],
        ["abaya_modern", "아바야(아라비아반도) · 현대형", "Modern Abaya", "popular"],
        ["kaftan_daily", "카프탄(북아프리카·중동) · 리조트 일상", "Kaftan — Resort Daily", "special"],
        ["thobe_inspired", "토브(아라비아반도) 응용 드레스", "Thobe-inspired Dress", "special"],
        ["dirndl_modern", "디른들(독일·오스트리아) 현대형", "Modern Dirndl", "special"],
        ["folk_embroidery", "자수 블라우스(동유럽)", "Folk Embroidery Blouse", "special"],
        ["kente_modern", "켄테(가나) 무늬 현대 드레스", "Kente-patterned Modern Dress", "popular"],
        ["boubou_flow", "부부(서아프리카) · 흐르는 실루엣", "Flowing Boubou", "special"],
        ["huipil_modern", "우이필(중미) 현대형", "Modern Huipil", "special"],
        ["poncho_andes", "안데스(페루·볼리비아) 직조 레이어", "Andean Woven Layer", "special"],
        ["kilt_inspired", "킬트(스코틀랜드) 응용 스커트", "Kilt-inspired Skirt", "special"],
        ["kebaya_daily", "크바야(인도네시아) · 일상", "Kebaya — Daily", "special"],
        ["barong_inspired", "바롱(필리핀) 응용 시스루 상의", "Barong-inspired Sheer Top", "special"],
        ["caftan_evening", "전통 이브닝 레이어링(지역은 계통에 따름)", "Traditional Evening Layering", "popular"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "wildcard": [
        ["", "자동", "", "basic"],
        ["festival_night", "야간 페스티벌 컷", "Night Festival Cut", "basic"],
        ["rain_editorial", "비 오는 에디토리얼", "Rain Editorial", "popular"],
        ["arcade_night", "야간 아케이드 스타일", "Night Arcade Styling", "popular"],
        ["ferry_deck", "페리 / 선박 데크 패션", "Ferry / Ship Deck Fashion", "popular"],
        ["retro_motel", "레트로 모텔 무드", "Retro Motel Mood", "special"],
        ["desert_resort", "사막 리조트 패션", "Desert Resort Fashion", "special"],
        ["futuristic_spa", "퓨처리스틱 스파", "Futuristic Spa", "special"],
        ["observatory_night", "야간 천문대", "Night Observatory", "special"],
        ["greenhouse_afterdark", "심야 온실", "Greenhouse after Dark", "special"],
        ["rooftop_cinema", "루프탑 시네마", "Rooftop Cinema", "special"],
        ["winter_lodge", "겨울 로지 패션", "Winter Lodge Fashion", "special"],
        ["art_studio", "영업 종료 후 아트 스튜디오", "After-hours Art Studio", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "hobbies_leisure": [
        ["", "자동", "", "basic"],
        ["hobby_music", "악기 연습", "Practicing a small acoustic instrument in a cozy room with a music stand and a resting cushion nearby.", "basic"],
        ["hobby_photo", "산책 사진 고르기", "Sorting printed habitat photographs beside a camera and a travel scrapbook at a cafe table.", "basic"],
        ["hobby_gardening", "창가 화분 돌보기", "Watering small berry seedlings on a windowsill and trimming a dry leaf with gardening scissors.", "basic"],
        ["hobby_reading", "창가 독서", "Turning a page of an old illustrated book of legends while seated by a window with a cup of tea.", "basic"],
        ["hobby_sketch", "풍경 스케치", "Sketching old trees and stone walls in a notebook on a park bench.", "basic"],
        ["hobby_craft", "부적 만들기", "Threading beads into a small travel charm at a hobby table with tidy craft tools.", "popular"],
        ["hobby_boardgame", "보드게임", "Moving a game piece across a wooden board game at a cozy table, weighing her next move.", "basic"],
        ["hobby_fishing", "낚시", "Casting a fishing line from a quiet wooden pier at dawn, a small tackle box at her feet.", "basic"],
        ["hobby_birdwatch", "탐조 관찰", "Watching the far side of a marsh through compact binoculars from a reed-lined observation hide, a field notebook on the ledge.", "popular"],
        ["hobby_origami", "종이접기", "Folding a small paper crane at a low table, a few finished paper figures lined up beside her.", "popular"],
        ["hobby_knitting", "뜨개질", "Knitting a soft scarf on a window seat, a ball of yarn resting in a basket at her side.", "special"],
        ["hobby_stargazing", "별 보기", "Adjusting a small telescope on a rooftop at night to look at the stars, a thermos beside the tripod.", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "travel": [
        ["", "자동", "", "basic"],
        ["travel_trail", "숲길 지도 확인", "Pausing at a forest trail junction to compare a folded map with a trail marker, wearing a light travel pack.", "basic"],
        ["travel_station", "여행 열차 기다리기", "Waiting on a rural station bench with a travel bag, holding a snack and checking a route card.", "basic"],
        ["travel_camp", "캠프 정리", "Folding a camping blanket beside a small tent and a neatly arranged cooking kit at a quiet campsite.", "basic"],
        ["travel_lakeside", "호숫가 쉬어가기", "Taking a water break on a flat lakeside rock, with walking shoes and a travel bag clearly grounded.", "basic"],
        ["travel_lookout", "전망대 풍경 감상", "Looking through binoculars from a hilltop lookout, with a folded habitat map in a side pocket.", "basic"],
        ["travel_coast", "해변 탐사 산책", "Examining shells and small tracks on a beach while making a quick sketch in a travel notebook.", "basic"],
        ["travel_ferry", "페리 갑판에서 섬 바라보기", "Leaning on the rail of a harbor ferry deck with a travel bag at her feet, watching an island coastline approach.", "basic"],
        ["travel_lodge", "산장 체크인", "Receiving a wooden room key at the front counter of a mountain lodge, her hiking pack still on one shoulder.", "basic"],
        ["travel_cablecar", "케이블카 창밖 보기", "Gazing out of a cable car window over a misty valley, one hand on the window rail and a small daypack on the seat.", "popular"],
        ["travel_footbath", "온천 마을 족욕", "Soaking her feet in a hot-spring town footbath under a wooden roof, trouser hems rolled up and a small towel folded beside her.", "popular"],
        ["travel_dunes", "사막 길에서 나침반 보기", "Checking a brass compass on a wind-rippled desert dune trail, a light scarf around her shoulders and a canteen at her hip.", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "festival": [
        ["", "자동", "", "basic"],
        ["fest_lantern", "등불 거리 산책", "walking between festival lanterns holding a small street snack", "basic"],
        ["fest_booth", "가판대 구경", "browsing a craft stall and picking up one small handmade object", "basic"],
        ["fest_fireworks", "강변 불꽃놀이", "sitting on a riverbank with a drink, looking up at fireworks", "popular"],
        ["night_market", "야시장", "a crowded night market, neon and paper lanterns, tasting food from a paper tray", "popular"],
        ["music_festival", "음악 페스티벌", "an outdoor music festival lawn at dusk, wristband, light dust in the air", "popular"],
        ["winter_market", "겨울 마켓", "a winter market with warm lights, mittens and a steaming cup", "special"],
        ["fest_parade", "꽃차 퍼레이드", "Riding a flower-decked parade float and tossing petals toward the street below.", "basic"],
        ["fest_ringtoss", "고리 던지기 노점", "Aiming a ring at the bottles of a festival ring-toss stall, one eye narrowed in concentration.", "basic"],
        ["fest_illumination", "겨울 조명 축제", "Strolling under a tunnel of winter illumination lights, holding a warm drink in gloved hands.", "popular"],
        ["fest_flowercrown", "꽃관 만들기", "Weaving a crown of fresh flowers at a spring flower-festival workshop table.", "popular"],
        ["fest_dance", "축제 춤판", "Dancing a simple circle step around a festival drum tower under paper lanterns.", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "occupation_basic": [
        ["", "자동", "", "basic"],
        ["office_desk", "사무실 책상", "at an office desk with a laptop and printed documents, sleeves rolled, mid-task", "basic"],
        ["cafe_barista", "카페 바리스타", "behind a cafe counter steaming milk, apron over a shirt", "basic"],
        ["blacksmith", "대장간·금속 공방", "in a small metal workshop filing a bracelet at the bench, leather apron, safety glasses pushed up", "popular"],
        ["museum_curator", "박물관 학예사", "in a museum storage room labeling an artifact with gloves and a clipboard", "popular"],
        ["archery_coach", "양궁장 코치", "at an archery range adjusting a student’s bow, whistle and cap", "popular"],
        ["librarian", "도서관 사서", "reshelving old books in a library aisle with a rolling cart", "basic"],
        ["florist", "플로리스트", "wrapping a bouquet at a flower shop counter, scissors and paper", "basic"],
        ["chef", "주방 셰프", "plating a dish at a restaurant pass, chef jacket, tweezers in hand", "popular"],
        ["mechanic", "정비사", "under a lifted car in a garage, wiping hands on a rag, overalls tied at the waist", "special"],
        ["field_geologist", "현장 지질조사", "on a rocky slope with a hammer and a sample bag, hi-vis vest", "special"],
        ["stage_tech", "무대 기술", "backstage checking a lighting cue sheet with a headset", "special"],
        ["tailor", "재단사", "pinning a garment on a dress form in a tailoring studio, tape measure around the neck", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "occupation_sensual": [
        ["", "자동", "", "basic"],
        ["office_desk", "사무실 책상", "at an office desk with a laptop and printed documents, sleeves rolled, mid-task", "basic"],
        ["cafe_barista", "카페 바리스타", "behind a cafe counter steaming milk, apron over a shirt", "basic"],
        ["blacksmith", "대장간·금속 공방", "in a small metal workshop filing a bracelet at the bench, leather apron, safety glasses pushed up", "popular"],
        ["museum_curator", "박물관 학예사", "in a museum storage room labeling an artifact with gloves and a clipboard", "popular"],
        ["archery_coach", "양궁장 코치", "at an archery range adjusting a student’s bow, whistle and cap", "popular"],
        ["librarian", "도서관 사서", "reshelving old books in a library aisle with a rolling cart", "basic"],
        ["florist", "플로리스트", "wrapping a bouquet at a flower shop counter, scissors and paper", "basic"],
        ["chef", "주방 셰프", "plating a dish at a restaurant pass, chef jacket, tweezers in hand", "popular"],
        ["mechanic", "정비사", "under a lifted car in a garage, wiping hands on a rag, overalls tied at the waist", "special"],
        ["field_geologist", "현장 지질조사", "on a rocky slope with a hammer and a sample bag, hi-vis vest", "special"],
        ["stage_tech", "무대 기술", "backstage checking a lighting cue sheet with a headset", "special"],
        ["tailor", "재단사", "pinning a garment on a dress form in a tailoring studio, tape measure around the neck", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "forge_workshop": [
        ["", "자동", "", "basic"],
        ["blade_polish", "칼날 연마 공방", "polishing a plain steel blank on a water stone under a work lamp in a blade-polishing studio, sleeves rolled, a towel over one shoulder", "basic"],
        ["smithing_class", "대장간 체험 수업", "hammering a glowing bar on an anvil with tongs during a weekend smithing class, safety glasses and a leather apron", "basic"],
        ["silversmith", "은세공 작업대", "sawing a small silver sheet at a jeweler's bench with a fine frame saw, a loupe pushed up on her head", "popular"],
        ["kiln_pottery", "가마 앞 도자 공방", "lifting a freshly glazed bowl out of a cooling kiln with heat gloves in a pottery studio", "popular"],
        ["restoration_lab", "유물 보존실", "cleaning a small corroded bronze fragment under a magnifier lamp in a museum conservation lab, nitrile gloves", "special"],
        ["leather_craft", "가죽 공방", "stitching a leather belt pouch with an awl and waxed thread at a leather-craft table", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "martial_practice": [
        ["", "자동", "", "basic"],
        ["dawn_form", "새벽 공원 수련", "moving through a slow practice form with a wooden training tool in a quiet park at dawn, mist over the grass", "basic"],
        ["dojo_kata", "도장 품새", "holding a clean stance with a wooden practice tool on the polished floor of an empty dojo, morning light through paper screens", "basic"],
        ["archery_range", "궁도장", "drawing a practice bow toward a straw target at an outdoor archery range, a quiver of blunt practice arrows at her hip", "popular"],
        ["fencing_salle", "펜싱 살", "drilling footwork with a blunt practice foil along the strip of a fencing salle, mask tucked under one arm", "popular"],
        ["shield_drill", "방패 막기 연습", "bracing a padded training shield against a hanging practice pad in a training hall", "special"],
        ["cooldown_wrap", "수련 뒤 손 감기", "sitting on a bench after practice, rewrapping her wrists with cloth tape, her practice tool resting beside her", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "seasonal_rite": [
        ["", "자동", "", "basic"],
        ["offering_table", "제사상 차리기", "arranging fruit, rice cakes and small dishes on an offering table for a seasonal rite in a family home", "basic"],
        ["lamp_lighting", "등잔 켜기", "lighting a row of small oil lamps along a doorstep at dusk for a festival of lights", "basic"],
        ["bonfire_night", "세시 모닥불", "adding a bundle of dried herbs to a seasonal bonfire on a hillside at twilight, sparks rising", "popular"],
        ["lantern_float", "등롱 띄우기", "setting a paper lantern afloat on a dark river during a remembrance festival, kneeling at the water's edge", "popular"],
        ["altar_flowers", "제단 꽃 장식", "decorating a household altar with fresh flowers, candles and small keepsakes for a festival of remembrance", "special"],
        ["new_year_visit", "새해 참배", "bowing at a shrine or temple on the first morning of the year in a warm winter coat, breath visible in the cold", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "retro_glamour": [
        ["", "자동", "", "basic"],
        ["flapper_party", "20년대 플래퍼 파티", "a 1920s flapper fringe dress with a dropped waist and a beaded headband, mid-Charleston step at a speakeasy party", "basic"],
        ["deco_lounge", "아르데코 라운지", "a 1920s bias-cut satin lounge gown, lighting a candle in an Art Deco hotel lounge", "special"],
        ["hollywood_bias", "30년대 할리우드 가운", "a 1930s Hollywood bias-cut satin gown with a cowl back, posing on the staircase of a vintage film set", "popular"],
        ["swing_dress", "40년대 스윙 댄스", "a 1940s swing dress with a sweetheart neckline, mid-twirl at a swing dance hall", "basic"],
        ["retro_highwaist", "50년대 하이웨이스트 비키니", "a 1950s pin-up bikini with a high-waisted bottom above the navel and a halter top", "basic"],
        ["pinup_beachball", "50년대 해변 핀업", "a 1950s high-waisted pin-up swimsuit, holding a striped beach ball on a sunny boardwalk", "popular"],
        ["pinup_car", "클래식 카 핀업", "a 1950s halter playsuit, leaning against the fender of a classic convertible", "popular"],
        ["diner_counter", "50년대 다이너", "a 1950s wiggle skirt and a fitted cropped blouse, perched on a chrome diner stool with a milkshake", "basic"],
        ["retro_pinup", "레트로 핀업 란제리", "a 1950s pin-up lingerie set with a structured bra and high-waisted bottoms", "popular"],
        ["mod_mini", "60년대 모드 미니", "a 1960s mod shift mini dress with geometric colour blocks and go-go boots, dancing on a checkerboard floor", "basic"],
        ["jetset_pool", "60년대 리비에라 수영장", "a 1960s jet-set one-piece swimsuit with a matching headscarf and cat-eye sunglasses at a Riviera hotel pool", "popular"],
        ["disco_halter", "70년대 디스코", "a 1970s lurex halter jumpsuit with flared legs, under a mirror ball on a lit disco floor", "popular"],
        ["boho_crochet", "70년대 보헤미안 페스티벌", "a 1970s crochet halter top with low-rise flared jeans at a sunny festival field", "basic"],
        ["roller_disco", "롤러 디스코", "1970s satin hot pants and a tube top on roller skates, gliding through a roller disco", "special"],
        ["aerobics_80s", "80년대 에어로빅", "an 1980s high-cut aerobics leotard over shiny tights with leg warmers and a headband, mid-move in a mirrored studio", "popular"],
        ["power_glam", "80년대 파워 글램", "an 1980s sequined mini dress with strong padded shoulders in a neon nightclub", "special"],
        ["nineties_slip", "90년대 미니멀 슬립", "a 1990s minimal satin slip dress with thin straps under a small cropped cardigan, at a city loft party", "basic"],
        ["y2k_lowrise", "Y2K 쇼핑몰", "a Y2K low-rise mini skirt, a butterfly halter top and platform sandals, posing with a flip phone at a mall fountain", "popular"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "subculture_fashion": [
        ["", "자동", "", "basic"],
        ["goth_chapel", "로맨틱 고스 예배당", "romantic goth — a black velvet dress with a corset belt and lace sleeves, lighting candles in an old stone chapel", "popular"],
        ["goth_cafe", "고스 카페", "trad goth — a black lace mini dress with platform boots and stacked silver rings, at a candlelit gothic cafe", "basic"],
        ["punk_gig", "펑크 라이브 하우스", "punk — a studded leather jacket over a ripped plain tee, a tartan mini skirt and combat boots, at the barrier of a small live house", "popular"],
        ["punk_alley", "펑크 뒷골목", "punk — tartan trousers with straps and safety pins and a cropped top with mesh sleeves over an opaque base, lacing her boots on a brick alley step", "basic"],
        ["rock_backstage", "록 백스테이지", "rock — a leather mini skirt, a cropped vest and a choker, tuning a guitar backstage", "basic"],
        ["gyaru_street", "갸루 거리", "gyaru — a bodycon mini dress, platform heels, long nail art and layered accessories, posing for a photo-booth picture in a busy shopping street", "popular"],
        ["decora_harajuku", "하라주쿠 데코라", "decora — a pastel tutu skirt, layered bright tops and stacks of colourful clips and bracelets on a Harajuku side street", "special"],
        ["yami_kawaii", "얌카와 크레페 가게", "yami-kawaii — a pink-and-black sailor-collar mini dress with heart chokers, at a crepe stand", "special"],
        ["cybergoth_rave", "사이버고스 레이브", "cybergoth — neon goggles worn on the forehead, a reflective mini skirt, a cropped top and tall platform boots, at a UV-lit warehouse rave", "popular"],
        ["grunge_records", "그런지 레코드 가게", "grunge — an oversized plaid flannel shirt tied at the waist over a slip dress and combat boots, in a second-hand record store", "basic"],
        ["emo_gig", "이모 공연", "emo — a fitted striped long-sleeve top, a studded belt, skinny jeans and checkered sneakers at an all-ages gig", "special"],
        ["steampunk_fair", "스팀펑크 박람회", "steampunk — a brocade underbust corset belt over a blouse, a short bustle skirt and brass goggles, at a steampunk fair", "popular"],
        ["gothic_lolita", "고딕 로리타 티 살롱", "gothic lolita — a black-and-white lace jumper skirt with a bonnet, at a rose-garden tea salon", "special"],
        ["skater_bowl", "스케이트 보울", "skater — a cropped hoodie, low-slung cargo shorts and high socks, dropping into a skate bowl", "basic"],
        ["biker_cafe", "바이커 카페", "biker — a fitted leather riding jacket open over a bandeau top, leather trousers and boots, beside a motorcycle at a roadside cafe", "popular"],
        ["raver_kandi", "야외 레이브", "raver — a metallic halter crop top, a cargo mini skirt and beaded bracelets, under laser lights at an outdoor rave", "basic"],
        ["visual_kei", "비주얼계 라이브", "visual kei — a dramatic black-and-silver layered stage outfit with lace cuffs, under a spotlight at a live house", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "nightlife": [
        ["", "자동", "", "basic"],
        ["club_floor", "클럽 댄스 플로어", "dancing in a sequined bodycon mini dress on a crowded club floor under coloured lights", "basic"],
        ["dj_booth", "DJ 부스 옆", "leaning on the rail beside a DJ booth in a cut-out mini dress, one hand raised to the beat", "popular"],
        ["neon_bar", "네온 바 카운터", "at a neon-lit bar counter in a backless satin top and a leather mini skirt, lifting a coloured drink", "basic"],
        ["karaoke_room", "노래방", "singing into a microphone in a private karaoke room in an off-shoulder sequin top and shorts, coloured lights spinning", "basic"],
        ["powder_mirror", "클럽 파우더룸 거울", "touching up lipstick at a club powder-room mirror in a halter mini dress, neon light on the tiles", "special"],
        ["club_queue", "클럽 앞 줄", "waiting in the queue outside a club at night in a short faux-fur jacket over a slip mini dress", "basic"],
        ["vip_booth", "VIP 벨벳 부스", "lounging in a velvet VIP booth in a one-shoulder sequin dress, a bucket of ice beside her", "popular"],
        ["night_taxi", "귀갓길 택시", "in the back seat of a taxi after a night out in a mini dress, city lights streaking across the window", "special"],
        ["rooftop_party", "옥상 파티", "at a city rooftop party in a backless mini dress, raising a glass under string lights", "popular"],
        ["jazz_bar_stage", "재즈 바 피아노", "leaning on the grand piano of a dim jazz bar in a high-slit gown, a glass in hand", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "dance_stage": [
        ["", "자동", "", "basic"],
        ["tango_solo", "탱고 연습", "practising a solo tango ocho in a backless high-slit dance dress on a wooden milonga floor", "popular"],
        ["salsa_spin", "살사 회전", "mid-spin in a fringed salsa dress at a social dance hall, the fringe flaring out", "basic"],
        ["flamenco", "플라멩코", "a flamenco dress with a ruffled train and a fitted bodice, stamping a step with one arm raised on a tablao stage", "popular"],
        ["belly_dance", "벨리댄스", "a belly dance costume with a coin-trimmed bra top and a low-slung chiffon skirt, swirling a veil on a lamp-lit stage", "popular"],
        ["jazz_kick", "재즈 무대 킥", "a sequined jazz dance leotard with a short flared skirt, mid high-kick on a lit stage", "basic"],
        ["dance_mirror", "연습실 거울", "a cropped dance top and high-waisted shorts, checking a pose in the mirror of a dance studio", "basic"],
        ["hula", "훌라", "a hula costume with a flower lei, a bandeau top and a grass-style skirt over shorts, swaying on a beach stage at sunset", "special"],
        ["kpop_practice", "K팝 안무 연습", "a cropped jersey top and cargo mini skirt, hitting a sharp choreography pose in a practice room", "popular"],
        ["ballroom_waltz", "볼룸 가운", "a flowing ballroom gown with a fitted bodice, turning a solo waltz step across a chandelier ballroom", "special"],
        ["mermaid_show", "인어 쇼 의상", "a mermaid show costume — a scale-sequined bodice and a flowing chiffon wrap skirt; posing by the glass of an aquarium stage", "special"],
        ["ballet_stage", "발레 무대 의상", "a ballet stage costume — a fitted bodice, a short stiff tutu and satin pointe shoes; stretching at the rehearsal barre", "special"],
        ["cabaret_showgirl", "카바레 쇼걸 코스튬", "a cabaret showgirl costume — a sparkling structured bodice, a feathered headpiece and a large feather fan; descending a backstage stair before the show", "popular"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "spa_wellness": [
        ["", "자동", "", "basic"],
        ["rotenburo_edge", "노천탕 가장자리", "sitting on the stone edge of an open-air hot spring in a swimsuit, feet in the steaming water, snow on the rocks", "popular"],
        ["hinoki_bath", "히노키 탕", "in a swimsuit in a cedar-wood tub by a window of a mountain inn, arms resting on the rim", "special"],
        ["jjimjilbang", "찜질방", "in matching bathhouse loungewear with a towel folded into a small sheep-ear headband, sipping a sweet rice drink on a heated floor", "basic"],
        ["spa_robe_lounge", "가운 라운지", "in a plush spa robe over a swimsuit, pouring herbal tea in a quiet spa lounge", "basic"],
        ["hammam", "하맘", "wrapped in a striped cotton peshtemal on the warm marble slab of a domed hammam, a brass bowl beside her", "special"],
        ["mud_mask", "스파 팩", "in a spa robe with a clay mask on her face, resting with cucumber slices in hand in a treatment room", "special"],
        ["spa_pool", "스파 풀", "in a swimsuit at the edge of a steaming thermal spa pool at dusk, elbows on the tiled edge", "popular"],
        ["cold_plunge", "냉탕", "in a sporty swimsuit stepping down into a cold plunge tub after the sauna, breath sharp", "basic"],
        ["sauna_lounge", "사우나 라운지", "wrapped in a large towel in a sauna lounge, sipping cold water between rounds", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "fantasy_costume": [
        ["", "자동", "", "basic"],
        ["elf_costume", "엘프 코스튬", "an elf costume — a leaf-trimmed short dress, a hooded half-cape and pointed ear tips, raising a lantern at a forest-themed costume party", "popular"],
        ["fairy_wings", "요정 코스튬", "a fairy costume — a petal-layered mini dress with glittering wing props, sprinkling glitter in a flower photo studio", "popular"],
        ["angel_devil", "천사·악마 파티", "an angel-and-devil party costume — a red satin mini dress with a small horn headband and a tail prop, one white feathered wing prop over her shoulder, at a Halloween party", "basic"],
        ["sorceress_robe", "마법사 코스튬", "a sorceress costume — an off-shoulder velvet robe gown with a jeweled belt and a crystal staff prop, posing at a fantasy photoshoot", "basic"],
        ["cosplay_photozone", "코스프레 포토존", "in an original fantasy costume with a short cape, striking a pose at a convention photo zone under ring lights", "basic"],
        ["forest_spirit", "숲의 정령", "a forest spirit costume — a moss-green draped gown with a flower crown and trailing ivy, in a misty garden shoot", "special"],
        ["star_goddess", "별의 여신", "a star goddess costume — a midnight-blue gown scattered with crystal stars and a crescent headpiece, on a starry studio set", "special"],
        ["fae_ball", "요정 가면무도회", "a fae ball costume — a backless gown with a wing-shaped satin cape and a leaf mask, at a fantasy masquerade", "popular"],
        ["moon_priestess", "달의 무녀", "a moon priestess costume — a white draped one-shoulder gown with silver bangles and a moonstone circlet, at a lantern-lit costume festival", "special"],
        ["vampire_gala", "뱀파이어 백작 부인 코스튬", "a vampire countess costume — a high-collared velvet cape over a fitted gown with a cinched waist; raising a glass of red juice in a candlelit masquerade hall", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "bridal": [
        ["", "자동", "", "basic"],
        ["gown_fitting", "드레스 가봉", "standing on a fitting platform in an open-back wedding gown while the bodice is pinned, a long mirror beside her", "basic"],
        ["before_ceremony", "예식 전 대기", "in a sweetheart-neckline wedding gown and veil, holding her bouquet by a sunlit window of the bridal room", "basic"],
        ["garden_aisle", "정원 버진로드", "walking alone down a garden aisle under a flower arch in a flowing gown, the train trailing on the petals", "popular"],
        ["self_wedding_shoot", "셀프 웨딩 촬영", "a solo bridal photoshoot on a windy sea cliff in a slit wedding gown, the veil lifting in the wind", "popular"],
        ["veil_wind", "해변 베일", "in a simple slip wedding dress on a beach at sunset, holding a long veil as the wind pulls it out", "special"],
        ["reception_gown", "피로연 드레스", "at the wedding reception in a backless reception gown, mid-turn on the dance floor", "basic"],
        ["second_dress", "2부 미니드레스", "in a short beaded after-party wedding dress, laughing as she kicks off her heels at the reception", "popular"],
        ["bridal_shower", "브라이덜 샤워", "in a white off-shoulder mini dress and a sash, opening a gift box at a bridal shower table", "special"],
        ["honeymoon_suite", "신혼여행 스위트", "on the balcony of a honeymoon suite in a silk slip dress, a breeze off the sea, a glass in hand", "popular"],
        ["bridal_lace", "브라이덜 레이스", "a white lace bridal lingerie set with a short veil, in a dressing room before the ceremony", "popular"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "gala_red_carpet": [
        ["", "자동", "", "basic"],
        ["red_carpet", "레드카펫 입장", "arriving on a red carpet in a high-slit evening gown, turning toward the flashes", "basic"],
        ["photo_wall", "포토월", "posing at a plain step-and-repeat wall in a one-shoulder sequined gown, one hand on her hip", "basic"],
        ["festival_steps", "영화제 계단", "climbing a grand red-carpeted staircase at a film festival in a gown with a long train", "popular"],
        ["award_ceremony", "시상식", "walking to the stage at an award ceremony in a plunging velvet gown, a plain golden statuette in hand", "popular"],
        ["gala_dinner", "갈라 디너", "seated at a candlelit gala dinner table in an open-back silk gown, raising a champagne glass", "basic"],
        ["charity_auction", "자선 경매", "raising a bidding paddle at a charity auction in a strapless satin gown and long gloves", "special"],
        ["front_row", "패션위크 앞줄", "seated in the front row of a fashion week show in a sculptural mini dress, legs crossed, runway lights ahead", "popular"],
        ["museum_gala", "박물관 갈라", "at a gala in a grand museum hall in a backless column gown, a marble statue behind her", "special"],
        ["afterparty_stairs", "갈라 뒤 계단", "sitting on a grand staircase after the gala in a satin gown, heels in one hand, the train pooled around her", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "heritage_visit": [
        ["", "자동", "", "basic"],
        ["museum_glass", "유리 너머의 그 무기", "standing in front of a museum vitrine where the legendary weapon is displayed, her reflection faint on the glass, a small knowing smile", "basic"],
        ["temple_steps", "신전 계단", "sitting on the worn steps of an old temple or shrine with a paper cup, tourists blurred behind", "basic"],
        ["ruin_walk", "유적 산책", "walking through a ruined colonnade or stone circle at golden hour, light jacket and sneakers", "popular"],
        ["saga_library", "고문서 열람실", "in a manuscript reading room turning a facsimile page of her own legend, cotton gloves", "popular"],
        ["mountain_pass", "전설의 고개", "at a mountain pass from the legend with a daypack, wind in her hair, looking down the valley", "popular"],
        ["statue_plaza", "동상 앞 광장", "in a city plaza beside a bronze statue of her legendary wielder, eating ice cream", "special"],
        ["relief_wall", "부조 벽", "tracing a carved relief of her weapon with one finger in a dim gallery", "special"],
        ["open_air_play", "야외 전설극 관람", "watching an open-air play of her own legend from the stone seats of an old amphitheater at dusk, a folded program on her knee", "popular"],
        ["sacred_grove", "전설의 숲", "resting under an ancient tree in a grove tied to her legend, sunlight through the leaves, a water bottle beside her", "popular"],
        ["holy_spring", "옛 샘터", "cupping water from a stone spring or holy well named in her legend, sleeves pushed up", "special"],
        ["museum_shop", "박물관 기념품점", "turning a small replica of her own weapon over in her hands in a museum shop, an amused, private smile", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "motif_editorial": [
        ["", "자동", "", "basic"],
        ["couture_gala", "쿠튀르 갈라", "a precise gala gown built from the weapon’s two colors and materials, preparing at a mirror", "basic"],
        ["runway", "런웨이", "a runway walk in an outfit whose cut echoes the weapon’s silhouette", "basic"],
        ["street_motif", "스트리트 모티브", "futuristic streetwear carrying the weapon’s motifs as prints and hardware", "popular"],
        ["jewelry_focus", "장신구 중심", "minimal black clothing so that jewelry shaped from the weapon’s motifs carries the look", "popular"],
        ["material_study", "재질 연구", "an editorial where fabric imitates the weapon’s material (metal sheen, wood grain, lacquer) in drape", "special"],
        ["heritage_couture", "헤리티지 쿠튀르", "traditional dress structure from her heritage rebuilt in the weapon’s colors", "special"],
        ["color_block_suit", "두 색 정장", "a sharply tailored suit split into the weapon's two colors, adjusting a cufflink at a studio window", "basic"],
        ["knitwear_motif", "모티브 니트", "chunky knitwear whose cable pattern traces the weapon's motifs, on a windy rooftop", "basic"],
        ["evening_cape", "이브닝 케이프", "a sweeping evening cape whose outline echoes the weapon's silhouette, descending a grand staircase", "popular"],
        ["resort_print", "리조트 프린트", "a flowing resort dress printed with the weapon's motifs on a sunlit terrace above the sea", "popular"],
        ["atelier_fitting", "아틀리에 가봉", "standing for a fitting in a couture atelier while a gown built from the weapon's materials is pinned", "special"],
        ["__custom__", "직접 입력", "", "special"]
      ],
    "auto_random": [
        ["", "자동", "", "basic"]
      ],
    "__custom__": [
        ["", "자동", "", "basic"],
        ["__custom__", "직접 입력", "", "special"]
      ]
  };
  /* 예시 설명(한국어) — 화면에서 고를 때 보여 준다. 없는 열쇠는 이름만 */
  var CASUAL_EX_NOTE = {"classic_bikini": "상하의가 나뉜 가장 기본적인 비키니.", "sport_onepiece": "경영복에 가까운 스포티한 원피스 수영복.", "highleg_onepiece": "다리 라인이 골반 위까지 파인 원피스.", "monokini": "원피스인데 옆구리나 배 쪽이 크게 뚫린 형태. 조각이 이어져 있어 비키니는 아니다.", "triangle_bikini": "상의 컵이 삼각형이고 목 뒤로 끈을 묶는 형태.", "bandeau_bikini": "어깨끈 없이 가슴을 가로로 감싸는 튜브형 상의.", "halter_bikini": "목 뒤로 끈을 걸어 어깨선을 드러내는 상의.", "asymmetric_swim": "한쪽 어깨만 덮는 비대칭 구조.", "crossstrap_swim": "등이나 가슴 앞에서 끈이 교차하는 구조.", "boyshort_swim": "하의가 짧은 반바지 형태라 엉덩이를 더 덮는다.", "rashguard_set": "긴팔 또는 반팔 상의로 팔까지 덮는 서핑용 세트.", "wrap_swim": "앞자락을 겹쳐 여미는 랩 구조의 수영복.", "swim_coverup": "수영복 위에 얇은 셔츠나 사롱을 걸친 상태.", "lace_set": "레이스 소재의 브라와 하의 세트.", "satin_set": "광택 있는 새틴 소재 세트.", "bralette_highwaist": "와이어 없는 브라렛에 배꼽 위까지 오는 하의를 맞춘 조합.", "bustier_inspired": "가슴부터 허리까지 이어진 상의. 코르셋보다 짧고 조임이 약하다.", "bodysuit": "상하의가 하나로 붙은 원피스형 란제리.", "garter_set": "허벅지에 두르는 밴드로 스타킹을 고정하는 구성.", "corset_lingerie": "허리를 조여 실루엣을 만드는 뻣뻣한 구조물. 뷔스티에보다 길고 단단하다.", "open_shirt_lingerie": "란제리 위에 셔츠를 걸치고 단추를 잠그지 않은 상태.", "night_robe": "란제리 위에 얇은 가운을 덧입은 구성.", "back_strap": "등 쪽 끈 배치가 장식이 되는 디자인.", "asymmetric_lingerie": "좌우 구조가 다른 비대칭 세트.", "slip_lingerie": "어깨끈이 가는 민소매 원피스형. 잠옷과 속옷의 중간.", "babydoll": "가슴 아래부터 퍼지는 짧고 하늘하늘한 형태.", "longline_bra": "브라 밑단이 갈비뼈 아래까지 내려오는 긴 형태.", "soft_tank_shorts": "민소매 상의에 짧은 하의를 맞춘 가장 기본적인 실내복.", "satin_lounge": "광택 있는 상하의 세트. 파자마보다 격이 있다.", "offshoulder_knit": "어깨가 흘러내리는 니트 상의.", "camisole_wrap": "가는 끈 상의에 감아 입는 하의를 맞춘 조합.", "bralette_cardigan": "브라렛 위에 가디건을 걸치고 여미지 않은 상태.", "one_shoulder_lounge": "한쪽 어깨만 덮는 실내복 세트.", "backless_lounge": "등이 크게 트인 실내복.", "oversized_shirt": "몸보다 큰 셔츠 한 장을 원피스처럼 입은 차림.", "hoodie_shorts": "배가 드러나는 짧은 후디에 쇼츠를 맞춘 조합.", "knit_dress_home": "몸에 붙는 부드러운 니트 원피스.", "robe_morning": "아침에 가운만 걸친 상태.", "slip_dress": "어깨끈이 가늘고 몸을 따라 흐르는 원피스.", "cocktail_mini": "무릎 위로 짧은 정장풍 드레스.", "one_shoulder_satin": "한쪽 어깨만 덮는 새틴 드레스.", "low_back_evening": "앞은 단정하고 등이 크게 파인 드레스.", "velvet_evening": "벨벳 특유의 묵직한 광택이 나는 드레스.", "halter_evening": "목 뒤로 끈을 걸어 어깨와 등을 드러내는 드레스.", "high_slit_gown": "긴 드레스에 다리까지 트임이 들어간 형태.", "event_staff": "행사 진행요원풍 의상. 실제 유니폼이 아니라 이벤트용 해석.", "uniform_inspired": "제복의 요소만 빌린 스타일. 특정 기관을 특정할 수 없게 한다.", "bunny": "몸에 붙는 원피스형에 토끼 귀와 커프스를 더한 고전적 코스튬.", "casino_dealer": "조끼·나비넥타이·소매 밴드 같은 딜러 요소를 쓴 스타일.", "lab_roleplay": "가운과 실험 도구를 소품으로 쓰는 연구실 역할극.", "retro_racer": "70~80년대 레이싱 이벤트풍 의상.", "vinyl_stage": "광택 있는 비닐 소재의 무대 의상.", "masquerade": "가면무도회풍. 가면과 장식이 중심.", "circus_ringmaster": "긴 재킷과 실크햇을 쓴 서커스 단장풍.", "pilates": "매트나 기구 위에서 코어를 쓰는 동작.", "basketball_jersey": "몸보다 큰 농구 유니폼을 헐렁하게 입은 차림.", "parkour_stairs": "계단이나 난간을 넘는 순간의 동작.", "aerial_silk": "천에 매달려 자세를 잡는 공중 동작.", "archery_draw": "활시위를 당겨 정지한 순간.", "auto_traditional": "계통 설정을 보고 어울리는 전통 의상을 알아서 고른다.", "hanbok_formal": "한국 한복. 저고리와 치마의 비율, 고름 매듭, 배래선을 지킨 정장형.", "hanbok_daily": "한국 한복의 구조만 남기고 길이와 소재를 현대화한 생활한복.", "kimono_formal": "일본 기모노. 오비를 갖춘 정식 형태로, 옷깃 여밈 방향까지 지킨다.", "yukata_daily": "일본의 여름용 홑겹 기모노. 축제·저녁 산책에 어울린다.", "hanfu_formal": "중국 한푸. 교령·유군 같은 특유의 여밈과 층 구성.", "qipao_daily": "중국 치파오(청삼). 입식 칼라와 옆트임을 살린 현대적 형태.", "aodai_daily": "긴 상의에 통 넓은 바지를 받쳐 입는 베트남 전통복.", "sari_formal": "인도 사리. 한 장의 천을 감아 두르는 방식과 어깨 드레이프가 핵심.", "lehenga_formal": "인도 레헹가. 긴 치마 + 짧은 상의 + 두파타 세 겹 구성.", "salwar_daily": "인도·파키스탄 지역의 살와르 카미즈. 통 넓은 바지에 긴 튜닉을 걸친 일상 차림.", "abaya_modern": "아라비아반도의 아바야. 몸을 감싸는 긴 겉옷을 현대적으로 재단한 형태.", "kaftan_daily": "북아프리카·중동 지역의 카프탄. 품이 넉넉하고 소매가 넓은 원피스형 겉옷.", "thobe_inspired": "아라비아반도 토브의 직선 재단과 자수를 응용한 드레스.", "dirndl_modern": "독일·오스트리아의 디른들. 보디스 + 앞치마 구조를 현대적으로 다듬은 형태.", "folk_embroidery": "동유럽 민속 자수를 살린 블라우스.", "kente_modern": "가나 켄테 직조 무늬를 현대 드레스에 옮긴 형태.", "boubou_flow": "서아프리카의 넓고 길게 흐르는 겉옷.", "huipil_modern": "중미의 사각 재단 상의와 자수 문양.", "poncho_andes": "안데스 직조 천을 겹쳐 두른 레이어.", "kilt_inspired": "스코틀랜드 킬트의 타탄 주름과 여밈 구조를 응용한 스커트.", "kebaya_daily": "인도네시아 크바야. 몸에 붙는 자수 상의 + 사롱 조합.", "barong_inspired": "비치는 원단에 자수를 넣은 필리핀풍 상의.", "caftan_evening": "전통 겉옷을 이브닝 룩으로 겹쳐 입은 구성.", "heritage_evening": "전통 정장을 갖춰 입고 나선 저녁 자리.", "burkini_modest": "머리부터 발목까지 덮는 모디스트 수영복. 노출 없이 물놀이 상황을 만든다.", "sarong_wrap": "수영복 위에 전통 사롱 천을 허리에 둘러 묶은 차림.", "yukata_poolside": "수영복 위에 유카타를 걸친 온천·여름 축제 분위기.", "heritage_pattern_swim": "켄테·이카트·자수 같은 전통 문양을 현대 수영복에 옮긴 형태.", "onsen_after": "온천에서 나온 직후. 수건과 유카타, 젖은 머리.", "hanbok_coverup": "저고리 깃과 고름 선을 응용한 비치 커버업.", "juban_inspired": "기모노 속옷인 나가주반의 여밈과 실루엣을 응용한 실크 레이어.", "hanbok_slip": "속적삼과 속치마의 층 구성을 현대 란제리로 옮긴 세트.", "qipao_silk_set": "입식 칼라와 매듭 단추를 살린 실크 상하 세트.", "embroidered_corset": "동유럽 민속 자수를 얹은 코르셋.", "kebaya_lace": "크바야 특유의 몸에 붙는 자수 레이스 상의를 응용.", "sari_blouse_set": "사리의 짧은 블라우스와 페티코트 구성을 응용한 세트.", "travel_trail": "갈림길에서 지도와 이정표를 번갈아 살펴요.", "travel_station": "역 벤치에서 짐과 간식을 챙기며 열차를 기다려요.", "travel_camp": "텐트 옆에서 담요나 취사 도구를 정리해요.", "travel_lakeside": "물가의 돌에 앉아 물병을 들고 잠깐 쉬어요.", "travel_lookout": "난간 옆에서 쌍안경으로 멀리 펼쳐진 지형을 살펴요.", "travel_coast": "해변에서 조개와 발자국을 관찰하며 기록해요.", "fest_lantern": "등불 사이를 걸으며 작은 축제 간식을 들어요.", "fest_booth": "가판대의 작은 공예품을 살펴보고 하나를 집어 들어요.", "fest_fireworks": "강변에 앉아 음료를 들고 저녁 하늘을 바라봐요.", "hobby_music": "방 안에서 작은 악기를 연주하며 리듬을 맞춰요.", "hobby_photo": "테이블 위의 카메라와 사진을 보며 여행 기록을 정리해요.", "hobby_gardening": "실내 화분에 물을 주고 잎을 손질해요.", "festival_night": "밤 축제에서 간식을 들거나 부스를 구경해요.", "adult_police": "경찰복의 재단을 차용한 이벤트 의상을 입고 소품을 정리해요.", "adult_nurse": "간호복에서 따온 이벤트 의상의 단추와 액세서리를 손질해요.", "adult_maid": "메이드풍 앞치마와 장식이 있는 이벤트 의상으로 준비 동작을 해요.", "adult_secretary": "셔츠와 재킷을 조합한 비서풍 이벤트 의상을 정돈해요.", "flight_attendant": "승무원풍 스카프와 재킷을 갖춘 이벤트 스타일이에요.", "ceremonial_instructor": "장식 재킷과 단정한 소품을 갖춘 행사 진행자풍 의상이에요.", "adult_teacher": "셔츠·카디건·책을 조합한 교사풍 이벤트 스타일이에요.", "adult_librarian": "책과 안경을 소품으로 사용하는 사서풍 이벤트 스타일이에요.", "cheer_costume": "움직임에 맞는 치어 의상과 응원 소품을 준비해요.", "cabin_crew_retro": "복고풍 모자와 스카프로 객실승무원 스타일을 표현해요.", "moonlit_pool": "달빛이 비치는 야외 수영장 가장자리에서 쉬어요.", "rooftop_infinity_pool": "옥상 수영장에서 도시 풍경과 수면이 함께 보여요.", "outdoor_shower": "수영복을 착용한 채 수영 후 물기를 씻어내요.", "cabana_daybed": "카바나 그늘에서 타월과 음료를 두고 쉬어요.", "thermal_spa": "수영복 차림으로 온천형 스파 풀에서 휴식해요.", "shoreline_walk": "얕은 물이 밀려오는 해변을 천천히 걸어요.", "poolside_bar": "수영장 옆 바에서 음료를 받거나 잠깐 쉬어요.", "river_dock": "강이나 호수의 데크에서 수영을 준비해요.", "warmup": "운동 전후에 팔과 다리를 가볍게 풀어요.", "stretch": "관절의 움직임이 읽히도록 몸을 천천히 늘여요.", "dance_transition": "춤 연습 중 무게중심을 옮기는 순간을 보여줘요.", "tennis_active": "라켓을 들고 공을 받기 전의 준비 동작을 해요.", "boxing_fitness": "운동용 글러브를 착용하고 기본 스텝이나 가드를 연습해요.", "running_recovery": "달리기를 마친 뒤 호흡을 고르거나 물을 마셔요.", "roller_skating": "롤러스케이트로 균형을 잡으며 천천히 이동해요.", "fencing_motion": "펜싱복의 움직임과 발의 스텝을 중심으로 표현해요.", "climbing_warmup": "실내 암벽 앞에서 손을 풀고 장비를 점검해요.", "surf_prep": "물가에서 보드를 챙기고 서핑 장비를 정돈해요.", "yoga_flow": "매트 위에서 자연스러운 요가 동작을 이어가요.", "cycling_kit": "사이클링 복장으로 자전거와 헬멧을 점검해요.", "track_sprint": "트랙에서 출발을 준비하며 낮게 중심을 잡아요.", "runway": "의상의 실루엣과 재단이 잘 드러나는 런웨이 걸음이에요.", "after_bath": "목욕 후 홈웨어를 입고 타월이나 머리카락을 정리해요.", "window_vanity": "창가 화장대에서 빗이나 액세서리를 사용해요.", "late_night_kitchen": "홈웨어 차림으로 늦은 밤 음료나 간식을 준비해요.", "laundry_lounge": "집에서 세탁물이나 침구를 접고 정리해요.", "sunroom_lounge": "햇빛이 드는 실내에서 책이나 음료와 함께 쉬어요.", "floor_cushion": "바닥 쿠션에 편하게 기대어 휴식해요.", "home_workout": "집의 작은 운동 공간에서 몸을 가볍게 풀어요.", "after_party": "행사가 끝난 뒤 겉옷이나 액세서리를 정리해요.", "hotel_evening": "호텔 방에서 저녁 외출을 준비하거나 짐을 풀어요.", "balcony_night": "밤의 발코니에서 음료를 들고 바깥을 바라봐요.", "mirror_touchup": "거울 앞에서 립 메이크업이나 머리 모양을 다듬어요.", "opera_night": "극장에 갈 차림으로 코트와 작은 가방을 챙겨요.", "penthouse_window": "큰 창가에서 도시 야경을 보며 잠깐 쉬어요.", "silk_robe_evening": "이브닝 의상 위에 실크 로브를 걸치고 옷매무새를 정리해요.", "wine_bar": "와인바의 구석 자리에서 잔과 메뉴를 살펴요.", "night_drive": "차의 조수석에서 밤 풍경을 바라보는 장면이에요.", "tea_ceremony_night": "저녁의 조용한 공간에서 찻잔과 다구를 정돈해요.", "knit_lingerie": "니트 질감이 드러나는 란제리풍 의상을 불투명한 소재로 표현해요.", "morning_lingerie": "아침 빛 속에서 란제리풍 의상의 겹침과 소재를 보여줘요.", "commute_train": "대중교통에서 손잡이를 잡거나 가방을 챙기며 이동해요.", "grocery_run": "가게에서 식재료를 고르고 장바구니에 담아요.", "simple_cooking": "주방에서 재료를 썰거나 간단한 음식을 만들어요.", "cafe_takeout": "카페에서 테이크아웃 컵을 받거나 뚜껑을 정리해요.", "laundry": "세탁물을 꺼내거나 테이블 위에서 접어요.", "rain_walk": "우산을 들고 비 오는 길을 천천히 걸어요.", "station_wait": "역에서 가방과 시간을 확인하며 교통편을 기다려요.", "bookstore": "서가 앞에서 책 한 권을 꺼내 살펴봐요.", "parcel_pickup": "편의점이나 수령대에서 작은 택배 상자를 받아요.", "midnight_laundromat": "늦은 시간 세탁실에서 빨래 바구니와 세제를 정리해요.", "greenhouse": "온실이나 식물가게에서 잎을 살피고 화분을 고르세요.", "pottery_class": "공방에서 흙을 빚거나 도구로 작은 작품을 다듬어요.", "record_store": "음반 가게에서 재킷을 넘겨 보며 음반을 골라요.", "hardware_store": "생활 수리에 필요한 작은 공구나 재료를 살펴요.", "festival_daily": "지역 축제에 편한 옷차림으로 나가 먹거리와 가판대를 구경해요.", "morning_stretch": "아침에 편한 실내복으로 팔과 어깨를 가볍게 늘여요.", "window_light": "창가에서 책이나 음료를 들고 자연스럽게 쉬어요.", "late_snack": "늦은 밤 주방에서 간식이나 음료를 꺼내요.", "high_shelf": "높은 선반의 물건을 꺼내려고 팔을 위로 뻗어요.", "hair_tie": "편한 옷을 입고 양손으로 젖은 머리를 묶어요.", "laundry_soft": "부드러운 생활복 차림으로 빨래를 접거나 건조대에 걸어요.", "sunroom_relax": "햇빛이 드는 방에서 몸을 기대고 잠깐 쉬어요.", "balcony_plants": "발코니의 화분에 물을 주고 잎을 살펴요.", "rainy_return": "집에 들어와 젖은 겉옷과 우산을 정리해요.", "floor_organizing": "바닥에 앉아 옷이나 수납함을 차례로 정리해요.", "after_work_change": "퇴근 후 재킷을 벗어 옷걸이에 걸고 가방을 내려놓아요.", "fridge_light": "냉장고를 열고 늦은 밤 먹을 음료나 간식을 골라요.", "shoe_bench": "현관 벤치에 앉아 신발 끈이나 버클을 정리해요.", "mirror_selfie": "전신거울 앞에서 옷매무새를 살피거나 휴대폰을 들어요.", "window_rain": "실내 창가에서 빗방울을 바라보며 쉬어요.", "stair_landing": "계단참에서 걸음을 멈추고 가방이나 머리카락을 정리해요.", "rain_editorial": "비와 우산을 활용해 의상의 재단과 움직임을 보여줘요.", "arcade_night": "밤의 오락실에서 게임을 하거나 작은 경품을 살펴요.", "ferry_deck": "배의 갑판에서 난간 곁에 서서 바람을 맞아요.", "retro_motel": "복고풍 숙소에서 여행 가방과 옷을 정리해요.", "desert_resort": "건조한 풍경의 리조트에서 그늘을 찾아 쉬어요.", "futuristic_spa": "미래적인 휴식 공간에서 가운이나 타월을 정돈해요.", "observatory_night": "야간 천문대에서 망원경과 별자리를 살펴요.", "greenhouse_afterdark": "밤의 온실에서 식물을 관찰하거나 물을 줘요.", "rooftop_cinema": "옥상 상영회에서 담요와 간식을 챙기며 영화를 기다려요.", "winter_lodge": "겨울 산장에서 겉옷을 정리하고 따뜻한 음료를 들어요.", "art_studio": "작업이 끝난 공방에서 도구와 작품을 정돈해요.", "blade_polish": "숫돌 위에서 아직 날이 없는 강철 판을 갈아요.", "smithing_class": "주말 대장간 수업에서 집게로 달군 쇠막대를 모루에 두드려요.", "silversmith": "보석 작업대에서 실톱으로 은판을 잘라요.", "kiln_pottery": "식은 가마에서 막 유약을 입힌 그릇을 꺼내요.", "restoration_lab": "박물관 보존실에서 확대경 아래 녹슨 청동 조각을 닦아요.", "leather_craft": "가죽 공방에서 송곳과 밀랍 실로 허리 주머니를 꿰매요.", "dawn_form": "새벽 공원에서 나무 연습 도구로 천천히 품새를 이어가요.", "dojo_kata": "빈 도장 마룻바닥에서 연습 도구를 들고 자세를 잡아요.", "archery_range": "야외 궁도장에서 연습용 활을 짚 과녁 쪽으로 당겨요.", "fencing_salle": "펜싱 살에서 끝이 뭉툭한 연습검으로 발놀림을 연습해요.", "shield_drill": "훈련장에서 연습용 방패로 매달린 패드를 막아요.", "cooldown_wrap": "수련을 마치고 벤치에 앉아 손목에 천 테이프를 다시 감아요.", "offering_table": "명절 제사상에 과일·떡·작은 그릇을 차려요.", "lamp_lighting": "빛의 축제 저녁, 문간에 작은 등잔을 줄지어 켜요.", "bonfire_night": "해 질 녘 언덕의 세시 모닥불에 마른 풀 다발을 넣어요.", "lantern_float": "추모 축제 밤, 강가에 무릎 꿇고 종이 등롱을 띄워요.", "altar_flowers": "추모의 축제를 맞아 집 제단을 꽃·초·작은 유품으로 꾸며요.", "new_year_visit": "새해 첫 아침 겨울 코트 차림으로 신사나 절에서 참배해요.", "hobby_reading": "창가에 앉아 찻잔을 곁에 두고 옛 전설 그림책을 넘겨요.", "hobby_sketch": "공원 벤치에서 고목과 돌담을 수첩에 그려요.", "hobby_craft": "작업 테이블에서 비즈를 꿰어 작은 여행 부적을 만들어요.", "hobby_boardgame": "아늑한 테이블에서 보드게임 말을 옮기며 다음 수를 고민해요.", "hobby_fishing": "새벽의 조용한 나무 잔교에서 낚싯줄을 던져요.", "hobby_birdwatch": "갈대 관찰소에서 작은 쌍안경으로 습지 건너편을 살펴요.", "hobby_origami": "낮은 탁자에서 작은 종이학을 접고, 완성한 종이 인형을 옆에 세워 둬요.", "hobby_knitting": "창가 의자에서 부드러운 목도리를 떠요. 실뭉치는 옆 바구니에 있어요.", "hobby_stargazing": "밤 옥상에서 작은 망원경을 맞추며 별을 봐요.", "travel_ferry": "항구를 떠난 페리 갑판 난간에 기대어 다가오는 섬을 바라봐요.", "travel_lodge": "산장 프런트에서 배낭을 멘 채 나무 열쇠를 받아요.", "travel_cablecar": "케이블카 창가에서 안개 낀 골짜기를 내려다봐요.", "travel_footbath": "온천 마을의 지붕 있는 족욕탕에 발을 담그고 쉬어요.", "travel_dunes": "바람 무늬 진 사막 모래언덕 길에서 놋쇠 나침반으로 방향을 확인해요.", "fest_parade": "꽃으로 꾸민 퍼레이드 차에 올라 거리로 꽃잎을 뿌려요.", "fest_ringtoss": "축제 고리 던지기 가판대에서 한쪽 눈을 가늘게 뜨고 병을 겨눠요.", "fest_illumination": "겨울 조명 터널 아래를 걸으며 장갑 낀 손으로 따뜻한 음료를 들어요.", "fest_flowercrown": "봄꽃 축제 공방 테이블에서 생화로 꽃관을 엮어요.", "fest_dance": "종이 등불 아래 축제 북 무대를 돌며 간단한 원무를 춰요.", "open_air_play": "해 질 녘 옛 원형극장 돌계단에 앉아 자기 전설을 다룬 야외극을 봐요.", "sacred_grove": "전설에 나오는 숲의 고목 아래에서 쉬어요.", "holy_spring": "전설에 이름이 나오는 돌샘에서 두 손으로 물을 떠요.", "museum_shop": "박물관 기념품점에서 자기 무기의 작은 모형을 손에 들고 혼자 웃어요.", "color_block_suit": "무기의 두 색으로 나눠 재단한 정장을 입고 커프스를 고쳐요.", "knitwear_motif": "무기의 모티브를 케이블 무늬로 옮긴 두꺼운 니트예요.", "evening_cape": "무기의 윤곽을 닮은 이브닝 케이프를 두르고 계단을 내려와요.", "resort_print": "무기 모티브를 프린트한 리조트 드레스로 바다 위 테라스에 서요.", "atelier_fitting": "무기의 재료로 지은 드레스를 아틀리에에서 가봉해요.", "night_market": "네온과 종이 등불 아래 붐비는 야시장에서 종이 접시의 음식을 맛봐요.", "music_festival": "해 질 녘 야외 음악 페스티벌 잔디밭, 손목 밴드를 차고 먼지가 옅게 날려요.", "winter_market": "따뜻한 불빛의 겨울 마켓에서 벙어리장갑을 끼고 김 나는 컵을 들어요.", "office_desk": "노트북과 인쇄한 서류가 놓인 사무실 책상에서 소매를 걷고 일하는 중이에요.", "cafe_barista": "카페 카운터 안에서 셔츠 위에 앞치마를 두르고 우유 거품을 내요.", "blacksmith": "작은 금속 공방 작업대에서 가죽 앞치마 차림으로 팔찌를 줄질해요.", "museum_curator": "박물관 수장고에서 장갑을 끼고 클립보드를 들고 유물에 표를 달아요.", "archery_coach": "양궁장에서 모자와 호루라기 차림으로 학생의 활을 고쳐 잡아 줘요.", "librarian": "도서관 통로에서 바퀴 달린 수레로 오래된 책을 다시 꽂아요.", "florist": "꽃집 카운터에서 가위와 포장지로 꽃다발을 싸요.", "chef": "식당 주방 패스에서 셰프 재킷 차림으로 핀셋을 들고 접시를 담아요.", "mechanic": "정비소에서 들어 올린 차 아래, 작업복 윗도리를 허리에 묶고 걸레로 손을 닦아요.", "field_geologist": "형광 조끼를 입고 바위 비탈에서 망치와 표본 주머니로 조사해요.", "stage_tech": "무대 뒤에서 헤드셋을 끼고 조명 큐 시트를 확인해요.", "tailor": "재단실에서 줄자를 목에 걸고 마네킹의 옷에 핀을 꽂아요.", "museum_glass": "자기 전설의 무기가 놓인 박물관 진열장 앞에 서요. 유리에 얼굴이 비치고 아는 듯 살짝 웃어요.", "temple_steps": "오래된 신전이나 사당의 닳은 계단에 종이컵을 들고 앉아요. 뒤로 관광객이 흐릿해요.", "ruin_walk": "해 질 녘 무너진 열주나 돌기둥 원을 가벼운 재킷과 운동화 차림으로 걸어요.", "saga_library": "고문서 열람실에서 면장갑을 끼고 자기 전설의 복제본 쪽을 넘겨요.", "mountain_pass": "전설에 나오는 고개에서 작은 배낭을 메고 바람을 맞으며 골짜기를 내려다봐요.", "statue_plaza": "전설 속 주인의 청동상이 선 광장에서 아이스크림을 먹어요.", "relief_wall": "어두운 전시실에서 자기 무기가 새겨진 부조를 손가락 하나로 따라 그려요.", "couture_gala": "무기의 두 색과 재료로 지은 정교한 갈라 드레스를 입고 거울 앞에서 준비해요.", "street_motif": "무기의 모티브를 프린트와 금속 장식으로 옮긴 미래적인 스트리트웨어예요.", "jewelry_focus": "검은 옷은 단순하게 두고, 무기 모티브로 만든 장신구가 룩을 이끌어요.", "material_study": "원단이 무기의 재질(금속 광택·나뭇결·옻칠)을 흉내 내며 흘러내리는 에디토리얼이에요.", "heritage_couture": "자기 전통 의상의 구조를 무기의 색으로 다시 지은 옷이에요.", "cutout_onepiece": "허리 옆이 크게 트인 안감 댄 원피스 수영복.", "plunge_onepiece": "가슴 가운데가 깊게 파인 V 원피스. 허리 밴드가 단단히 잡아 준다.", "retro_highwaist": "배꼽 위까지 오는 하의에 홀터 상의를 맞춘 핀업풍 비키니.", "oring_bikini": "가슴 가운데와 골반 옆을 금속 링으로 이은 비키니.", "crochet_bikini": "안감을 댄 코바늘 니트 비키니. 휴양지 분위기.", "yacht_deck": "정박한 요트 앞 갑판 쿠션에 손을 짚고 기대 햇볕을 쬐어요.", "waterfall_pool": "바위 사이 폭포 웅덩이에 허리까지 들어가 두 손으로 젖은 머리를 넘겨요.", "beach_volley": "뜨거운 모래 위에서 스포티한 비키니 차림으로 몸을 낮춰 공을 받아요.", "paddle_board": "잔잔한 만에서 패들보드 위에 서서 노를 저어요.", "pool_float": "햇살 드는 수영장에서 커다란 튜브에 몸을 맡기고 음료를 들어요.", "cabaret_showgirl": "반짝이는 보디스와 깃털 머리장식·큰 깃털 부채의 카바레 쇼걸풍.", "witch_party": "뾰족 모자·코르셋 끈 짧은 드레스·줄무늬 스타킹의 핼러윈 마녀 의상.", "vampire_gala": "높은 깃의 벨벳 망토와 코르셋 허리 드레스의 뱀파이어 백작 부인풍.", "majorette": "깃털 모자·장식 끈 재킷·주름 미니스커트·흰 부츠의 마조렛 의상. 실제 휘장은 없다.", "sailor_stage": "세일러 칼라 크롭 상의와 주름 미니스커트의 무대 의상. 실제 해군 표식은 없다.", "lifeguard_event": "빨간 원피스풍 의상에 호루라기와 구명 튜브 소품을 든 라이프가드 이벤트 의상.", "cat_cafe": "고양이 귀 머리띠·리본 초커·프릴 앞치마 드레스의 테마 카페 의상.", "santa_party": "퍼 트림 빨간 벨벳 미니드레스와 산타 모자의 크리스마스 파티 의상.", "mermaid_show": "비늘 스팽글 보디스와 흐르는 시폰 랩스커트의 인어 쇼 의상.", "ballet_stage": "몸에 붙는 보디스와 짧은 튀튀·토슈즈의 발레 무대 의상.", "bridal_lace": "흰 레이스 세트에 짧은 베일을 쓴 예식 전 드레스룸.", "satin_teddy": "목선부터 골반까지 이어진 원피스형 새틴 란제리.", "retro_pinup": "구조 잡힌 브라와 하이웨이스트 하의의 50년대 핀업 세트.", "velvet_set": "깊은 색 벨벳 브라렛과 하이웨이스트 하의 세트.", "cage_back": "등판에서 끈이 기하학적으로 엮인 브라렛 세트.", "sport_cotton": "글자 없는 넓은 밴드의 면 세트. 밝은 아침 침실.", "chemise_silk": "무릎 위 길이에 레이스 단을 댄 불투명 실크 슈미즈.", "front_lace_corset": "앞섶을 끈으로 여미는 코르셋에 하이웨이스트 하의를 맞춘 세트.", "sauna_lounge": "사우나 휴게실에서 큰 수건을 두르고 냉수를 마셔요.", "hammock_balcony": "실크 라운지 세트 차림으로 발코니 해먹에 누워 한쪽 다리를 늘어뜨려요.", "breakfast_bed": "새틴 파자마 차림으로 침대에 앉아 무릎 위 아침 쟁반을 받쳐요.", "rooftop_party": "전구 줄 아래 도시 옥상 파티에서 등이 트인 미니드레스로 잔을 들어요.", "jazz_bar_stage": "어두운 재즈 바의 그랜드피아노에 하이 슬릿 가운 차림으로 기대요.", "flapper_party": "드롭 웨이스트 술 장식 드레스로 스피크이지 파티에서 찰스턴을 춰요.", "deco_lounge": "아르데코 호텔 라운지에서 바이어스컷 새틴 가운 차림으로 초에 불을 붙여요.", "hollywood_bias": "등이 늘어지는 30년대 바이어스컷 새틴 가운으로 옛 영화 세트 계단에 서요.", "swing_dress": "하트 넥라인 스윙 드레스로 댄스홀에서 빙그르 돌아요.", "pinup_beachball": "햇살 드는 보드워크에서 하이웨이스트 핀업 수영복 차림으로 줄무늬 비치볼을 들어요.", "pinup_car": "50년대 홀터 플레이수트 차림으로 클래식 오픈카 펜더에 기대요.", "diner_counter": "위글 스커트와 짧은 블라우스로 크롬 다이너 의자에 걸터앉아 밀크셰이크를 들어요.", "mod_mini": "기하학 색 면의 60년대 모드 미니드레스와 고고 부츠로 체크무늬 바닥에서 춤춰요.", "jetset_pool": "60년대 원피스 수영복에 스카프와 캣아이 선글라스로 리비에라 호텔 수영장에 있어요.", "disco_halter": "루렉스 홀터 점프슈트로 미러볼 아래 빛나는 디스코 바닥에 서요.", "boho_crochet": "코바늘 홀터 상의와 로우라이즈 나팔바지로 햇살 드는 페스티벌 들판에 있어요.", "roller_disco": "새틴 핫팬츠와 튜브톱 차림으로 롤러스케이트를 타고 롤러 디스코장을 미끄러져요.", "aerobics_80s": "하이컷 레오타드와 레그워머·헤어밴드로 거울 스튜디오에서 에어로빅 동작을 해요.", "power_glam": "어깨가 각진 스팽글 미니드레스로 네온 나이트클럽에 있어요.", "nineties_slip": "가는 끈 새틴 슬립드레스에 짧은 가디건을 걸치고 도시 로프트 파티에 있어요.", "y2k_lowrise": "로우라이즈 미니스커트·나비 홀터 상의·플랫폼 샌들로 쇼핑몰 분수 앞에서 폴더폰을 들어요.", "goth_chapel": "코르셋 벨트와 레이스 소매의 검은 벨벳 드레스로 옛 돌 예배당에서 초를 켜요.", "goth_cafe": "검은 레이스 미니드레스·플랫폼 부츠·은반지로 촛불 켠 고딕 카페에 있어요.", "punk_gig": "징 박힌 가죽 재킷·찢어진 티·타탄 미니스커트·워커로 작은 라이브 하우스 펜스 앞에 있어요.", "punk_alley": "끈·옷핀 달린 타탄 바지와 짧은 상의로 벽돌 골목 계단에서 부츠 끈을 매요.", "rock_backstage": "가죽 미니스커트·짧은 조끼·초커 차림으로 무대 뒤에서 기타를 조율해요.", "gyaru_street": "바디콘 미니드레스·플랫폼 힐·긴 네일아트로 번화가 스티커 사진기 앞에서 포즈를 잡아요.", "decora_harajuku": "파스텔 튀튀 스커트와 겹겹의 원색 상의·핀·팔찌로 하라주쿠 골목에 서요.", "yami_kawaii": "분홍·검정 세일러 칼라 미니드레스와 하트 초커로 크레페 가게 앞에 있어요.", "cybergoth_rave": "이마에 얹은 네온 고글·반사 미니스커트·높은 플랫폼 부츠로 자외선 조명 창고 레이브에 있어요.", "grunge_records": "허리에 묶은 큰 체크 셔츠·슬립드레스·워커로 중고 레코드 가게에 있어요.", "emo_gig": "줄무늬 긴팔·징 벨트·스키니진·체크 스니커즈로 작은 공연장에 있어요.", "steampunk_fair": "블라우스 위 브로케이드 언더버스트 벨트·짧은 버슬 스커트·놋쇠 고글로 스팀펑크 박람회에 있어요.", "gothic_lolita": "흑백 레이스 점퍼스커트와 보닛 차림으로 장미 정원 티 살롱에 있어요.", "skater_bowl": "짧은 후디·카고 반바지·긴 양말로 스케이트 보울에 뛰어들어요.", "biker_cafe": "밴도 상의 위로 연 가죽 라이딩 재킷·가죽 바지로 길가 카페의 오토바이 옆에 서요.", "raver_kandi": "메탈릭 홀터 크롭톱·카고 미니스커트·비즈 팔찌로 레이저 아래 야외 레이브에 있어요.", "visual_kei": "레이스 소맷부리의 검정·은색 겹 무대 의상으로 라이브 하우스 조명 아래 서요.", "club_floor": "스팽글 바디콘 미니드레스로 색 조명 아래 붐비는 클럽 플로어에서 춤춰요.", "dj_booth": "컷아웃 미니드레스로 DJ 부스 옆 난간에 기대 한 손을 박자에 맞춰 들어요.", "neon_bar": "등이 트인 새틴 상의와 가죽 미니스커트로 네온 바 카운터에서 색 음료를 들어요.", "karaoke_room": "오프숄더 스팽글 상의와 반바지 차림으로 노래방에서 마이크를 잡고 노래해요.", "powder_mirror": "홀터 미니드레스로 클럽 파우더룸 거울 앞에서 립스틱을 고쳐 발라요.", "club_queue": "슬립 미니드레스 위에 짧은 인조 퍼 재킷을 걸치고 밤의 클럽 앞 줄에 서요.", "vip_booth": "원숄더 스팽글 드레스로 벨벳 VIP 부스에 기대앉아요.", "night_taxi": "밤 외출 뒤 미니드레스 차림으로 택시 뒷좌석에서 창밖 불빛을 봐요.", "tango_solo": "등 트인 하이 슬릿 댄스 드레스로 밀롱가 나무 바닥에서 혼자 탱고 오초를 연습해요.", "salsa_spin": "술 장식 살사 드레스로 댄스홀에서 회전하는 순간, 술이 퍼져요.", "flamenco": "프릴 자락과 몸에 붙는 보디스의 플라멩코 드레스로 타블라오 무대에서 발을 굴러요.", "belly_dance": "동전 장식 상의와 낮게 두른 시폰 스커트로 등불 무대에서 베일을 돌려요.", "jazz_kick": "스팽글 재즈 레오타드와 짧은 플레어 스커트로 조명 무대에서 하이킥을 해요.", "dance_mirror": "짧은 댄스 상의와 하이웨이스트 반바지로 연습실 거울을 보며 자세를 확인해요.", "hula": "꽃 레이·밴도 상의·반바지 위 풀치마로 노을 진 해변 무대에서 훌라를 춰요.", "kpop_practice": "짧은 저지 상의와 카고 미니스커트로 연습실에서 날카로운 안무 동작을 잡아요.", "ballroom_waltz": "몸에 붙는 보디스의 볼룸 가운으로 샹들리에 무도회장에서 혼자 왈츠 스텝을 돌아요.", "rotenburo_edge": "수영복 차림으로 노천탕 돌 가장자리에 앉아 김 나는 물에 발을 담가요.", "hinoki_bath": "산속 료칸 창가의 히노키 탕에 수영복 차림으로 팔을 가장자리에 얹어요.", "jjimjilbang": "찜질복에 양머리 수건을 쓰고 뜨끈한 바닥에서 식혜를 마셔요.", "spa_robe_lounge": "수영복 위에 두툼한 가운을 걸치고 조용한 스파 라운지에서 허브차를 따라요.", "hammam": "줄무늬 면 페슈테말을 두르고 돔 지붕 하맘의 따뜻한 대리석에 앉아요.", "mud_mask": "가운 차림에 얼굴에 진흙 팩을 바르고 오이 조각을 든 채 쉬어요.", "spa_pool": "해 질 녘 김 오르는 스파 풀 가장자리에 수영복 차림으로 팔꿈치를 얹어요.", "cold_plunge": "사우나를 마치고 스포티한 수영복 차림으로 냉탕에 들어서며 숨을 들이켜요.", "elf_costume": "잎 장식 짧은 드레스·후드 반망토·뾰족 귀 소품의 엘프 의상으로 숲 테마 파티에 있어요.", "fairy_wings": "꽃잎 겹 미니드레스와 반짝이는 날개 소품으로 꽃 촬영 스튜디오에서 반짝이를 뿌려요.", "angel_devil": "빨간 새틴 미니드레스·뿔 머리띠·꼬리 소품에 한쪽 어깨엔 흰 깃털 날개를 단 천사·악마 의상으로 핼러윈 파티에 있어요.", "sorceress_robe": "오프숄더 벨벳 로브 드레스와 보석 벨트·수정 지팡이 소품으로 판타지 촬영에 서요.", "cosplay_photozone": "짧은 망토의 창작 판타지 의상으로 행사장 포토존 링라이트 아래 포즈를 잡아요.", "forest_spirit": "이끼색 드레이프 드레스와 꽃관·덩굴로 안개 낀 정원 촬영에 서요.", "star_goddess": "수정 별을 흩뿌린 짙은 남색 드레스와 초승달 머리장식으로 별빛 세트에 서요.", "fae_ball": "등 트인 드레스와 날개 모양 망토·잎사귀 가면으로 판타지 가면무도회에 있어요.", "moon_priestess": "흰 원숄더 드레이프 드레스·은 팔찌·월장석 머리띠로 등불 축제에 있어요.", "gown_fitting": "등이 트인 웨딩드레스를 입고 가봉대에 서서 보디스를 핀으로 맞춰요.", "before_ceremony": "하트 넥라인 웨딩드레스와 베일 차림으로 신부 대기실 창가에서 부케를 들어요.", "garden_aisle": "꽃 아치 아래 정원 버진로드를 흐르는 드레스 차림으로 혼자 걸어요.", "self_wedding_shoot": "바닷바람 부는 절벽에서 트임 있는 웨딩드레스로 셀프 웨딩 촬영을 해요.", "veil_wind": "노을 진 해변에서 슬립 웨딩드레스 차림으로 바람에 날리는 긴 베일을 잡아요.", "reception_gown": "피로연에서 등 트인 드레스로 댄스 플로어에서 돌아요.", "second_dress": "비즈 장식 짧은 2부 드레스로 피로연에서 웃으며 구두를 벗어요.", "bridal_shower": "흰 오프숄더 미니드레스와 띠를 두르고 브라이덜 샤워 테이블에서 선물 상자를 열어요.", "honeymoon_suite": "바다 바람이 드는 신혼여행 스위트 발코니에서 실크 슬립드레스로 잔을 들어요.", "red_carpet": "하이 슬릿 이브닝 가운으로 레드카펫에 들어서며 플래시 쪽으로 몸을 돌려요.", "photo_wall": "원숄더 스팽글 가운으로 무늬만 있는 포토월 앞에서 한 손을 허리에 얹어요.", "festival_steps": "긴 자락 가운 차림으로 영화제의 붉은 대계단을 올라요.", "award_ceremony": "깊이 파인 벨벳 가운으로 시상식 무대로 걸어 나가며 금빛 트로피를 들어요.", "gala_dinner": "등 트인 실크 가운으로 촛불 켠 갈라 디너 테이블에서 샴페인 잔을 들어요.", "charity_auction": "어깨 없는 새틴 가운과 긴 장갑으로 자선 경매에서 응찰 패를 들어요.", "front_row": "조형적인 미니드레스로 패션위크 쇼 앞줄에 다리를 꼬고 앉아요.", "museum_gala": "등 트인 칼럼 가운으로 웅장한 박물관 홀 갈라에 서요. 뒤로 대리석 조각상이 있어요.", "afterparty_stairs": "갈라가 끝난 뒤 새틴 가운 차림으로 대계단에 앉아 구두를 한 손에 들어요."};
  /* 강도 축 — AUTO 면 안 붙는다. [값] → [한국어 설명, 영어 문장] */
  var CASUAL_AXES = ["overall_intensity", "skin_exposure", "action_level", "weapon_influence", "separates_preference"];
  var CASUAL_AXIS_OPTIONS = {"overall_intensity": ["AUTO", "restrained", "sensual", "bold", "strong"], "skin_exposure": ["AUTO", "low", "moderate", "bold"], "action_level": ["AUTO", "mostly posed", "balanced", "mostly active"], "weapon_influence": ["AUTO", "subtle", "balanced", "strong"], "separates_preference": ["AUTO", "balanced", "prefer separates", "strongly prefer separates"]};
  var CASUAL_AXIS_LABELS = {"overall_intensity": ["Overall Intensity", "전체 강도"], "skin_exposure": ["Skin Exposure", "피부 노출 정도"], "action_level": ["Action Level", "액션 비중"], "weapon_influence": ["Weapon Motif Influence", "무기 모티브 영향도"], "separates_preference": ["Separates Preference", "분리형 의상 선호"]};
  var CASUAL_AXIS_GUIDES = {"overall_intensity": {"restrained": ["의상과 태도를 차분하게 절제해요. 노출량은 별도 선택이에요.", "understated styling and restrained demeanor; exposure is separate"], "sensual": ["부드러운 옷의 흐름과 여유 있는 몸짓으로 관능미를 표현해요.", "sensual fabric drape and relaxed expressive posture; no automatic extra exposure"], "bold": ["대담한 의상선과 자신감 있는 태도로 강도를 높여요.", "bold outfit lines and confident demeanor; honor chosen coverage"], "strong": ["선택한 장면 안에서 의상·태도의 존재감을 가장 강하게 해요.", "maximal styling presence within the scene; retain chosen exposure and anatomy"]}, "skin_exposure": {"low": ["목·손 정도의 제한된 노출이에요. 직접 지정한 의상이 우선해요.", "mostly covered clothing, limited neck/hand exposure unless outfit is explicit"], "moderate": ["팔이나 종아리 등 일부 부위를 드러내요. 가슴·골반은 가려요.", "some exposed arms or lower legs, with chest and pelvis covered"], "bold": ["어깨·등·복부·다리에서 장면에 맞는 부위를 더 드러내요. 가슴·골반은 가려요.", "more scene-appropriate shoulder, back, midriff or leg exposure; cover chest and pelvis"]}, "action_level": {"mostly posed": ["한 장 안에서 잠시 멈추거나 자세를 유지하는 순간이에요.", "a paused or held moment of the selected activity"], "balanced": ["자세를 읽기 쉬운 가벼운 동작의 한 순간이에요. 컷 수 비율이 아니에요.", "a readable moment of gentle movement, not a ratio of multiple images"], "mostly active": ["선택한 활동을 실제로 수행하는 중간 순간이에요. 포즈 선택과 충돌하면 포즈를 유지해요.", "an active mid-action moment compatible with the selected pose"]}, "weapon_influence": {"subtle": ["원본의 색 포인트나 작은 장신구 정도만 반영해요.", "one restrained weapon-color accent or small accessory"], "balanced": ["색과 작은 무늬 등 두 가지 안팎의 특징을 의상에 반영해요.", "a few weapon color and marking cues integrated into everyday clothing"], "strong": ["원본 색·무늬를 의상 디자인에서 분명하게 보여줘요. 장갑이나 종족 신체는 추가하지 않아요.", "clearly recognizable weapon palette and motifs in clothing, not new armor or creature anatomy"]}, "separates_preference": {"balanced": ["장면에 맞춰 원피스나 상하의 조합을 선택해요. 둘을 겹치라는 뜻은 아니에요.", "choose either a one-piece outfit or separates to suit the scene"], "prefer separates": ["명시한 의상이 없으면 상의·하의를 나눈 조합을 선호해요.", "prefer separate top and bottom unless outfit is explicitly specified"], "strongly prefer separates": ["명시한 의상이 없으면 상의·하의 조합을 기본으로 해요.", "use separate top and bottom by default; explicit outfit takes priority"]}};
  /* 자세·방향·표정 — 일상컷 장면 축. [key, 한국어] 와 key → 영어 문장 */
  var CASUAL_POSES = [
    ["", "자동 — 장면에 맞게"],
    ["standing_relaxed", "편하게 선 자세"],
    ["standing_formal", "반듯하게 서기"],
    ["contrapposto", "한쪽 다리에 무게 싣기"],
    ["hand_on_hip", "허리에 손"],
    ["arms_crossed", "팔짱"],
    ["sitting", "의자에 앉기"],
    ["sitting_floor", "바닥에 앉기"],
    ["kneeling", "무릎을 댄 자세"],
    ["leaning_wall", "벽에 기대기"],
    ["leaning_furniture", "가구에 기대기"],
    ["walking", "걷기"],
    ["mid_stride", "걸음 중간"],
    ["stretching", "기지개"],
    ["bending_over", "상체 숙이기"],
    ["on_tiptoe", "발끝 세우기"],
    ["hands_in_hair", "머리 정리하기"],
    ["carrying_something", "물건 들기"],
    ["mid_action", "동작 한가운데"],
    ["squatting", "쪼그려 앉기"],
    ["one_knee_up", "한쪽 무릎 세워 앉기"],
    ["side_sitting", "다리를 옆으로 두고 앉기"],
    ["cross_legged", "책상다리로 앉기"],
    ["perched_seat", "걸터앉기"],
    ["turning_back", "돌아보는 순간"],
    ["waving", "가볍게 손 흔들기"],
    ["holding_cup", "컵 들고 쉬기"],
    ["reading_book", "책 읽기"],
    ["preparing_food", "음식 준비하기"],
    ["taking_photo", "사진 찍기"],
    ["adjusting_bag", "가방끈 고쳐 메기"],
    ["checking_map", "지도 펼쳐 보기"],
    ["small_jog", "가벼운 조깅"],
    ["dance_step", "작은 댄스 스텝"]
  ];
  var CASUAL_POSE_EN = {"standing_relaxed": "Stand at ease with relaxed shoulders and naturally balanced feet.", "standing_formal": "Stand upright with a balanced stance and a composed posture.", "contrapposto": "Rest weight on one leg with the opposite knee relaxed in natural contrapposto.", "hand_on_hip": "Place one hand on the hip and let the other arm rest naturally or support the scene's prop.", "arms_crossed": "Fold the arms comfortably across the torso with readable hands.", "sitting": "Sit naturally on a chair or bench with supported feet and readable hands.", "sitting_floor": "Sit on the floor or a mat with both legs in front of the hips — stretched out or knees loosely raised — two separate legs and both feet in view, heels resting on the floor.", "kneeling": "Kneel for a low task: both knees on the floor, shins lying flat and parallel behind them, both feet behind the hips with the tops of the feet on the floor and the soles facing up.", "leaning_wall": "Lean a shoulder or the back lightly against a wall while keeping balance through the feet.", "leaning_furniture": "Rest a hand or forearm on a table, counter or railing in a relaxed supported pose.", "walking": "Walk at a comfortable pace with a natural step and arm swing.", "mid_stride": "Capture a clear mid-stride step with believable weight transfer.", "stretching": "Stretch the arms and upper back gently in a comfortable everyday motion.", "bending_over": "Bend forward slightly to examine or reach a low object with a balanced stance.", "on_tiptoe": "Rise slightly onto the toes to reach a higher object without changing limb proportions.", "hands_in_hair": "Use the hands to tidy the established hairstyle without changing its cut or length.", "carrying_something": "Carry the scene's bag, basket or box with believable hand contact and weight.", "mid_action": "Capture the selected activity already in progress with a readable natural gesture.", "squatting": "Squat comfortably to interact at a lower height with balanced feet.", "one_knee_up": "Sit on a mat with one knee raised and that foot flat on the floor, the other leg folded flat in front, and an arm resting on the raised knee; both feet in view.", "side_sitting": "Side-sit on a mat: hips on the mat, both knees bent and pointing to the same side, both lower legs folded back so the two feet lie side by side next to the opposite hip; torso upright.", "cross_legged": "Sit cross-legged on a floor cushion: knees open to either side, shins crossed in front of the hips, each foot tucked under the opposite knee with its outer edge on the cushion; relaxed shoulders and readable hands.", "perched_seat": "Perch on a low ledge or bench with the feet resting naturally below.", "turning_back": "Pause mid-step and turn the head and shoulders gently back over one shoulder — a quarter turn at most, face in three-quarter or profile — without twisting the torso unnaturally.", "waving": "Raise one hand near shoulder height in a friendly small wave.", "holding_cup": "Hold a cup comfortably in one or both hands during a quiet break.", "reading_book": "Hold an open book with readable finger placement and look toward its pages.", "preparing_food": "Work at a kitchen counter, stirring a bowl or arranging ingredients with clearly separated hands and utensils.", "taking_photo": "Hold a camera with both hands to photograph a subject in the scene.", "adjusting_bag": "Adjust a shoulder strap with one hand while supporting the travel bag naturally.", "checking_map": "Hold a folded-out route map in both hands while checking the surroundings.", "small_jog": "Jog lightly with compact arm movement and a believable running step.", "dance_step": "Take a small rhythmic dance step with coordinated arms and balanced feet."};
  var CASUAL_ORIENTS = [
    ["", "AUTO — 자동"],
    ["front", "front — 정면"],
    ["front_3q", "front three-quarter — 앞 3/4"],
    ["side", "side profile — 측면"],
    ["rear_3q", "rear three-quarter — 뒤 3/4"],
    ["back", "back view — 뒷태"],
    ["over_shoulder", "over shoulder — 뒤돌아보기"],
    ["seated_twist", "seated twist — 앉은 비틀기"],
    ["walking_away", "walking away — 멀어지는 방향"],
    ["turning_midmotion", "turning mid-motion — 움직임 중 회전"],
    ["low_angle", "low angle — 아래에서 올려다본 각도"],
    ["high_angle", "high angle — 위에서 내려다본 각도"],
    ["leaning_forward", "leaning forward — 앞으로 기울인 상체"],
    ["leaning_back", "leaning back — 뒤로 젖힌 상체"],
    ["crouching", "crouching — 쪼그린 자세"],
    ["reclining", "reclining — 기대 누운 자세"],
    ["reaching_up", "reaching up — 위로 손 뻗기"],
    ["looking_down", "looking down — 시선을 아래로"],
    ["looking_away", "looking away — 시선을 밖으로"],
    ["back_to_camera", "back to camera — 완전히 등진 자세"],
    ["profile_close", "close profile — 측면 근접"],
    ["three_quarter_back", "three-quarter back — 뒤 3/4 강조"]
  ];
  var CASUAL_ORIENT_EN = {"front": "torso and pelvis face the camera; gaze is independent", "front_3q": "front three-quarter body turn of about 30-45 degrees; rotate torso and pelvis together", "side": "side body profile, approximately 90 degrees to camera", "rear_3q": "rear three-quarter view showing back and one flank; the head turns no more than a quarter turn, face in profile or three-quarter", "back": "back centered toward camera; if the face shows, the head turns no more than a quarter turn over one shoulder, face in profile", "over_shoulder": "body turned away, head looking back over one shoulder — a quarter turn at most, face in three-quarter or profile with the chin above that shoulder", "seated_twist": "seated with supported pelvis and a natural torso twist", "walking_away": "walking away from camera with a readable rearward stride", "turning_midmotion": "mid-turn body motion with equipment following its body mounts", "low_angle": "camera below subject looking upward; obey selected framing", "high_angle": "camera above subject looking downward; obey selected framing", "leaning_forward": "torso leaning forward with supported balance", "leaning_back": "torso leaning backward with clear support", "crouching": "low crouch with flexed knees and hips", "reclining": "reclined body supported by a surface", "reaching_up": "reach upward with natural shoulder articulation", "looking_down": "gaze directed downward; camera height unchanged", "looking_away": "gaze off-camera; body orientation independent", "back_to_camera": "body fully facing away; no forced face visibility", "profile_close": "side profile, close only when no explicit framing is selected", "three_quarter_back": "rear three-quarter view with natural equipment depth and occlusion; the head turns no more than a quarter turn, face in profile or three-quarter"};
  var CASUAL_EXPRESSIONS = [
    ["", "AUTO — 자동"],
    ["calm", "calm — 차분함"],
    ["focused", "focused — 집중"],
    ["soft_smile", "soft smile — 옅은 미소"],
    ["half_smile", "half-smile — 은은한 미소"],
    ["playful", "playful — 장난기"],
    ["confident", "confident — 자신감"],
    ["sensual", "sensual — 자연스러운 섹시"],
    ["provocative", "provocative — 도발적이되 비노출"],
    ["sleepy", "sleepy — 졸린 느낌"],
    ["candid", "candid — 생활감"],
    ["mildly_annoyed", "mildly annoyed — 약간 짜증"],
    ["surprised", "surprised — 놀람"],
    ["curious", "curious — 호기심"],
    ["serious", "serious — 진지함"],
    ["amused", "amused — 재미있어하는"],
    ["bored", "bored — 심드렁함"],
    ["pensive", "pensive — 생각에 잠긴"],
    ["smug", "smug — 우쭐한"],
    ["gentle", "gentle — 온화함"],
    ["determined", "determined — 결의에 찬"],
    ["exhausted", "exhausted — 지친"],
    ["nostalgic", "nostalgic — 아련한"],
    ["unimpressed", "unimpressed — 시큰둥함"],
    ["flustered", "flustered — 당황한"],
    ["proud", "proud — 자랑스러운"],
    ["wistful", "wistful — 그리운 듯한"],
    ["mischievous", "mischievous — 짓궂은"],
    ["relieved", "relieved — 안도한"],
    ["cold_smile", "cold smile — 차가운 미소"],
    ["laughing", "laughing — 소리내어 웃는 · 눈 감김"],
    ["laughing_open", "laughing, eyes open — 소리내어 웃는 · 눈 뜬 채"]
  ];
  var CASUAL_EXPRESSION_EN = {"calm": "relaxed brow, softly open eyes, lips closed and unstrained, no smile", "focused": "slightly drawn brow, narrowed steady eyes fixed on one point, mouth firmly closed", "soft_smile": "faint upward pull at the mouth corners, lips together, warmth reaching the lower eyelids", "half_smile": "one mouth corner lifted higher than the other, lips closed, gaze slightly to the side", "playful": "asymmetric grin with teeth just showing, one brow raised, eyes narrowed with amusement", "confident": "level brow, direct unhurried gaze, chin slightly raised, mouth closed and composed", "sensual": "heavy-lidded eyes, lips slightly parted and relaxed, brow smooth, chin a little lowered", "provocative": "direct challenging gaze under lowered lids, one brow raised, mouth corner tugged in a slight smirk", "sleepy": "heavy drooping eyelids, unfocused gaze, softened slack mouth, brow low and relaxed", "candid": "caught mid-motion, eyes off camera, mouth in an unposed in-between shape", "mildly_annoyed": "inner brows drawn together, one eye slightly narrowed, mouth pressed flat to one side", "surprised": "raised brows, widened eyes with visible upper white, mouth open in a small round shape", "curious": "one brow raised higher, head tilted, eyes wide and attentive, lips slightly parted", "serious": "level lowered brow, steady unblinking gaze, mouth closed in a straight line, jaw set", "amused": "crinkled lower eyelids, closed-lip smile pushing the cheeks up, brows relaxed", "bored": "lidded half-open eyes looking away, slack mouth, brows flat and unengaged", "pensive": "gaze angled down and away, slightly furrowed brow, lips lightly pressed or touched", "smug": "one mouth corner lifted, lids lowered in a knowing look, chin tipped slightly up", "gentle": "softly lowered brows, warm relaxed eyes, faint closed-lip smile, no tension anywhere", "determined": "brows pulled down and in, hard forward gaze, jaw clenched, mouth a tight line", "exhausted": "drooping lids and brows, dull unfocused gaze, mouth slightly open and slack, shoulders of the face fallen", "nostalgic": "soft distant gaze past the camera, faint wistful half-smile, brows gently raised at the inner ends", "unimpressed": "flat level brows, half-lidded deadpan stare, mouth in a straight unmoved line", "flustered": "raised inner brows, darting or averted eyes, mouth slightly open, faint blush across the cheeks and nose", "proud": "chin lifted, brows level, eyes bright and steady, closed-lip smile with a firm mouth", "wistful": "gaze softened and directed slightly upward or away, faint sad smile, inner brows raised", "mischievous": "narrowed sparkling eyes, one brow up, closed-lip grin pushed to one side", "relieved": "brows released upward and outward, eyes half closed, breath-out mouth slightly open, whole face loosened", "cold_smile": "mouth smiling while the eyes stay flat and unsmiling, brows level, gaze direct and unwarm", "laughing": "head tipped back slightly, eyes squeezed nearly shut, mouth open wide with teeth showing, cheeks raised high", "laughing_open": "mouth open wide in a laugh with teeth showing and cheeks raised, but the eyes stay open and engaged — lids only slightly narrowed, gaze still readable rather than squeezed shut"};
  var CASUAL_FRAME_EN = {"environmental": "Environmental long shot: show the complete woman and enough surroundings to establish the activity and location.", "full_body": "Full-body framing: keep the complete head, hands and feet inside the frame with restrained margins.", "three_quarter": "Three-quarter portrait framing from the head to just above the knees, with the scene's hand action readable.", "waist_up": "Waist-up framing showing the head, torso and relevant hand gesture; place essential props inside this crop.", "chest_up": "Chest-up framing focused on the face, shoulders and expression with a small amount of setting.", "face_close": "Close-up of the face and hairstyle, preserving the approved facial identity and using only a subtle background.", "detail": "Detail framing centered on the woman's hands and the scene's object or task, with natural anatomy and readable contact."};
  var CASUAL_LENS_EN = {"wide24": "24mm-equivalent wide-angle impression with spacious environmental depth; use enough camera distance to avoid stretching the face or limbs.", "documentary35": "35mm-equivalent environmental perspective balancing the woman and the setting with moderate depth.", "natural50": "50mm-equivalent natural perspective with balanced proportions and modest depth compression.", "portrait85": "85mm-equivalent short-telephoto perspective from a suitable distance, with gentle background compression.", "telephoto135": "135mm-equivalent telephoto perspective from farther away, with compressed background depth and unchanged anatomy."};
  /* 뒤돌아보기 — 등이 카메라를 보는 각도·돌아보는 자세에서 등 위에 정면 얼굴이 붙었다(pkm 2026-10-25 같은 문제). 이 각도·자세에만 CASUAL_RULES.lookBack 을 싣는다 */
  var LOOK_BACK = { orient: ['rear_3q', 'three_quarter_back', 'over_shoulder', 'back'], pose: ['turning_back'] };
  var CASUAL_RULES = {
    lookBack: 'LOOK-BACK: her back is toward the camera, so her head turns at most a quarter turn over one shoulder — the face shows in profile or three-quarter view, never full-front on a back-facing torso. Her chin sits just above the near shoulder, the far eye and cheek may be partly hidden, the side of the neck shows the turn and the shoulder line continues behind the head; her eyes, not her whole face, swing toward the camera.',
    input: 'IMAGE-GUIDED CONTINUATION. Use the attached approved image of this character as the identity input. Preserve face geometry, age, ethnicity, eye shape and colors, skin tone, hair color and cut, height and body proportions; expression and natural hair motion may change, not facial structure or haircut. Render her in the selected style rather than copying the attached image\u2019s rendering.',
    project: 'Show one woman in a coherent everyday, fashion or other requested scene. Ordinary clothing is the default; her mecha armor never appears in a casual scene. Her weapon shows only as a subtle color accent, a small accessory or a motif on the clothing, never as an object she holds. Never require cosplay of the weapon.',
    material: 'Clothing remains clothing: distinguish fabric from exposed skin through garment edges, seams, drape and material-appropriate folds. Preserve the requested fabric and finish, including satin, leather or other explicitly chosen materials; do not force everything matte. Exposed skin is living skin with soft anatomical shading, no panel seams or metallic reflections. Do not turn garments into rigid shells or introduce mechanical parts.',
    camera: 'Camera, crop, viewpoint, pose and environment may change to support this scene. Do not inherit the card art\u2019s framing. Preserve identity and readable anatomy through movement. The selected rendering style still controls lighting and surfaces.',
    priority: "SELECTED SCENE PRIORITY: Explicit pose, orientation, framing and lens choices take priority over incidental staging in category guides or examples. Adapt the activity and its props to those choices without changing identity; never force a full-body view when a close crop is selected. Lens values describe an illustrative perspective, not mandatory photographic rendering or background blur.",
    negative: 'One coherent human body with two arms and two legs; no duplicated hands, faces or accidental limbs. No childlike age regression, no identity replacement, no collage, no captions, no logos, no watermarks. Keep facial identity and anatomy independent of rendering stylization and outfit volume.',
    final: 'Before finishing, verify one woman, the same identity as the attached image, a casual scene with no armor and no weapon in hand, coherent anatomy and the selected rendering style.'
  };

  /* 화풍 견본 문장(스타일만 시험할 때) */
  var STYLE_SAMPLE = 'One adult woman standing in a plain studio, full body, holding a plain straight sword, neutral expression, simple grey backdrop.';

  root.AtelierSpec = {
    STYLES: STYLES, DEFAULT_STYLE: DEFAULT_STYLE, RULES: RULES, OUTPUTS: OUTPUTS,
    CORE: CORE, HOLD_LINE: HOLD_LINE, ARMOR_WORN: ARMOR_WORN, ARMOR_WEAR: ARMOR_WEAR, HANDS_LINE: HANDS_LINE, ARMOR_HANDS: ARMOR_HANDS, DESIGNS: DESIGNS, EXTRAS: EXTRAS, EMBODIMENT: EMBODIMENT,
    MYTH_FLAVOR: MYTH_FLAVOR, KIND_SILHOUETTE: KIND_SILHOUETTE, ACTIONS: ACTIONS,
    PARAM_GROUPS: PARAM_GROUPS, PARAMS: PARAMS,
    FIGURE_BASE: FIGURE_BASE, FIGURE_VALUES: FIGURE_VALUES, COLOR_KEYS: COLOR_KEYS, COLOR_HEX: COLOR_HEX,
    CASUAL_CATS: CASUAL_CATS, CASUAL_EXAMPLES: CASUAL_EXAMPLES, CASUAL_EX_NOTE: CASUAL_EX_NOTE, CASUAL_PRACTICE: CASUAL_PRACTICE, CASUAL_RITES: CASUAL_RITES,
    CASUAL_AXES: CASUAL_AXES, CASUAL_AXIS_OPTIONS: CASUAL_AXIS_OPTIONS, CASUAL_AXIS_LABELS: CASUAL_AXIS_LABELS, CASUAL_AXIS_GUIDES: CASUAL_AXIS_GUIDES,
    CASUAL_POSES: CASUAL_POSES, CASUAL_POSE_EN: CASUAL_POSE_EN, CASUAL_ORIENTS: CASUAL_ORIENTS, CASUAL_ORIENT_EN: CASUAL_ORIENT_EN, LOOK_BACK: LOOK_BACK,
    CASUAL_EXPRESSIONS: CASUAL_EXPRESSIONS, CASUAL_EXPRESSION_EN: CASUAL_EXPRESSION_EN, CASUAL_FRAME_EN: CASUAL_FRAME_EN, CASUAL_LENS_EN: CASUAL_LENS_EN,
    CASUAL_RULES: CASUAL_RULES, STYLE_SAMPLE: STYLE_SAMPLE
  };
})(typeof window !== 'undefined' ? window : globalThis);
