// Cachecol 3D: o cachecol e uma faixa de tecido com espessura, pousada numa mesa.
// A forma (coracao -> arco) e calculada sem esticar o tecido: so muda a curvatura.
import * as THREE from "three";
import { RoomEnvironment } from "../vendor/RoomEnvironment.js";

const $ = (id) => document.getElementById(id);
const container = $("scene"),
  action = $("action"),
  letter = $("letter");
const headline = $("headline"),
  subtitle = $("subtitle"),
  hint = $("hint");
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)),
  mix = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t),
  smooth = (a, b, x) => ease(clamp((x - a) / (b - a), 0, 1));
const params = new URLSearchParams(location.search);
const num = (k, d) => (params.has(k) ? parseFloat(params.get(k)) : d);

// Medidas da textura (escritas pelo gerar_textura.py)
const info = await fetch("./assets/textura-info.json")
  .then((r) => r.json())
  .catch(() => ({
    carreiras: 914,
    malhas: 64,
    razao: 10.71,
    mosaico: 8,
    franja: [
      [136, 37, 42],
      [38, 88, 54],
      [179, 170, 155],
    ],
  }));

// ---------------------------------------------------------------- render, camara, luz
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);
$("loading")?.remove();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  34,
  innerWidth / innerHeight,
  0.1,
  60,
);
camera.position.set(0, 0, 9.5);
camera.lookAt(0, 0, 0);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.22;

scene.add(new THREE.HemisphereLight(0xfff0e4, 0x35202a, 0.42));
// Luz principal rasante: e ela que desenha as dobras e a malha.
const key = new THREE.DirectionalLight(0xfff0e2, 3.3);
key.position.set(-5.2, 4.6, 3.6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, {
  left: -5,
  right: 5,
  top: 5,
  bottom: -5,
  near: 1,
  far: 22,
});
key.shadow.bias = -0.0005;
key.shadow.normalBias = 0.018;
key.shadow.radius = 5;
scene.add(key);
const rim = new THREE.PointLight(0xd55d7b, 22, 16);
rim.position.set(4.5, -2, 2.4);
scene.add(rim);

const group = new THREE.Group();
scene.add(group);

// ---------------------------------------------------------------- mesa (so recebe sombra) e envelope
const Z_MESA = -0.24,
  Z_ENV = -0.095;
const ENV = { x: 0, y: -0.04, hw: 1.21, hh: 0.81 };
const mesa = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.ShadowMaterial({ opacity: 0.46, color: 0x0a0408 }),
);
mesa.position.z = Z_MESA;
mesa.receiveShadow = true;
group.add(mesa);

const envelope = new THREE.Group();
envelope.position.set(0, -0.04, -0.17);
group.add(envelope);
const paper = new THREE.MeshStandardMaterial({
  color: 0xece0c7,
  roughness: 0.98,
  side: THREE.DoubleSide,
});
const foldMaterial = new THREE.MeshStandardMaterial({
  color: 0xd9c4a2,
  roughness: 1,
  side: THREE.DoubleSide,
});
const sombra = (m) => {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};
function plane(w, h, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  envelope.add(m);
  return m;
}
sombra(plane(2.42, 1.62, paper, 0, 0, -0.05));
const triangle = (coords, mat) => {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(coords.flat(), 3),
  );
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  envelope.add(m);
  return m;
};
triangle(
  [
    [-1.21, -0.81, 0.01],
    [0, -0.11, 0.02],
    [-1.21, 0.81, 0.01],
  ],
  foldMaterial,
);
triangle(
  [
    [1.21, -0.81, 0.015],
    [1.21, 0.81, 0.015],
    [0, -0.11, 0.02],
  ],
  foldMaterial,
);
triangle(
  [
    [-1.21, -0.81, 0.03],
    [1.21, -0.81, 0.03],
    [0, -0.04, 0.04],
  ],
  paper,
);
const flap = new THREE.Group();
flap.position.set(0, 0.81, 0.045);
envelope.add(flap);
const flapGeo = new THREE.BufferGeometry();
flapGeo.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(
    [
      [-1.21, 0, 0],
      [0, -0.94, 0],
      [1.21, 0, 0],
    ].flat(),
    3,
  ),
);
flapGeo.computeVertexNormals();
const flapMesh = new THREE.Mesh(flapGeo, foldMaterial);
flapMesh.receiveShadow = true;
flap.add(flapMesh);
const seal = sombra(
  new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.14, 0.03, 40),
    new THREE.MeshStandardMaterial({ color: 0x8e3350, roughness: 0.5 }),
  ),
);
seal.rotation.x = Math.PI / 2;
seal.position.set(0, -0.13, 0.065);
envelope.add(seal);
const letterPaper = new THREE.Mesh(
  new THREE.PlaneGeometry(2.13, 1.43),
  new THREE.MeshStandardMaterial({
    color: 0xfff7e7,
    roughness: 1,
    side: THREE.DoubleSide,
  }),
);
letterPaper.position.set(0, 0, 0);
letterPaper.receiveShadow = true;
envelope.add(letterPaper);
const letterLines = [];
for (let k = 0; k < 5; k++)
  letterLines.push(
    plane(
      1.45 - (k % 3) * 0.12,
      0.016,
      new THREE.MeshBasicMaterial({
        color: 0xbb968f,
        transparent: true,
        opacity: 0.55,
      }),
      0,
      0.36 - k * 0.2,
      0.008,
    ),
  );

