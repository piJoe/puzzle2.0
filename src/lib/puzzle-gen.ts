import * as THREE from "three";
import Prando from "prando";
import { nextPowerOf2, toVector2 } from "./helper";
import { PuzzleMaterial } from "./materials/puzzle-material";
import { PuzzlePickingMaterial } from "./materials/puzzle-picking-material";

let rng = new Prando("DREIZACKEN");
// let rng = new Prando();

function createPuzzleConn(
  startPoint: THREE.Vector2,
  endPoint: THREE.Vector2
): THREE.Vector2[] {
  const points: THREE.Vector2[] = [];

  const start3D = new THREE.Vector3(startPoint.x, startPoint.y);
  const end3D = new THREE.Vector3(endPoint.x, endPoint.y);
  const baseLine = new THREE.Line3(start3D, end3D);

  // calculate normals
  const parallel = end3D.clone().sub(start3D).normalize();
  const normal = parallel.clone().set(-parallel.y, parallel.x, parallel.z);

  // calculate length
  const connLen = baseLine.distance();

  // STEP 1: Setup variables
  const midPos = rng.next(0.46, 0.54);
  const midSize = rng.next(0.26, 0.28);
  const curveDir = rng.next() > 0.5 ? 1 : -1;
  const nipLength = midSize * curveDir;
  const nipJitter = rng.next(-0.05, 0.05);
  const nipStartJitter = nipJitter * rng.next(0.5, 1);
  const nipEndJitter = nipJitter * rng.next(0.5, 1);
  const distortYVal = -curveDir * (rng.next(0.01, 0.05) * connLen);
  const distortY = normal.clone().setLength(distortYVal);
  const neckLength = 0.25;

  // STEP 2: get start/end of mid-piece

  const [midStart, midEnd] = [
    baseLine.at(midPos - midSize * 0.5, new THREE.Vector3()),
    baseLine.at(midPos + midSize * 0.5, new THREE.Vector3()),
  ];

  // STEP 3: add nipple
  const [nipHeadStartA, nipHeadStartB, nipHeadEndA, nipHeadEndB] = [
    baseLine
      .at(midPos - midSize * 0.45, new THREE.Vector3())
      .add(normal.clone().setLength(nipLength * 0.65 * connLen))
      .add(parallel.clone().setLength(nipStartJitter * connLen)),
    baseLine
      .at(midPos - midSize * 0.325, new THREE.Vector3())
      .add(normal.clone().setLength(nipLength * 0.9 * connLen))
      .add(parallel.clone().setLength(nipStartJitter * connLen)),

    baseLine
      .at(midPos + midSize * 0.45, new THREE.Vector3())
      .add(normal.clone().setLength(nipLength * 0.65 * connLen))
      .add(parallel.clone().setLength(nipEndJitter * connLen)),
    baseLine
      .at(midPos + midSize * 0.325, new THREE.Vector3())
      .add(normal.clone().setLength(nipLength * 0.9 * connLen))
      .add(parallel.clone().setLength(nipEndJitter * connLen)),
  ];
  const nipHead = baseLine
    .at(midPos, new THREE.Vector3())
    .add(normal.clone().setLength(nipLength * connLen));

  const [neckStartA, neckStartB, neckEndA, neckEndB] = [
    baseLine
      .at(midPos - midSize * 0.25, new THREE.Vector3())
      .add(normal.clone().setLength(nipLength * 0.1 * connLen)),
    baseLine
      .at(midPos - midSize * 0.25, new THREE.Vector3())
      .add(normal.clone().setLength(nipLength * (0.1 + neckLength) * connLen))
      .add(parallel.clone().setLength(nipStartJitter * 0.6 * connLen)),

    baseLine
      .at(midPos + midSize * 0.25, new THREE.Vector3())
      .add(normal.clone().setLength(nipLength * 0.1 * connLen)),
    baseLine
      .at(midPos + midSize * 0.25, new THREE.Vector3())
      .add(normal.clone().setLength(nipLength * (0.1 + neckLength) * connLen))
      .add(parallel.clone().setLength(nipEndJitter * 0.6 * connLen)),
  ];

  // STEP 4: distort by random amount
  const toDistort = [
    midStart,
    midEnd,
    nipHeadStartA,
    nipHeadStartB,
    nipHeadEndA,
    nipHeadEndB,
    nipHead,
    neckStartA,
    neckStartB,
    neckEndA,
    neckEndB,
  ];

  toDistort.forEach((p) => {
    p.add(distortY);
  });
  toDistort.forEach((p) => {
    const distortX = rng.next(-0.005, 0.005) * connLen;
    p.add(parallel.clone().setLength(distortX));
  });

  points.push(startPoint);
  points.push(toVector2(midStart));
  points.push(toVector2(neckStartA));
  points.push(toVector2(neckStartB));
  points.push(toVector2(nipHeadStartA));
  points.push(toVector2(nipHeadStartB));
  points.push(toVector2(nipHead));
  points.push(toVector2(nipHeadEndB));
  points.push(toVector2(nipHeadEndA));
  points.push(toVector2(neckEndB));
  points.push(toVector2(neckEndA));
  points.push(toVector2(midEnd));
  points.push(endPoint);

  return points;
}

