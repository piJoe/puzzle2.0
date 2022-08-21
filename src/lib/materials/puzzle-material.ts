import { DataTexture, ShaderMaterial, Texture, Vector2 } from "three";
import {
  vshPositionPuzzleData,
  vshRotateFunc,
  vshModelIds,
  vshPuzzleDataFunc,
} from "./shader-chunks";

const DEFAULT_TEXTURE = new DataTexture(
  Uint8Array.from([255, 0, 255, 255]),
  1,
  1
);
DEFAULT_TEXTURE.needsUpdate = true;

export class PuzzleMaterial extends ShaderMaterial {
  constructor(size: Vector2, dataTex: DataTexture, map?: Texture) {
    super();

    this.type = "PuzzleMaterial";

    this.uniforms = {
      puzzleDataSize: { value: size },
      puzzleDataTex: { value: dataTex },
      map: { value: map ?? DEFAULT_TEXTURE },
      nightVision: { value: 0.0 },
    };

    this.vertexShader = `
    ${vshRotateFunc}
    ${vshModelIds}
    ${vshPuzzleDataFunc}
    varying vec2 uvV;
    void main() {
        uvV = uv;
        ${vshPositionPuzzleData}
    }`;

    this.fragmentShader = `
    uniform sampler2D map; 
    varying vec2 uvV;
    uniform float nightVision;
    void main() {
        vec4 baseCol = texture2D(map, uvV);
        baseCol = 0.5 + max(1., nightVision * 1.5) * (baseCol - 0.5); // contrast
        // baseCol *= max(1., (4. * nightVision)); // exposure
        baseCol = baseCol + (0.35 * nightVision); // brightness
        gl_FragColor = baseCol;
    }`;
  }

  updateMap(map: Texture) {
    this.uniforms.map.value = map;
    this.needsUpdate = true;
  }

  updatePuzzleData(size: Vector2, dataTex: DataTexture) {
    this.uniforms.puzzleDataSize.value.copy(size);
    this.uniforms.puzzleDataTex.value = dataTex;
    this.needsUpdate = true;
  }

  updateNightVision(val: number) {
    this.uniforms.nightVision.value = val;
    this.needsUpdate = true;
  }
}