// ---------------------------------------------------------------- material do cachecol
const loader = new THREE.TextureLoader();
const map = loader.load("./assets/cachecol-cor.jpg");
map.colorSpace = THREE.SRGBColorSpace;
map.anisotropy = renderer.capabilities.getMaxAnisotropy();
// O relevo do ponto de tricot repete-se alinhado com a grelha de malhas da imagem de cor.
const knit = loader.load("./assets/malha-normal.png");
knit.wrapS = knit.wrapT = THREE.RepeatWrapping;
knit.repeat.set(info.carreiras / info.mosaico, info.malhas / info.mosaico);
knit.anisotropy = map.anisotropy;
const scarfMaterial = new THREE.MeshPhysicalMaterial({
  map,
  normalMap: knit,
  normalScale: new THREE.Vector2(1.1, 1.1),
  roughness: 1,
  metalness: 0,
  sheen: 0.7,
  sheenRoughness: 0.8,
  sheenColor: new THREE.Color(0.2, 0.16, 0.14), // pelo do fio a apanhar luz rasante
});

// ---------------------------------------------------------------- medidas e forma
const W = num("w", 0.74); // largura do cachecol
const L = W * info.razao; // comprimento: a textura nunca estica
const T = W * 0.036; // espessura
const N = 400,
  M = 28; // divisoes ao comprido e a largura
const ds = L / N;

const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function noise1(x) {
  const i = Math.floor(x),
    f = x - i,
    u = f * f * (3 - 2 * f);
  return mix(hash(i), hash(i + 1), u);
}
function noise2(x, y) {
  const j = Math.floor(y),
    f = y - j,
    u = f * f * (3 - 2 * f);
  return mix(noise1(x + j * 57.3), noise1(x + (j + 1) * 57.3), u);
}

// Vincos: dobras suaves que atravessam o tecido, como num cachecol pousado sem cuidado.
const vincos = [];
for (let s0 = W * 0.5, k = 0; s0 < L - W * 0.4; k++) {
  vincos.push({
    s: s0,
    ang: (hash(k * 3.1 + 1) - 0.5) * 1.5,
    amp: W * (0.03 + 0.055 * hash(k * 5.3 + 2)),
    larg: W * (0.07 + 0.09 * hash(k * 7.7 + 3)),
    lado: hash(k * 9.1 + 4) * 2 - 1,
  });
  s0 += W * (0.45 + 0.75 * hash(k * 2.3 + 5));
}
function dobra(s, q) {
  // q: -1..1 a largura
  let z = 0;
  for (const v of vincos) {
    const ds_ = s - v.s;
    if (ds_ > W * 1.3 || ds_ < -W * 1.3) continue;
    const d = (ds_ * Math.cos(v.ang) + q * W * 0.5 * Math.sin(v.ang)) / v.larg;
    z += v.amp * Math.exp(-d * d) * (0.55 + 0.45 * q * v.lado);
  }
  return z;
}