function randomMove(start, end) {
  // calculate length
  const connLen = start.distanceTo(end);

  // calculate normals
  const parallel = end.clone().sub(start).normalize();
  const normal = parallel.set(-parallel.y, parallel.x, parallel.z);

  const distort = rng.next(-0.035, 0.035) * connLen;
  start.add(normal.clone().setLength(distort));
  end.add(normal.clone().setLength(distort));
}

interface IConnectorLine {
  points: THREE.Vector2[];
  isBorder: boolean;
  // isBorder: x === 0 || x === sizeX || Math.random() > 0.9,
  connectionId: number;
}

interface IPuzzlePiece {
  lines: IConnectorLine[];
  rotation: number;
  position: THREE.Vector2;
  center: THREE.Vector2;
  points: THREE.Vector2[];
}

function generateGrid(
  sizeX,
  sizeY,
  borderless = false,
  pieceSize = { x: 1, y: 1 }
) {
  const points: THREE.Vector2[][] = [];
  for (let x = 0; x <= sizeX; x++) {
    const parts: THREE.Vector2[] = [];
    for (let y = 0; y <= sizeY; y++) {
      parts.push(new THREE.Vector2(pieceSize.x * x, pieceSize.y * y));
    }
    points.push(parts);
  }

  const verticalLines: IConnectorLine[] = [];
  const horizontalLines: IConnectorLine[] = [];
  let id = 0;
  for (let x = 0; x <= sizeX; x++) {
    for (let y = 0; y <= sizeY; y++) {
      // vertical
      if (y < sizeY) {
        const line = {
          points: [points[x][y], points[x][y + 1]],
          isBorder: !borderless ? x === 0 || x === sizeX : false,
          // isBorder: x === 0 || x === sizeX || Math.random() > 0.9,
          connectionId: id++,
        };
        verticalLines.push(line);
      }

      // horizontal
      if (x < sizeX) {
        const line = {
          points: [points[x][y], points[x + 1][y]],
          isBorder: !borderless ? y === 0 || y === sizeY : false,
          // isBorder: y === 0 || y === sizeY || Math.random() > 0.9,
          connectionId: id++,
        };
        horizontalLines.push(line);
      }
    }
  }

  // @todo: make this to Partial<IPuzzlePiece>[] or maybe rework this
  const pieces: IPuzzlePiece[] = [];
  for (let x = 0; x < sizeX; x++) {
    for (let y = 0; y < sizeY; y++) {
      pieces.push({
        lines: [
          verticalLines[x * sizeY + y],
          horizontalLines[x * (sizeY + 1) + y + 1],
          verticalLines[(x + 1) * sizeY + y],
          horizontalLines[x * (sizeY + 1) + y],
        ],
        rotation: 0,
        position: new THREE.Vector2(),
        center: new THREE.Vector2(),
        points: [],
      });
    }
  }

  // @TODO: rotate and create connections:
  // randomRotate per line
  // createPuzzleConn per line:
  //  -> add related piece as argument,
  //  -> allowing for bounding-box checks and therefore more extreme random values!

  return {
    verticalLines,
    horizontalLines,
    pieces,
  };
}

