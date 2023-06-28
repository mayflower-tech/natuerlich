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
  BufferGeometry,
  Camera,
  Mesh,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Texture,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from "three";
import { RenderLayerPortal, useLayer, useLayerUpdate } from "./index.js";
import {
  useMeshForwardEvents,
  useMeshForwardEventsFromProps,
} from "@coconut-xr/xinteraction/react";

const planeGeometry = new PlaneGeometry();

/**
 * 1x1 plane containing the content in the best possible resolution
 * Content size required at init. Either specify a "content" or a "contentWidth" and "contentHeight".
 * Don't change the content size often due to performance reasons.
 */
export const QuadLayer = forwardRef<
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
  }
>(
  (
    {
      colorFormat,
      depthFormat,
      texture: customTexture,
      index = -1,
      pixelHeight,
      pixelWidth,
      updateTarget,
      geometry = planeGeometry,
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
          binding.createQuadLayer({
            space,
            viewPixelHeight: pixelHeight,
            viewPixelWidth: pixelWidth,
            width: 0,
            height: 0,
            isStatic,
            colorFormat,
            depthFormat,
            transform: new XRRigidTransform(),
          }),
        [colorFormat, depthFormat, isStatic, pixelHeight, pixelWidth],
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
      updateLayerScale,
      updateTarget,
    );

    useImperativeHandle(ref, () => internalRef.current!, []);

    return (
      <mesh
        renderOrder={layer != null ? -1000 : undefined}
        ref={internalRef}
        visible={layer == null || !transparent}
        geometry={geometry}
        {...(props as any)}
      >
        <meshBasicMaterial
          transparent={transparent}
          map={texture}
          depthWrite={true}
          colorWrite={layer == null}
        />
      </mesh>
    );
  },
);

function updateLayerScale(layer: XRQuadLayer, scale: Vector3) {
  layer.width = scale.x / 2;
  layer.height = scale.y / 2;
}

export const QuadLayerPortal = forwardRef<
  Object3D,
  Omit<ComponentPropsWithoutRef<typeof QuadLayer>, "updateTarget" | "texture">
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
      <QuadLayer {...props} updateTarget={updateTarget} {...eventProps} />
    </>
  );
});
