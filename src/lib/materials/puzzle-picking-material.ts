import { DataTexture, ShaderMaterial, Texture, Vector2 } from "three";
import {
  vshPositionPuzzleData,
  vshRotateFunc,
  vshModelIds,
  vshPuzzleDataFunc,
} from "./shader-chunks";

export class PuzzlePickingMaterial extends ShaderMaterial {
  constructor(size: Vector2, dataTex: DataTexture) {
    super();

    this.type = "PuzzlePickingMaterial";

    this.uniforms = {
      puzzleDataSize: { value: size },
      puzzleDataTex: { value: dataTex },
    };

    this.defaultAttributeValues = {
      modelId: 0,
    };

    this.vertexShader = `
    ${vshRotateFunc}
    varying vec3 modelIdV;
    ${vshModelIds}
    ${vshPuzzleDataFunc}

    void main() {
      modelIdV = modelToColor(modelId);
      ${vshPositionPuzzleData}
    }`;

    this.fragmentShader = `
    varying highp vec3 modelIdV;
    void main() {
      gl_FragColor = vec4(modelIdV, 1.0);
    }`;
  }

  updatePuzzleData(size: Vector2, dataTex: DataTexture) {
    this.uniforms.puzzleDataSize.value.copy(size);
    this.uniforms.puzzleDataTex.value = dataTex;
    this.needsUpdate = true;
  }
}