function calculatePieceCount(fullWidth, fullHeight, targetCount) {
  const ratio_w = fullWidth / fullHeight;
  const ratio_h = fullHeight / fullWidth;

  let pieceCountW = Math.round(Math.sqrt(targetCount * ratio_w));
  let pieceCountH = Math.round(Math.sqrt(targetCount * ratio_h));

  // fixes min target count
  while (pieceCountH * pieceCountW < targetCount) {
    if (pieceCountH < pieceCountW) {
      pieceCountW++;
    } else {
      pieceCountH++;
    }
  }

  return {
    x: pieceCountW,
    y: pieceCountH,
    total: pieceCountH * pieceCountW,
  };
}

function generateGridByRealSize(width, height, count) {
  const { x, y } = calculatePieceCount(width, height, count);
  const pieceSize = {
    x: width / x,
    y: height / y,
  };

  return { pieceSize, ...generateGrid(x, y, false, pieceSize) };
}

function offsetPuzzlePoints(points, offset) {
  let result: THREE.Vector2[] = [];

  offset = new THREE.BufferAttribute(new Float32Array([offset, 0, 0]), 3);

  for (let i = 0; i < points.length; i++) {
    let v1 = new THREE.Vector2().subVectors(
      points[i - 1 < 0 ? points.length - 1 : i - 1],
      points[i]
    );
    let v2 = new THREE.Vector2().subVectors(
      points[i + 1 == points.length ? 0 : i + 1],
      points[i]
    );
    let angle = v2.angle() - v1.angle();
    let halfAngle = angle * 0.5;

    let hA = halfAngle;
    let tA = v2.angle() + Math.PI * 0.5;

    let shift = Math.tan(hA - Math.PI * 0.5);
    let shiftMatrix = new THREE.Matrix4().set(
      1,
      0,
      0,
      0,
      -shift,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    );

    let tempAngle = tA;
    let rotationMatrix = new THREE.Matrix4().set(
      Math.cos(tempAngle),
      -Math.sin(tempAngle),
      0,
      0,
      Math.sin(tempAngle),
      Math.cos(tempAngle),
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    );

    let translationMatrix = new THREE.Matrix4().set(
      1,
      0,
      0,
      points[i].x,
      0,
      1,
      0,
      points[i].y,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    );

    let cloneOffset = offset.clone();
    cloneOffset.applyMatrix4(shiftMatrix);
    cloneOffset.applyMatrix4(rotationMatrix);
    cloneOffset.applyMatrix4(translationMatrix);

    result.push(new THREE.Vector2(cloneOffset.getX(0), cloneOffset.getY(0)));
  }

  return result;
}

// =============================================
// SETUP THREE.JS
// =============================================

const loader = new THREE.TextureLoader();

const renderer = new THREE.WebGLRenderer({
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.floor(window.devicePixelRatio));
document.body.appendChild(renderer.domElement);

console.log(renderer);

const pickingTarget = new THREE.WebGLRenderTarget(
  window.innerWidth,
  window.innerHeight,
  {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    encoding: THREE.LinearEncoding,
  }
);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  10000
);

window.addEventListener("resize", onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  pickingTarget.setSize(window.innerWidth, window.innerHeight);
  // render();
}
const pickingScene = new THREE.Scene();

const scene = new THREE.Scene();

const pixelBuffer = new Uint8Array(4);
let selected = 0;
// const start = { x: 0, y: 0 };
// document.querySelector("canvas").addEventListener("mousemove", (e) => {
//   // console.log(e);
//   const { x, y } = {
//     x: e.clientX,
//     y: e.clientY,
//   };

//   renderer.readRenderTargetPixels(
//     pickingTarget,
//     x,
//     pickingTarget.height - y,
//     1,
//     1,
//     pixelBuffer
//   );

//   const id =
//     (pixelBuffer[0] << 16) | (pixelBuffer[1] << 8) | pixelBuffer[2];

//   selected = id;
// });
const selection = document.getElementById("selection")!;
function renderSelectionArea(posA, posB) {
  const [minX, minY, maxX, maxY] = [
    posA.x < posB.x ? posA.x : posB.x,
    posA.y < posB.y ? posA.y : posB.y,

    posA.x >= posB.x ? posA.x : posB.x,
    posA.y >= posB.y ? posA.y : posB.y,
  ];

  selection.style.top = minY + "px";
  selection.style.left = minX + "px";
  selection.style.height = maxY - minY + "px";
  selection.style.width = maxX - minX + "px";
}