// Pontos de passagem das duas poses (antes de ajustar ao comprimento do cachecol).
const heartPts = [
  [-0.19, -1.19],
  [-0.42, -0.98],
  [-1.1, -0.3],
  [-1.5, 0.42],
  [-1.36, 1.02],
  [-0.94, 1.27],
  [-0.52, 1.17],
  [-0.2, 0.9],
  [0, 0.82],
  [0.2, 0.9],
  [0.52, 1.17],
  [0.94, 1.27],
  [1.36, 1.02],
  [1.5, 0.42],
  [1.1, -0.3],
  [0.42, -0.98],
  [-0.33, -1.66],
];
const openPts = [
  [-2.42, -1.55],
  [-2.6, -0.75],
  [-2.52, 0.15],
  [-2.16, 0.98],
  [-1.56, 1.52],
  [-0.82, 1.77],
  [0, 1.84],
  [0.82, 1.77],
  [1.56, 1.52],
  [2.16, 0.98],
  [2.52, 0.15],
  [2.6, -0.75],
  [2.42, -1.55],
];
function pose(pts, oy) {
  const curve = new THREE.CatmullRomCurve3(
    pts.map((q) => new THREE.Vector3(q[0], q[1], 0)),
    false,
    "centripetal",
  );
  const s = L / curve.getLength(),
    p = curve.getSpacedPoints(N);
  const th = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let a = Math.atan2(p[i + 1].y - p[i].y, p[i + 1].x - p[i].x);
    if (i) {
      while (a - th[i - 1] > Math.PI) a -= 2 * Math.PI;
      while (a - th[i - 1] < -Math.PI) a += 2 * Math.PI;
    }
    th[i] = a;
  }
  const m = p[N / 2];
  return { th, mx: m.x * s, my: m.y * s + oy };
}
const P_HEART = pose(heartPts, num("hy", -0.02)),
  P_OPEN = pose(openPts, num("oy", 0.0));

// ---------------------------------------------------------------- malha do tecido
const RING = 2 * (M + 1) + 4; // cima + baixo + 2 pontos de arredondamento em cada orla
const nv = (N + 1) * RING + 2;
const pos = new Float32Array(nv * 3),
  uv = new Float32Array(nv * 2),
  idx = [];
for (let i = 0; i <= N; i++)
  for (let r = 0; r < RING; r++) {
    const k = i * RING + r;
    let v;
    if (r <= M) v = r / M;
    else if (r < M + 3) v = 1;
    else if (r < 2 * M + 4) v = 1 - (r - (M + 3)) / M;
    else v = 0;
    uv[k * 2] = i / N;
    uv[k * 2 + 1] = v;
    if (i < N) {
      const a = k,
        b = i * RING + ((r + 1) % RING),
        c = a + RING,
        d = b + RING;
      idx.push(a, c, b, b, c, d);
    }
  }
for (const [i, c] of [
  [0, nv - 2],
  [N, nv - 1],
]) {
  uv[c * 2] = i / N;
  uv[c * 2 + 1] = 0.5;
  for (let r = 0; r < RING; r++) {
    const a = i * RING + r,
      b = i * RING + ((r + 1) % RING);
    if (i === 0) idx.push(c, a, b);
    else idx.push(c, b, a);
  }
}
const clothGeo = new THREE.BufferGeometry();
clothGeo.setAttribute(
  "position",
  new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage),
);
clothGeo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
clothGeo.setIndex(idx);
const cloth = new THREE.Mesh(clothGeo, scarfMaterial);
cloth.castShadow = cloth.receiveShadow = true;
cloth.frustumCulled = false;
group.add(cloth);

// altura da superficie onde o tecido pousa: a mesa, ou o envelope quando esta por cima dele
function chao(x, y) {
  const dx = Math.max(Math.abs(x - ENV.x) - ENV.hw, 0),
    dy = Math.max(Math.abs(y - ENV.y) - ENV.hh, 0);
  return mix(Z_ENV, Z_MESA, smooth(0, 0.34, Math.hypot(dx, dy)));
}

const cxA = new Float32Array(N + 1),
  cyA = new Float32Array(N + 1),
  thA = new Float32Array(N + 1),
  kA = new Float32Array(N + 1),
  kS = new Float32Array(N + 1);
const thSeg = new Float32Array(N),
  pd = new Float32Array(M + 1),
  ph = new Float32Array(M + 1),
  pa = new Float32Array(M + 1);
const KW = Math.max(2, Math.round((0.34 * W) / ds)); // suavizacao da curvatura
const ends = [null, null];

