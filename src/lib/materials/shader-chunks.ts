export const vshRotateFunc = `
mat3 rotation3dZ(float angle) {
    float s = sin(angle);
    float c = cos(angle);

    return mat3(
        c, s, 0.0,
        -s, c, 0.0,
        0.0, 0.0, 1.0
    );
}
`;

export const vshPosition = `
vec3 pos = position.xyz * rotation3dZ(pieceRotation);
vec4 mvPosition = modelViewMatrix * vec4( pos, 1.0 );
vec4 mvPositionWorld = mvPosition + vec4( piecePosition, 0.0, 0.0 );
gl_Position = projectionMatrix * mvPositionWorld;`;

export const vshPositionPuzzleData = `
vec4 piece = pieceData(modelId);
vec3 pos = position.xyz * rotation3dZ(piece.a);
vec4 mvPosition = modelViewMatrix * vec4( pos, 1.0 );
vec4 mvPositionWorld = mvPosition + vec4(piece.xyz, 0.);
gl_Position = projectionMatrix * mvPositionWorld;`;

export const vshModelIds = `
attribute float modelId;
vec3 modelToColor(float f) {
    vec3 color;
    color.r = floor(f / 256.0 / 256.0);
    color.g = floor((f - color.r * 256.0 * 256.0) / 256.0);
    color.b = floor(f - color.r * 256.0 * 256.0 - color.g * 256.0);
    return color / 255.0;
}
`;

export const vshPuzzleDataFunc = `
uniform vec2 puzzleDataSize;
uniform sampler2D puzzleDataTex;
vec4 pieceData(float id) {
    float col = mod(id, puzzleDataSize.x);
    float row = floor(id / puzzleDataSize.x);
    float oneHPixel = 1. / puzzleDataSize.x;
    vec2 pUV = vec2((col + 0.5) / puzzleDataSize.x, (row + 0.5) / puzzleDataSize.y);
    return texture2D(puzzleDataTex, pUV);
}
`;
