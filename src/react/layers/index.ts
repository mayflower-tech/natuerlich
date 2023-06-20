import type { Object3D, WebGLRenderer } from "three";

export function updateLayer(
  layer: XRCompositionLayer,
  content: TexImageSource | OffscreenCanvas | undefined,
  frame: XRFrame | undefined,
  renderer: WebGLRenderer,
) {
  if (content == null || frame == null) {
    return;
  }


  const binding = renderer.xr.getBinding();
  const context = renderer.getContext() as WebGL2RenderingContext;
  const glayer = binding.getSubImage(layer, frame);
  renderer.state.bindTexture(context.TEXTURE_2D, glayer.colorTexture);
  context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, true);
  context.texSubImage2D(
    context.TEXTURE_2D,
    0,
    0,
    0,
    content.width,
    content.height,
    context.RGBA,
    context.UNSIGNED_BYTE,
    content,
  );
}

export type LayerObject = Object3D & {
  updateContent: (content: TexImageSource | OffscreenCanvas) => void;
};

export * from "./quad-layer.js";
export * from "./cylinder-layer.js";
