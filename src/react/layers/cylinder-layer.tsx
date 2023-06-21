/* eslint-disable react/display-name */
import { GroupProps, useFrame, useStore } from "@react-three/fiber";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { useXR } from "../state.js";
import React from "react";
import { BackSide, CylinderGeometry, Matrix4, Mesh, Quaternion, Texture, Vector3 } from "three";
import { LayerObject, updateLayer } from "./index.js";

const positionHelper = new Vector3();
const quaternionHelper = new Quaternion();
const scaleHelper = new Vector3();
const matrixHelper = new Matrix4();

const deg60 = (60 * Math.PI) / 180;

/**
 * partial cylinder containing the content in the best possible resolution
 * Content size required at init. Either specify a "content" or a "contentWidth" and "contentHeight".
 * Don't change the content raidus, centralAngle, contentWidth, and contentHeight often due to performance reasons.
 */
export const CylinderLayer = forwardRef<
  LayerObject,
  GroupProps & {
    texture: Texture;
    isStatic?: boolean | undefined;
    colorFormat?: GLenum | undefined;
    centralAngle?: number;
    radius?: number;
    index?: number;
  }
>(
  (
    { colorFormat, isStatic, texture, centralAngle = deg60, radius = 2, index = -1, ...props },
    ref,
  ) => {
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
      return binding.createCylinderLayer({
        space,
        colorFormat,
        isStatic,
        aspectRatio: content.width / content.height,
        radius: radius,
        centralAngle: centralAngle,
        viewPixelWidth: content.width,
        viewPixelHeight: content.height,
        transform: new XRRigidTransform(),
      });
    }, [
      centralAngle,
      colorFormat,
      content.height,
      content.width,
      isStatic,
      radius,
      store,
      supportsLayers,
    ]);

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
      layer.radius = scaleHelper.x * radius;
      if (needsUpdate.current || layer.needsRedraw) {
        updateLayer(layer, content, frame, store.getState().gl);
        needsUpdate.current = false;
      }
    });

    const geometry = useMemo(() => {
      const width = radius * centralAngle; //(2 * PI * radius = umfang) * angle / (2 * PI)
      const height = (width * content.height) / content.width;
      return new CylinderGeometry(radius, radius, height, 32, 1, true, 0, centralAngle).rotateY(
        Math.PI - centralAngle / 2,
      );
    }, [radius, centralAngle, content.height, content.width]);

    return (
      <mesh
        renderOrder={supportsLayers ? -1000 : undefined}
        geometry={geometry}
        ref={internalRef}
        {...(props as any)}
      >
        <meshBasicMaterial side={BackSide} map={texture} colorWrite={!supportsLayers} />
      </mesh>
    );
  },
);
