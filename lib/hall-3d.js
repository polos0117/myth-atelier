/* 만신전 홀의 진짜 3D — 흑요석 기둥 여섯, 금 갓, 제단 위 금빛 등불, 떠오르는 불티.
   Three.js 를 CDN 에서 그때 받는다(만신전을 골랐을 때만). 못 받으면 mount 가 거부하고
   CSS 기둥이 그대로 선다 — 검사 하네스와 CDN 막힌 곳에서도 화면은 깨지지 않는다.
   저장소는 원래 라이브러리를 안 쓴다. 이건 만신전 하나에 한한 실험이다 (docs/PATCH.md). */
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

/* 기둥 자리 — CSS 기둥(.hall-col nth-child)과 같은 배치: 앞 둘, 가운데 둘, 뒤 둘 */
const SPOTS = [[-3.9, 2.2], [3.9, 2.2], [-2.9, -1.2], [2.9, -1.2], [-2.1, -4.4], [2.1, -4.4]];
const MODES = {
  base:   { lamp: 0xf3dc9a, power: 26, rim: 0x5a4a90, rimPower: 6,  spark: 0xffe9a8 },
  awaken: { lamp: 0xfff1c0, power: 60, rim: 0xd9b56a, rimPower: 14, spark: 0xfff6d0 },
  cursed: { lamp: 0xe0304a, power: 40, rim: 0xc0143c, rimPower: 18, spark: 0xff5a74 }
};

