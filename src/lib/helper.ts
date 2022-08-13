import { Vector3, Vector2 } from "three";

export function nextPowerOf2(i: number): number {
  return 1 << Math.ceil(Math.log2(i));
}

export function toVector2(v: Vector3): Vector2 {
  return new Vector2(v.x, v.y);
}
