import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// 波形パラメータ
const params = {
  amplitude: 1.5,
  frequency: 0.18,
  phaseStep: 0.12,
  noiseStrength: 0.3,
  noiseFrequency: 0.5,
  bpm: 120,
  beatStrength: 0.7,
  beatType: 'sin',
  speed: 1.2,
  noiseSpeed: 0.7,
  yOffset: 0,
  // ポストプロセス
  bloom: true,
  bloomStrength: 1.2,
  bloomRadius: 0.2,
  bloomThreshold: 0.0,
  glitch: false,
  film: false,
  filmNoiseIntensity: 0.5,
  filmScanlinesIntensity: 0.05,
  filmScanlinesCount: 2048,
  filmGrayscale: false,
  outline: false,
  outlineColor: '#00ffff',
  outlineStrength: 2.5,
  fxaa: false,
  // 波形色
  colorMode: 'white', // 'white', 'gradient', 'rainbow'
  color1: '#ffffff',
  color2: '#00ffff',
  // 動き方
  moveMode: 'leftToRight', // 'leftToRight', 'rightToLeft', 'centerToEdge', 'edgeToCenter', 'random'
};

// lil-gui UI
const gui = new GUI();
gui.add(params, 'amplitude', 0, 5, 0.01).name('振幅');
gui.add(params, 'frequency', 0.01, 1, 0.01).name('周波数');
gui.add(params, 'phaseStep', 0, 1, 0.01).name('位相ステップ');
gui.add(params, 'noiseStrength', 0, 2, 0.01).name('ノイズ強度');
gui.add(params, 'noiseFrequency', 0.01, 2, 0.01).name('ノイズ周波数');
gui.add(params, 'bpm', 30, 300, 1).name('BPM');
gui.add(params, 'beatStrength', 0, 2, 0.01).name('鼓動の強さ');
gui.add(params, 'speed', 0, 5, 0.01).name('波形速度');
gui.add(params, 'noiseSpeed', 0, 5, 0.01).name('ノイズ速度');
gui.add(params, 'yOffset', -10, 10, 0.01).name('上下オフセット');
gui.add(params, 'beatType', ['sin', 'pulse', 'ease']).name('鼓動タイプ');
const fPost = gui.addFolder('エフェクト');
fPost.add(params, 'bloom').name('Bloom');
fPost.add(params, 'bloomStrength', 0, 3, 0.01).name('Bloom強度');
fPost.add(params, 'bloomRadius', 0, 1, 0.01).name('Bloom半径');
fPost.add(params, 'bloomThreshold', 0, 1, 0.01).name('Bloom閾値');
fPost.add(params, 'glitch').name('Glitch');
fPost.add(params, 'film').name('Film');
fPost.add(params, 'filmNoiseIntensity', 0, 1, 0.01).name('Filmノイズ');
fPost.add(params, 'filmScanlinesIntensity', 0, 1, 0.01).name('Filmスキャンライン');
fPost.add(params, 'filmScanlinesCount', 0, 4096, 1).name('Filmライン数');
fPost.add(params, 'filmGrayscale').name('Filmグレースケール');
fPost.add(params, 'outline').name('Outline');
fPost.addColor(params, 'outlineColor').name('Outline色');
fPost.add(params, 'outlineStrength', 0, 10, 0.01).name('Outline強度');
fPost.add(params, 'fxaa').name('FXAA');
const fColor = gui.addFolder('波形色');
fColor.add(params, 'colorMode', ['white', 'gradient', 'rainbow']).name('色モード');
fColor.addColor(params, 'color1').name('色1');
fColor.addColor(params, 'color2').name('色2');
const fMove = gui.addFolder('動き方');
fMove.add(params, 'moveMode', ['leftToRight', 'rightToLeft', 'centerToEdge', 'edgeToCenter', 'random']).name('動き方');

// three.jsを使ったパルサー波形アニメーション（3Dバージョン）
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// OrbitControlsの追加
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 10;
controls.maxDistance = 100;

// EffectComposerと各種Pass
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  params.bloomStrength,
  params.bloomRadius,
  params.bloomThreshold
);
const glitchPass = new GlitchPass();
const filmPass = new FilmPass(
  params.filmNoiseIntensity,
  params.filmScanlinesIntensity,
  params.filmScanlinesCount,
  params.filmGrayscale
);
const outlinePass = new OutlinePass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  scene,
  camera
);
const fxaaPass = new ShaderPass(FXAAShader);
fxaaPass.material.uniforms['resolution'].value.x = 1 / window.innerWidth;
fxaaPass.material.uniforms['resolution'].value.y = 1 / window.innerHeight;

composer.addPass(renderPass);
composer.addPass(bloomPass);
composer.addPass(glitchPass);
composer.addPass(filmPass);
composer.addPass(outlinePass);
composer.addPass(fxaaPass);

bloomPass.enabled = params.bloom;
glitchPass.enabled = params.glitch;
filmPass.enabled = params.film;
outlinePass.enabled = params.outline;
fxaaPass.enabled = params.fxaa;

