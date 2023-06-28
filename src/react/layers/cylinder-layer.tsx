/* eslint-disable react/display-name */
import { GroupProps, RootState, createPortal } from "@react-three/fiber";
import {
  ComponentPropsWithoutRef,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import React from "react";
import {
  BackSide,
  BufferGeometry,
  CylinderGeometry,
  Mesh,
  Object3D,
  Scene,
  Texture,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";
import { RenderLayerPortal, useLayer, useLayerUpdate } from "./index.js";
import { useMeshForwardEventsFromProps } from "@coconut-xr/xinteraction/react";

const deg60 = (60 * Math.PI) / 180;

/**
 * partial cylinder containing the content in the best possible resolution
 * Content size required at init. Either specify a "content" or a "contentWidth" and "contentHeight".
 * Don't change the content raidus, centralAngle, contentWidth, and contentHeight often due to performance reasons.
 */
export const CylinderLayer = forwardRef<
  Object3D,
  GroupProps & {
    texture?: Texture;
    updateTarget?: (renderer: WebGLRenderer, target: WebGLRenderTarget) => void;
    pixelWidth: number;
    pixelHeight: number;
    colorFormat?: GLenum | undefined;
    depthFormat?: GLenum | undefined;
    index?: number;
    transparent?: boolean;
    geometry?: BufferGeometry;
    radius?: number;
    centralAngle?: number;
  }
>(
  (
    {
      colorFormat,
      depthFormat,
      radius = 2,
      centralAngle = deg60,
      texture: customTexture,
      index = -1,
      pixelHeight,
      pixelWidth,
      updateTarget,
      geometry: customGeometry,
      transparent = false,
      ...props
    },
    ref,
  ) => {
    const internalRef = useRef<Mesh>(null);

    const isStatic = updateTarget == null;

    const layer = useLayer(
      useCallback(
        (binding, space) =>
          binding.createCylinderLayer({
            space,
            viewPixelWidth: pixelWidth,
            viewPixelHeight: pixelHeight,
            aspectRatio: pixelWidth / pixelHeight,
            centralAngle: centralAngle,
            radius: 0,
            colorFormat,
            depthFormat,
            transform: new XRRigidTransform(),
            isStatic,
          }),
        [centralAngle, colorFormat, depthFormat, pixelHeight, pixelWidth, isStatic],
      ),
      transparent,
      index,
    );

    const texture = useLayerUpdate(
      internalRef,
      layer,
      customTexture,
      transparent,
      pixelWidth,
      pixelHeight,
      updateLayerScale.bind(null, radius),
      updateTarget,
    );

    useImperativeHandle(ref, () => internalRef.current!, []);

    const hasCustomGeometry = customGeometry != null;

    const geometry =
      useMemo(() => {
        if (hasCustomGeometry) {
          return undefined;
        }
        const width = radius * centralAngle; //(2 * PI * radius = umfang) * angle / (2 * PI)
        const height = (width * pixelHeight) / pixelWidth;
        return new CylinderGeometry(radius, radius, height, 32, 1, true, 0, centralAngle).rotateY(
          Math.PI - centralAngle / 2,
        );
      }, [hasCustomGeometry, radius, centralAngle, pixelHeight, pixelWidth]) ?? customGeometry;

    return (
      <mesh
        renderOrder={layer != null ? -1000 : undefined}
        visible={layer == null || !transparent}
        geometry={geometry}
        ref={internalRef}
        {...(props as any)}
      >
        <meshBasicMaterial
          side={BackSide}
          map={texture}
          colorWrite={layer == null}
          transparent={transparent}
        />
      </mesh>
    );
  },
);

function updateLayerScale(radius: number, layer: XRCylinderLayer, scale: Vector3) {
  layer.radius = scale.x * radius;
}

export const CylinderLayerPortal = forwardRef<
  Object3D,
  Omit<ComponentPropsWithoutRef<typeof CylinderLayer>, "updateTarget" | "texture">
>(({ children, ...props }, ref) => {
  const properties = useMemo<Partial<RootState>>(
    () => ({
      scene: new Scene(),
      size: { left: 0, top: 0, width: props.pixelWidth, height: props.pixelHeight },
    }),
    [props.pixelHeight, props.pixelWidth],
  );

  const updateTarget = useCallback((renderer: WebGLRenderer, target: WebGLRenderTarget) => {
    if (properties.camera == null || properties.scene == null) {
      return;
    }
    const prevTarget = renderer.getRenderTarget();
    const xrEnabled = renderer.xr.enabled;

    renderer.xr.enabled = false;
    renderer.setRenderTarget(target);
    renderer.render(properties.scene, properties.camera);

    renderer.xr.enabled = xrEnabled;
    renderer.setRenderTarget(prevTarget);
  }, []);

  const eventProps = useMeshForwardEventsFromProps(properties);

  useImperativeHandle(ref, () => eventProps.ref.current!);

  return (
    <>
      {createPortal(
        <RenderLayerPortal properties={properties}>{children}</RenderLayerPortal>,
        properties.scene!,
        properties as Partial<RootState>,
      )}
      <CylinderLayer {...props} updateTarget={updateTarget} {...eventProps} />
    </>
  );
});