function createImageFromTexture(data, width, height) {
  // Create a 2D canvas to store the result
  var canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  var context = canvas.getContext("2d");

  // Copy the pixels to a 2D canvas
  if (context) {
    var imageData = context.createImageData(width, height);
    imageData.data.set(data);
    context.putImageData(imageData, 0, 0);
  }

  (document.getElementById("img")! as HTMLImageElement).src =
    canvas.toDataURL();
}

let dragging = false;
let startPos = { x: 0, y: 0 };
const canvas = document.querySelector("canvas")!;
canvas.addEventListener("mousedown", (e) => {
  e.preventDefault();
  e.stopPropagation();

  const { x, y } = {
    x: e.clientX,
    y: e.clientY,
  };
  startPos = { x, y };
  dragging = true;

  selection.classList.toggle("visible", true);
  renderSelectionArea(startPos, { x, y });
});
canvas.addEventListener("mousemove", (e) => {
  if (dragging) {
    const { x, y } = {
      x: e.clientX,
      y: e.clientY,
    };

    renderSelectionArea(startPos, { x, y });
  }
});
canvas.addEventListener("mouseup", (e) => {
  e.preventDefault();
  e.stopPropagation();

  const { x, y } = {
    x: e.clientX,
    y: e.clientY,
  };

  const endPos = { x, y };

  console.time("selection");

  const [width, height] = [
    Math.max(1, Math.abs(startPos.x - endPos.x)),
    Math.max(1, Math.abs(startPos.y - endPos.y)),
  ];

  renderSelectionArea(startPos, endPos);

  const pixelBuffer = new Uint8Array(width * height * 4);

  renderSelection();
  renderer.readRenderTargetPixels(
    pickingTarget,
    startPos.x > endPos.x ? endPos.x : startPos.x,
    pickingTarget.height -
      (startPos.y > endPos.y ? endPos.y : startPos.y) -
      height,
    width,
    height,
    pixelBuffer
  );

  // createImageFromTexture(pixelBuffer, width, height);

  const ids = new Map();
  for (let i = 0; i < pixelBuffer.length; i += 4) {
    const id =
      (pixelBuffer[i + 0] << 16) |
      (pixelBuffer[i + 1] << 8) |
      pixelBuffer[i + 2];

    if (!ids.has(id)) {
      ids.set(id, true);
    }
  }
  const selected = [...ids.keys()];
  console.log(selected);

  for (const id of selected) {
    if (id > 0) {
      const piece = pieces[id - 1];
      piece.rotation = (piece.rotation + Math.PI / 2) % (Math.PI * 2);
      puzzleData.set(
        [piece.position.x, piece.position.y, piece.rotation, 0],
        id * 4
      );
    }
  }
  puzzleDataTex.needsUpdate = true;

  console.timeEnd("selection");

  // const id =
  //   (pixelBuffer[0] << 16) | (pixelBuffer[1] << 8) | pixelBuffer[2];

  selection.classList.toggle("visible", false);
  dragging = false;
});

// =============================================
// GRID GEDÖHNS
// =============================================

console.time("puzzlegen");
// @todo: suggest minimum px density of 64x64px, meaning we set count to (width/64) * (height/64)
const [sizeX, sizeY, count] = [496, 830, 20000];

const { verticalLines, horizontalLines, pieces, pieceSize } =
  generateGridByRealSize(sizeX, sizeY, count);

// refocus camera
camera.position.set(sizeX / 1.5, sizeY / 1.25, 200);
camera.lookAt(sizeX / 1.5, sizeY / 1.25, 0);

const allLines = [...verticalLines, ...horizontalLines];
for (let l of allLines) {
  if (!l.isBorder) {
    const [start, end] = [l.points[0], l.points[1]];
    randomMove(l.points[0], l.points[1]);
    const points = createPuzzleConn(l.points[0], l.points[1]);

    // round off our newly create points
    const curve = new THREE.SplineCurve(points.slice(1, -1));
    l.points = [start, ...curve.getPoints(20), end];
  }
}