function updateCloth(e, t) {
  // 1. linha central: mistura-se o ANGULO das duas poses, por isso o comprimento nunca muda
  for (let i = 0; i < N; i++) thSeg[i] = mix(P_HEART.th[i], P_OPEN.th[i], e);
  cxA[0] = 0;
  cyA[0] = 0;
  for (let i = 0; i < N; i++) {
    cxA[i + 1] = cxA[i] + Math.cos(thSeg[i]) * ds;
    cyA[i + 1] = cyA[i] + Math.sin(thSeg[i]) * ds;
  }
  const ox = mix(P_HEART.mx, P_OPEN.mx, e) - cxA[N / 2],
    oy = mix(P_HEART.my, P_OPEN.my, e) - cyA[N / 2];
  for (let i = 0; i <= N; i++) {
    cxA[i] += ox;
    cyA[i] += oy;
    thA[i] =
      i === 0
        ? thSeg[0]
        : i === N
          ? thSeg[N - 1]
          : (thSeg[i - 1] + thSeg[i]) / 2;
    kA[i] = i === 0 || i === N ? 0 : (thSeg[i] - thSeg[i - 1]) / ds;
  }
  for (let i = 0; i <= N; i++) {
    let s = 0,
      w = 0;
    for (let j = -KW * 2; j <= KW * 2; j++) {
      const q = i + j;
      if (q < 0 || q > N) continue;
      const g = Math.exp(-(j * j) / (2 * KW * KW));
      s += kA[q] * g;
      w += g;
    }
    kS[i] = s / w;
  }

  const pegar = Math.sin(Math.PI * e); // a meio do movimento o cachecol levanta da mesa
  const cruzado = 1 - smooth(0.08, 0.5, e); // no coracao, uma ponta fica por cima da outra
  for (let i = 0; i <= N; i++) {
    const s = i * ds,
      u = i / N,
      th = thA[i],
      tx = Math.cos(th),
      ty = Math.sin(th),
      nx = -ty,
      ny = tx;
    const side = kS[i] >= 0 ? 1 : -1,
      k = Math.abs(kS[i]) * W * 0.5;
    // Numa curva, o lado de dentro tem tecido a mais: enrola para cima e faz pregas.
    const aMax = Math.min(1.05, 1.15 * Math.pow(k, 0.9));
    const wl = W * (1 + 0.03 * (noise1((s / W) * 1.7 + 7) - 0.5));
    const hw = wl / 2,
      dq = wl / M;
    let d = -hw,
      h = 0,
      prev = 0;
    for (let jj = 0; jj <= M; jj++) {
      const sig = -1 + (2 * jj) / M,
        al = aMax * smooth(-0.2, 1, sig);
      if (jj) {
        const am = (al + prev) / 2;
        d += Math.cos(am) * dq;
        h += Math.sin(am) * dq;
      }
      pd[jj] = d;
      ph[jj] = h;
      pa[jj] = al;
      prev = al;
    }
    const pregas =
        W * 0.05 * Math.min(1, k / 0.45) * (1 - 0.75 * smooth(0.9, 1.5, k)),
      fase = (2 * Math.PI * s) / (0.4 * W) + 3 * noise1((s / W) * 0.8 + 40);
    const sobe =
      (T + W * 0.05) * cruzado * smooth(L - 2.7 * W, L - 1.7 * W, s) +
      pegar * (0.16 + 0.16 * Math.sin(Math.PI * u));
    for (let j = 0; j <= M; j++) {
      const jj = side > 0 ? j : M - j,
        sig = -1 + (2 * jj) / M,
        q = (2 * j) / M - 1;
      const off = side * pd[jj],
        al = pa[jj],
        ca = Math.cos(al),
        sa = Math.sin(al);
      const x = cxA[i] + nx * off,
        y = cyA[i] + ny * off;
      let z = ph[jj];
      z +=
        pregas *
        Math.pow(smooth(-0.25, 1, sig), 1.5) *
        (0.5 + 0.5 * Math.sin(fase + sig * 0.9));
      z +=
        W * 0.024 * noise2((s / W) * 1.15, q * 0.9 + 3) +
        dobra(s, q) * (1 - 0.6 * Math.min(1, k * 1.2)); // ondulado geral e vincos
      z +=
        W *
        0.034 *
        Math.abs(q * q * q) *
        noise1((s / W) * 2.3 + (q > 0 ? 11 : 29)); // orlas levantadas
      z += pegar * 0.05 * Math.sin(u * 21 + t * 1.6) * q;
      const zb = chao(x, y) + sobe;
      // normal aproximada do perfil, para dar espessura
      const mx = -side * nx * sa,
        my = -side * ny * sa,
        mz = ca;
      const a = (i * RING + j) * 3,
        b = (i * RING + (2 * M + 3 - j)) * 3;
      pos[a] = x;
      pos[a + 1] = y;
      pos[a + 2] = zb + T + z;
      pos[b] = x - mx * T;
      pos[b + 1] = y - my * T;
      pos[b + 2] = zb + T + z - mz * T;
      if (j === 0 || j === M) {
        // orla arredondada
        const sg = j === M ? 1 : -1,
          ex = sg * nx * ca * (side * sg > 0 ? 1 : 1),
          ey = sg * ny * ca,
          ez = sg * side * sa;
        const cxm = x - (mx * T) / 2,
          cym = y - (my * T) / 2,
          czm = zb + T + z - (mz * T) / 2,
          r = T / 2,
          c45 = 0.7071;
        const r1 = j === M ? M + 1 : 2 * M + 5,
          r2 = j === M ? M + 2 : 2 * M + 4; // junto ao topo, junto ao fundo
        const a1 = (i * RING + r1) * 3,
          a2 = (i * RING + r2) * 3;
        pos[a1] = cxm + r * c45 * (ex + mx);
        pos[a1 + 1] = cym + r * c45 * (ey + my);
        pos[a1 + 2] = czm + r * c45 * (ez + mz);
        pos[a2] = cxm + r * c45 * (ex - mx);
        pos[a2 + 1] = cym + r * c45 * (ey - my);
        pos[a2 + 2] = czm + r * c45 * (ez - mz);
      }
    }
  }
  for (const [i, c] of [
    [0, nv - 2],
    [N, nv - 1],
  ]) {
    const a = (i * RING + M / 2) * 3,
      b = (i * RING + M + 3 + M / 2) * 3;
    pos[c * 3] = (pos[a] + pos[b]) / 2;
    pos[c * 3 + 1] = (pos[a + 1] + pos[b + 1]) / 2;
    pos[c * 3 + 2] = (pos[a + 2] + pos[b + 2]) / 2;
  }
  clothGeo.attributes.position.needsUpdate = true;
  clothGeo.computeVertexNormals();
  ends[0] = { i: 0, dx: -Math.cos(thA[0]), dy: -Math.sin(thA[0]) };
  ends[1] = { i: N, dx: Math.cos(thA[N]), dy: Math.sin(thA[N]) };
  updateFringe();
}

