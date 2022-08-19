import {
  AlwaysStencilFunc,
  DataTexture,
  ReplaceStencilOp,
  ShaderMaterial,
  Vector2,
} from "three";
import {
  vshPositionPuzzleData,
  vshRotateFunc,
  vshModelIds,
  vshPuzzleDataFunc,
} from "./shader-chunks";

export class PuzzleSelectionMaterial extends ShaderMaterial {
  constructor(size: Vector2, dataTex: DataTexture) {
    super();

    this.type = "PuzzleSelectionMaterial";

    this.uniforms = {
      puzzleDataSize: { value: size },
      puzzleDataTex: { value: dataTex },
      // @todo: add these
      selectDataSize: { value: null },
      selectDataTex: { value: null },
    };

    this.defaultAttributeValues = {
      modelId: 0,
    };

    this.vertexShader = `
    ${vshRotateFunc}
    ${vshModelIds}
    ${vshPuzzleDataFunc}

    void main() {
      ${vshPositionPuzzleData}
    }`;

    this.fragmentShader = `
    void main() {
      gl_FragColor = vec4(1., 0., 0.5, 1.0);
    }`;

    super.stencilWrite = true;
    super.stencilWriteMask = 0xff;
    super.stencilFunc = AlwaysStencilFunc;
    super.stencilRef = 1;
    super.stencilZPass = ReplaceStencilOp;
  }

  updatePuzzleData(size: Vector2, dataTex: DataTexture) {
    this.uniforms.puzzleDataSize.value.copy(size);
    this.uniforms.puzzleDataTex.value = dataTex;
    this.needsUpdate = true;
  }
}