// lil-guiでエフェクトのON/OFFや強度を反映
fPost.onChange(() => {
  bloomPass.strength = params.bloomStrength;
  bloomPass.radius = params.bloomRadius;
  bloomPass.threshold = params.bloomThreshold;
  bloomPass.enabled = params.bloom;
  glitchPass.enabled = params.glitch;
  filmPass.enabled = params.film;
  filmPass.uniforms.nIntensity.value = params.filmNoiseIntensity;
  filmPass.uniforms.sIntensity.value = params.filmScanlinesIntensity;
  filmPass.uniforms.sCount.value = params.filmScanlinesCount;
  filmPass.uniforms.grayscale.value = params.filmGrayscale ? 1 : 0;
  outlinePass.enabled = params.outline;
  outlinePass.edgeStrength = params.outlineStrength;
  outlinePass.visibleEdgeColor.set(params.outlineColor);
  fxaaPass.enabled = params.fxaa;
});

const lines = [];
const lineCount = 40;
const pointsPerLine = 120;
const width = 20;
const depthStep = 0.6; // Z方向の間隔

function getLineColor(i, j) {
  if (params.colorMode === 'white') {
    return new THREE.Color(params.color1);
  } else if (params.colorMode === 'gradient') {
    const t = i / (lineCount - 1);
    return new THREE.Color(params.color1).lerp(new THREE.Color(params.color2), t);
  } else if (params.colorMode === 'rainbow') {
    const t = j / (pointsPerLine - 1);
    return new THREE.Color().setHSL(t, 1.0, 0.5);
  }
  return new THREE.Color(params.color1);
}

for (let i = 0; i < lineCount; i++) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(pointsPerLine * 3);
  const colors = new Float32Array(pointsPerLine * 3);
  for (let j = 0; j < pointsPerLine; j++) {
    const x = (j / (pointsPerLine - 1)) * width - width / 2;
    const y = 0;
    const z = i * depthStep - (lineCount * depthStep) / 2;
    positions[j * 3] = x;
    positions[j * 3 + 1] = y;
    positions[j * 3 + 2] = z;
    const color = getLineColor(i, j);
    colors[j * 3] = color.r;
    colors[j * 3 + 1] = color.g;
    colors[j * 3 + 2] = color.b;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.LineBasicMaterial({ vertexColors: true });
  const line = new THREE.Line(geometry, material);
  lines.push(line);
  scene.add(line);
}

camera.position.set(0, 10, 30);
camera.lookAt(0, 0, 0);

function getBeat(phase, strength, type) {
  switch (type) {
    case 'sin':
      return 1 + strength * Math.max(0, Math.sin(Math.PI * phase) ** 2);
    case 'pulse':
      return 1 + strength * (phase < 0.15 ? 1 - phase / 0.15 : 0);
    case 'ease':
      return 1 + strength * (phase < 0.2 ? (1 - Math.cos(Math.PI * phase / 0.2)) / 2 : 0);
    default:
      return 1;
  }
}

function updateLineColors() {
  for (let i = 0; i < lineCount; i++) {
    const line = lines[i];
    const colors = line.geometry.attributes.color.array;
    for (let j = 0; j < pointsPerLine; j++) {
      const color = getLineColor(i, j);
      colors[j * 3] = color.r;
      colors[j * 3 + 1] = color.g;
      colors[j * 3 + 2] = color.b;
    }
    line.geometry.attributes.color.needsUpdate = true;
  }
}
fColor.onChange(updateLineColors);

function getPhase(j, i, time) {
  const center = (pointsPerLine - 1) / 2;
  switch (params.moveMode) {
    case 'leftToRight':
      return time * params.speed;
    case 'rightToLeft':
      return -time * params.speed;
    case 'centerToEdge':
      return time * params.speed + Math.abs(j - center) * 0.12;
    case 'edgeToCenter':
      return time * params.speed + (center - Math.abs(j - center)) * 0.12;
    case 'random':
      // ランダムな進行方向・速度（各ラインごとに）
      if (!getPhase.randomOffsets) {
        getPhase.randomOffsets = Array.from({ length: lineCount }, () => Math.random() * Math.PI * 2);
        getPhase.randomSpeeds = Array.from({ length: lineCount }, () => 0.5 + Math.random() * 1.5);
      }
      return time * getPhase.randomSpeeds[i] + getPhase.randomOffsets[i];
    default:
      return time * params.speed;
  }
}

function animate() {
  requestAnimationFrame(animate);
  const time = performance.now() * 0.001;

  // BPMに合わせた鼓動エフェクト
  const beatInterval = 60 / params.bpm;
  const beatPhase = ((time / beatInterval) % 1);
  const beat = getBeat(beatPhase, params.beatStrength, params.beatType);

  lines.forEach((line, i) => {
    const positions = line.geometry.attributes.position.array;
    for (let j = 0; j < pointsPerLine; j++) {
      // 動き方に応じてphaseを決定
      const phase = getPhase(j, i, time);
      const base = Math.sin(j * params.frequency + i * params.phaseStep + phase) * params.amplitude * beat;
      const noise = Math.sin(j * params.noiseFrequency + time * params.noiseSpeed + i) * params.noiseStrength;
      positions[j * 3 + 1] = base + noise + params.yOffset;
    }
    line.geometry.attributes.position.needsUpdate = true;
  });
  controls.update();
  composer.render();
}

animate();

// リサイズ対応
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloomPass.setSize(window.innerWidth, window.innerHeight);
  outlinePass.setSize(new THREE.Vector2(window.innerWidth, window.innerHeight));
  fxaaPass.material.uniforms['resolution'].value.x = 1 / window.innerWidth;
  fxaaPass.material.uniforms['resolution'].value.y = 1 / window.innerHeight;
}); 