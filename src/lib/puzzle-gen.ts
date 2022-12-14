import * as THREE from "three";
import Prando from "prando";
import {
  calculatePieceCount,
  nextPowerOf2,
  offsetOutline,
  posToWorldPos,
  rotateZ,
  toVector2,
} from "./helper";
import { PuzzleMaterial } from "./materials/puzzle-material";
import { PuzzlePickingMaterial } from "./materials/puzzle-picking-material";
import { OrthographicCamera, Vector2, Vector3 } from "three";

import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import { PuzzleOutlineMaterial } from "./materials/puzzle-outline-material";
import { PuzzleSelectionMaterial } from "./materials/puzzle-selection-material";
import { PuzzleOverlayMaterial } from "./materials/puzzle-overlay-material";

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
  neighbours: IPuzzlePiece[];
}

interface IPuzzlePiece {
  lines: IConnectorLine[];
  rotation: number;
  position: THREE.Vector3;
  center: THREE.Vector2;
  points: THREE.Vector2[];
  id: number;
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
        const line: IConnectorLine = {
          points: [points[x][y], points[x][y + 1]],
          isBorder: !borderless ? x === 0 || x === sizeX : false,
          // isBorder: x === 0 || x === sizeX || Math.random() > 0.9,
          connectionId: id++,
          neighbours: [],
        };
        verticalLines.push(line);
      }

      // horizontal
      if (x < sizeX) {
        const line: IConnectorLine = {
          points: [points[x][y], points[x + 1][y]],
          isBorder: !borderless ? y === 0 || y === sizeY : false,
          // isBorder: y === 0 || y === sizeY || Math.random() > 0.9,
          connectionId: id++,
          neighbours: [],
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
        position: new THREE.Vector3(),
        center: new THREE.Vector2(),
        points: [],
        id: 0,
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

// =============================================
// SETUP THREE.JS
// =============================================

const loader = new THREE.TextureLoader();

const renderer = new THREE.WebGLRenderer({
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.setPixelRatio(Math.floor(window.devicePixelRatio));
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

function updateCameraViewport(sizeX, sizeY) {
  let aspect = window.innerWidth / window.innerHeight;

  // const size = tableSize.bottomRight.clone().sub(tableSize.topLeft);
  const size = { x: sizeX, y: sizeY };
  const len = size.x > size.y ? size.x : size.y;

  camera.left = (-aspect * len) / 2;
  camera.right = (aspect * len) / 2;
  camera.top = len / 2;
  camera.bottom = -len / 2;

  // portrait device
  if (aspect < 1.0) {
    aspect = window.innerHeight / window.innerWidth;

    camera.left = -len / 2;
    camera.right = len / 2;
    camera.top = (aspect * len) / 2;
    camera.bottom = (-aspect * len) / 2;
  }

  camera.updateProjectionMatrix();
}

// const camera = new THREE.PerspectiveCamera(
//   45,
//   window.innerWidth / window.innerHeight,
//   1,
//   10000
// );
const camera = new OrthographicCamera(
  window.innerWidth / -2,
  window.innerWidth / 2,
  window.innerHeight / 2,
  window.innerHeight / -2,
  0,
  10000
);
camera.position.setZ(100);

window.addEventListener("resize", onWindowResize, false);
function onWindowResize() {
  // const aspect = window.innerWidth / window.innerHeight;
  // camera.aspect = aspect;
  // camera.updateProjectionMatrix();
  updateCameraViewport(sizeX, sizeY);
  renderer.setSize(window.innerWidth, window.innerHeight);
  pickingTarget.setSize(window.innerWidth, window.innerHeight);
  // render();
}

const listener = new THREE.AudioListener();
camera.add(listener);

const click = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
audioLoader.load("/static/sounds/snap.mp3", function (buffer) {
  click.setBuffer(buffer);
  click.setVolume(0.6);
  // click.setRefDistance(20);
});

const pickingScene = new THREE.Scene();
const scene = new THREE.Scene();

scene.add(click);

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

function select(startPos, endPos) {
  const [width, height] = [
    Math.max(1, Math.abs(startPos.x - endPos.x)),
    Math.max(1, Math.abs(startPos.y - endPos.y)),
  ];

  renderSelectionArea(startPos, endPos);

  const pixelBuffer = new Uint8Array(width * height * 4);

  renderGPUPickingScene();
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

    if (!ids.has(id) && id !== 0) {
      ids.set(id, true);
    }
  }
  return [...ids.keys()];
}

function snapPieces(piece: IPuzzlePiece) {
  // find all neighbours by piece.lines
  for (const l of piece.lines) {
    const neighbour = l.neighbours.find((p) => p !== piece);

    if (!neighbour) continue;
    //console.log("NEIGHBOUR:", neighbour.rotation, "SELF:", piece.rotation);
    if (neighbour.rotation !== piece.rotation) continue;

    const rotationMatrix = rotateZ(piece.rotation);

    // snap to neighbour
    const neighbourSnap = l.points[0]
      .clone()
      .sub(neighbour.center)
      .applyMatrix3(rotationMatrix)
      .add(neighbour.position);
    const mySnap = l.points[0]
      .clone()
      .sub(piece.center)
      .applyMatrix3(rotationMatrix)
      .add(piece.position);

    const distance = neighbourSnap.distanceTo(mySnap);

    if (distance > puzzleSnapDistance) {
      continue;
    }
    // snapA.position.set(neighbourSnap.x, neighbourSnap.y, 1);
    // snapB.position.set(mySnap.x, mySnap.y, 1);

    // @todo: maybe store all snaps instead of executing first directly, then sort by distance, closest wins?
    piece.position.add(neighbourSnap.sub(mySnap) as unknown as Vector3);
    click.play();
    document.querySelector("#snap-fx")?.classList.toggle("play", true);
    window.setTimeout(() => {
      document.querySelector("#snap-fx")?.classList.toggle("play", false);
    }, 200);
    // console.log(neighbourSnap, mySnap);

    break;
  }
}

let dragging = false;
let camDragging = false;
let startPos = { x: 0, y: 0 };
let lastPos = new Vector3(0, 0, 0);
let selecting = false;
let selected: number[] = [];
let nightVisionActive = false;
const canvas = document.querySelector("canvas")!;

window.addEventListener("keyup", (e) => {
  if (e.key === "q") {
    nightVisionActive = !nightVisionActive;
    m.updateNightVision(nightVisionActive ? 1 : 0);
  }
});

window.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  e.stopPropagation();
});
canvas.addEventListener("wheel", (e) => {
  // console.log(e);
  // e.preventDefault();
  e.stopPropagation();
  const prevZoom = camera.zoom;
  // camera.zoom += e.deltaY * -0.005;
  camera.zoom *= 1 + e.deltaY * -0.001;
  if (camera.zoom < 0.5) camera.zoom = 0.5;
  camera.updateProjectionMatrix();
  // zoom to mouse position
  const camZ = camera.position.z;
  camera.position.lerp(mousePos, 1 - prevZoom / camera.zoom);
  camera.position.setZ(camZ);
});
canvas.addEventListener("mousedown", (e) => {
  e.preventDefault();
  e.stopPropagation();

  const { x, y } = {
    x: e.clientX,
    y: e.clientY,
  };
  startPos = { x, y };

  if (e.ctrlKey && e.button === 0) {
    // selecting = true;
    // selection.classList.toggle("visible", true);
    // renderSelectionArea(startPos, { x, y });
    // return;
  } else {
    selected = select(startPos, startPos);
    console.log(selected);
  }

  switch (e.button) {
    case 0: // left-click
      if (e.shiftKey) {
        camDragging = true;
        lastPos.set(
          (x / window.innerWidth) * (camera.right * 2),
          (y / window.innerHeight) * (camera.bottom * 2),
          0
        );
      } else {
        dragging = true;
        lastPos.copy(
          posToWorldPos(x, y, window.innerWidth, window.innerHeight, camera)
        );
      }
      break;
    case 1: // middle-click
      camDragging = true;
      lastPos.set(
        (x / window.innerWidth) * (camera.right * 2),
        (y / window.innerHeight) * (camera.bottom * 2),
        0
      );
      break;
    case 2: // right-click
      for (const id of selected) {
        if (id > 0) {
          const piece = pieces[id - 1];
          // piece.position.add(moved);
          piece.rotation = (piece.rotation + Math.PI / 2) % (Math.PI * 2);

          snapPieces(piece);
          piece.position.setZ(0.0);

          puzzleData.set(
            [
              piece.position.x,
              piece.position.y,
              piece.position.z,
              piece.rotation,
            ],
            id * 4
          );
        }
      }
      puzzleDataTex.needsUpdate = true;
      break;
  }
});
const mousePos = new Vector3();
canvas.addEventListener(
  "mousemove",
  (e) => {
    const { x, y } = {
      x: e.clientX,
      y: e.clientY,
    };

    mousePos.copy(
      posToWorldPos(x, y, window.innerWidth, window.innerHeight, camera)
    );

    if (!e.shiftKey) {
      selecting = false;
      selection.classList.toggle("visible", false);
    }
    if (selecting && e.shiftKey) {
      renderSelectionArea(startPos, { x, y });
      lastPos.set(x, y, 0);
      return;
    }

    if (camDragging) {
      let [xd, yd] = [
        (x / window.innerWidth) * (camera.right * 2),
        (y / window.innerHeight) * (camera.bottom * 2),
      ];
      const moved = new Vector3(xd - lastPos.x, yd - lastPos.y, 0);
      lastPos.set(xd, yd, 0);

      camera.position.sub(moved.divideScalar(camera.zoom));
      return;
    }

    if (dragging) {
      const worldPos = posToWorldPos(
        x,
        y,
        window.innerWidth,
        window.innerHeight,
        camera
      );

      const moved = new Vector3(
        worldPos.x - lastPos.x,
        worldPos.y - lastPos.y,
        0
      );
      lastPos.copy(worldPos);

      for (const piece of pieces) {
        const id = piece.id;
        if (selected.includes(id)) {
          piece.position.add(moved).setZ(0.1);
          // piece.rotation = (piece.rotation + Math.PI / 2) % (Math.PI * 2);
        } else {
          piece.position.setZ(0.0);
        }
        puzzleData.set(
          [
            piece.position.x,
            piece.position.y,
            piece.position.z,
            piece.rotation,
          ],
          id * 4
        );
      }
      puzzleDataTex.needsUpdate = true;

      // renderSelectionArea(startPos, { x, y });
    }
  },
  { passive: true }
);
canvas.addEventListener("mouseup", (e) => {
  e.preventDefault();
  e.stopPropagation();

  if (selecting && e.shiftKey) {
    selecting = false;
    selection.classList.toggle("visible", false);
    selected = select(startPos, lastPos);
    console.log(selected);
    return;
  }

  if (dragging) {
    dragging = false;
    for (const id of selected) {
      if (id > 0) {
        const piece = pieces[id - 1];

        snapPieces(piece);

        piece.position.setZ(0.0);
        puzzleData.set(
          [
            piece.position.x,
            piece.position.y,
            piece.position.z,
            piece.rotation,
          ],
          id * 4
        );
      }
    }
    selected = [];
  }

  if (camDragging) {
    camDragging = false;
  }
  puzzleDataTex.needsUpdate = true;
  return;

  // const { x, y } = {
  //   x: e.clientX,
  //   y: e.clientY,
  // };

  // const endPos = { x, y };

  // console.time("selection");

  // const selected = select(startPos, endPos);

  // for (const id of selected) {
  //   if (id > 0) {
  //     const piece = pieces[id - 1];
  //     piece.rotation = (piece.rotation + Math.PI / 2) % (Math.PI * 2);
  //     puzzleData.set(
  //       [piece.position.x, piece.position.y, piece.position.z, piece.rotation],
  //       id * 4
  //     );
  //   }
  // }
  // puzzleDataTex.needsUpdate = true;

  // console.timeEnd("selection");

  // // const id =
  // //   (pixelBuffer[0] << 16) | (pixelBuffer[1] << 8) | pixelBuffer[2];

  // selection.classList.toggle("visible", false);
  // dragging = false;
});

// =============================================
// GRID GED??HNS
// =============================================

export function generateGridByRealSize(width, height, count) {
  const { x, y } = calculatePieceCount(width, height, count);
  const pieceSize = {
    x: width / x,
    y: height / y,
  };

  return { pieceSize, ...generateGrid(x, y, false, pieceSize) };
}

console.time("puzzlegen");
// @todo: suggest minimum px density of 64x64px, meaning we set count to (width/64) * (height/64)
const [sizeX, sizeY, count] = [3840 / 2, 1908 / 2, 2000];

const { verticalLines, horizontalLines, pieces, pieceSize } =
  generateGridByRealSize(sizeX, sizeY, count);

const puzzleGapSize = 0.005 * ((pieceSize.x + pieceSize.y) / 2);
const puzzleSnapDistance = ((pieceSize.x + pieceSize.y) / 2) * 0.15;

// refocus camera
// camera.position.set(sizeX / 1.5, sizeY / 1.25, 50);
// camera.lookAt(sizeX / 1.5, sizeY / 1.25, 0);

const allLines = [...verticalLines, ...horizontalLines];
// const lineMap = new Map<number, IConnectorLine>();
for (let l of allLines) {
  if (!l.isBorder) {
    const [start, end] = [l.points[0], l.points[1]];
    randomMove(l.points[0], l.points[1]);
    const points = createPuzzleConn(l.points[0], l.points[1]);

    // round off our newly created points
    const curve = new THREE.SplineCurve(points.slice(1, -1));
    l.points = [start, ...curve.getPoints(20), end];
  }
  // lineMap.set(l.connectionId, l);
}

const tableSize = { topLeft: new Vector2(), bottomRight: new Vector2() };

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

    // add piece to line as 'neighbour'
    line.neighbours.push(piece);
  }

  // clone every point so we are free to modify without breaking shit
  points = points.map((p) => p.clone());

  // calculate border box and center point
  // @todo: see if this is really true, probably we need another function for calculating the bb
  const bb = new THREE.Box2().setFromPoints(
    piece.lines.map((line) => line.points[0])
  );
  piece.center = bb.getCenter(new THREE.Vector2());
  const pos = piece.center.clone().multiplyScalar(1.6);
  // const pos = piece.center;
  piece.position.set(pos.x, pos.y, 0);
  piece.rotation =
    THREE.MathUtils.degToRad(Math.ceil((Math.random() * 360) / 90) * 90) %
    (Math.PI * 2);

  piece.points = offsetOutline(points, puzzleGapSize * -1);

  if (piece.position.x < tableSize.topLeft.x) {
    tableSize.topLeft.x = piece.position.x;
  }
  if (piece.position.y < tableSize.topLeft.y) {
    tableSize.topLeft.y = piece.position.y;
  }
  if (piece.position.x > tableSize.topLeft.x) {
    tableSize.bottomRight.x = piece.position.x;
  }
  if (piece.position.y > tableSize.topLeft.y) {
    tableSize.bottomRight.y = piece.position.y;
  }
}
// cleanup line point allocations (no longer needed)
for (let l of allLines) {
  // set points to start and end only, needed for snapping logic
  l.points = [l.points[0], l.points[l.points.length - 1]];
}
console.timeEnd("puzzlegen");