// ---------------------------------------------------------------- franjas: fios soltos com volume
const FIOS = 44,
  FK = 7,
  FR = 5; // fios por ponta, pontos por fio, lados do tubo
const fv = 2 * FIOS * (FK + 1) * FR,
  fpos = new Float32Array(fv * 3),
  fcol = new Float32Array(fv * 3),
  fidx = [];
const fios = [];
for (let e = 0; e < 2; e++)
  for (let f = 0; f < FIOS; f++) {
    const id = e * FIOS + f,
      r = (n) => hash(id * 13.7 + n);
    const c = info.franja[Math.floor(f / 2 + r(1) * 1.4) % 3],
      tom = 0.78 + 0.4 * r(2);
    fios.push({
      e,
      q: (f + 0.15 + 0.7 * r(3)) / FIOS,
      len: W * (0.22 + 0.13 * r(4)),
      abre: (r(5) - 0.5) * 0.5,
      onda: (r(6) - 0.5) * 0.16,
      freq: 1.5 + 2.5 * r(7),
      fase: r(8) * 6.28,
      raio: W * (0.0085 + 0.004 * r(9)),
      monte: r(10),
    });
    const base = id * (FK + 1) * FR;
    for (let m = 0; m <= FK; m++)
      for (let a = 0; a < FR; a++) {
        const k = base + m * FR + a,
          suj = 0.82 + 0.18 * hash(k * 0.37);
        fcol[k * 3] = (c[0] / 255) ** 2.2 * tom * suj;
        fcol[k * 3 + 1] = (c[1] / 255) ** 2.2 * tom * suj;
        fcol[k * 3 + 2] = (c[2] / 255) ** 2.2 * tom * suj;
        if (m < FK) {
          const b = base + m * FR + ((a + 1) % FR);
          fidx.push(k, b, k + FR, b, b + FR, k + FR);
        }
      }
  }
