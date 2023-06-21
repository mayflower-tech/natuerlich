/* eslint-disable react/display-name */
import { GroupProps, useFrame, useStore } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useXR } from "../state.js";
import React from "react";
import {
  Matrix4,
  Mesh,
  PlaneGeometry,
  Quaternion,
  Texture,
  Vector3,
} from "three";
import { LayerObject, updateLayer } from "./index.js";

const positionHelper = new Vector3();
const quaternionHelper = new Quaternion();
const scaleHelper = new Vector3();
const matrixHelper = new Matrix4();

const planeGeometry = new PlaneGeometry();

/**
 * 1x1 plane containing the content in the best possible resolution
 * Content size required at init. Either specify a "content" or a "contentWidth" and "contentHeight".
 * Don't change the content size often due to performance reasons.
 */
export const QuadLayer = forwardRef<
  LayerObject,
  GroupProps & {
    texture: Texture;
    isStatic?: boolean | undefined;
    colorFormat?: GLenum | undefined;
    index?: number;
  }
>(({ colorFormat, isStatic, texture, index = -1, ...props }, ref) => {
  const store = useStore();
  const supportsLayers = useXR(
    ({ session }) => session?.enabledFeatures?.includes("layers") ?? false,
  );
  const content = texture.image as TexImageSource;
  const internalRef = useRef<Mesh>(null);
  const needsUpdate = useRef(false);

  useImperativeHandle(
    ref,
    () =>
      Object.assign(internalRef.current!, {
        updateContent: () => {
          needsUpdate.current = true;
        },
      }),
    [],
  );

  const layer = useMemo(() => {
    if (!supportsLayers) {
      return undefined;
    }
    const xrManager = store.getState().gl.xr;
    const binding = xrManager.getBinding();
    const space = xrManager.getReferenceSpace();
    if (space == null) {
      return undefined;
    }
    const layer = binding.createQuadLayer({
      space,
      colorFormat,
      height: 0,
      isStatic,
      width: 0,
      viewPixelWidth: content.width,
      viewPixelHeight: content.height,
    });
    return layer;
  }, [colorFormat, content.height, content.width, isStatic, store, supportsLayers]);

  useEffect(() => {
    if (layer == null) {
      return;
    }
    needsUpdate.current = true;
    useXR.getState().addLayer(index, layer);
    return () => {
      layer.destroy();
      useXR.getState().removeLayer(layer);
    };
  }, [layer, index]);

  useFrame((state, delta, frame: XRFrame | undefined) => {
    if (layer == null || internalRef.current == null) {
      return;
    }
    matrixHelper
      .multiplyMatrices(state.camera.matrix, state.camera.matrixWorldInverse)
      .multiply(internalRef.current.matrixWorld)
      .decompose(positionHelper, quaternionHelper, scaleHelper);
    layer.transform = new XRRigidTransform(positionHelper, quaternionHelper);
    layer.width = scaleHelper.x / 2;
    layer.height = scaleHelper.y / 2;
    if (needsUpdate.current || layer.needsRedraw) {
      updateLayer(layer, content, frame, store.getState().gl);
      needsUpdate.current = false;
    }
  });

  return (
    <mesh
      renderOrder={supportsLayers ? -1000 : undefined}
      geometry={planeGeometry}
      ref={internalRef}
      {...(props as any)}
    >
      <meshBasicMaterial map={texture} colorWrite={!supportsLayers} />
    </mesh>
  );
});