// recenter camera
window.camera = camera;
updateCameraViewport(sizeX, sizeY);
camera.position.set(
  (tableSize.bottomRight.x - tableSize.topLeft.x) / 2,
  (tableSize.bottomRight.y - tableSize.topLeft.y) / 2,
  camera.position.z
);
// camera.left = tableSize.topLeft.x;
// camera.top = tableSize.topLeft.y;
// camera.right = tableSize.bottomRight.x;
// camera.bottom = tableSize.bottomRight.y;
// camera.updateProjectionMatrix();

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
  piece.id = modelId;
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
  }

  // set everything in puzzleData texture
  puzzleData.set(
    [piece.position.x, piece.position.y, piece.position.z, piece.rotation],
    modelId * 4
  );

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

loader.load("/imgs/schussenried.jpg", (texture) => {
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.minFilter = THREE.LinearMipMapLinearFilter;
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

// const mouseGeo = new THREE.SphereGeometry(2, 8);
// const mouseMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
// const mouseMesh = new THREE.Mesh(mouseGeo, mouseMat);
// mouseMesh.position.copy(mousePos);
// scene.add(mouseMesh);

const silhoutteBuffer = new THREE.WebGLRenderTarget(
  window.innerWidth,
  window.innerHeight,
  {
    stencilBuffer: true,
  }
);

const outlineBuffer = new THREE.WebGLRenderTarget(
  window.innerWidth,
  window.innerHeight,
  {
    stencilBuffer: true,
  }
);

const sceneBuffer = new THREE.WebGLRenderTarget(
  window.innerWidth,
  window.innerHeight
);

const selectionMat = new PuzzleSelectionMaterial(puzzleSize, puzzleDataTex);
const outlineMat = new PuzzleOutlineMaterial(silhoutteBuffer);
const combineMat = new PuzzleOverlayMaterial(outlineBuffer, sceneBuffer);
const fsQuad = new FullScreenQuad(outlineMat);

function renderWithOutline() {
  renderer.autoClear = false;
  renderer.setClearColor(0);
  renderer.setClearAlpha(0);
  renderer.clear();

  // render selected pieces color
  // @todo: only selected pieces!
  renderer.setRenderTarget(silhoutteBuffer);
  renderer.clear();
  scene.overrideMaterial = selectionMat;
  renderer.render(scene, camera);
  scene.overrideMaterial = null;

  // render outline
  // @todo: copy stencil over somehow? (maybe try using WebGLMultipleRenderTargets?)
  renderer.setRenderTarget(outlineBuffer);
  renderer.clear();
  // stencilling, again...
  // scene.overrideMaterial = selectionMat;
  // renderer.render(scene, camera);
  // scene.overrideMaterial = null;
  // finally rendering the outline
  renderer.clearColor();
  fsQuad.material = outlineMat;
  fsQuad.render(renderer);

  // render scene
  renderer.setRenderTarget(sceneBuffer);
  renderer.clear();
  renderer.render(scene, camera);

  // combine
  renderer.setRenderTarget(null);
  renderer.clear();
  fsQuad.material = combineMat;
  fsQuad.render(renderer);

  renderer.autoClearStencil = true;
  renderer.autoClearDepth = true;
}

let i = 0;
function render() {
  // if (nightVisionActive && nightVisionVal < 1) {
  //   nightVisionVal = Math.min(nightVisionVal + 0.075, 1);
  //   m.updateNightVision(nightVisionVal);
  // }
  // if (!nightVisionActive && nightVisionVal > 0) {
  //   nightVisionVal = Math.max(nightVisionVal - 0.2, 0);
  //   m.updateNightVision(nightVisionVal);
  // }

  // mouseMesh.position.copy(mousePos).setZ(1);

  // console.time("render");
  // renderWithOutline();
  renderer.setRenderTarget(null);
  renderer.setClearColor(0x040404);
  renderer.render(scene, camera);
  // console.timeEnd("render");

  requestAnimationFrame(render);
}

requestAnimationFrame(render);

function renderGPUPickingScene() {
  renderer.setClearColor(0);
  renderer.setRenderTarget(pickingTarget);
  renderer.render(pickingScene, camera);
}
