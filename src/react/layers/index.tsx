import { RootState, useFrame, useStore } from "@react-three/fiber";
import { ReactNode, RefObject, useEffect, useMemo } from "react";
import {
  Camera,
  DepthFormat,
  DepthStencilFormat,
  DepthTexture,
  Matrix4,
  Mesh,
  Quaternion,
  RGBAFormat,
  Scene,
  Texture,
  UnsignedByteType,
  UnsignedInt248Type,
  UnsignedIntType,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";
import { useXR } from "../state.js";
import React from "react";

export function writeContentToLayer(
  renderer: WebGLRenderer,
  layer: XRCompositionLayer,
  frame: XRFrame,
  content: TexImageSource,
) {
  const context = renderer.getContext() as WebGL2RenderingContext;
  const subImage = renderer.xr.getBinding().getSubImage(layer, frame);
  renderer.state.bindTexture(context.TEXTURE_2D, subImage.colorTexture);
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

export function useLayer<T extends XRQuadLayer | XRCylinderLayer>(
  createLayer: (binding: XRWebGLBinding, space: XRSpace) => T,
  transparent: boolean,
  index: number,
): T | undefined {
  const store = useStore();
  const supportsLayers = useXR(
    ({ session }) => session?.enabledFeatures?.includes("layers") ?? false,
  );
  const supportsDepthSorting = useXR(
    ({ session }) => session?.enabledFeatures?.includes("depth-sorted-layers") ?? false,
  );

  const layersEnabled = supportsLayers && (!transparent || supportsDepthSorting);

  const layer = useMemo(() => {
    if (!layersEnabled) {
      return undefined;
    }
    const xrManager = store.getState().gl.xr;
    const binding = xrManager.getBinding();
    const space = xrManager.getReferenceSpace();
    if (space == null) {
      return undefined;
    }
    return createLayer(binding, space);
  }, [layersEnabled, store, createLayer]);

  useEffect(() => {
    if (layer == null) {
      return;
    }
    useXR.getState().addLayer(index, layer);
    return () => {
      layer.destroy();
      useXR.getState().removeLayer(layer);
    };
  }, [layer, index]);

  return layer;
}

const positionHelper = new Vector3();
const quaternionHelper = new Quaternion();
const scaleHelper = new Vector3();
const matrixHelper = new Matrix4();

export function useLayerUpdate<T extends XRQuadLayer | XRCylinderLayer>(
  ref: RefObject<Mesh>,
  layer: T | undefined,
  texture: Texture | undefined,
  transparent: boolean,
  width: number,
  height: number,
  updateLayerSize: (layer: T, scale: Vector3) => void,
  updateTarget?: (renderer: WebGLRenderer, target: WebGLRenderTarget) => void,
): Texture | undefined {
  const store = useStore();
  const nonLayerRenderTarget = useMemo(() => {
    if (layer != null || texture != null) {
      return undefined;
    }
    const renderer = store.getState().gl;
    const attributes = renderer.getContext().getContextAttributes();
    return new WebGLRenderTarget(width, height, {
      type: UnsignedByteType,
      format: RGBAFormat,
      stencilBuffer: attributes?.stencil,
      colorSpace: renderer.outputColorSpace,
      samples: attributes?.antialias ? 4 : 1,
    });
  }, [layer, texture, width, height, store]);

  //cleanup nonLayerRenderTarget
  useEffect(() => () => nonLayerRenderTarget?.dispose(), [nonLayerRenderTarget]);

  useFrame((state, _delta, frame: XRFrame | undefined) => {
    //update layer position
    if (layer != null && ref.current != null) {
      matrixHelper
        .multiplyMatrices(state.camera.matrix, state.camera.matrixWorldInverse)
        .multiply(ref.current.matrixWorld)
        .decompose(positionHelper, quaternionHelper, scaleHelper);
      layer.transform = new XRRigidTransform(positionHelper, quaternionHelper);
      updateLayerSize(layer, scaleHelper);
    }

    //update non-layer target
    if (nonLayerRenderTarget != null && updateTarget != null) {
      updateTarget(state.gl, nonLayerRenderTarget);
      return;
    }

    if (frame == null || layer == null) {
      return;
    }

    //re-write texture if necassary
    if (texture != null && layer.needsRedraw) {
      writeContentToLayer(state.gl, layer, frame, texture.image);
      return;
    }

    //re-render target for layer
    //workarround

    if (updateTarget == null) {
      return;
    }

    const renderer = state.gl;

    //we need to recreate the render target so that the color buffer is bound to the colorTexture of the layer

    //the following is very bad
    const attributes = renderer.getContext().getContextAttributes();
    const target = new WebGLRenderTarget(width, height, {
      type: UnsignedByteType,
      format: RGBAFormat,
      depthTexture: transparent
        ? new DepthTexture(
            width,
            height,
            attributes?.stencil ? UnsignedInt248Type : UnsignedIntType,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            attributes?.stencil ? DepthStencilFormat : DepthFormat,
          )
        : undefined,
      stencilBuffer: attributes?.stencil,
      colorSpace: renderer.outputColorSpace,
      samples: attributes?.antialias ? 4 : 1,
    });

    renderer.initTexture(target.texture);
    if (target.depthTexture != null) {
      renderer.initTexture(target.depthTexture);
    }

    const subImage = renderer.xr.getBinding().getSubImage(layer, frame);

    renderer.properties.get(target.texture).__webglTexture = subImage.colorTexture;

    if (target.depthTexture != null) {
      renderer.properties.get(target.depthTexture).__webglTexture = subImage.depthStencilTexture;
    }

    updateTarget(renderer, target);
  });

  return texture ?? nonLayerRenderTarget?.texture;
}

export function RenderLayerPortal({
  properties,
  children,
}: {
  properties: { camera?: Camera; scene?: Scene };
  children?: ReactNode;
}) {
  const store = useStore();
  useEffect(() => {
    const update = (state: RootState) => {
      properties.camera = state.camera;
      properties.scene = state.scene;
    };
    update(store.getState());
    return store.subscribe(update);
  }, []);
  return <>{children}</>;
}

export * from "./quad-layer.js";
export * from "./cylinder-layer.js";
