import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

const params = {
  width: window.innerWidth,
  height: window.innerWidth,
};

const mouse = new THREE.Vector2();

async function createApp() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('white');

  params.width = window.innerWidth;
  params.height = window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(params.width, params.height);
  document.body.appendChild(renderer.domElement);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputEncoding = THREE.sRGBEncoding;

  const camera = new THREE.PerspectiveCamera(75, params.width / params.height, 0.1, 1000);
  camera.position.set(0, 0, 5);

  const pmRem = new THREE.PMREMGenerator(renderer);
  pmRem.compileEquirectangularShader();

  const envHdrTexture = await new RGBELoader().loadAsync('../src/assets/cannon-map.hdr');
  const envRT = pmRem.fromEquirectangular(envHdrTexture);

  const ring1 = createRing(envRT.texture, 0.65, new THREE.Color('white'));
  ring1.scale.set(0.75, 0.75, 1);

  const ring2 = createRing(envRT.texture, 0.35, new THREE.Color(0.25, 0.225, 0.215));
  ring2.scale.set(1.05, 1.05, 1);

  const ring3 = createRing(envRT.texture, 0.15, new THREE.Color(0.7, 0.7, 0.7));
  ring3.scale.set(1.3, 1.3, 1);
  scene.add(ring1, ring2, ring3);

  const hourLine = create3DLine(0.4, 0.135, 0.07, envRT.texture, new THREE.Color('white'), 3);
  const minuteLine = create3DLine(0.8, 0.135, 0.07, envRT.texture, new THREE.Color(0.5, 0.5, 0.5), 3);
  const secondLine = create3DLine(1, 0.075, 0.07, envRT.texture, new THREE.Color(0.2, 0.2, 0.2), 3);
  scene.add(hourLine, minuteLine, secondLine);

  const clockLines = createClockLines(envRT.texture);
  scene.add(clockLines);

  window.addEventListener('resize', () => resize(camera, renderer));
  window.addEventListener('mousemove', mouseMove);

  function render() {
    addDelayRotation(ring1, 1.2);
    addDelayRotation(ring2, 0.3);
    addDelayRotation(ring3, -0.2);

    const date = new Date();
    const hourAngle = (date.getHours() / 12) * Math.PI * 2;
    rotateLine(hourLine, hourAngle, ring1.rotation, 1.0, 0);

    const minuteAngle = (date.getMinutes() / 60) * Math.PI * 2;
    rotateLine(minuteLine, minuteAngle, ring1.rotation, 0.8, 0.1);

    const secondAngle = (date.getSeconds() / 60) * Math.PI * 2;
    rotateLine(secondLine, secondAngle, ring1.rotation, 0.75, -0.1);

    clockLines.children.forEach((line, index) => {
      rotateLine(line, (index / 12) * Math.PI * 2, ring1.rotation, 1.72, 0.2);
    });

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }

  render();
}

createApp();

function mouseMove(event: MouseEvent) {
  const { clientX, clientY } = event;
  const x = clientX - params.width * 0.5;
  const y = clientY - params.height * 0.5;
  mouse.set(x * 0.001, y * 0.001);
}

function resize(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) {
  params.width = window.innerWidth;
  params.height = window.innerHeight;

  camera.aspect = params.width / params.height;
  camera.updateProjectionMatrix();

  renderer.setSize(params.width, params.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

function createRing(envMap: THREE.Texture, thickness: number, color: THREE.Color) {
  const ringFront = new THREE.Mesh(
    new THREE.RingGeometry(2, 2 + thickness, 70),
    new THREE.MeshStandardMaterial({ envMap, roughness: 0, metalness: 1, side: THREE.DoubleSide, color, envMapIntensity: 1 }),
  );
  ringFront.position.set(0, 0, 0.25 * 0.5);

  const ringBack = new THREE.Mesh(
    new THREE.RingGeometry(2, 2 + thickness, 70),
    new THREE.MeshStandardMaterial({ envMap, roughness: 0, metalness: 1, side: THREE.DoubleSide, color, envMapIntensity: 1 }),
  );
  ringBack.position.set(0, 0, -0.25 * 0.5);

  const outerCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(2 + thickness, 2 + thickness, 0.25, 100, 1, true),
    new THREE.MeshStandardMaterial({ envMap, roughness: 0, metalness: 1, side: THREE.DoubleSide, color, envMapIntensity: 1 }),
  );
  outerCylinder.rotation.x = Math.PI * 0.5;

  const innerCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2, 0.25, 70, 1, true),
    new THREE.MeshStandardMaterial({ envMap, roughness: 0, metalness: 1, side: THREE.DoubleSide, color, envMapIntensity: 1 }),
  );
  innerCylinder.rotation.x = Math.PI * 0.5;

  const ringGroup = new THREE.Group();
  ringGroup.add(ringFront, ringBack, outerCylinder, innerCylinder);

  return ringGroup;
}

function addDelayRotation(object: THREE.Group, speed: number) {
  const rotationX = object.rotation.x * 0.95 + mouse.y * speed * 0.05;
  const rotationY = object.rotation.y * 0.95 + mouse.x * speed * 0.05;
  return object.rotation.set(rotationX, rotationY, 0);
}

function create3DLine(
  height: number,
  width: number,
  depth: number,
  envMap: THREE.Texture,
  color: THREE.Color,
  envMapIntensity: number,
) {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ envMap, color, envMapIntensity, roughness: 0, metalness: 1, side: THREE.DoubleSide }),
  );
  box.position.set(0, 0, 0);

  const topCap = new THREE.Mesh(
    new THREE.CylinderGeometry(width * 0.5, width * 0.5, depth, 20),
    new THREE.MeshStandardMaterial({ envMap, color, envMapIntensity, roughness: 0, metalness: 1, side: THREE.DoubleSide }),
  );
  topCap.rotation.x = Math.PI * 0.5;
  topCap.position.set(0, height * 0.5, 0);

  const bottomCap = new THREE.Mesh(
    new THREE.CylinderGeometry(width * 0.5, width * 0.5, depth, 20),
    new THREE.MeshStandardMaterial({ envMap, color, envMapIntensity, roughness: 0, metalness: 1, side: THREE.DoubleSide }),
  );
  bottomCap.rotation.x = Math.PI * 0.5;
  bottomCap.position.set(0, -height * 0.5, 0);

  const line = new THREE.Group();
  line.add(box, topCap, bottomCap);
  return line;
}

function rotateLine(
  line: THREE.Group | THREE.Object3D,
  angle: number,
  ringRotation: THREE.Euler,
  topTranslation: number,
  depthTranslation: number,
) {
  const tMatrix = new THREE.Matrix4().makeTranslation(0, topTranslation, depthTranslation);
  const rMatrix = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 0, 1), -angle);
  const r1Matrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler().copy(ringRotation));

  line.matrix.copy(new THREE.Matrix4().multiply(r1Matrix).multiply(rMatrix).multiply(tMatrix));
  line.matrixAutoUpdate = false;
  line.matrixWorldNeedsUpdate = false;
}

function createClockLines(texture: THREE.Texture) {
  const group = new THREE.Group();

  for (let i = 0; i < 12; i++) {
    const line = create3DLine(0.1, 0.075, 0.025, texture, new THREE.Color(0.65, 0.65, 0.65), 1);
    group.add(line);
  }

  return group;
}
