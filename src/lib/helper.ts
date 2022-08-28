import {
  Vector3,
  Vector2,
  OrthographicCamera,
  Camera,
  Matrix3,
  Matrix4,
  BufferAttribute,
} from "three";

export function nextPowerOf2(i: number): number {
  return 1 << Math.ceil(Math.log2(i));
}

export function toVector2(v: Vector3): Vector2 {
  return new Vector2(v.x, v.y);
}

var vec = new Vector3();
var pos = new Vector3();
export function posToWorldPos(
  x: number,
  y: number,
  width: number,
  height: number,
  cam: (OrthographicCamera | Camera) & { isOrthographicCamera: boolean },
  targetZ = 0
) {
  vec.set((x / width) * 2 - 1, -(y / height) * 2 + 1, 0.5);
  vec.unproject(cam);
  if (cam.isOrthographicCamera) {
    pos.copy(vec);
    return pos;
  }

  vec.sub(cam.position).normalize();
  var distance = (targetZ - cam.position.z) / vec.z;
  vec.multiplyScalar(distance);
  pos.copy(cam.position).add(vec);
  return pos;
}

export function rotateZ(angle: number): Matrix3 {
  const s = Math.sin(angle);
  const c = Math.cos(angle);

  return new Matrix3().set(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0);
}

export function calculatePieceCount(
  fullWidth: number,
  fullHeight: number,
  targetCount: number
) {
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

export function offsetOutline(
  points: Vector2[],
  offsetAmount: number
): Vector2[] {
  let result: Vector2[] = [];

  const offset = new BufferAttribute(new Float32Array([offsetAmount, 0, 0]), 3);

  for (let i = 0; i < points.length; i++) {
    let v1 = new Vector2().subVectors(
      points[i - 1 < 0 ? points.length - 1 : i - 1],
      points[i]
    );
    let v2 = new Vector2().subVectors(
      points[i + 1 == points.length ? 0 : i + 1],
      points[i]
    );
    let angle = v2.angle() - v1.angle();
    let halfAngle = angle * 0.5;

    let hA = halfAngle;
    let tA = v2.angle() + Math.PI * 0.5;

    let shift = Math.tan(hA - Math.PI * 0.5);
    let shiftMatrix = new Matrix4().set(
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
    let rotationMatrix = new Matrix4().set(
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

    let translationMatrix = new Matrix4().set(
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

    result.push(new Vector2(cloneOffset.getX(0), cloneOffset.getY(0)));
  }

  return result;
}
