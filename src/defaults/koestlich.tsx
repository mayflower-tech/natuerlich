/* eslint-disable react/display-name */
import React, {
  forwardRef,
  ComponentPropsWithoutRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from "react";
import { Object3D, OrthographicCamera } from "three";
import { QuadLayer, QuadLayerPortal } from "../react/index.js";
import { RootContainer } from "@coconut-xr/koestlich";
import { useStore } from "@react-three/fiber";

/**
 * combines WebXR layers with a Koestlich root container
 */
export const KoestlichQuadLayer = forwardRef<
  Object3D,
  Omit<ComponentPropsWithoutRef<typeof QuadLayer>, "updateTarget" | "texture"> & {
    far?: number;
    near?: number;
    contentScale?: number;
    precision?: number;
  }
>(({ children, far, near, contentScale = 1, ...props }, ref) => {
  return (
    <QuadLayerPortal {...props} ref={ref}>
      <KoestlichFullscreenCamera
        width={props.pixelWidth / contentScale}
        height={props.pixelHeight / contentScale}
        far={far}
        near={near}
      />
      <RootContainer
        width={props.pixelWidth / contentScale}
        height={props.pixelHeight / contentScale}
        precision={1 / contentScale}
      >
        {children}
      </RootContainer>
    </QuadLayerPortal>
  );
});

/**
 * expects the Koestlich container to be at 0,0,0 with anchor center
 */
export const KoestlichFullscreenCamera = forwardRef<
  OrthographicCamera,
  { width: number; height: number; near?: number; far?: number }
>(({ width, height, near = 100, far = -1 }, ref) => {
  const store = useStore();
  const internalRef = useRef<OrthographicCamera>(null);
  useImperativeHandle(ref, () => internalRef.current!, []);

  useEffect(() => {
    const newCamera = internalRef.current;
    if (newCamera == null) {
      return;
    }
    const prevCamera = store.getState().camera;
    store.setState({ camera: newCamera });

    return () => {
      if (store.getState().camera != newCamera) {
        //camera was already changed to another one
        return;
      }
      store.setState({ camera: prevCamera });
    };
  }, [store]);

  const halfHeight = height / 2;
  const halfWidth = width / 2;

  return (
    <orthographicCamera
      position={[0, 0, near]}
      near={0}
      top={0}
      bottom={-height}
      left={0}
      right={width}
      far={far - near}
      ref={internalRef}
    />
  );
});