for (const piece of pieces) {
  let points: THREE.Vector2[] = [];
  let i = 0;
  let endPoint: THREE.Vector2 | null = null;
  for (const line of piece.lines) {
    const pointsInLine = [...line.points];
    const startPoint = pointsInLine[0];
    if (endPoint !== null && startPoint !== endPoint) {
      points.push(...pointsInLine.reverse().slice(0, -1));
    } else {
      points.push(...pointsInLine.slice(0, -1));
    }
    endPoint = pointsInLine[pointsInLine.length - 1];
  }

  // clone every point so we are free to modify without breaking shit
  points = points.map((p) => p.clone());

  // calculate border box and center point
  // @todo: see if this is really true, probably we need another function for calculating the bb
  const bb = new THREE.Box2().setFromPoints(
    piece.lines.map((line) => line.points[0])
  );
  piece.center = bb.getCenter(new THREE.Vector2());
  piece.position = piece.center.clone().multiplyScalar(1.6);
  piece.rotation = THREE.MathUtils.degToRad(
    Math.ceil((Math.random() * 360) / 90) * 90
  );

  piece.points = offsetPuzzlePoints(points, -0.005 * pieceSize.x);
}
// cleanup line point allocations (no longer needed)
for (let l of allLines) {
  l.points = [];
}
console.timeEnd("puzzlegen");

console.time("render");
const geometry = new THREE.BufferGeometry();
const verticesArr: number[] = [];
const uvArr: number[] = [];
const modelIdArr: number[] = [];

// datatexture RGBA Float (r = pos.x, g = pos.y, b = angle, a = outline)
const puzzleDataSize = nextPowerOf2(Math.sqrt(pieces.length + 1));
const puzzleData = new Float32Array(puzzleDataSize * puzzleDataSize * 4);

let id = 1;
for (let i in pieces) {
  const modelId = id;
  id++;
  const piece = pieces[i];
  const tris = THREE.ShapeUtils.triangulateShape(piece.points, []);
  for (const face of tris) {
    const points = [
      piece.points[face[0]],
      piece.points[face[1]],
      piece.points[face[2]],
    ];

    // add to vertices array, subtract center position
    verticesArr.push(
      points[0].x - piece.center.x,
      points[0].y - piece.center.y,
      0,
      points[1].x - piece.center.x,
      points[1].y - piece.center.y,
      0,
      points[2].x - piece.center.x,
      points[2].y - piece.center.y,
      0
    );

    // add to UV array
    uvArr.push(
      points[0].x / sizeX,
      points[0].y / sizeY,
      points[1].x / sizeX,
      points[1].y / sizeY,
      points[2].x / sizeX,
      points[2].y / sizeY
    );

    // add to modelId array
    modelIdArr.push(modelId, modelId, modelId);

    // set everything in puzzleData texture
    puzzleData.set(
      [piece.position.x, piece.position.y, piece.rotation, 0],
      modelId * 4
    );
  }
  // cleanup piece point allocations (no longer needed)
  piece.points = [];
}

const vertices = Float32Array.from(verticesArr);
const uvs = Float32Array.from(uvArr);
const modelIds = Float32Array.from(modelIdArr);
geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
geometry.setAttribute("modelId", new THREE.BufferAttribute(modelIds, 1));
const puzzleDataTex = new THREE.DataTexture(
  puzzleData,
  puzzleDataSize,
  puzzleDataSize,
  THREE.RGBAFormat,
  THREE.FloatType
);
puzzleDataTex.needsUpdate = true;

const puzzleSize = new THREE.Vector2(puzzleDataSize, puzzleDataSize);
const m = new PuzzleMaterial(puzzleSize, puzzleDataTex);

loader.load("/imgs/sailormoon.jpg", (texture) => {
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  m.updateMap(texture);
});

const mesh = new THREE.Mesh(geometry, m);
mesh.frustumCulled = false;
scene.add(mesh);
const pickMesh = new THREE.Mesh(
  geometry,
  new PuzzlePickingMaterial(puzzleSize, puzzleDataTex)
);
pickMesh.frustumCulled = false;
pickingScene.add(pickMesh);

render();
console.timeEnd("render");

function render() {
  renderer.setClearColor(0);
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);

  requestAnimationFrame(render);
}

function renderSelection() {
  renderer.setClearColor(0);
  renderer.setRenderTarget(pickingTarget);
  renderer.render(pickingScene, camera);
}
