/* eslint-disable react/display-name */
import { useLoader, useFrame } from "@react-three/fiber";
import React, { useMemo, forwardRef, useEffect } from "react";
import { suspend } from "suspend-react";
import { Group } from "three";
import { GLTFLoader } from "three-stdlib/index.js";
import {
  XRInputSourceData,
  fetchControllerProfile,
  bindMotionControllerToObject,
  updateMotionController,
  createMotionController,
} from "../motion-controller.js";

//TODO: get ref to items (for e.g. highlighting)

const createMotionControllerSymbol = Symbol("createMotionController");

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
  const { scene } = useLoader(GLTFLoader, motionController.assetUrl);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  useEffect(
    () => bindMotionControllerToObject(motionController, clonedScene),
    [motionController, clonedScene],
  );
  useFrame(() => updateMotionController(motionController));
  // eslint-disable-next-line react/no-unknown-property
  return <primitive ref={ref} object={clonedScene} />;
});

const fetchControllerProfileSymbol = Symbol("fetchControllerProfile");

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
