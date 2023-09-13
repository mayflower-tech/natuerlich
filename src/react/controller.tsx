/* eslint-disable react/display-name */
import { useLoader, useFrame } from "@react-three/fiber";
import React, { useMemo, forwardRef, useEffect } from "react";
import { suspend } from "suspend-react";
import { Group } from "three";
import type { GLTF } from "three-stdlib/loaders/GLTFLoader.js";
import * as ThreeGLTF from "three-stdlib/loaders/GLTFLoader.js";
import {
  XRInputSourceData,
  fetchControllerProfile,
  bindMotionControllerToObject,
  updateMotionController,
  createMotionController,
} from "../motion-controller.js";
import { useXR } from "./state.js";

const { GLTFLoader } = ThreeGLTF;

//TODO: get ref to items (for e.g. highlighting)

const createMotionControllerSymbol = Symbol("createMotionController");

/**
 * render a the detected controller model and animates pressed buttons and other input elements
 */
export const DynamicControllerModel = forwardRef<
  Group,
  {
    inputSource: XRInputSource;
    basePath?: string;
    defaultProfileId?: string;
  }
>(({ inputSource, basePath, defaultProfileId }, ref) => {
  const motionController = suspend(createMotionController, [
    inputSource,
    basePath,
    defaultProfileId,
    createMotionControllerSymbol,
  ]);

  const { scene } = useLoader(GLTFLoader, motionController.assetUrl) as GLTF;
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  useEffect(
    () => bindMotionControllerToObject(motionController, clonedScene),
    [motionController, clonedScene],
  );
  useEffect(() => {
    useXR.getState().motionControllers.set(inputSource, motionController);
  }, [inputSource, motionController]);
  useFrame((_state, _delta, frame: XRFrame | undefined) => {
    if (
      frame == null ||
      frame.session.visibilityState === "hidden" ||
      frame.session.visibilityState === "visible-blurred"
    ) {
      clonedScene.visible = false;
      return;
    }
    clonedScene.visible = true;
    if (inputSource.gamepad != null) {
      updateMotionController(motionController);
    }
  });
  // eslint-disable-next-line react/no-unknown-property
  return <primitive ref={ref} object={clonedScene} />;
});

const fetchControllerProfileSymbol = Symbol("fetchControllerProfile");

/**
 * render a the detected controller model
 */
export const StaticControllerModel = forwardRef<
  Group,
  {
    inputSource: XRInputSourceData;
    basePath?: string;
    defaultProfileId?: string;
  }
>(({ inputSource, basePath, defaultProfileId }, ref) => {
  const { assetPath } = suspend(fetchControllerProfile, [
    inputSource,
    basePath,
    defaultProfileId,
    fetchControllerProfileSymbol,
  ]);
  if (assetPath == null) {
    throw new Error(`unable to find profile for input source`);
  }
  const { scene } = useLoader(GLTFLoader, assetPath);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  // eslint-disable-next-line react/no-unknown-property
  return <primitive ref={ref} object={clonedScene} />;
});