const fringeGeo = new THREE.BufferGeometry();
fringeGeo.setAttribute(
  "position",
  new THREE.BufferAttribute(fpos, 3).setUsage(THREE.DynamicDrawUsage),
);
fringeGeo.setAttribute("color", new THREE.BufferAttribute(fcol, 3));
fringeGeo.setIndex(fidx);
const fringe = new THREE.Mesh(
  fringeGeo,
  new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
);
fringe.castShadow = fringe.receiveShadow = true;
fringe.frustumCulled = false;
group.add(fringe);

function updateFringe() {
  for (let id = 0; id < fios.length; id++) {
    const f = fios[id],
      en = ends[f.e],
      jf = f.q * M,
      j0 = Math.min(M - 1, Math.floor(jf)),
      fr = jf - j0;
    const ta = (en.i * RING + j0) * 3,
      tb = ta + 3,
      ba = (en.i * RING + (2 * M + 3 - j0)) * 3,
      bb = ba - 3;
    const sx = (mix(pos[ta], pos[tb], fr) + mix(pos[ba], pos[bb], fr)) / 2,
      sy =
        (mix(pos[ta + 1], pos[tb + 1], fr) +
          mix(pos[ba + 1], pos[bb + 1], fr)) /
        2,
      sz =
        (mix(pos[ta + 2], pos[tb + 2], fr) +
          mix(pos[ba + 2], pos[bb + 2], fr)) /
        2;
    const px = -en.dy,
      py = en.dx; // direcao a largura
    const base = id * (FK + 1) * FR;
    for (let m = 0; m <= FK; m++) {
      const tt = m / FK,
        lat =
          f.len *
          (f.abre * tt + f.onda * Math.sin(tt * Math.PI * f.freq + f.fase));
      const x = sx + en.dx * f.len * tt + px * lat,
        y = sy + en.dy * f.len * tt + py * lat;
      const pousa = chao(x, y) + f.raio * (1 + 3.5 * f.monte);
      const z =
        mix(sz, Math.min(sz, pousa), smooth(0.05, 0.7, tt)) +
        (m === 0 ? 0 : f.raio * 0.6 * Math.sin(tt * 9 + f.fase));
      const rr = f.raio * (m === FK ? 0.55 : 1);
      for (let a = 0; a < FR; a++) {
        const ang = (a / FR) * 6.2832 + tt * 5,
          k = (base + m * FR + a) * 3,
          c = Math.cos(ang) * rr,
          s = Math.sin(ang) * rr;
        fpos[k] = x + px * c;
        fpos[k + 1] = y + py * c;
        fpos[k + 2] = z + s;
      }
    }
  }
  fringeGeo.attributes.position.needsUpdate = true;
  fringeGeo.computeVertexNormals();
}

// ---------------------------------------------------------------- po no ar
const starsGeo = new THREE.BufferGeometry(),
  coords = [];
let po;
for (let i = 0; i < 130; i++)
  coords.push(
    (Math.random() - 0.5) * 13,
    (Math.random() - 0.5) * 8,
    0.6 + Math.random() * 3.5,
  );
starsGeo.setAttribute("position", new THREE.Float32BufferAttribute(coords, 3));
scene.add(
  (po = new THREE.Points(
    starsGeo,
    new THREE.PointsMaterial({
      color: 0xe8b4c4,
      size: 0.016,
      transparent: true,
      opacity: 0.5,
    }),
  )),
);

// ---------------------------------------------------------------- interacao
let startedAt = -1,
  open = false,
  zoom = 0;
const clock = new THREE.Clock(),
  pointer = { x: 0, y: 0 };
const INCLINA = num("rx", -0.5); // vemos a mesa de cima, um pouco de lado
function resize() {
  const w = innerWidth,
    h = innerHeight,
    estreito = w < 650;
  camera.aspect = w / h;
  camera.fov = estreito ? 42 : 34;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  group.scale.setScalar(w < 430 ? 0.78 : estreito ? 0.9 : 1);
  camera.userData.base = estreito ? 11.1 : 9.5;
}
addEventListener("resize", resize);
resize();
addEventListener("pointermove", (e) => {
  pointer.x = (e.clientX / innerWidth - 0.5) * 2;
  pointer.y = (e.clientY / innerHeight - 0.5) * 2;
});
addEventListener(
  "wheel",
  (e) => {
    if (!open) zoom = clamp(zoom - e.deltaY * 0.0012, 0, 1);
  },
  { passive: true },
);
// aproximar com dois dedos
let pin = null;
const cv = renderer.domElement,
  afast = (t) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
