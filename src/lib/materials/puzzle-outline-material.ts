import {
  NotEqualStencilFunc,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
} from "three";

export class PuzzleOutlineMaterial extends ShaderMaterial {
  constructor(buffer: WebGLRenderTarget) {
    super();

    this.type = "PuzzleOutlineMaterial";

    this.uniforms = {
      tBuffer: { value: buffer.texture },
      bufferSize: { value: new Vector2(buffer.width, buffer.height) },
    };

    this.vertexShader = `
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`;

    this.fragmentShader = `
    uniform sampler2D tBuffer;
    uniform vec2 bufferSize;
    void main() {
      vec4 color = vec4(0., 0., 0., 0.);

      vec2 uv = vec2(gl_FragCoord.x - 1., gl_FragCoord.y - 1.)/bufferSize;
      color = max(texture(tBuffer, uv), color);
      uv = vec2(gl_FragCoord.x, gl_FragCoord.y - 1.)/bufferSize;
      color = max(texture(tBuffer, uv), color);
      uv = vec2(gl_FragCoord.x + 1., gl_FragCoord.y - 1.)/bufferSize;
      color = max(texture(tBuffer, uv), color);

      // ------

      uv = vec2(gl_FragCoord.x - 1., gl_FragCoord.y + 1.)/bufferSize;
      color = max(texture(tBuffer, uv), color);
      uv = vec2(gl_FragCoord.x, gl_FragCoord.y + 1.)/bufferSize;
      color = max(texture(tBuffer, uv), color);
      uv = vec2(gl_FragCoord.x + 1., gl_FragCoord.y + 1.)/bufferSize;
      color = max(texture(tBuffer, uv), color);

      // ------

      uv = vec2(gl_FragCoord.x - 1., gl_FragCoord.y)/bufferSize;
      color = max(texture(tBuffer, uv), color);
      uv = vec2(gl_FragCoord.x, gl_FragCoord.y)/bufferSize;
      color = max(texture(tBuffer, uv), color);
      uv = vec2(gl_FragCoord.x + 1., gl_FragCoord.y)/bufferSize;
      color = max(texture(tBuffer, uv), color);

      gl_FragColor = color;
    }`;

    super.depthWrite = false;
    super.depthTest = false;
    super.stencilWrite = true;
    super.stencilWriteMask = 0x00;
    super.stencilFunc = NotEqualStencilFunc;
    super.stencilRef = 1;
  }

  updateBuffer(buffer: WebGLRenderTarget) {
    this.uniforms.bufferSize.value.set(buffer.width, buffer.height);
    this.uniforms.tBuffer.value = buffer.texture;
    this.needsUpdate = true;
  }
}
