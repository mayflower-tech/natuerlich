/* eslint-disable react/display-name */
import React, {
  forwardRef,
  ComponentPropsWithoutRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useLayoutEffect,
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
>(({ children, far, near, precision = 0.1, contentScale = 1, ...props }, ref) => {
  return (
    <QuadLayerPortal {...props} ref={ref}>
      <KoestlichFullscreenCamera zoom={contentScale} far={far} near={near} />
      <RootContainer
        anchorX="center"
        anchorY="center"
        width={props.pixelWidth / contentScale}
        height={props.pixelHeight / contentScale}
        precision={precision / contentScale}
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
  { near?: number; far?: number; zoom?: number }
>(({ near = 100, far = -1, zoom = 1 }, ref) => {
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

  useLayoutEffect(() => internalRef.current?.updateProjectionMatrix(), [zoom, near, far]);

  //the camera automatically retrieves the width and height and positions itself and the view bounds accordingly
  return (
    <orthographicCamera
      position={[0, 0, near]}
      zoom={zoom}
      near={0}
      far={near - far}
      ref={internalRef}
    />
  );
});