export async function mount(host) {
  if (!host || host.querySelector('.hall-gl')) return null;
  const T = await import(THREE_URL);
  let canvas;
  try { canvas = document.createElement('canvas'); if (!canvas.getContext('webgl2') && !canvas.getContext('webgl')) return null; }
  catch (e) { return null; }
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  canvas.className = 'hall-gl';
  host.insertBefore(canvas, host.firstChild);

  const scene = new T.Scene();
  scene.fog = new T.FogExp2(0x0b0a0d, 0.055);
  const camera = new T.PerspectiveCamera(42, 1, 0.1, 60);
  camera.position.set(0, 2.3, 11.5);
  const look = new T.Vector3(0, 2.5, -1);

  /* 재료 — 흑요석은 매끈한 검은 유리(clearcoat), 금은 살짝 거친 금속 */
  const obsidian = new T.MeshPhysicalMaterial({ color: 0x0a0910, roughness: 0.22, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12, reflectivity: 1 });
  const gold = new T.MeshStandardMaterial({ color: 0xd9b56a, roughness: 0.32, metalness: 0.85, emissive: 0x2a1c06 });
  const goldDark = new T.MeshStandardMaterial({ color: 0x8a6a2a, roughness: 0.45, metalness: 0.8, emissive: 0x1a1004 });
  const floorMat = new T.MeshStandardMaterial({ color: 0x0d0b11, roughness: 0.28, metalness: 0.35 });

  /* 바닥 — 반사가 조금 있는 검은 돌, 금 격자 선을 그려 붙인다 */
  const gridCanvas = document.createElement('canvas'); gridCanvas.width = gridCanvas.height = 512;
  const g = gridCanvas.getContext('2d'); g.fillStyle = '#0d0b11'; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(226,194,117,.28)'; g.lineWidth = 2;
  for (let i = 0; i <= 512; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
  const gridTex = new T.CanvasTexture(gridCanvas); gridTex.wrapS = gridTex.wrapT = T.RepeatWrapping; gridTex.repeat.set(16, 16);
  gridTex.colorSpace = T.SRGBColorSpace;
  floorMat.map = gridTex;
  const floor = new T.Mesh(new T.PlaneGeometry(60, 60), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  /* 기둥 — 몸통은 아래가 조금 넓고(엔타시스), 갓은 에키누스 + 주판, 받침은 토러스 */
  const shaftGeo = new T.CylinderGeometry(0.30, 0.36, 4.6, 64, 1);
  const echinusGeo = new T.CylinderGeometry(0.52, 0.34, 0.22, 64);
  const abacusGeo = new T.BoxGeometry(1.05, 0.14, 1.05);
  const torusGeo = new T.TorusGeometry(0.40, 0.09, 24, 64);
  const plinthGeo = new T.BoxGeometry(1.0, 0.14, 1.0);
  const columns = new T.Group();
  SPOTS.forEach(([x, z]) => {
    const c = new T.Group();
    const shaft = new T.Mesh(shaftGeo, obsidian); shaft.position.y = 2.3 + 0.2; shaft.castShadow = true; c.add(shaft);
    const ech = new T.Mesh(echinusGeo, gold); ech.position.y = 4.8 + 0.11; c.add(ech);
    const aba = new T.Mesh(abacusGeo, gold); aba.position.y = 5.02 + 0.07; c.add(aba);
    const tor = new T.Mesh(torusGeo, goldDark); tor.rotation.x = Math.PI / 2; tor.position.y = 0.25; c.add(tor);
    const pli = new T.Mesh(plinthGeo, goldDark); pli.position.y = 0.07; c.add(pli);
    c.position.set(x, 0, z); columns.add(c);
  });
  scene.add(columns);

  /* 빛 — 제단 위 금빛 등불 하나가 주광, 뒤에서 남보라 림, 바닥에 낮은 채움 */
  scene.add(new T.AmbientLight(0x3a3040, 0.7));
  scene.add(new T.HemisphereLight(0x6a5a80, 0x0b0a0d, 0.5));
  const lamp = new T.PointLight(0xf3dc9a, 26, 22, 1.8); lamp.position.set(0, 4.2, -1.2);
  lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.002; scene.add(lamp);
  const rimL = new T.SpotLight(0x5a4a90, 6, 30, 0.6, 0.6, 1); rimL.position.set(-6, 7, -8); rimL.target.position.set(0, 2, 0); scene.add(rimL, rimL.target);
  const rimR = new T.SpotLight(0x5a4a90, 6, 30, 0.6, 0.6, 1); rimR.position.set(6, 7, -8); rimR.target.position.set(0, 2, 0); scene.add(rimR, rimR.target);
  const fill = new T.PointLight(0xd9b56a, 4, 12, 2); fill.position.set(0, 0.6, 3); scene.add(fill);

  /* 불티 — 점 120개가 제단 둘레에서 천천히 오른다 */
  const N = 120, pos = new Float32Array(N * 3), vel = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 9; pos[i * 3 + 1] = Math.random() * 6; pos[i * 3 + 2] = (Math.random() - .5) * 8 - 1; vel[i] = 0.2 + Math.random() * 0.5; }
  const sparkGeo = new T.BufferGeometry(); sparkGeo.setAttribute('position', new T.BufferAttribute(pos, 3));
  const sparkMat = new T.PointsMaterial({ color: 0xffe9a8, size: 0.06, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false });
  scene.add(new T.Points(sparkGeo, sparkMat));

  let tiltX = 0, tiltY = 0, mode = 'base', raf = 0, alive = true, t0 = performance.now();
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function size() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    /* 좁은 화면(폰)에서는 기둥 여섯이 프레임 밖으로 나간다 — 벌린 폭을 줄이고 카메라를 뒤로 뺀다 */
    const k = Math.min(1, (w / h) / 1.25); columns.scale.set(k, 1, 1); camera.position.z = 11.5 + (1 - k) * 4;
  }
  const ro = new ResizeObserver(size); ro.observe(host); size();
  function frame(now) {
    if (!alive) return;
    const t = (now - t0) / 1000, m = MODES[mode];
    /* 등불이 숨 쉰다. 손이 닿은 쪽으로 카메라가 살짝 돈다 */
    lamp.intensity = m.power * (0.92 + 0.08 * Math.sin(t * 2.3) * Math.sin(t * 0.7 + 1));
    camera.position.x += ((tiltY * 1.6) - camera.position.x) * 0.06;
    camera.position.y += ((2.3 - tiltX * 0.8) - camera.position.y) * 0.06;
    camera.lookAt(look);
    columns.rotation.y = Math.sin(t * 0.05) * 0.02;
    const p = sparkGeo.attributes.position.array;
    for (let i = 0; i < N; i++) { p[i * 3 + 1] += vel[i] * 0.016; p[i * 3] += Math.sin(t + i) * 0.002; if (p[i * 3 + 1] > 6.5) p[i * 3 + 1] = 0; }
    sparkGeo.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
    if (!still && !document.hidden) raf = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', onVis);
  function onVis() { if (!document.hidden && alive && !raf) raf = requestAnimationFrame(frame); if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } }
  raf = requestAnimationFrame(frame);

  return {
    tilt(x, y) { tiltY = x; tiltX = y; if (still) renderer.render(scene, camera); },
    mode(m) {
      mode = MODES[m] ? m : 'base'; const c = MODES[mode];
      lamp.color.setHex(c.lamp); rimL.color.setHex(c.rim); rimR.color.setHex(c.rim); rimL.intensity = rimR.intensity = c.rimPower;
      sparkMat.color.setHex(c.spark); fill.color.setHex(mode === 'cursed' ? 0xc0143c : 0xd9b56a);
      if (still) renderer.render(scene, camera);
    },
    dispose() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', onVis);
      [shaftGeo, echinusGeo, abacusGeo, torusGeo, plinthGeo, sparkGeo, floor.geometry].forEach(g => g.dispose());
      [obsidian, gold, goldDark, floorMat, sparkMat].forEach(m => m.dispose()); gridTex.dispose();
      renderer.dispose(); canvas.remove();
    }
  };
}
