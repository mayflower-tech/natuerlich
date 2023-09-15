/* eslint-disable react/display-name */
import { useLoader, useFrame } from "@react-three/fiber";
import React, { useMemo, forwardRef, useEffect } from "react";
import { suspend } from "suspend-react";
import { Group } from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  XRInputSourceData,
  fetchControllerProfile,
  bindMotionControllerToObject,
  updateMotionController,
  getAssetPath,
} from "../motion-controller.js";
import { ControllerProfile } from "../motion-controller.js";
import * as WebXRMotionControllers from "@webxr-input-profiles/motion-controllers";

const { MotionController: MotionControllerImpl } = WebXRMotionControllers;

//TODO: get ref to items (for e.g. highlighting)

const fetchControllerProfileSymbol = Symbol("fetchControllerProfile");

/**
 * @returns the controller profile information based on the available input source profiles
 */
export function useInputSourceProfile(
  inputSourceProfiles: Array<string>,
  basePath?: string,
  defaultProfileId?: string,
): ControllerProfile {
  return suspend(
    () => fetchControllerProfile(inputSourceProfiles, basePath, defaultProfileId),
    [fetchControllerProfileSymbol, ...inputSourceProfiles, basePath, defaultProfileId],
  );
}

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
  const profile = useInputSourceProfile(inputSource.profiles, basePath, defaultProfileId);
  const motionController = useMemo(
    () =>
      new MotionControllerImpl(inputSource, profile, getAssetPath(profile, inputSource.handedness)),
    [inputSource, profile],
  );
  const { scene } = useLoader(GLTFLoader, getAssetPath(profile, inputSource.handedness)) as GLTF;
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  useEffect(
    () => bindMotionControllerToObject(motionController, clonedScene),
    [motionController, clonedScene],
  );
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
  const profile = useInputSourceProfile(inputSource.profiles, basePath, defaultProfileId);
  const { scene } = useLoader(GLTFLoader, getAssetPath(profile, inputSource.handedness));
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  // eslint-disable-next-line react/no-unknown-property
  return <primitive ref={ref} object={clonedScene} />;
});