cv.addEventListener(
  "touchstart",
  (e) => {
    if (e.touches.length === 2) pin = { d: afast(e.touches), z: zoom };
  },
  { passive: true },
);
cv.addEventListener(
  "touchmove",
  (e) => {
    if (pin && e.touches.length === 2) {
      zoom = clamp(pin.z + (afast(e.touches) / pin.d - 1) * 0.9, 0, 1);
      e.preventDefault();
    }
  },
  { passive: false },
);
cv.addEventListener("touchend", () => {
  pin = null;
});
if (matchMedia("(pointer: coarse)").matches)
  hint.innerHTML =
    "Move com o rato (ou com o dedo no teu pc chique p ver mais do tecido)";

const HINT = hint.innerHTML;
function reveal() {
  if (startedAt >= 0) return;
  startedAt = clock.getElapsedTime();
  action.disabled = true;
  action.textContent = "E vai abrir...";
  hint.textContent = "Ja vai ta carregando a animaçãokkk";
}
function reset() {
  startedAt = -1;
  open = false;
  drawn = -1;
  letter.classList.remove("visible");
  action.disabled = false;

  hint.innerHTML = HINT;
}
action.addEventListener("click", () => (open ? reset() : reveal()));
$("close").addEventListener("click", reset);
renderer.domElement.addEventListener("click", () => {
  if (startedAt < 0) reveal();
});

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fixo = params.has("abrir") ? clamp(num("abrir", 0), 0, 1) : null; // ?abrir=0.5 congela a pose (para capturas)
let drawn = -1;
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime(),
    age = startedAt < 0 ? 0 : t - startedAt;
  let unfolding =
    startedAt < 0
      ? 0
      : ease(clamp((age - 0.35) / (reduced ? 0.15 : 2.9), 0, 1));
  let flapAmount =
    startedAt < 0 ? 0 : ease(clamp((age - 3.0) / (reduced ? 0.12 : 1), 0, 1));
  let letterAmount =
    startedAt < 0
      ? 0
      : ease(clamp((age - 3.6) / (reduced ? 0.15 : 1.25), 0, 1));
  if (fixo !== null) {
    unfolding = fixo;
    flapAmount = letterAmount = num("carta", 0);
  }
  // o tecido so e recalculado enquanto se mexe: parado na mesa, fica parado
  if (unfolding !== drawn) {
    updateCloth(unfolding, t);
    drawn = unfolding;
  }
  flap.rotation.x = -Math.PI * 0.965 * flapAmount;
  seal.visible = flapAmount < 0.35;
  letterPaper.position.y = letterAmount * 0.97;
  letterPaper.position.z = smooth(0, 0.35, letterAmount) * 0.165;
  for (const l of letterLines) {
    l.position.y = (l.userData.y0 ??= l.position.y) + letterAmount * 0.97;
    l.position.z = 0.008 + smooth(0, 0.35, letterAmount) * 0.165;
  }
  const ry = num("ry", pointer.x * 0.38 + Math.sin(t * 0.31) * 0.05),
    rx =
      INCLINA -
      (params.has("ry") ? 0 : pointer.y * 0.24 + Math.cos(t * 0.27) * 0.025);
  group.rotation.y = mix(group.rotation.y, ry, 0.05);
  group.rotation.x = mix(group.rotation.x, rx, 0.05);
  const dist = camera.userData.base * (1 - 0.5 * num("zoom", zoom));
  camera.position.z = mix(camera.position.z, dist, 0.1);
  if (fixo === null && age > 5.1 && !open) {
    open = true;
    letter.classList.add("visible");
    headline.textContent = "Feliz aniversário, meu amor ♡";
    subtitle.textContent = "Uma carta cartinha pra ti mor.";
    action.disabled = false;
    action.textContent = "↶ Ver o cachecol novamente";
    hint.textContent = "A carta ta abrida";
  }
  po.rotation.z = t * 0.012;
  po.position.y = Math.sin(t * 0.2) * 0.08;
  renderer.render(scene, camera);
}
group.rotation.x = INCLINA;
animate();
window.__pronto = true;
