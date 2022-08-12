import * as THREE from "three";

export function nextPowerOf2(i: number): number {
  return 1 << Math.ceil(Math.log2(i));
}

export function toVector2(v: THREE.Vector3): THREE.Vector2 {
  return new THREE.Vector2(v.x, v.y);
}
