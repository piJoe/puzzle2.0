import { Vector3, Vector2 } from "three";

export function nextPowerOf2(i: number): number {
  return 1 << Math.ceil(Math.log2(i));
}

export function toVector2(v: Vector3): Vector2 {
  return new Vector2(v.x, v.y);
}

var vec = new Vector3(); // create once and reuse
var pos = new Vector3(); // create once and reuse
export function posToWorldPos(x, y, width, height, cam) {
  vec.set((x / width) * 2 - 1, -(y / height) * 2 + 1, 0.5);
  vec.unproject(cam);
  vec.sub(cam.position).normalize();
  var distance = -cam.position.z / vec.z;

  pos.copy(cam.position).add(vec.multiplyScalar(distance));
  return pos;
}
