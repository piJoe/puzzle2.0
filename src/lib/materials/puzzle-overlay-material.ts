import { ShaderMaterial, WebGLRenderTarget } from "three";

export class PuzzleOverlayMaterial extends ShaderMaterial {
  constructor(
    outlineBuffer: WebGLRenderTarget,
    sceneBuffer: WebGLRenderTarget
  ) {
    super();

    this.type = "PuzzleOverlayMaterial";

    this.uniforms = {
      tScene: { value: sceneBuffer.texture },
      tOutline: { value: outlineBuffer.texture },
      // texSize: { value: new Vector2(sceneBuffer.width, sceneBuffer.height) },
    };

    this.vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`;

    this.fragmentShader = `
    varying vec2 vUv;

    uniform sampler2D tScene;
    uniform sampler2D tOutline;

    void main() {
      vec4 sceneCol = texture(tScene, vUv);
      vec4 outlineCol = texture(tOutline, vUv);
      gl_FragColor = min(vec4(1.,1.,1.,1.), (outlineCol * (1.0 - sceneCol.a)) + outlineCol * sceneCol);
    }`;
  }
}
